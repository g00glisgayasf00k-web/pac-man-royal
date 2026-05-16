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
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        wins INT NOT NULL DEFAULT 0,
        total_points BIGINT NOT NULL DEFAULT 0,
        games_played INT NOT NULL DEFAULT 0,
        updated_at BIGINT NOT NULL
      );
    `);
  } finally {
    client.release();
  }
}
