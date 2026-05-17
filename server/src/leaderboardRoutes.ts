import { Router } from 'express';
import type { LeaderboardMode } from '../../shared/leaderboardTypes.js';
import { getUserByToken } from './auth.js';
import { getLeaderboard, getYourLeaderboardStats, recordGameResult } from './leaderboard.js';

export const leaderboardRouter = Router();

function bearerToken(req: { headers: { authorization?: string } }) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice(7).trim();
}

function parseMode(value: unknown): LeaderboardMode {
  return value === 'online' ? 'online' : 'local';
}

leaderboardRouter.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const mode = parseMode(req.query.mode);
    const entries = await getLeaderboard(mode, limit);
    let you = null;
    const user = await getUserByToken(bearerToken(req));
    if (user) {
      you = await getYourLeaderboardStats(user.id, mode);
    }
    res.json({ entries, you });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Could not load leaderboard' });
  }
});

leaderboardRouter.post('/record', async (req, res) => {
  try {
    const { score, won, mode } = req.body ?? {};
    const result = await recordGameResult(
      bearerToken(req),
      Number(score) || 0,
      Boolean(won),
      parseMode(mode)
    );
    res.json({ ok: true, bestScore: result.bestScore });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not record result';
    const status = msg === 'Not authenticated' ? 401 : 400;
    res.status(status).json({ error: msg });
  }
});
