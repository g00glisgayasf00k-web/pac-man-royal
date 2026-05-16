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
    .sort(
      (a, b) =>
        b.wins - a.wins || b.bestScore - a.bestScore || b.totalPoints - a.totalPoints
    )
    .slice(0, 50)
    .map((row, i) => ({
      rank: i + 1,
      username: row.username,
      displayName: row.displayName,
      wins: row.wins,
      bestScore: row.bestScore,
      totalPoints: row.totalPoints,
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
       ORDER BY s.wins DESC, s.best_score DESC, s.total_points DESC
       LIMIT $2`,
      [mode, cap]
    );
    return rows.map((row, i) => ({
      rank: i + 1,
      username: row.username,
      displayName: row.display_name,
      wins: row.wins,
      bestScore: row.best_score,
      totalPoints: Number(row.total_points),
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
): Promise<void> {
  const user = await getUserByToken(token);
  if (!user) throw new Error('Not authenticated');
  await recordGameResultForUser(user.id, user.username, user.displayName, score, won, mode);
}

export async function recordGameResultForUser(
  userId: string,
  username: string,
  displayName: string,
  score: number,
  won: boolean,
  mode: LeaderboardMode
): Promise<void> {
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
    return;
  }

  await loadFileStore();
  const key = storeKey(userId, gameMode);
  const existing = store.entries[key];
  const prevBest = existing?.bestScore ?? 0;
  store.entries[key] = {
    userId,
    mode: gameMode,
    username,
    displayName,
    wins: (existing?.wins ?? 0) + (won ? 1 : 0),
    bestScore: Math.max(prevBest, pts),
    totalPoints: (existing?.totalPoints ?? 0) + pts,
    gamesPlayed: (existing?.gamesPlayed ?? 0) + 1,
    updatedAt: now,
  };
  await saveFileStore();
  await logGameResult(userId, username, displayName, pts, won, gameMode);
}
