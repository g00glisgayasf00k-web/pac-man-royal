import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { LeaderboardEntry } from '../../shared/leaderboardTypes.js';
import { getUserByToken } from './auth.js';
import { useDatabase, getPool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

interface StatsRecord {
  userId: string;
  username: string;
  displayName: string;
  wins: number;
  totalPoints: number;
  gamesPlayed: number;
  updatedAt: number;
}

interface LeaderboardStore {
  entries: Record<string, StatsRecord>;
}

let store: LeaderboardStore = { entries: {} };
let fileLoaded = false;

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadFileStore() {
  if (fileLoaded) return;
  await ensureDataDir();
  try {
    const raw = await fs.readFile(LEADERBOARD_FILE, 'utf8');
    store = JSON.parse(raw) as LeaderboardStore;
  } catch {
    store = { entries: {} };
    await saveFileStore();
  }
  fileLoaded = true;
}

async function saveFileStore() {
  await ensureDataDir();
  await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function toEntries(rows: StatsRecord[]): LeaderboardEntry[] {
  return rows
    .sort((a, b) => b.wins - a.wins || b.totalPoints - a.totalPoints)
    .slice(0, 50)
    .map((row, i) => ({
      rank: i + 1,
      username: row.username,
      displayName: row.displayName,
      wins: row.wins,
      totalPoints: row.totalPoints,
      gamesPlayed: row.gamesPlayed,
    }));
}

export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const cap = Math.min(50, Math.max(1, limit));

  if (useDatabase()) {
    const { rows } = await getPool().query<{
      username: string;
      display_name: string;
      wins: number;
      total_points: string;
      games_played: number;
    }>(
      `SELECT u.username, u.display_name, s.wins, s.total_points, s.games_played
       FROM leaderboard_stats s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.wins DESC, s.total_points DESC
       LIMIT $1`,
      [cap]
    );
    return rows.map((row, i) => ({
      rank: i + 1,
      username: row.username,
      displayName: row.display_name,
      wins: row.wins,
      totalPoints: Number(row.total_points),
      gamesPlayed: row.games_played,
    }));
  }

  await loadFileStore();
  return toEntries(Object.values(store.entries)).slice(0, cap);
}

export async function recordGameResult(
  token: string | undefined,
  score: number,
  won: boolean
): Promise<void> {
  const user = await getUserByToken(token);
  if (!user) throw new Error('Not authenticated');

  const pts = Math.max(0, Math.floor(score));
  const now = Date.now();

  if (useDatabase()) {
    const pool = getPool();
    await pool.query(
      `INSERT INTO leaderboard_stats (user_id, wins, total_points, games_played, updated_at)
       VALUES ($1, $2, $3, 1, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         wins = leaderboard_stats.wins + EXCLUDED.wins,
         total_points = leaderboard_stats.total_points + EXCLUDED.total_points,
         games_played = leaderboard_stats.games_played + 1,
         updated_at = EXCLUDED.updated_at`,
      [user.id, won ? 1 : 0, pts, now]
    );
    return;
  }

  await loadFileStore();
  const existing = store.entries[user.id];
  const next: StatsRecord = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    wins: (existing?.wins ?? 0) + (won ? 1 : 0),
    totalPoints: (existing?.totalPoints ?? 0) + pts,
    gamesPlayed: (existing?.gamesPlayed ?? 0) + 1,
    updatedAt: now,
  };
  store.entries[user.id] = next;
  await saveFileStore();
}

export async function recordGameResultForUser(
  userId: string,
  username: string,
  displayName: string,
  score: number,
  won: boolean
): Promise<void> {
  const pts = Math.max(0, Math.floor(score));
  const now = Date.now();

  if (useDatabase()) {
    await getPool().query(
      `INSERT INTO leaderboard_stats (user_id, wins, total_points, games_played, updated_at)
       VALUES ($1, $2, $3, 1, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         wins = leaderboard_stats.wins + EXCLUDED.wins,
         total_points = leaderboard_stats.total_points + EXCLUDED.total_points,
         games_played = leaderboard_stats.games_played + 1,
         updated_at = EXCLUDED.updated_at`,
      [userId, won ? 1 : 0, pts, now]
    );
    return;
  }

  await loadFileStore();
  const existing = store.entries[userId];
  store.entries[userId] = {
    userId,
    username,
    displayName,
    wins: (existing?.wins ?? 0) + (won ? 1 : 0),
    totalPoints: (existing?.totalPoints ?? 0) + pts,
    gamesPlayed: (existing?.gamesPlayed ?? 0) + 1,
    updatedAt: now,
  };
  await saveFileStore();
}
