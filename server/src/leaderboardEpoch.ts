import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { resetLeaderboardData } from './leaderboard.js';
import { getPool, useDatabase } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const EPOCH_MARKER_FILE = path.join(DATA_DIR, 'leaderboard_epoch.txt');

/** Bump when leaderboard data should be wiped (e.g. match format change) */
export const LEADERBOARD_EPOCH = 'match-timer-v1';

const META_KEY = 'leaderboard_epoch';

async function getStoredEpoch(): Promise<string | null> {
  if (useDatabase()) {
    const { rows } = await getPool().query<{ value: string }>(
      'SELECT value FROM app_meta WHERE key = $1',
      [META_KEY]
    );
    return rows[0]?.value ?? null;
  }
  try {
    return (await fs.readFile(EPOCH_MARKER_FILE, 'utf8')).trim() || null;
  } catch {
    return null;
  }
}

async function setStoredEpoch(epoch: string): Promise<void> {
  if (useDatabase()) {
    await getPool().query(
      `INSERT INTO app_meta (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [META_KEY, epoch]
    );
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(EPOCH_MARKER_FILE, epoch, 'utf8');
}

/** One-time reset per epoch — clears stale scores after rule changes */
export async function applyLeaderboardEpochIfNeeded(): Promise<boolean> {
  const stored = await getStoredEpoch();
  if (stored === LEADERBOARD_EPOCH) return false;

  await resetLeaderboardData();
  await setStoredEpoch(LEADERBOARD_EPOCH);
  console.log(`Leaderboard reset for epoch "${LEADERBOARD_EPOCH}" (was: ${stored ?? 'none'})`);
  return true;
}
