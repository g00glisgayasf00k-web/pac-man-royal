import { FRUIT_LABELS, FRUIT_POINTS } from '../../../shared/fruits';
import { GameSnapshot, WIN_SCORE } from '../../../shared/gameTypes';

interface Props {
  snapshot: GameSnapshot | null;
  highlightId?: string;
}

export function Scoreboard({ snapshot, highlightId }: Props) {
  if (!snapshot) return null;

  const sorted = [...snapshot.players].sort((a, b) => b.score - a.score);
  const now = Date.now();
  const you = sorted.find((p) => p.id === highlightId);
  const youBoosted =
    you && you.id === snapshot.pacmanId && you.speedBoostUntil > now;

  const statusLines: { key: string; className: string; text: string }[] = [];
  if (snapshot.ghostsReleasedAt > now) {
    statusLines.push({
      key: 'head-start',
      className: 'head-start',
      text: `Ghosts in ${Math.ceil((snapshot.ghostsReleasedAt - now) / 1000)}s`,
    });
  }
  if (snapshot.fruit) {
    const label = FRUIT_LABELS[snapshot.fruit.kind];
    const pts = FRUIT_POINTS[snapshot.fruit.kind];
    statusLines.push({
      key: 'fruit',
      className: 'fruit',
      text: `${label} — ${pts} pts (Pac-Man only)`,
    });
  }
  if (youBoosted) {
    statusLines.push({
      key: 'boost',
      className: 'boost',
      text: 'Pac-Man 1.5× speed',
    });
  }

  return (
    <div className="scoreboard" role="region" aria-label="Live scores">
      {statusLines.length > 0 && (
        <div className="scoreboard-status">
          {statusLines.map((line) => (
            <span key={line.key} className={`status-line ${line.className}`}>
              {line.text}
            </span>
          ))}
        </div>
      )}

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
