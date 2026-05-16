import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { authRouter } from './authRoutes.js';
import { leaderboardRouter } from './leaderboardRoutes.js';
import { attachRoomHandlers, GameRoom } from './gameRoom.js';
import { initDb, useDatabase } from './db.js';

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
    if (useDatabase()) {
      console.log('User accounts: PostgreSQL (persists across deploys)');
    } else {
      console.warn(
        'User accounts: local JSON only — set DATABASE_URL on Render or accounts reset each deploy'
      );
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
