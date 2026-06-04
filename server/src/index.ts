import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { createAdminRouter } from './adminRoutes.js';
import { authRouter } from './authRoutes.js';
import { leaderboardRouter } from './leaderboardRoutes.js';
import { attachRoomHandlers, GameRoom } from './gameRoom.js';
import { initDb, useDatabase } from './db.js';
import { applyLeaderboardEpochIfNeeded } from './leaderboardEpoch.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const rooms = new Map<string, GameRoom>();

attachRoomHandlers(io, rooms);

app.use('/api/auth', authRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/admin', createAdminRouter(rooms));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size, userStore: useDatabase() ? 'postgres' : 'file' });
});

const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Build client first: npm run build');
  });
});

async function start() {
  try {
    await initDb();
    const reset = await applyLeaderboardEpochIfNeeded();
    if (reset) {
      console.log('Leaderboard and match history cleared for new 3-minute scoring.');
    }
    if (useDatabase()) {
      console.log('User accounts: PostgreSQL');
    } else {
      console.log('User accounts: local JSON (server/data) — no DATABASE_URL');
    }
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }

  httpServer.listen(PORT, () => {
    console.log(`Pac-Man Battle Royale server on http://localhost:${PORT}`);
  });
}

void start();
