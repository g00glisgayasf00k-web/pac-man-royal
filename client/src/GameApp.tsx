import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Direction,
  FIXED_DT,
  GameMode,
  GameSnapshot,
  MAX_SIM_STEPS_PER_FRAME,
  OnlineLaunchOptions,
  OnlineLobbySnapshot,
  UI_SNAPSHOT_HZ,
  ghostNameForSlot,
  WIN_SCORE,
} from '../../shared/gameTypes';
import { GameEngine } from '../../shared/gameEngine';
import { GameCanvas } from './components/GameCanvas';
import { GameModeMenu } from './components/GameModeMenu';
import { OnlineWaiting } from './components/OnlineWaiting';
import { Scoreboard } from './components/Scoreboard';
import { useKeyboardInput } from './hooks/useInput';
import { useSwipeInput } from './hooks/useSwipeInput';
import { recordGameResult } from './auth/api';
import { loadSession } from './auth/session';
import type { AuthUser } from './auth/types';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

type Screen = 'menu' | 'game' | 'win';

type JoinResponse = {
  ok: boolean;
  code?: string;
  playerId?: string;
  slot?: number;
  lobby?: OnlineLobbySnapshot;
  error?: string;
};

type Props = {
  user: AuthUser;
  launchMode: GameMode;
  onlineLaunch: OnlineLaunchOptions;
  onLogout: () => void;
  onExitToWelcome: () => void;
};

