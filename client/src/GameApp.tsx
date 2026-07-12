import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Direction,
  FIXED_DT,
  GameMode,
  GameSnapshot,
  MAX_SIM_STEPS_PER_FRAME,
  MOVE_SPEED,
  NETWORK_SNAPSHOT_HZ,
  OnlineLaunchOptions,
  OnlineLobbySnapshot,
  SoloLaunchOptions,
  UI_SNAPSHOT_HZ,
  ghostNameForSlot,
  soloDifficultyLabel,
  soloDifficultySpeedMultiplier,
} from '../../shared/gameTypes';
import { GameEngine } from '../../shared/gameEngine';
import { ArcadeHud } from './components/ArcadeHud';
import { DpadControls } from './components/DpadControls';
import { GameCanvas } from './components/GameCanvas';
import { MatchStartFlash } from './components/MatchStartFlash';
import { OnlineWaiting } from './components/OnlineWaiting';
import { Scoreboard } from './components/Scoreboard';
import { useGameJuice } from './hooks/useGameJuice';
import { useKeyboardInput } from './hooks/useInput';
import { useSwipeInput } from './hooks/useSwipeInput';
import { recordGameResult } from './auth/api';
import { loadSession } from './auth/session';
import type { AuthUser } from './auth/types';
import { getServerUrl } from './config/api';
import { recordMatchCompleted, showPendingAdIfNeeded } from './ads/interstitial';

const SERVER_URL = getServerUrl();

type Screen = 'game' | 'win';

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
  soloLaunch: SoloLaunchOptions;
  onExitToWelcome: () => void;
  onScoreRecorded?: () => void;
};

