import { useEffect, useState } from 'react';
import type { LeaderboardEntry, LeaderboardMode } from '../../../../shared/leaderboardTypes';
import { fetchLeaderboard } from '../../auth/api';

type Props = {
  mode: LeaderboardMode;
  title: string;
  limit?: number;
  className?: string;
};

export function OverallLeaderboard({ mode, title, limit = 5, className = '' }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchLeaderboard(mode, limit)
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
  }, [mode, limit]);

  return (
    <section
      className={`overall-leaderboard overall-leaderboard-${mode} ${className}`.trim()}
      aria-label={`${title} leaderboard`}
    >
      <p className="section-label">— {title} —</p>

      {loading && <p className="leaderboard-status">LOADING…</p>}
      {!loading && error && <p className="leaderboard-status leaderboard-error">{error}</p>}
      {!loading && !error && entries.length === 0 && (
        <p className="leaderboard-status">NO SCORES YET</p>
      )}

      {!loading && !error && entries.length > 0 && (
        <ol className="leaderboard-list">
          {entries.map((entry) => (
            <li
              key={`${mode}-${entry.rank}-${entry.username}`}
              className={entry.rank <= 3 ? `rank-${entry.rank}` : ''}
            >
              <span className="lb-rank">#{entry.rank}</span>
              <span className="lb-name" title={entry.displayName}>
                {entry.displayName}
              </span>
              <span className="lb-wins">{entry.wins}W</span>
              <span className="lb-best" title="Highest score in one match">
                {entry.bestScore.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className="leaderboard-foot">WINS · HIGH SCORE</p>
    </section>
  );
}

export function DualLeaderboards({ limit = 5, className = '' }: { limit?: number; className?: string }) {
  return (
    <div className={`leaderboards-row ${className}`.trim()}>
      <OverallLeaderboard mode="local" title="SOLO VS AI" limit={limit} />
      <OverallLeaderboard mode="online" title="ONLINE" limit={limit} />
    </div>
  );
}
