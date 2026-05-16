import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function useDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPool(): pg.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    const needsSsl =
      url.includes('render.com') ||
      url.includes('sslmode=require') ||
      process.env.DATABASE_SSL === 'true';
    pool = new Pool({
      connectionString: url,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export async function initDb(): Promise<void> {
  if (!useDatabase()) return;

  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at BIGINT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

      CREATE TABLE IF NOT EXISTS leaderboard_stats (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mode TEXT NOT NULL DEFAULT 'local',
        wins INT NOT NULL DEFAULT 0,
        total_points BIGINT NOT NULL DEFAULT 0,
        games_played INT NOT NULL DEFAULT 0,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, mode)
      );

      ALTER TABLE leaderboard_stats ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'local';
      ALTER TABLE leaderboard_stats DROP CONSTRAINT IF EXISTS leaderboard_stats_pkey;
      ALTER TABLE leaderboard_stats ADD PRIMARY KEY (user_id, mode);

      CREATE TABLE IF NOT EXISTS game_results (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        display_name TEXT NOT NULL,
        mode TEXT NOT NULL,
        score INT NOT NULL,
        won BOOLEAN NOT NULL,
        played_at BIGINT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS game_results_played_at_idx ON game_results(played_at DESC);
      CREATE INDEX IF NOT EXISTS game_results_mode_idx ON game_results(mode);
    `);
  } finally {
    client.release();
  }
}
