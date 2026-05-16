import { GameSnapshot, WIN_SCORE } from '../../../shared/gameTypes';

interface Props {
  snapshot: GameSnapshot | null;
  highlightId?: string;
}

export function Scoreboard({ snapshot, highlightId }: Props) {
  if (!snapshot) return null;

  const sorted = [...snapshot.players].sort((a, b) => b.score - a.score);

  return (
    <div className="scoreboard" role="region" aria-label="Live scores">
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
            {p.id === snapshot.pacmanId && <span className="role">PAC</span>}
            <span className="score">{p.score}</span>
          </li>
        ))}
      </ol>

      <p className="scoreboard-goal">First to {WIN_SCORE}</p>
    </div>
  );
}
