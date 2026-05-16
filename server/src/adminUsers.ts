import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AdminUser, AdminUsersResponse } from '../../shared/adminTypes.js';
import { isAdminUsername } from './admin.js';
import { normalizeUsername } from './authPostgres.js';
import { useDatabase, getPool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
const GAME_RESULTS_FILE = path.join(DATA_DIR, 'game_results.json');

async function loadFileUsers(): Promise<
  { id: string; username: string; displayName: string; createdAt: number }[]
> {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as {
      users: { id: string; username: string; displayName: string; createdAt: number }[];
    };
    return parsed.users ?? [];
  } catch {
    return [];
  }
}

async function loadFileLeaderboard(): Promise<
  Record<string, { userId: string; gamesPlayed: number; wins: number; totalPoints: number }>
> {
  try {
    const raw = await fs.readFile(LEADERBOARD_FILE, 'utf8');
    const parsed = JSON.parse(raw) as {
      entries: Record<string, { userId: string; gamesPlayed: number; wins: number; totalPoints: number }>;
    };
    return parsed.entries ?? {};
  } catch {
    return {};
  }
}

export async function listAdminUsers(search = '', limit = 100): Promise<AdminUsersResponse> {
  const cap = Math.min(200, Math.max(1, limit));
  const q = search.trim().toLowerCase();

  if (useDatabase()) {
    const pool = getPool();
    const params: string[] = [];
    let where = '';
    if (q) {
      params.push(`%${q}%`);
      where = `WHERE u.username ILIKE $1 OR u.display_name ILIKE $1`;
    }
    params.push(String(cap));

    const { rows } = await pool.query<{
      id: string;
      username: string;
      display_name: string;
      created_at: string;
      games_played: string;
      wins: string;
      total_points: string;
      active_sessions: string;
    }>(
      `SELECT u.id, u.username, u.display_name, u.created_at,
              COALESCE(SUM(s.games_played), 0)::text AS games_played,
              COALESCE(SUM(s.wins), 0)::text AS wins,
              COALESCE(SUM(s.total_points), 0)::text AS total_points,
              (SELECT COUNT(*)::text FROM sessions WHERE user_id = u.id) AS active_sessions
       FROM users u
       LEFT JOIN leaderboard_stats s ON s.user_id = u.id
       ${where}
       GROUP BY u.id, u.username, u.display_name, u.created_at
       ORDER BY u.created_at DESC
       LIMIT $${params.length}`,
      params
    );

    const { rows: countRows } = await pool.query<{ count: string }>(
      q
        ? `SELECT COUNT(*)::text AS count FROM users u WHERE u.username ILIKE $1 OR u.display_name ILIKE $1`
        : `SELECT COUNT(*)::text AS count FROM users`,
      q ? [`%${q}%`] : []
    );

    const users: AdminUser[] = rows.map((r) => ({
      id: r.id,
      username: r.username,
      displayName: r.display_name,
      createdAt: Number(r.created_at),
      gamesPlayed: Number(r.games_played),
      wins: Number(r.wins),
      totalPoints: Number(r.total_points),
      activeSessions: Number(r.active_sessions),
      isAdmin: isAdminUsername(r.username),
    }));

    return { users, total: Number(countRows[0]?.count ?? users.length) };
  }

  const allUsers = await loadFileUsers();
  const lb = await loadFileLeaderboard();
  const statsByUser = new Map<string, { games: number; wins: number; points: number }>();

  for (const entry of Object.values(lb)) {
    const cur = statsByUser.get(entry.userId) ?? { games: 0, wins: 0, points: 0 };
    cur.games += entry.gamesPlayed;
    cur.wins += entry.wins;
    cur.points += entry.totalPoints;
    statsByUser.set(entry.userId, cur);
  }

  let filtered = allUsers;
  if (q) {
    filtered = allUsers.filter(
      (u) => u.username.includes(q) || u.displayName.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => b.createdAt - a.createdAt);
  const slice = filtered.slice(0, cap);

  const users: AdminUser[] = slice.map((u) => {
    const st = statsByUser.get(u.id);
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      createdAt: u.createdAt,
      gamesPlayed: st?.games ?? 0,
      wins: st?.wins ?? 0,
      totalPoints: st?.points ?? 0,
      activeSessions: 0,
      isAdmin: isAdminUsername(u.username),
    };
  });

  return { users, total: filtered.length };
}

export async function deleteAdminUser(
  userId: string,
  actingAdminUsername: string
): Promise<void> {
  if (useDatabase()) {
    const pool = getPool();
    const { rows } = await pool.query<{ username: string }>(
      `SELECT username FROM users WHERE id = $1`,
      [userId]
    );
    const target = rows[0];
    if (!target) throw new Error('User not found');
    if (normalizeUsername(target.username) === normalizeUsername(actingAdminUsername)) {
      throw new Error('You cannot delete your own account');
    }
    if (isAdminUsername(target.username)) {
      throw new Error('Cannot delete an admin account');
    }
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    return;
  }

  const raw = await fs.readFile(USERS_FILE, 'utf8').catch(() => null);
  if (!raw) throw new Error('User not found');
  const store = JSON.parse(raw) as {
    users: {
      id: string;
      username: string;
      displayName: string;
      createdAt: number;
      salt: string;
      passwordHash: string;
    }[];
  };
  const idx = store.users.findIndex((u) => u.id === userId);
  if (idx < 0) throw new Error('User not found');
  const target = store.users[idx];
  if (normalizeUsername(target.username) === normalizeUsername(actingAdminUsername)) {
    throw new Error('You cannot delete your own account');
  }
  if (isAdminUsername(target.username)) {
    throw new Error('Cannot delete an admin account');
  }

  store.users.splice(idx, 1);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(store, null, 2), 'utf8');

  try {
    const lbRaw = await fs.readFile(LEADERBOARD_FILE, 'utf8');
    const lb = JSON.parse(lbRaw) as { entries: Record<string, { userId: string }> };
    for (const [key, entry] of Object.entries(lb.entries ?? {})) {
      if (entry.userId === userId) delete lb.entries[key];
    }
    await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(lb, null, 2), 'utf8');
  } catch {
    /* no leaderboard file */
  }

  try {
    const grRaw = await fs.readFile(GAME_RESULTS_FILE, 'utf8');
    const gr = JSON.parse(grRaw) as { results: { userId: string }[] };
    gr.results = (gr.results ?? []).filter((r) => r.userId !== userId);
    await fs.writeFile(GAME_RESULTS_FILE, JSON.stringify(gr, null, 2), 'utf8');
  } catch {
    /* no game results file */
  }
}
