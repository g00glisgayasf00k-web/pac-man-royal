import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '../../../../shared/leaderboardTypes';
import { fetchLeaderboard } from '../../auth/api';

type Props = {
  limit?: number;
  className?: string;
};

export function OverallLeaderboard({ limit = 10, className = '' }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchLeaderboard(limit)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load scores');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return (
    <section
      className={`overall-leaderboard ${className}`.trim()}
      aria-label="Overall leaderboard"
    >
      <p className="section-label">— HALL OF FAME —</p>

      {loading && <p className="leaderboard-status">LOADING SCORES…</p>}
      {!loading && error && <p className="leaderboard-status leaderboard-error">{error}</p>}
      {!loading && !error && entries.length === 0 && (
        <p className="leaderboard-status">NO SCORES YET — BE THE FIRST!</p>
      )}

      {!loading && !error && entries.length > 0 && (
        <ol className="leaderboard-list">
          {entries.map((entry) => (
            <li
              key={`${entry.rank}-${entry.username}`}
              className={entry.rank <= 3 ? `rank-${entry.rank}` : ''}
            >
              <span className="lb-rank">#{entry.rank}</span>
              <span className="lb-name" title={entry.displayName}>
                {entry.displayName}
              </span>
              <span className="lb-wins">{entry.wins}W</span>
              <span className="lb-pts">{entry.totalPoints.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}

      <p className="leaderboard-foot">WINS · TOTAL POINTS · REGISTERED PLAYERS</p>
    </section>
  );
}
