import { useState } from 'react';
import { FRUIT_DEFINITIONS } from '../../../shared/fruits';
import { GameSnapshot, WIN_SCORE } from '../../../shared/gameTypes';

interface Props {
  snapshot: GameSnapshot | null;
  highlightId?: string;
}

export function Scoreboard({ snapshot, highlightId }: Props) {
  const [open, setOpen] = useState(true);

  if (!snapshot) return null;
  const sorted = [...snapshot.players].sort((a, b) => b.score - a.score);
  const pac = snapshot.players.find((p) => p.id === snapshot.pacmanId);
  const now = Date.now();
  const you = sorted.find((p) => p.id === highlightId);

  return (
    <aside className={`scoreboard${open ? '' : ' collapsed'}`}>
      <header className="scoreboard-header">
        <h2>Scores</h2>
        <button
          type="button"
          className="scoreboard-toggle"
          aria-expanded={open}
          aria-label={open ? 'Hide scores' : 'Show scores'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '−' : '+'}
        </button>
      </header>

      {!open && you && <p className="scoreboard-peek">{you.score} pts</p>}

      <div className="scoreboard-body">
        <p className="goal">First to {WIN_SCORE} wins</p>
        {snapshot.ghostsReleasedAt > now && (
          <p className="status-line head-start">
            Ghosts release in {Math.ceil((snapshot.ghostsReleasedAt - now) / 1000)}s
          </p>
        )}
        {snapshot.ghostSpeedLevel > 0 && (
          <p className="status-line ghost-speed">Ghost speed +{snapshot.ghostSpeedLevel * 10}%</p>
        )}
        {snapshot.ghostFreezeUntil > now && (
          <p className="status-line freeze">Ghosts slowed!</p>
        )}
        {snapshot.fruit && (
          <p className="status-line fruit">
            Fruit: {FRUIT_DEFINITIONS[snapshot.fruit.kind].label} —{' '}
            {FRUIT_DEFINITIONS[snapshot.fruit.kind].effect}
          </p>
        )}
        {pac && pac.speedBoostUntil > now && (
          <p className="status-line boost">Speed boost 1.5×</p>
        )}
        {pac && pac.shieldUntil > now && <p className="status-line shield">Shield active</p>}
        {pac && pac.doubleScoreUntil > now && (
          <p className="status-line double">2× points</p>
        )}
        <ul>
          {sorted.map((p) => (
            <li
              key={p.id}
              className={[
                highlightId === p.id ? 'you' : '',
                p.id === snapshot.pacmanId ? 'pacman' : 'ghost',
              ].join(' ')}
            >
              <span className="dot" style={{ background: p.color }} />
              <span className="name">{p.name}</span>
              <span className="role">{p.id === snapshot.pacmanId ? 'PAC' : 'GHOST'}</span>
              <span className="score">{p.score}</span>
              <div className="bar">
                <ProgressBar score={p.score} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function ProgressBar({ score }: { score: number }) {
  const pct = Math.min(100, (score / WIN_SCORE) * 100);
  return <span className="fill" style={{ width: `${pct}%` }} />;
}
