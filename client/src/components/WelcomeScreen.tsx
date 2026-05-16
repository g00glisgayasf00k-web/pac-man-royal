import { useCallback, useEffect, useState } from 'react';
import { GameMode, WIN_SCORE } from '../../../shared/gameTypes';
import {
  ArcadeFooter,
  ArcadeGate,
  ArcadeHeader,
  ArcadePlayers,
  ArcadeRuleCards,
} from './arcade/ArcadeLayout';
import { ArcadeModeSelect, tabToGameMode } from './arcade/ArcadeModeSelect';
import { DualLeaderboards } from './arcade/OverallLeaderboard';
import './welcome/welcome.css';

type Props = {
  onPlay: (mode: GameMode) => void;
};

const LOAD_MS = 2800;

export function WelcomeScreen({ onPlay }: Props) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<'solo' | 'online'>('solo');

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
    onPlay(tabToGameMode(tab));
  }, [ready, onPlay, tab]);

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
            {WIN_SCORE.toLocaleString()} <span>POINTS</span>
          </p>
        </div>
      </div>

      <ArcadeModeSelect tab={tab} onTabChange={setTab} />

      <p className={`insert ${ready ? 'blink' : ''}`}>
        {ready ? '— PRESS START —' : `LOADING… ${progress}%`}
      </p>

      <div className="btn-row">
        <button type="button" className="btn-play" disabled={!ready} onClick={launch}>
          ▶ {tab === 'solo' ? 'START GAME' : 'JOIN ONLINE'}
        </button>
      </div>

      <ArcadePlayers />
      <DualLeaderboards limit={5} />
      <ArcadeRuleCards />

      <ArcadeFooter />
    </ArcadeGate>
  );
}
