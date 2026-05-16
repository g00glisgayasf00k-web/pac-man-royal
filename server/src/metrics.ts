import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AdminMetrics, AdminRecentGame } from '../../shared/adminTypes.js';
import type { LeaderboardMode } from '../../shared/leaderboardTypes.js';
import { useDatabase, getPool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const GAME_RESULTS_FILE = path.join(DATA_DIR, 'game_results.json');
const MAX_FILE_LOG = 5000;

interface GameResultRow {
  userId: string;
  username: string;
  displayName: string;
  mode: LeaderboardMode;
  score: number;
  won: boolean;
  playedAt: number;
}

interface GameResultStore {
  results: GameResultRow[];
}

let fileResults: GameResultStore = { results: [] };
let fileResultsLoaded = false;

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setUTCDate(x.getUTCDate() - i);
    days.push(x.toISOString().slice(0, 10));
  }
  return days;
}

async function loadFileResults() {
  if (fileResultsLoaded) return;
  try {
    const raw = await fs.readFile(GAME_RESULTS_FILE, 'utf8');
    fileResults = JSON.parse(raw) as GameResultStore;
  } catch {
    fileResults = { results: [] };
  }
  fileResultsLoaded = true;
}

async function saveFileResults() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  if (fileResults.results.length > MAX_FILE_LOG) {
    fileResults.results = fileResults.results.slice(-MAX_FILE_LOG);
  }
  await fs.writeFile(GAME_RESULTS_FILE, JSON.stringify(fileResults, null, 2), 'utf8');
}

