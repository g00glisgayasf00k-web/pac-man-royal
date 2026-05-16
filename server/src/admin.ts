import { normalizeUsername } from './authPostgres.js';

export function isAdminUsername(username: string): boolean {
  const raw = process.env.ADMIN_USERNAMES ?? '';
  const list = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length) return false;
  return list.includes(normalizeUsername(username));
}