export default function GameApp({
  user,
  launchMode,
  onlineLaunch,
  soloLaunch,
  onExitToWelcome,
  onScoreRecorded,
}: Props) {
  const [screen, setScreen] = useState<Screen>('game');
  const [mode, setMode] = useState<GameMode>('local');
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [onlineLobby, setOnlineLobby] = useState<OnlineLobbySnapshot | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [playerSlot, setPlayerSlot] = useState(0);
  const [roomCode, setRoomCode] = useState('');
  const [onlineStatus, setOnlineStatus] = useState('');
  const engineRef = useRef<GameEngine | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const rafRef = useRef(0);
  const simAccumRef = useRef(0);
  const uiAccumRef = useRef(0);
  const liveSnapshotRef = useRef<GameSnapshot | null>(null);
  const resultRecordedRef = useRef(false);
  const adCountedRef = useRef(false);
  const autoStartedRef = useRef(false);
  const onlineLaunchRef = useRef(onlineLaunch);
  onlineLaunchRef.current = onlineLaunch;
  const soloLaunchRef = useRef(soloLaunch);
  soloLaunchRef.current = soloLaunch;

  const UI_DT = 1 / UI_SNAPSHOT_HZ;

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const pushUiSnapshot = useCallback((snap: GameSnapshot) => {
    liveSnapshotRef.current = snap;
    setSnapshot(snap);
  }, []);

  const persistMatchResult = useCallback(
    async (snap: GameSnapshot, gameMode: GameMode) => {
      if (resultRecordedRef.current || snap.status !== 'ended') return;
      const me = snap.players.find((p) => p.id === playerId);
      if (!me) return;
      const token = loadSession()?.token;
      if (!token) return;

      resultRecordedRef.current = true;
      try {
        await recordGameResult(token, {
          score: me.score,
          won: snap.winnerId === playerId,
          mode: gameMode,
        });
        onScoreRecorded?.();
      } catch {
        resultRecordedRef.current = false;
      }
    },
    [playerId, onScoreRecorded]
  );

  const finishMatch = useCallback(
    (snap: GameSnapshot, gameMode: GameMode) => {
      void persistMatchResult(snap, gameMode);
      pushUiSnapshot(snap);
      setScreen('win');
      if (!adCountedRef.current) {
        adCountedRef.current = true;
        recordMatchCompleted();
      }
    },
    [persistMatchResult, pushUiSnapshot]
  );

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
        finishMatch(snap, 'local');
        stopLoop();
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [stopLoop, UI_DT, finishMatch]);

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
  }, [stopLoop]);

  const exitToWelcome = useCallback(() => {
    const snap = liveSnapshotRef.current;
    if (snap?.status === 'ended') {
      void persistMatchResult(snap, mode);
    }
    cleanupMatch();
    resultRecordedRef.current = false;
    autoStartedRef.current = false;
    onExitToWelcome();
  }, [cleanupMatch, onExitToWelcome, persistMatchResult, mode]);

  const handleJoinResponse = useCallback(
    (socket: Socket, res: JoinResponse) => {
      if (!res.ok) {
        socket.disconnect();
        exitToWelcome();
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
    [exitToWelcome]
  );

  const startGame = useCallback(
    async (
      gameMode: GameMode,
      name: string,
      online?: OnlineLaunchOptions,
      solo?: SoloLaunchOptions
    ) => {
      await showPendingAdIfNeeded();

      resultRecordedRef.current = false;
      adCountedRef.current = false;
      setMode(gameMode);
      if (gameMode === 'online') {
        const join = online ?? onlineLaunchRef.current;
        if (join.joinMode === 'join' && !join.code?.trim()) {
          exitToWelcome();
          return;
        }

        const socket = io(SERVER_URL, {
          transports: ['polling', 'websocket'],
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
            finishMatch(snap, 'online');
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

      const soloOpts = solo ?? soloLaunchRef.current;
      const speedMult = soloDifficultySpeedMultiplier(soloOpts.difficulty);
      const moveSpeed = MOVE_SPEED * speedMult;

      setPlayerId(configs[0].id);
      setPlayerSlot(0);
      engineRef.current = new GameEngine(configs, { moveSpeed });
      const initial = engineRef.current.getSnapshot();
      liveSnapshotRef.current = initial;
      setSnapshot(initial);
      setScreen('game');
      startLocalLoop();
    },
    [startLocalLoop, handleJoinResponse, exitToWelcome, finishMatch, UI_DT]
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
  const { effects, highScore, lives, level } = useGameJuice(snapshot, playerId);
  const [showStartFlash, setShowStartFlash] = useState(false);
  const startFlashPlayedRef = useRef(false);
  useEffect(() => {
    if (controlsEnabled && snapshot?.status === 'playing' && !startFlashPlayedRef.current) {
      startFlashPlayedRef.current = true;
      setShowStartFlash(true);
    }
    if (!snapshot) {
      startFlashPlayedRef.current = false;
      setShowStartFlash(false);
    }
  }, [controlsEnabled, snapshot?.status, snapshot]);

  useKeyboardInput(controlsEnabled, playerSlot, sendInput);
  const swipeHandlers = useSwipeInput(controlsEnabled, sendInput);

  const stageClass = [
    'game-stage',
    controlsEnabled ? 'swipe-input' : '',
    effects.powerGlow ? 'game-stage--power-glow' : '',
    effects.shake ? 'game-stage--shake' : '',
    effects.flash ? 'game-stage--flash' : '',
  ]
    .filter(Boolean)
    .join(' ');

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
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    void startGame(
      launchMode,
      user.displayName,
      launchMode === 'online' ? onlineLaunch : undefined,
      launchMode === 'local' ? soloLaunch : undefined
    );
  }, [launchMode, onlineLaunch, soloLaunch, user.displayName, startGame]);

  const playAgain = useCallback(() => {
    const snap = liveSnapshotRef.current;
    if (snap?.status === 'ended') {
      void persistMatchResult(snap, mode);
    }
    // Keep the win screen up until any pending ad finishes, then start.
    void (async () => {
      await showPendingAdIfNeeded();
      cleanupMatch();
      resultRecordedRef.current = false;
      setScreen('game');
      await startGame(mode, user.displayName);
    })();
  }, [cleanupMatch, mode, user.displayName, startGame, persistMatchResult]);

  const hudSubtitle =
    mode === 'local'
      ? `${soloDifficultyLabel(soloLaunchRef.current.difficulty)} SOLO`
      : onlineStatus || undefined;

  const myScore = snapshot?.players.find((p) => p.id === playerId)?.score ?? 0;

  return (
    <div className="app game-screen mobile-game-shell">
      <header className="mobile-top-bar">
        <button type="button" className="btn-exit" onClick={exitToWelcome}>
          MENU
        </button>
        <span className="mobile-top-bar__title">PAC-ROYALE</span>
        {mode === 'local' && (
          <span className="mobile-top-bar__tag">
            {soloDifficultyLabel(soloLaunchRef.current.difficulty)}
          </span>
        )}
        {mode === 'online' && onlineStatus && (
          <span className="mobile-top-bar__tag" title={onlineStatus}>
            ONLINE
          </span>
        )}
      </header>

      {!waitingOnline && (
        <>
          <ArcadeHud
            snapshot={snapshot}
            playerId={playerId}
            highScore={highScore}
            lives={lives}
            level={level}
            scorePop={effects.scorePop}
            subtitle={hudSubtitle}
          />
          <Scoreboard snapshot={snapshot} highlightId={playerId} />
        </>
      )}

      <main className="play-area">
        {waitingOnline ? (
          <OnlineWaiting lobby={onlineLobby} roomCode={roomCode} />
        ) : (
          <div className="game-stage-wrap">
            <div className={stageClass} {...swipeHandlers}>
              <GameCanvas
                snapshot={snapshot}
                liveSnapshotRef={liveSnapshotRef}
                blendHz={mode === 'online' ? NETWORK_SNAPSHOT_HZ : 60}
              />
              <MatchStartFlash
                active={showStartFlash}
                onDone={() => setShowStartFlash(false)}
              />
              {effects.scoreDelta != null && (
                <span className="score-float" key={snapshot?.tick}>
                  +{effects.scoreDelta}
                </span>
              )}
            </div>
          </div>
        )}
      </main>

      {!waitingOnline && (
        <DpadControls enabled={controlsEnabled} onDirection={sendInput} />
      )}

      {screen === 'win' && snapshot?.winnerName && (
        <div className="overlay win-overlay">
          <div className="win-card">
            <p className="win-label">GAME OVER</p>
            <h2>{snapshot.winnerName} WINS!</h2>
            <p>
              YOUR SCORE: {myScore}
              <br />
              WINNER: {snapshot.players.find((p) => p.id === snapshot.winnerId)?.score ?? 0} PTS
            </p>
            <div className="win-actions">
              <button type="button" className="btn-arcade-primary" onClick={playAgain}>
                PLAY AGAIN
              </button>
              <button type="button" className="btn-arcade-secondary" onClick={exitToWelcome}>
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