export async function logGameResult(
  userId: string,
  username: string,
  displayName: string,
  score: number,
  won: boolean,
  mode: LeaderboardMode
): Promise<void> {
  const row: GameResultRow = {
    userId,
    username,
    displayName,
    mode,
    score: Math.max(0, Math.floor(score)),
    won,
    playedAt: Date.now(),
  };

  if (useDatabase()) {
    await getPool().query(
      `INSERT INTO game_results (user_id, username, display_name, mode, score, won, played_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, username, displayName, mode, row.score, won, row.playedAt]
    );
    return;
  }

  await loadFileResults();
  fileResults.results.push(row);
  await saveFileResults();
}

export async function getAdminMetrics(liveRooms: number): Promise<AdminMetrics> {
  const generatedAt = Date.now();
  const days = lastNDays(7);

  if (useDatabase()) {
    return getAdminMetricsPostgres(liveRooms, generatedAt, days);
  }
  return getAdminMetricsFile(liveRooms, generatedAt, days);
}

async function getAdminMetricsPostgres(
  liveRooms: number,
  generatedAt: number,
  days: string[]
): Promise<AdminMetrics> {
  const pool = getPool();

  const { rows: userCount } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users`
  );
  const { rows: sessionCount } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM sessions`
  );

  const { rows: modeRows } = await pool.query<{
    mode: LeaderboardMode;
    players: string;
    games_played: string;
    wins: string;
    total_points: string;
  }>(
    `SELECT mode,
            COUNT(DISTINCT user_id)::text AS players,
            COALESCE(SUM(games_played), 0)::text AS games_played,
            COALESCE(SUM(wins), 0)::text AS wins,
            COALESCE(SUM(total_points), 0)::text AS total_points
     FROM leaderboard_stats
     GROUP BY mode`
  );

  const { rows: signupRows } = await pool.query<{ day: string; count: string }>(
    `SELECT to_char(to_timestamp(created_at / 1000.0), 'YYYY-MM-DD') AS day,
            COUNT(*)::text AS count
     FROM users
     WHERE created_at >= $1
     GROUP BY day
     ORDER BY day`,
    [(Date.now() - 7 * 24 * 60 * 60 * 1000)]
  );

  const { rows: gameDayRows } = await pool.query<{
    day: string;
    mode: LeaderboardMode;
    count: string;
  }>(
    `SELECT to_char(to_timestamp(played_at / 1000.0), 'YYYY-MM-DD') AS day,
            mode,
            COUNT(*)::text AS count
     FROM game_results
     WHERE played_at >= $1
     GROUP BY day, mode
     ORDER BY day`,
    [(Date.now() - 7 * 24 * 60 * 60 * 1000)]
  );

  const { rows: topRows } = await pool.query<{
    username: string;
    display_name: string;
    games_played: string;
    wins: string;
    total_points: string;
  }>(
    `SELECT u.username, u.display_name,
            COALESCE(SUM(s.games_played), 0)::text AS games_played,
            COALESCE(SUM(s.wins), 0)::text AS wins,
            COALESCE(SUM(s.total_points), 0)::text AS total_points
     FROM users u
     LEFT JOIN leaderboard_stats s ON s.user_id = u.id
     GROUP BY u.id, u.username, u.display_name
     HAVING COALESCE(SUM(s.games_played), 0) > 0
     ORDER BY COALESCE(SUM(s.wins), 0) DESC, COALESCE(SUM(s.total_points), 0) DESC
     LIMIT 10`
  );

  const { rows: recentRows } = await pool.query<{
    played_at: string;
    username: string;
    display_name: string;
    mode: LeaderboardMode;
    score: number;
    won: boolean;
  }>(
    `SELECT played_at, username, display_name, mode, score, won
     FROM game_results
     ORDER BY played_at DESC
     LIMIT 25`
  );

  const { rows: gameTotals } = await pool.query<{
    total_games: string;
    total_wins: string;
    avg_score: string;
  }>(
    `SELECT COUNT(*)::text AS total_games,
            COALESCE(SUM(CASE WHEN won THEN 1 ELSE 0 END), 0)::text AS total_wins,
            COALESCE(AVG(score), 0)::text AS avg_score
     FROM game_results`
  );

  const signupMap = new Map(signupRows.map((r) => [r.day, Number(r.count)]));
  const gameDayMap = new Map<string, { local: number; online: number }>();
  for (const r of gameDayRows) {
    const entry = gameDayMap.get(r.day) ?? { local: 0, online: 0 };
    if (r.mode === 'online') entry.online = Number(r.count);
    else entry.local = Number(r.count);
    gameDayMap.set(r.day, entry);
  }

  const byMode = (['local', 'online'] as LeaderboardMode[]).map((mode) => {
    const row = modeRows.find((r) => r.mode === mode);
    return {
      mode,
      players: row ? Number(row.players) : 0,
      gamesPlayed: row ? Number(row.games_played) : 0,
      wins: row ? Number(row.wins) : 0,
      totalPoints: row ? Number(row.total_points) : 0,
    };
  });

  const totalGames = Number(gameTotals[0]?.total_games ?? 0);
  const totalWins = Number(gameTotals[0]?.total_wins ?? 0);

  return {
    generatedAt,
    storage: 'postgres',
    liveRooms,
    overview: {
      totalUsers: Number(userCount[0]?.count ?? 0),
      totalGames,
      totalWins,
      averageScore: Math.round(Number(gameTotals[0]?.avg_score ?? 0)),
      activeSessions: Number(sessionCount[0]?.count ?? 0),
    },
    byMode,
    signupsByDay: days.map((date) => ({ date, count: signupMap.get(date) ?? 0 })),
    gamesByDay: days.map((date) => ({
      date,
      local: gameDayMap.get(date)?.local ?? 0,
      online: gameDayMap.get(date)?.online ?? 0,
    })),
    topPlayers: topRows.map((r) => ({
      username: r.username,
      displayName: r.display_name,
      gamesPlayed: Number(r.games_played),
      wins: Number(r.wins),
      totalPoints: Number(r.total_points),
    })),
    recentGames: recentRows.map((r) => ({
      playedAt: Number(r.played_at),
      username: r.username,
      displayName: r.display_name,
      mode: r.mode,
      score: r.score,
      won: r.won,
    })),
  };
}

async function getAdminMetricsFile(
  liveRooms: number,
  generatedAt: number,
  days: string[]
): Promise<AdminMetrics> {
  const { loadStoreUsers } = await import('./metricsFileHelpers.js');
  const users = await loadStoreUsers();
  await loadFileResults();

  const results = fileResults.results;
  const totalGames = results.length;
  const totalWins = results.filter((r) => r.won).length;
  const averageScore =
    totalGames > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / totalGames) : 0;

  const signupMap = new Map<string, number>();
  for (const u of users) {
    const d = dayKey(u.createdAt);
    if (days.includes(d)) signupMap.set(d, (signupMap.get(d) ?? 0) + 1);
  }

  const gameDayMap = new Map<string, { local: number; online: number }>();
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const r of results) {
    if (r.playedAt < cutoff) continue;
    const d = dayKey(r.playedAt);
    const entry = gameDayMap.get(d) ?? { local: 0, online: 0 };
    if (r.mode === 'online') entry.online++;
    else entry.local++;
    gameDayMap.set(d, entry);
  }

  const playerMap = new Map<string, AdminRecentGame & { games: number; wins: number; points: number }>();
  for (const r of results) {
    const key = r.userId;
    const cur = playerMap.get(key) ?? {
      playedAt: r.playedAt,
      username: r.username,
      displayName: r.displayName,
      mode: r.mode,
      score: r.score,
      won: r.won,
      games: 0,
      wins: 0,
      points: 0,
    };
    cur.games++;
    if (r.won) cur.wins++;
    cur.points += r.score;
    playerMap.set(key, cur);
  }

  const { loadFileLeaderboard } = await import('./metricsFileHelpers.js');
  const lb = await loadFileLeaderboard();

  const byMode = (['local', 'online'] as LeaderboardMode[]).map((mode) => {
    const rows = Object.values(lb).filter((e) => e.mode === mode);
    return {
      mode,
      players: rows.length,
      gamesPlayed: rows.reduce((s, r) => s + r.gamesPlayed, 0),
      wins: rows.reduce((s, r) => s + r.wins, 0),
      totalPoints: rows.reduce((s, r) => s + r.totalPoints, 0),
    };
  });

  const topPlayers = [...playerMap.values()]
    .map((p) => ({
      username: p.username,
      displayName: p.displayName,
      gamesPlayed: p.games,
      wins: p.wins,
      totalPoints: p.points,
    }))
    .sort((a, b) => b.wins - a.wins || b.totalPoints - a.totalPoints)
    .slice(0, 10);

  const recentGames: AdminRecentGame[] = [...results]
    .sort((a, b) => b.playedAt - a.playedAt)
    .slice(0, 25)
    .map((r) => ({
      playedAt: r.playedAt,
      username: r.username,
      displayName: r.displayName,
      mode: r.mode,
      score: r.score,
      won: r.won,
    }));

  return {
    generatedAt,
    storage: 'file',
    liveRooms,
    overview: {
      totalUsers: users.length,
      totalGames,
      totalWins,
      averageScore,
      activeSessions: 0,
    },
    byMode,
    signupsByDay: days.map((date) => ({ date, count: signupMap.get(date) ?? 0 })),
    gamesByDay: days.map((date) => ({
      date,
      local: gameDayMap.get(date)?.local ?? 0,
      online: gameDayMap.get(date)?.online ?? 0,
    })),
    topPlayers,
    recentGames,
  };
}
