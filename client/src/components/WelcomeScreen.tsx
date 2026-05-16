import { useCallback, useEffect, useState } from 'react';
import type { SoloLaunchOptions } from '../../../shared/gameTypes';
import {
  GameMode,
  OnlineJoinMode,
  OnlineLaunchOptions,
  SoloDifficulty,
  MATCH_DURATION_LABEL,
} from '../../../shared/gameTypes';
import {
  ArcadeFooter,
  ArcadeGate,
  ArcadeHeader,
  ArcadePlayers,
  ArcadeRuleCards,
} from './arcade/ArcadeLayout';
import { ArcadeModeSelect, tabToGameMode } from './arcade/ArcadeModeSelect';
import { OnlineJoinSelect } from './arcade/OnlineJoinSelect';
import { SoloDifficultySelect } from './arcade/SoloDifficultySelect';
import { DualLeaderboards } from './arcade/OverallLeaderboard';
import { clearRoomFromUrl, readRoomCodeFromUrl } from '../utils/roomInvite';
import './welcome/welcome.css';

type Props = {
  onPlay: (mode: GameMode, online?: OnlineLaunchOptions, solo?: SoloLaunchOptions) => void;
  onLogout?: () => void;
};

const LOAD_MS = 2800;

export function WelcomeScreen({ onPlay, onLogout }: Props) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<'solo' | 'online'>('solo');
  const [onlineJoinMode, setOnlineJoinMode] = useState<OnlineJoinMode>('quick');
  const [joinCode, setJoinCode] = useState('');
  const [soloDifficulty, setSoloDifficulty] = useState<SoloDifficulty>('easy');

  useEffect(() => {
    const fromUrl = readRoomCodeFromUrl();
    if (fromUrl) {
      setTab('online');
      setOnlineJoinMode('join');
      setJoinCode(fromUrl);
      clearRoomFromUrl();
    }
  }, []);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / LOAD_MS);
      setProgress(Math.round(t * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setReady(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const launch = useCallback(() => {
    if (!ready) return;
    const mode = tabToGameMode(tab);
    if (mode === 'online') {
      if (onlineJoinMode === 'join' && joinCode.trim().length < 4) return;
      onPlay(mode, { joinMode: onlineJoinMode, code: joinCode.trim() || undefined });
      return;
    }
    onPlay(mode);
  }, [ready, onPlay, tab, onlineJoinMode, joinCode]);

  useEffect(() => {
    if (!ready) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        launch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready, launch]);

  return (
    <ArcadeGate className="welcome-gate">
      {onLogout && (
        <div className="welcome-top-bar">
          <button type="button" className="btn-sec" onClick={onLogout}>
            SIGN OUT
          </button>
        </div>
      )}
      <ArcadeHeader />

      <div className="target-bar">
        <span className="target-icon" aria-hidden>
          🏆
        </span>
        <div className="target-info">
          <p className="target-label">{ready ? 'READY TO PLAY' : 'LOADING GAME…'}</p>
          <div className="target-track">
            <div className="target-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="target-pts">
            {MATCH_DURATION_LABEL} <span>MATCH</span>
          </p>
        </div>
      </div>

      <ArcadeModeSelect tab={tab} onTabChange={setTab} />

      {tab === 'solo' && (
        <SoloDifficultySelect difficulty={soloDifficulty} onDifficultyChange={setSoloDifficulty} />
      )}

      {tab === 'online' && (
        <OnlineJoinSelect
          joinMode={onlineJoinMode}
          joinCode={joinCode}
          onJoinModeChange={setOnlineJoinMode}
          onJoinCodeChange={setJoinCode}
        />
      )}

      <p className={`insert ${ready ? 'blink' : ''}`}>
        {ready ? '— PRESS START —' : `LOADING… ${progress}%`}
      </p>

      <div className="btn-row">
        <button
          type="button"
          className="btn-play"
          disabled={
            !ready || (tab === 'online' && onlineJoinMode === 'join' && joinCode.trim().length < 4)
          }
          onClick={launch}
        >
          ▶{' '}
          {tab === 'solo'
            ? 'START GAME'
            : onlineJoinMode === 'create'
              ? 'CREATE ROOM'
              : onlineJoinMode === 'join'
                ? 'JOIN ROOM'
                : 'QUICK MATCH'}
        </button>
      </div>

      <ArcadePlayers />
      <DualLeaderboards limit={5} />
      <ArcadeRuleCards />

      <ArcadeFooter />
    </ArcadeGate>
  );
}
