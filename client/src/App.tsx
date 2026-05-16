import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Direction,
  GameMode,
  GameSnapshot,
  OnlineLobbySnapshot,
  WIN_SCORE,
} from '../../shared/gameTypes';
import { GameEngine } from '../../shared/gameEngine';
import { GameCanvas } from './components/GameCanvas';
import { Lobby } from './components/Lobby';
import { OnlineWaiting } from './components/OnlineWaiting';
import { MobileControls } from './components/MobileControls';
import { Scoreboard } from './components/Scoreboard';
import { useKeyboardInput } from './hooks/useInput';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

type Screen = 'lobby' | 'game' | 'win';

export default function App() {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [mode, setMode] = useState<GameMode>('local');
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [onlineLobby, setOnlineLobby] = useState<OnlineLobbySnapshot | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [playerSlot, setPlayerSlot] = useState(0);
  const [roomCode, setRoomCode] = useState('');
  const [onlineStatus, setOnlineStatus] = useState('');
  const [onlineError, setOnlineError] = useState('');
  const engineRef = useRef<GameEngine | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const rafRef = useRef(0);
  const lastRef = useRef(performance.now());

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const startLocalLoop = useCallback(() => {
    stopLoop();
    const loop = (now: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;
      engine.step(dt);
      const snap = engine.getSnapshot();
      setSnapshot(snap);
      if (snap.status === 'ended') {
        setScreen('win');
        stopLoop();
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
  }, [stopLoop]);

  const startGame = useCallback(
    (gameMode: GameMode, name: string) => {
      setMode(gameMode);
      setOnlineError('');

      if (gameMode === 'online') {
        const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('lobby-update', (lobby: OnlineLobbySnapshot) => {
          setOnlineLobby(lobby);
          const humans = lobby.players.filter((p) => !p.isAI).length;
          setOnlineStatus(`${humans}/${lobby.maxPlayers} players`);
        });

        socket.on('game-state', (snap: GameSnapshot) => {
          setSnapshot(snap);
          setOnlineLobby(null);
          if (snap.status === 'ended') setScreen('win');
        });

        socket.emit('quick-join', { name }, (res: {
          ok: boolean;
          code?: string;
          playerId?: string;
          slot?: number;
          lobby?: OnlineLobbySnapshot;
          error?: string;
        }) => {
          if (!res.ok) {
            setOnlineError(res.error ?? 'Could not join');
            socket.disconnect();
            return;
          }
          setPlayerId(res.playerId!);
          setPlayerSlot(res.slot!);
          setRoomCode(res.code!);
          if (res.lobby) setOnlineLobby(res.lobby);
          const humans = res.lobby?.players.filter((p) => !p.isAI).length ?? 1;
          setOnlineStatus(`${humans}/${res.lobby?.maxPlayers ?? 5} players`);
          setScreen('game');
        });

        return;
      }

      const configs = [
        { id: 'p0', name, slot: 0, isAI: false },
        { id: 'g1', name: 'Red AI', slot: 1, isAI: true },
        { id: 'g2', name: 'Pink AI', slot: 2, isAI: true },
        { id: 'g3', name: 'Cyan AI', slot: 3, isAI: true },
        { id: 'g4', name: 'Orange AI', slot: 4, isAI: true },
      ];

      setPlayerId(configs[0].id);
      setPlayerSlot(0);
      engineRef.current = new GameEngine(configs);
      setSnapshot(engineRef.current.getSnapshot());
      setScreen('game');
      startLocalLoop();
    },
    [startLocalLoop]
  );

  const sendInput = useCallback(
    (dir: Direction) => {
      if (mode === 'online' && socketRef.current && roomCode && snapshot) {
        socketRef.current.emit('input', {
          code: roomCode,
          playerId,
          direction: dir,
        });
        return;
      }
      engineRef.current?.setInput(playerId, dir);
    },
    [mode, playerId, roomCode, snapshot]
  );

  useKeyboardInput(screen !== 'lobby' && !!snapshot, playerSlot, sendInput);

  useEffect(() => {
    const lock = screen === 'game';
    document.documentElement.classList.toggle('game-locked', lock);
    document.body.classList.toggle('game-locked', lock);
    return () => {
      document.documentElement.classList.remove('game-locked');
      document.body.classList.remove('game-locked');
    };
  }, [screen]);

  useEffect(() => {
    return () => {
      stopLoop();
      socketRef.current?.disconnect();
    };
  }, [stopLoop]);

  const backToLobby = () => {
    stopLoop();
    socketRef.current?.disconnect();
    socketRef.current = null;
    engineRef.current = null;
    setSnapshot(null);
    setOnlineLobby(null);
    setRoomCode('');
    setOnlineStatus('');
    setOnlineError('');
    setScreen('lobby');
  };

  if (screen === 'lobby') {
    return (
      <>
        {onlineError && (
          <p className="online-error" style={{ textAlign: 'center', color: '#f87171' }}>
            {onlineError}
          </p>
        )}
        <Lobby onStart={startGame} />
      </>
    );
  }

  const waitingOnline = mode === 'online' && onlineLobby && !snapshot;
  const controlsEnabled = screen === 'game' && !!snapshot && !waitingOnline;

  return (
    <div className="app game-screen">
      <header className="top-bar">
        <button type="button" className="btn-ghost" onClick={backToLobby}>
          ← Menu
        </button>
        <h1>Pac-Man Battle Royale</h1>
        {onlineStatus && <span className="room-tag">{onlineStatus}</span>}
      </header>

      <main className="play-area">
        {waitingOnline ? (
          <OnlineWaiting lobby={onlineLobby} />
        ) : (
          <>
            <GameCanvas snapshot={snapshot} />
            <Scoreboard snapshot={snapshot} highlightId={playerId} />
          </>
        )}
      </main>

      {screen === 'win' && snapshot?.winnerName && (
        <div className="overlay win-overlay">
          <div className="win-card">
            <h2>{snapshot.winnerName} wins!</h2>
            <p>Reached {WIN_SCORE} points</p>
            <button type="button" className="btn-primary" onClick={backToLobby}>
              Play again
            </button>
          </div>
        </div>
      )}

      <MobileControls enabled={controlsEnabled} onDirection={sendInput} />

      {!waitingOnline && (
        <footer className="hint-bar">
          <span className="hint-desktop">
            Arrow keys to move • Catch Pac-Man to become him • Eat pellets for points
          </span>
          <span className="hint-mobile">
            Use the D-pad to move • Catch Pac-Man to become him • Eat pellets for points
          </span>
        </footer>
      )}
    </div>
  );
}