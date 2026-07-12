import { useEffect, useState } from 'react';
import { formatMatchTimeRemaining, GameSnapshot } from '../../../shared/gameTypes';

interface Props {
  snapshot: GameSnapshot | null;
  playerId: string;
  highScore: number;
  lives: number;
  level: number;
  scorePop?: boolean;
  subtitle?: string;
}

export function ArcadeHud({
  snapshot,
  playerId,
  highScore,
  lives,
  level,
  scorePop,
  subtitle,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!snapshot || snapshot.status === 'ended') return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [snapshot?.status, snapshot?.matchEndsAt]);

  const me = snapshot?.players.find((p) => p.id === playerId);
  const score = me?.score ?? 0;
  const isPac = snapshot && me && snapshot.pacmanId === playerId && me.role === 'pacman';
  const timer =
    snapshot && snapshot.status !== 'ended'
      ? formatMatchTimeRemaining(snapshot.matchEndsAt - now)
      : "TIME'S UP";

  return (
    <header className="arcade-hud" role="banner">
      <div className="arcade-hud__row arcade-hud__row--main">
        <div className="arcade-hud__score-block">
          <span className="arcade-hud__label">SCORE</span>
          <span className={`arcade-hud__score${scorePop ? ' arcade-hud__score--pop' : ''}`}>
            {score}
          </span>
        </div>
        <div className="arcade-hud__meta">
          <div className="arcade-hud__chip">
            <span className="arcade-hud__label">HI</span>
            <span className="arcade-hud__hi">{highScore}</span>
          </div>
          <div className="arcade-hud__chip">
            <span className="arcade-hud__label">LV</span>
            <span className="arcade-hud__level">{level}</span>
          </div>
        </div>
      </div>

      <div className="arcade-hud__row arcade-hud__row--sub">
        <div className="arcade-hud__lives" aria-label={`${lives} lives remaining`}>
          {Array.from({ length: 3 }, (_, i) => (
            <span
              key={i}
              className={`arcade-hud__life${i < lives ? ' arcade-hud__life--on' : ''}`}
              aria-hidden
            />
          ))}
        </div>
        <div className="arcade-hud__timer-wrap">
          <span className="arcade-hud__label">TIME</span>
          <span className="arcade-hud__timer">{timer}</span>
        </div>
        <span className={`arcade-hud__role${isPac ? ' arcade-hud__role--pac' : ''}`}>
          {isPac ? 'ROYALE' : 'GHOST'}
        </span>
      </div>

      {subtitle && <p className="arcade-hud__subtitle">{subtitle}</p>}
    </header>
  );
}
