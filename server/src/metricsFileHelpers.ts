import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { LeaderboardMode } from '../../shared/leaderboardTypes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

export interface FileUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: number;
}

interface FileLeaderboardEntry {
  userId: string;
  mode?: LeaderboardMode;
  username: string;
  displayName: string;
  wins: number;
  totalPoints: number;
  gamesPlayed: number;
}

export async function loadStoreUsers(): Promise<FileUser[]> {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as { users: FileUser[] };
    return parsed.users ?? [];
  } catch {
    return [];
  }
}

export async function loadFileLeaderboard(): Promise<Record<string, FileLeaderboardEntry>> {
  try {
    const raw = await fs.readFile(LEADERBOARD_FILE, 'utf8');
    const parsed = JSON.parse(raw) as { entries: Record<string, FileLeaderboardEntry> };
    return parsed.entries ?? {};
  } catch {
    return {};
  }
}
