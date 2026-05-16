import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: number;
}

interface UserRecord extends PublicUser {
  passwordHash: string;
  salt: string;
}

interface UserStore {
  users: UserRecord[];
}

const sessions = new Map<string, string>();

let store: UserStore = { users: [] };
let loaded = false;

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadStore() {
  if (loaded) return;
  await ensureDataDir();
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8');
    store = JSON.parse(raw) as UserStore;
  } catch {
    store = { users: [] };
    await saveStore();
  }
  loaded = true;
}

async function saveStore() {
  await ensureDataDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function toPublic(user: UserRecord): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function registerUser(
  username: string,
  password: string,
  displayName: string
): Promise<{ token: string; user: PublicUser }> {
  await loadStore();
  const u = normalizeUsername(username);
  if (u.length < 3) throw new Error('Username must be at least 3 characters');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');
  if (store.users.some((x) => x.username === u)) throw new Error('Username already taken');

  const salt = crypto.randomBytes(16).toString('hex');
  const user: UserRecord = {
    id: crypto.randomUUID(),
    username: u,
    displayName: displayName.trim().slice(0, 16) || username.trim().slice(0, 16) || 'Player',
    createdAt: Date.now(),
    salt,
    passwordHash: hashPassword(password, salt),
  };
  store.users.push(user);
  await saveStore();

  const token = crypto.randomUUID();
  sessions.set(token, user.id);
  return { token, user: toPublic(user) };
}

export async function loginUser(
  username: string,
  password: string
): Promise<{ token: string; user: PublicUser }> {
  await loadStore();
  const u = normalizeUsername(username);
  const user = store.users.find((x) => x.username === u);
  if (!user || user.passwordHash !== hashPassword(password, user.salt)) {
    throw new Error('Invalid username or password');
  }
  const token = crypto.randomUUID();
  sessions.set(token, user.id);
  return { token, user: toPublic(user) };
}

export async function getUserByToken(token: string | undefined): Promise<PublicUser | null> {
  if (!token) return null;
  await loadStore();
  const userId = sessions.get(token);
  if (!userId) return null;
  const user = store.users.find((x) => x.id === userId);
  return user ? toPublic(user) : null;
}

export function revokeToken(token: string | undefined) {
  if (token) sessions.delete(token);
}
