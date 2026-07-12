import { useEffect, useState } from 'react';
import { formatMatchTimeRemaining, GameSnapshot } from '../../../shared/gameTypes';

interface Props {
  snapshot: GameSnapshot | null;
  highlightId?: string;
}

export function Scoreboard({ snapshot, highlightId }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!snapshot || snapshot.status === 'ended') return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [snapshot?.status, snapshot?.matchEndsAt]);

  if (!snapshot) return null;

  const sorted = [...snapshot.players].sort((a, b) => b.score - a.score);
  const remaining = formatMatchTimeRemaining(snapshot.matchEndsAt - now);
  const timerLabel = snapshot.status === 'ended' ? "Time's up" : remaining;

  return (
    <div className="scoreboard scoreboard--compact" role="region" aria-label="Live scores">
      <ol className="scoreboard-track">
        {sorted.map((p, rank) => (
          <li
            key={p.id}
            className={[
              'scoreboard-player',
              highlightId === p.id ? 'you' : '',
              p.id === snapshot.pacmanId ? 'pacman' : 'ghost',
              rank === 0 ? 'leader' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="dot" style={{ background: p.color }} aria-hidden />
            <span className="name" title={p.name}>
              {p.name}
            </span>
            {p.id === snapshot.pacmanId && <span className="role">ROYALE</span>}
            <span className="score">{p.score}</span>
          </li>
        ))}
      </ol>

      <p className="scoreboard-timer" aria-live="polite">
        {timerLabel}
      </p>
    </div>
  );
}
