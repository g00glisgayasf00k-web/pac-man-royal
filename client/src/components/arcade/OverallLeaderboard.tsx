import { useEffect, useState } from 'react';
import type { LeaderboardEntry, LeaderboardMode, YourLeaderboardStats } from '../../../../shared/leaderboardTypes';
import { fetchLeaderboard } from '../../auth/api';
import { loadSession } from '../../auth/session';

type Props = {
  mode: LeaderboardMode;
  title: string;
  limit?: number;
  className?: string;
  refreshKey?: number;
};

export function OverallLeaderboard({ mode, title, limit = 5, className = '', refreshKey = 0 }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [you, setYou] = useState<YourLeaderboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const token = loadSession()?.token;
    fetchLeaderboard(mode, limit, token)
      .then((data) => {
        if (!cancelled) {
          setEntries(data.entries);
          setYou(data.you ?? null);
        }
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
  }, [mode, limit, refreshKey]);

  const sessionUsername = loadSession()?.user.username;
  const youInTop =
    you && sessionUsername && entries.some((e) => e.username === sessionUsername);

  return (
    <section
      className={`overall-leaderboard overall-leaderboard-${mode} ${className}`.trim()}
      aria-label={`${title} leaderboard`}
    >
      <p className="section-label">— {title} —</p>

      {loading && <p className="leaderboard-status">LOADING…</p>}
      {!loading && error && <p className="leaderboard-status leaderboard-error">{error}</p>}
      {!loading && !error && entries.length === 0 && !you && (
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

      {!loading && !error && you && you.gamesPlayed > 0 && (
        <p className={`leaderboard-you${youInTop ? ' leaderboard-you-in-top' : ''}`}>
          YOUR BEST: <strong>{you.bestScore.toLocaleString()}</strong>
          {!youInTop && entries.length > 0 ? ' · not in top 5 yet' : ''}
        </p>
      )}

      <p className="leaderboard-foot">WINS · HIGH SCORE</p>
    </section>
  );
}

export function DualLeaderboards({
  limit = 5,
  className = '',
  refreshKey = 0,
}: {
  limit?: number;
  className?: string;
  refreshKey?: number;
}) {
  return (
    <div className={`leaderboards-row ${className}`.trim()}>
      <OverallLeaderboard mode="local" title="SOLO VS AI" limit={limit} refreshKey={refreshKey} />
      <OverallLeaderboard mode="online" title="ONLINE" limit={limit} refreshKey={refreshKey} />
    </div>
  );
}
