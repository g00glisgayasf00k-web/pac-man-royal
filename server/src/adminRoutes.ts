import { Router } from 'express';
import { isAdminUsername } from './admin.js';
import { getUserByToken } from './auth.js';
import { getAdminMetrics } from './metrics.js';

export function createAdminRouter(getLiveRooms: () => number) {
  const router = Router();

  function bearerToken(req: { headers: { authorization?: string } }) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return undefined;
    return header.slice(7).trim();
  }

  router.get('/metrics', async (req, res) => {
    const user = await getUserByToken(bearerToken(req));
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!isAdminUsername(user.username)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    try {
      const metrics = await getAdminMetrics(getLiveRooms());
      res.json(metrics);
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load metrics' });
    }
  });

  router.get('/check', async (req, res) => {
    const user = await getUserByToken(bearerToken(req));
    if (!user) {
      res.status(401).json({ ok: false, admin: false });
      return;
    }
    res.json({ ok: true, admin: isAdminUsername(user.username) });
  });

  return router;
}
