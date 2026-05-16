import crypto from 'crypto';
import type { PublicUser } from './authTypes.js';
import { getPool } from './db.js';

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  salt: string;
  created_at: string;
}

function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function rowToPublic(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    createdAt: Number(row.created_at),
  };
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function registerUserPostgres(
  username: string,
  password: string,
  displayName: string
): Promise<{ token: string; user: PublicUser }> {
  const u = normalizeUsername(username);
  if (u.length < 3) throw new Error('Username must be at least 3 characters');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  const salt = crypto.randomBytes(16).toString('hex');
  const id = crypto.randomUUID();
  const name = displayName.trim().slice(0, 16) || username.trim().slice(0, 16) || 'Player';
  const passwordHash = hashPassword(password, salt);
  const createdAt = Date.now();

  const pool = getPool();
  try {
    await pool.query(
      `INSERT INTO users (id, username, display_name, password_hash, salt, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, u, name, passwordHash, salt, createdAt]
    );
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && e.code === '23505') {
      throw new Error('Username already taken');
    }
    throw e;
  }

  const token = crypto.randomUUID();
  await pool.query(`INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, $3)`, [
    token,
    id,
    Date.now(),
  ]);

  return {
    token,
    user: { id, username: u, displayName: name, createdAt },
  };
}

export async function loginUserPostgres(
  username: string,
  password: string
): Promise<{ token: string; user: PublicUser }> {
  const u = normalizeUsername(username);
  const pool = getPool();
  const { rows } = await pool.query<UserRow>(
    `SELECT id, username, display_name, password_hash, salt, created_at
     FROM users WHERE username = $1`,
    [u]
  );
  const user = rows[0];
  if (!user || user.password_hash !== hashPassword(password, user.salt)) {
    throw new Error('Invalid username or password');
  }

  const token = crypto.randomUUID();
  await pool.query(`INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, $3)`, [
    token,
    user.id,
    Date.now(),
  ]);

  return { token, user: rowToPublic(user) };
}

export async function getUserByTokenPostgres(token: string | undefined): Promise<PublicUser | null> {
  if (!token) return null;
  const pool = getPool();
  const { rows } = await pool.query<UserRow>(
    `SELECT u.id, u.username, u.display_name, u.password_hash, u.salt, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1`,
    [token]
  );
  const user = rows[0];
  return user ? rowToPublic(user) : null;
}

export async function revokeTokenPostgres(token: string | undefined) {
  if (!token) return;
  await getPool().query(`DELETE FROM sessions WHERE token = $1`, [token]);
}
