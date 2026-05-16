import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { attachRoomHandlers, GameRoom } from './gameRoom.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const rooms = new Map<string, GameRoom>();

attachRoomHandlers(io, rooms);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Build client first: npm run build');
  });
});

httpServer.listen(PORT, () => {
  console.log(`Pac-Man Battle Royale server on http://localhost:${PORT}`);
});