export default function GameApp({
  user,
  launchMode,
  onlineLaunch,
  onLogout,
  onExitToWelcome,
}: Props) {
  const [screen, setScreen] = useState<Screen>('game');
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
  const simAccumRef = useRef(0);
  const uiAccumRef = useRef(0);
  const liveSnapshotRef = useRef<GameSnapshot | null>(null);
  const resultRecordedRef = useRef(false);
  const autoStartedRef = useRef(false);
  const onlineLaunchRef = useRef(onlineLaunch);
  onlineLaunchRef.current = onlineLaunch;

  const UI_DT = 1 / UI_SNAPSHOT_HZ;

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const pushUiSnapshot = useCallback((snap: GameSnapshot) => {
    liveSnapshotRef.current = snap;
    setSnapshot(snap);
  }, []);

  const startLocalLoop = useCallback(() => {
    stopLoop();
    let last = performance.now();
    simAccumRef.current = 0;
    uiAccumRef.current = 0;

    const loop = (now: number) => {
      const engine = engineRef.current;
      if (!engine) return;

      let frameDt = (now - last) / 1000;
      last = now;
      if (frameDt > 0.25) frameDt = 0.25;

      simAccumRef.current += frameDt;
      let steps = 0;
      while (simAccumRef.current >= FIXED_DT && steps < MAX_SIM_STEPS_PER_FRAME) {
        engine.step(FIXED_DT);
        simAccumRef.current -= FIXED_DT;
        steps++;
      }

      const snap = engine.getSnapshot();
      liveSnapshotRef.current = snap;

      uiAccumRef.current += frameDt;
      if (uiAccumRef.current >= UI_DT) {
        uiAccumRef.current = 0;
        setSnapshot(snap);
      }

      if (snap.status === 'ended') {
        pushUiSnapshot(snap);
        setScreen('win');
        stopLoop();
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [stopLoop, pushUiSnapshot, UI_DT]);

  const handleJoinResponse = useCallback(
    (socket: Socket, res: JoinResponse) => {
      if (!res.ok) {
        setOnlineError(res.error ?? 'Could not join');
        socket.disconnect();
        setScreen('menu');
        return;
      }
      setPlayerId(res.playerId!);
      setPlayerSlot(res.slot!);
      setRoomCode(res.code!);
      if (res.lobby) setOnlineLobby(res.lobby);
      const humans = res.lobby?.players.filter((p) => !p.isAI).length ?? 1;
      const codeLabel = res.code ? ` · ${res.code}` : '';
      setOnlineStatus(`${humans}/${res.lobby?.maxPlayers ?? 5} players${codeLabel}`);
      setScreen('game');
    },
    []
  );

  const startGame = useCallback(
    (gameMode: GameMode, name: string, online?: OnlineLaunchOptions) => {
      setMode(gameMode);
      setOnlineError('');

      if (gameMode === 'online') {
        const join = online ?? onlineLaunchRef.current;
        if (join.joinMode === 'join' && !join.code?.trim()) {
          setOnlineError('Enter a room code');
          setScreen('menu');
          return;
        }

        const socket = io(SERVER_URL, {
          transports: import.meta.env.PROD ? ['websocket'] : ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('lobby-update', (lobby: OnlineLobbySnapshot) => {
          setOnlineLobby(lobby);
          const humans = lobby.players.filter((p) => !p.isAI).length;
          setOnlineStatus(`${humans}/${lobby.maxPlayers} players · ${lobby.code}`);
        });

        let onlineUiAccum = 0;
        let onlineLast = performance.now();

        socket.on('game-state', (snap: GameSnapshot) => {
          liveSnapshotRef.current = snap;
          setOnlineLobby(null);

          const now = performance.now();
          let frameDt = (now - onlineLast) / 1000;
          onlineLast = now;
          if (frameDt > 0.25) frameDt = 0.25;
          onlineUiAccum += frameDt;

          if (snap.status === 'ended' || onlineUiAccum >= UI_DT) {
            onlineUiAccum = 0;
            setSnapshot(snap);
          }

          if (snap.status === 'ended') {
            setScreen('win');
            setSnapshot(snap);
          }
        });

        const token = loadSession()?.token;
        const payload = { name, token };
        const onRes = (res: JoinResponse) => handleJoinResponse(socket, res);

        if (join.joinMode === 'create') {
          socket.emit('create-room', payload, onRes);
        } else if (join.joinMode === 'join') {
          socket.emit('join-room', { ...payload, code: join.code!.trim() }, onRes);
        } else {
          socket.emit('quick-join', payload, onRes);
        }

        return;
      }

      const configs = [
        { id: 'p0', name, slot: 0, isAI: false },
        { id: 'g1', name: ghostNameForSlot(1), slot: 1, isAI: true },
        { id: 'g2', name: ghostNameForSlot(2), slot: 2, isAI: true },
        { id: 'g3', name: ghostNameForSlot(3), slot: 3, isAI: true },
        { id: 'g4', name: ghostNameForSlot(4), slot: 4, isAI: true },
      ];

      setPlayerId(configs[0].id);
      setPlayerSlot(0);
      engineRef.current = new GameEngine(configs);
      const initial = engineRef.current.getSnapshot();
      liveSnapshotRef.current = initial;
      setSnapshot(initial);
      setScreen('game');
      startLocalLoop();
    },
    [startLocalLoop, handleJoinResponse]
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

  const waitingOnline = mode === 'online' && onlineLobby && !snapshot;
  const controlsEnabled = screen === 'game' && !!snapshot && !waitingOnline;

  useKeyboardInput(controlsEnabled, playerSlot, sendInput);
  const swipeHandlers = useSwipeInput(controlsEnabled, sendInput);

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

  useEffect(() => {
    if (screen !== 'win' || !snapshot || mode !== 'local') return;
    if (resultRecordedRef.current) return;
    const me = snapshot.players.find((p) => p.id === playerId);
    if (!me) return;
    resultRecordedRef.current = true;
    const token = loadSession()?.token;
    if (!token) return;
    void recordGameResult(token, {
      score: me.score,
      won: snapshot.winnerId === playerId,
      mode: 'local',
    }).catch(() => {});
  }, [screen, snapshot, mode, playerId]);

  useEffect(() => {
    if (screen === 'menu') resultRecordedRef.current = false;
  }, [screen]);

  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    startGame(launchMode, user.displayName, launchMode === 'online' ? onlineLaunch : undefined);
  }, [launchMode, onlineLaunch, user.displayName, startGame]);

  const cleanupMatch = useCallback(() => {
    stopLoop();
    socketRef.current?.disconnect();
    socketRef.current = null;
    engineRef.current = null;
    liveSnapshotRef.current = null;
    setSnapshot(null);
    setOnlineLobby(null);
    setRoomCode('');
    setOnlineStatus('');
    setOnlineError('');
  }, [stopLoop]);

  const playAgain = useCallback(() => {
    cleanupMatch();
    resultRecordedRef.current = false;
    setScreen('game');
    startGame(mode, user.displayName);
  }, [cleanupMatch, mode, user.displayName, startGame]);

  const exitToWelcome = useCallback(() => {
    cleanupMatch();
    resultRecordedRef.current = false;
    autoStartedRef.current = false;
    onExitToWelcome();
  }, [cleanupMatch, onExitToWelcome]);

  const openMenu = useCallback(() => {
    if (waitingOnline) {
      exitToWelcome();
      return;
    }
    cleanupMatch();
    setScreen('menu');
  }, [waitingOnline, exitToWelcome, cleanupMatch]);

  if (screen === 'menu') {
    return (
      <>
        {onlineError && (
          <p className="online-error" style={{ textAlign: 'center', color: '#f87171' }}>
            {onlineError}
          </p>
        )}
        <GameModeMenu
          displayName={user.displayName}
          username={user.username}
          onStart={(gameMode, online) => {
            setOnlineError('');
            startGame(gameMode, user.displayName, online);
          }}
          onLogout={onLogout}
        />
      </>
    );
  }

  return (
    <div className="app game-screen">
      <header className="top-bar">
        <button type="button" className="btn-ghost" onClick={openMenu}>
          ← Menu
        </button>
        <h1>Pac-Man Battle Royale</h1>
        {onlineStatus && <span className="room-tag">{onlineStatus}</span>}
      </header>

      {!waitingOnline && (
        <Scoreboard snapshot={snapshot} highlightId={playerId} />
      )}

      <main className="play-area">
        {waitingOnline ? (
          <OnlineWaiting lobby={onlineLobby} roomCode={roomCode} />
        ) : (
          <div
            className={`game-stage${controlsEnabled ? ' swipe-input' : ''}`}
            {...swipeHandlers}
          >
            <GameCanvas
              snapshot={snapshot}
              liveSnapshotRef={liveSnapshotRef}
              interpolateOnline={mode === 'online'}
            />
          </div>
        )}
      </main>

      {screen === 'win' && snapshot?.winnerName && (
        <div className="overlay win-overlay">
          <div className="win-card">
            <h2>{snapshot.winnerName} wins!</h2>
            <p>Reached {WIN_SCORE} points</p>
            <div className="win-actions">
              <button type="button" className="btn-primary" onClick={playAgain}>
                Play again
              </button>
              <button type="button" className="btn-ghost" onClick={exitToWelcome}>
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {!waitingOnline && (
        <footer className="hint-bar">
          <span className="hint-desktop">
            Arrow keys to move • Catch Pac-Man to become him • Eat pellets for points
          </span>
          <span className="hint-mobile">
            Swipe on the maze to move • Catch Pac-Man to become him • Eat pellets for points
          </span>
        </footer>
      )}
    </div>
  );
}
