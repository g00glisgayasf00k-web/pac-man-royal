import { Router, type Request, type Response, type NextFunction } from 'express';
import type { PublicUser } from './authTypes.js';
import { isAdminUsername } from './admin.js';
import { deleteAdminUser, listAdminUsers } from './adminUsers.js';
import { getUserByToken } from './auth.js';
import type { GameRoom } from './gameRoom.js';
import { getAdminLiveRooms } from './gameRoom.js';
import { resetLeaderboardData } from './leaderboard.js';
import { getAdminMetrics } from './metrics.js';

type AdminRequest = Request & { adminUser?: PublicUser };

export function createAdminRouter(rooms: Map<string, GameRoom>) {
  const router = Router();

  function bearerToken(req: { headers: { authorization?: string } }) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return undefined;
    return header.slice(7).trim();
  }

  async function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
    const user = await getUserByToken(bearerToken(req));
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!isAdminUsername(user.username)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    req.adminUser = user;
    next();
  }

  router.get('/check', async (req, res) => {
    const user = await getUserByToken(bearerToken(req));
    if (!user) {
      res.status(401).json({ ok: false, admin: false });
      return;
    }
    res.json({ ok: true, admin: isAdminUsername(user.username) });
  });

  router.get('/metrics', requireAdmin, async (_req, res) => {
    try {
      const metrics = await getAdminMetrics(rooms.size);
      res.json(metrics);
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load metrics' });
    }
  });

  router.get('/users', requireAdmin, async (req, res) => {
    try {
      const search = String(req.query.q ?? '');
      const limit = Number(req.query.limit ?? 100);
      const data = await listAdminUsers(search, limit);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load users' });
    }
  });

  router.get('/rooms', requireAdmin, (_req, res) => {
    res.json(getAdminLiveRooms(rooms));
  });

  router.post('/leaderboard/reset', requireAdmin, async (_req, res) => {
    try {
      await resetLeaderboardData();
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Reset failed' });
    }
  });

  router.delete('/users/:userId', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const userId = String(req.params.userId);
      await deleteAdminUser(userId, req.adminUser!.username);
      res.json({ ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      const status = msg === 'User not found' ? 404 : 400;
      res.status(status).json({ error: msg });
    }
  });

  return router;
}
