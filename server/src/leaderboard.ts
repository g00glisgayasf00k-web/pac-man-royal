import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { LeaderboardEntry, LeaderboardMode } from '../../shared/leaderboardTypes.js';
import { getUserByToken } from './auth.js';
import { useDatabase, getPool } from './db.js';
import { logGameResult, resetGameResults } from './metrics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

interface StatsRecord {
  userId: string;
  mode: LeaderboardMode;
  username: string;
  displayName: string;
  wins: number;
  bestScore: number;
  totalPoints: number;
  gamesPlayed: number;
  updatedAt: number;
}

interface LeaderboardStore {
  entries: Record<string, StatsRecord>;
}

let store: LeaderboardStore = { entries: {} };
let fileLoaded = false;

function storeKey(userId: string, mode: LeaderboardMode) {
  return `${userId}:${mode}`;
}

function normalizeMode(mode: unknown): LeaderboardMode {
  return mode === 'online' ? 'online' : 'local';
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadFileStore() {
  if (fileLoaded) return;
  await ensureDataDir();
  try {
    const raw = await fs.readFile(LEADERBOARD_FILE, 'utf8');
    const parsed = JSON.parse(raw) as LeaderboardStore;
    store = { entries: {} };
    for (const [key, row] of Object.entries(parsed.entries ?? {})) {
      const normalized: StatsRecord = {
        ...row,
        mode: row.mode ?? 'local',
        bestScore: row.bestScore ?? 0,
      };
      store.entries[storeKey(normalized.userId, normalized.mode)] = normalized;
    }
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
    .filter((row) => row.bestScore > 0 || row.gamesPlayed > 0)
    .sort((a, b) => b.bestScore - a.bestScore || b.wins - a.wins)
    .slice(0, 50)
    .map((row, i) => ({
      rank: i + 1,
      username: row.username,
      displayName: row.displayName,
      wins: row.wins,
      bestScore: row.bestScore,
      gamesPlayed: row.gamesPlayed,
    }));
}

/** Clear all wins/points and per-game history (scores from old 1000-pt rules, etc.) */
export async function resetLeaderboardData(): Promise<void> {
  if (useDatabase()) {
    await getPool().query('DELETE FROM leaderboard_stats');
    await resetGameResults();
    return;
  }

  store = { entries: {} };
  fileLoaded = true;
  await saveFileStore();
  await resetGameResults();
}

export async function getYourLeaderboardStats(
  userId: string,
  mode: LeaderboardMode
): Promise<{ bestScore: number; wins: number; gamesPlayed: number } | null> {
  if (useDatabase()) {
    const { rows } = await getPool().query<{
      best_score: number;
      wins: number;
      games_played: number;
    }>(
      `SELECT best_score, wins, games_played
       FROM leaderboard_stats
       WHERE user_id = $1 AND mode = $2`,
      [userId, mode]
    );
    const row = rows[0];
    if (!row) return null;
    return {
      bestScore: row.best_score,
      wins: row.wins,
      gamesPlayed: row.games_played,
    };
  }

  await loadFileStore();
  const entry = store.entries[storeKey(userId, mode)];
  if (!entry) return null;
  return {
    bestScore: entry.bestScore,
    wins: entry.wins,
    gamesPlayed: entry.gamesPlayed,
  };
}

export async function getLeaderboard(
  mode: LeaderboardMode,
  limit = 10
): Promise<LeaderboardEntry[]> {
  const cap = Math.min(50, Math.max(1, limit));

  if (useDatabase()) {
    const { rows } = await getPool().query<{
      username: string;
      display_name: string;
      wins: number;
      best_score: number;
      total_points: string;
      games_played: number;
    }>(
      `SELECT u.username, u.display_name, s.wins, s.best_score, s.total_points, s.games_played
       FROM leaderboard_stats s
       JOIN users u ON u.id = s.user_id
       WHERE s.mode = $1
       ORDER BY s.best_score DESC, s.wins DESC
       LIMIT $2`,
      [mode, cap]
    );
    return rows.map((row, i) => ({
      rank: i + 1,
      username: row.username,
      displayName: row.display_name,
      wins: row.wins,
      bestScore: row.best_score,
      gamesPlayed: row.games_played,
    }));
  }

  await loadFileStore();
  const rows = Object.values(store.entries).filter((e) => e.mode === mode);
  return toEntries(rows).slice(0, cap);
}

export async function recordGameResult(
  token: string | undefined,
  score: number,
  won: boolean,
  mode: LeaderboardMode
): Promise<{ bestScore: number }> {
  const user = await getUserByToken(token);
  if (!user) throw new Error('Not authenticated');
  return recordGameResultForUser(user.id, user.username, user.displayName, score, won, mode);
}

export async function recordGameResultForUser(
  userId: string,
  username: string,
  displayName: string,
  score: number,
  won: boolean,
  mode: LeaderboardMode
): Promise<{ bestScore: number }> {
  const pts = Math.max(0, Math.floor(score));
  const now = Date.now();
  const gameMode = normalizeMode(mode);

  if (useDatabase()) {
    await getPool().query(
      `INSERT INTO leaderboard_stats (user_id, mode, wins, best_score, total_points, games_played, updated_at)
       VALUES ($1, $2, $3, $4, $4, 1, $5)
       ON CONFLICT (user_id, mode) DO UPDATE SET
         wins = leaderboard_stats.wins + EXCLUDED.wins,
         best_score = GREATEST(leaderboard_stats.best_score, EXCLUDED.best_score),
         total_points = leaderboard_stats.total_points + EXCLUDED.total_points,
         games_played = leaderboard_stats.games_played + 1,
         updated_at = EXCLUDED.updated_at`,
      [userId, gameMode, won ? 1 : 0, pts, now]
    );
    await logGameResult(userId, username, displayName, pts, won, gameMode);
    const { rows } = await getPool().query<{ best_score: number }>(
      `SELECT best_score FROM leaderboard_stats WHERE user_id = $1 AND mode = $2`,
      [userId, gameMode]
    );
    return { bestScore: rows[0]?.best_score ?? pts };
  }

  await loadFileStore();
  const key = storeKey(userId, gameMode);
  const existing = store.entries[key];
  const prevBest = existing?.bestScore ?? 0;
  const bestScore = Math.max(prevBest, pts);
  store.entries[key] = {
    userId,
    mode: gameMode,
    username,
    displayName,
    wins: (existing?.wins ?? 0) + (won ? 1 : 0),
    bestScore,
    totalPoints: (existing?.totalPoints ?? 0) + pts,
    gamesPlayed: (existing?.gamesPlayed ?? 0) + 1,
    updatedAt: now,
  };
  await saveFileStore();
  await logGameResult(userId, username, displayName, pts, won, gameMode);
  return { bestScore };
}
