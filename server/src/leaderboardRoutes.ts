import { Router } from 'express';
import { getLeaderboard, recordGameResult } from './leaderboard.js';

export const leaderboardRouter = Router();

function bearerToken(req: { headers: { authorization?: string } }) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice(7).trim();
}

leaderboardRouter.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const entries = await getLeaderboard(limit);
    res.json({ entries });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Could not load leaderboard' });
  }
});

leaderboardRouter.post('/record', async (req, res) => {
  try {
    const { score, won } = req.body ?? {};
    await recordGameResult(bearerToken(req), Number(score) || 0, Boolean(won));
    res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not record result';
    const status = msg === 'Not authenticated' ? 401 : 400;
    res.status(status).json({ error: msg });
  }
});
