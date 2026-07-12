import { useCallback, useEffect, useState } from 'react';
import type {
  AdminLiveRoom,
  AdminMetrics,
  AdminUser,
} from '../../../shared/adminTypes';
import {
  deleteAdminUser,
  resetAdminLeaderboard,
  fetchAdminLiveRooms,
  fetchAdminMetrics,
  fetchAdminUsers,
} from './api';
import '../styles/admin.css';

type Tab = 'overview' | 'players' | 'live' | 'activity';

function formatTime(ts: number) {
  return new Date(ts).toLocaleString();
}

function formatDay(date: string) {
  const d = new Date(date + 'T12:00:00Z');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function maxCount(values: number[]) {
  return Math.max(1, ...values);
}

function BarChart({
  labels,
  series,
}: {
  labels: string[];
  series: { name: string; values: number[]; className: string }[];
}) {
  const peak = maxCount(series.flatMap((s) => s.values));
  return (
    <div className="admin-bars" role="img" aria-hidden>
      {labels.map((label, i) => (
        <div key={label} className="admin-bar-col">
          <div className="admin-bar-stack">
            {series.map((s) => (
              <div
                key={s.name}
                className={`admin-bar-seg ${s.className}`}
                style={{ height: `${(s.values[i] / peak) * 100}%` }}
                title={`${s.name}: ${s.values[i]}`}
              />
            ))}
          </div>
          <span className="admin-bar-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

type Props = {
  token: string;
};

export function AdminDashboard({ token }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [liveRooms, setLiveRooms] = useState<AdminLiveRoom[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingLeaderboard, setResettingLeaderboard] = useState(false);

  const loadMetrics = useCallback(async () => {
    const data = await fetchAdminMetrics(token);
    setMetrics(data);
  }, [token]);

  const loadUsers = useCallback(async () => {
    const data = await fetchAdminUsers(token, search);
    setUsers(data.users);
    setUserTotal(data.total);
  }, [token, search]);

  const refreshAll = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [m, u, r] = await Promise.all([
        fetchAdminMetrics(token),
        fetchAdminUsers(token, search),
        fetchAdminLiveRooms(token),
      ]);
      setMetrics(m);
      setUsers(u.users);
      setUserTotal(u.total);
      setLiveRooms(r.rooms);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, [token]);

  useEffect(() => {
    const id = setTimeout(() => {
      void loadUsers().catch(() => {});
    }, 300);
    return () => clearTimeout(id);
  }, [search, loadUsers]);

  const handleResetLeaderboard = async () => {
    const ok = window.confirm(
      'Clear all leaderboard wins, points, and match history?\n\nUse this after scoring rule changes. This cannot be undone.'
    );
    if (!ok) return;
    setResettingLeaderboard(true);
    setError(null);
    try {
      await resetAdminLeaderboard(token);
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Leaderboard reset failed');
    } finally {
      setResettingLeaderboard(false);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (user.isAdmin) return;
    const ok = window.confirm(
      `Delete @${user.username} (${user.displayName})?\n\nThis removes their account, stats, and game history. This cannot be undone.`
    );
    if (!ok) return;
    setDeletingId(user.id);
    setError(null);
    try {
      await deleteAdminUser(token, user.id);
      await Promise.all([loadUsers(), loadMetrics()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="admin-gate">
        <p>Loading dashboard…</p>
      </div>
    );
  }

  const overview = metrics?.overview;
  const dayLabels = metrics?.signupsByDay.map((d) => formatDay(d.date)) ?? [];

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div>
          <p className="admin-kicker">PAC-ROYALE</p>
          <h1>Admin panel</h1>
        </div>
        <div className="admin-header-actions">
          <span className="admin-meta">
            {metrics?.storage === 'postgres' ? 'PostgreSQL' : 'Local file'}
            {metrics ? ` · ${formatTime(metrics.generatedAt)}` : ''}
          </span>
          <button type="button" className="admin-btn" onClick={() => void refreshAll()} disabled={loading}>
            Refresh
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-danger"
            onClick={() => void handleResetLeaderboard()}
            disabled={loading || resettingLeaderboard}
          >
            {resettingLeaderboard ? 'Clearing…' : 'Reset scores'}
          </button>
          <a href="/" className="admin-btn admin-btn-ghost">
            Back to game
          </a>
        </div>
      </header>

      {error && <p className="admin-banner admin-banner-error">{error}</p>}

      <nav className="admin-nav" aria-label="Admin sections">
        {(
          [
            ['overview', 'Overview'],
            ['players', `Players (${userTotal})`],
            ['live', `Live (${liveRooms.length})`],
            ['activity', 'Activity'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && metrics && overview && (
        <>
          <section className="admin-cards">
            <article className="admin-card">
              <span className="admin-card-label">Users</span>
              <strong>{overview.totalUsers}</strong>
            </article>
            <article className="admin-card">
              <span className="admin-card-label">Games played</span>
              <strong>{overview.totalGames}</strong>
            </article>
            <article className="admin-card">
              <span className="admin-card-label">Wins</span>
              <strong>{overview.totalWins}</strong>
            </article>
            <article className="admin-card">
              <span className="admin-card-label">Avg score</span>
              <strong>{overview.averageScore}</strong>
            </article>
            <article className="admin-card admin-card-live">
              <span className="admin-card-label">Live rooms</span>
              <strong>{metrics.liveRooms}</strong>
            </article>
            <article className="admin-card">
              <span className="admin-card-label">Active sessions</span>
              <strong>{overview.activeSessions}</strong>
            </article>
          </section>

          <section className="admin-panel">
            <h2>By mode</h2>
            <div className="admin-mode-grid">
              {metrics.byMode.map((m) => (
                <article key={m.mode} className="admin-mode-card">
                  <h3>{m.mode === 'online' ? 'Online' : 'Solo vs AI'}</h3>
                  <ul>
                    <li>
                      <span>Players</span>
                      <strong>{m.players}</strong>
                    </li>
                    <li>
                      <span>Games</span>
                      <strong>{m.gamesPlayed}</strong>
                    </li>
                    <li>
                      <span>Wins</span>
                      <strong>{m.wins}</strong>
                    </li>
                    <li>
                      <span>Total points</span>
                      <strong>{m.totalPoints.toLocaleString()}</strong>
                    </li>
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-charts">
            <article className="admin-panel">
              <h2>Signups (7 days)</h2>
              <BarChart
                labels={dayLabels}
                series={[
                  { name: 'Signups', values: metrics.signupsByDay.map((d) => d.count), className: 'seg-signup' },
                ]}
              />
            </article>
            <article className="admin-panel">
              <h2>Games (7 days)</h2>
              <BarChart
                labels={dayLabels}
                series={[
                  { name: 'Solo', values: metrics.gamesByDay.map((d) => d.local), className: 'seg-local' },
                  { name: 'Online', values: metrics.gamesByDay.map((d) => d.online), className: 'seg-online' },
                ]}
              />
              <div className="admin-legend">
                <span className="seg-local">Solo</span>
                <span className="seg-online">Online</span>
              </div>
            </article>
          </section>
        </>
      )}

      {tab === 'players' && (
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>All players</h2>
            <input
              type="search"
              className="admin-search"
              placeholder="Search username or display name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {users.length === 0 ? (
            <p className="admin-empty">No players found.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Joined</th>
                    <th>Games</th>
                    <th>Wins</th>
                    <th>Points</th>
                    <th>Sessions</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.displayName}</strong>
                        <span className="admin-sub">@{u.username}</span>
                        {u.isAdmin && <span className="admin-badge">ADMIN</span>}
                      </td>
                      <td className="admin-time">{formatTime(u.createdAt)}</td>
                      <td>{u.gamesPlayed}</td>
                      <td>{u.wins}</td>
                      <td>{u.totalPoints.toLocaleString()}</td>
                      <td>{u.activeSessions}</td>
                      <td className="admin-actions-cell">
                        {!u.isAdmin && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger admin-btn-sm"
                            disabled={deletingId === u.id}
                            onClick={() => void handleDelete(u)}
                          >
                            {deletingId === u.id ? '…' : 'Delete'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'live' && (
        <section className="admin-panel">
          <h2>Live rooms</h2>
          {liveRooms.length === 0 ? (
            <p className="admin-empty">No active rooms right now.</p>
          ) : (
            <div className="admin-room-grid">
              {liveRooms.map((room) => (
                <article key={room.code} className="admin-room-card">
                  <header>
                    <strong>{room.code}</strong>
                    <span className={`admin-status admin-status-${room.status}`}>{room.status}</span>
                  </header>
                  <p className="admin-sub">
                    {room.humanCount} human · {room.playerCount}/{room.maxPlayers} slots
                    {room.private ? ' · Private' : ' · Public'}
                  </p>
                  <ul className="admin-room-players">
                    {room.players.map((p) => (
                      <li key={`${p.slot}-${p.name}`}>
                        <span className="dot" style={{ background: `hsl(${p.slot * 72}, 80%, 55%)` }} />
                        {p.name}
                        {p.isAI && <span className="admin-tag">AI</span>}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'activity' && metrics && (
        <section className="admin-panel">
          <h2>Recent games</h2>
          {metrics.recentGames.length === 0 ? (
            <p className="admin-empty">No games recorded yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Player</th>
                    <th>Mode</th>
                    <th>Score</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentGames.map((g, i) => (
                    <tr key={`${g.playedAt}-${g.username}-${i}`}>
                      <td className="admin-time">{formatTime(g.playedAt)}</td>
                      <td>
                        {g.displayName}
                        <span className="admin-sub">@{g.username}</span>
                      </td>
                      <td>{g.mode === 'online' ? 'Online' : 'Solo'}</td>
                      <td>{g.score}</td>
                      <td className={g.won ? 'admin-win' : 'admin-loss'}>{g.won ? 'Win' : 'Loss'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="admin-section-gap">Top players</h2>
          {metrics.topPlayers.length === 0 ? (
            <p className="admin-empty">No leaderboard data yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Games</th>
                  <th>Wins</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topPlayers.map((p) => (
                  <tr key={p.username}>
                    <td>
                      <strong>{p.displayName}</strong>
                      <span className="admin-sub">@{p.username}</span>
                    </td>
                    <td>{p.gamesPlayed}</td>
                    <td>{p.wins}</td>
                    <td>{p.totalPoints.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
