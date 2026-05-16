import { Router } from 'express';
import { getUserByToken, loginUser, registerUser, revokeToken } from './auth.js';

export const authRouter = Router();

function bearerToken(req: { headers: { authorization?: string } }) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice(7).trim();
}

authRouter.post('/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body ?? {};
    const result = await registerUser(String(username ?? ''), String(password ?? ''), String(displayName ?? ''));
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Registration failed' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    const result = await loginUser(String(username ?? ''), String(password ?? ''));
    res.json(result);
  } catch (e) {
    res.status(401).json({ error: e instanceof Error ? e.message : 'Login failed' });
  }
});

authRouter.get('/me', async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({ user });
});

authRouter.post('/logout', (req, res) => {
  revokeToken(bearerToken(req));
  res.json({ ok: true });
});
