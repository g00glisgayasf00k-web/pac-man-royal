import { useCallback, useEffect, useState } from 'react';
import type { AdminMetrics } from '../../../shared/adminTypes';
import { checkAdminAccess, fetchAdminMetrics } from '../admin/api';
import { fetchMe, login } from '../auth/api';
import { clearSession, loadSession, saveSession } from '../auth/session';
import type { AuthSession } from '../auth/types';
import '../styles/admin.css';

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

function MetricsDashboard({ metrics, onRefresh }: { metrics: AdminMetrics; onRefresh: () => void }) {
  const { overview, byMode, signupsByDay, gamesByDay, topPlayers, recentGames } = metrics;
  const dayLabels = signupsByDay.map((d) => formatDay(d.date));

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div>
          <p className="admin-kicker">PAC-MAN ROYAL</p>
          <h1>Admin metrics</h1>
        </div>
        <div className="admin-header-actions">
          <span className="admin-meta">
            {metrics.storage === 'postgres' ? 'PostgreSQL' : 'Local file'} · Updated{' '}
            {formatTime(metrics.generatedAt)}
          </span>
          <button type="button" className="admin-btn" onClick={onRefresh}>
            Refresh
          </button>
          <a href="/" className="admin-btn admin-btn-ghost">
            Back to game
          </a>
        </div>
      </header>

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
          {byMode.map((m) => (
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
            series={[{ name: 'Signups', values: signupsByDay.map((d) => d.count), className: 'seg-signup' }]}
          />
        </article>
        <article className="admin-panel">
          <h2>Games (7 days)</h2>
          <BarChart
            labels={dayLabels}
            series={[
              { name: 'Solo', values: gamesByDay.map((d) => d.local), className: 'seg-local' },
              { name: 'Online', values: gamesByDay.map((d) => d.online), className: 'seg-online' },
            ]}
          />
          <div className="admin-legend">
            <span className="seg-local">Solo</span>
            <span className="seg-online">Online</span>
          </div>
        </article>
      </section>

      <section className="admin-tables">
        <article className="admin-panel">
          <h2>Top players</h2>
          {topPlayers.length === 0 ? (
            <p className="admin-empty">No games recorded yet.</p>
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
                {topPlayers.map((p) => (
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
        </article>

        <article className="admin-panel">
          <h2>Recent games</h2>
          {recentGames.length === 0 ? (
            <p className="admin-empty">No recent games.</p>
          ) : (
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
                {recentGames.map((g, i) => (
                  <tr key={`${g.playedAt}-${g.username}-${i}`}>
                    <td className="admin-time">{formatTime(g.playedAt)}</td>
                    <td>{g.displayName}</td>
                    <td>{g.mode === 'online' ? 'Online' : 'Solo'}</td>
                    <td>{g.score}</td>
                    <td className={g.won ? 'admin-win' : 'admin-loss'}>{g.won ? 'Win' : 'Loss'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </section>
    </div>
  );
}

export function AdminScreen() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const loadMetrics = useCallback(async (token: string) => {
    setError(null);
    const data = await fetchAdminMetrics(token);
    setMetrics(data);
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    const saved = loadSession();
    if (!saved?.token) {
      setSession(null);
      setLoading(false);
      return;
    }
    try {
      const user = await fetchMe(saved.token);
      const next = { token: saved.token, user };
      saveSession(next);
      setSession(next);
      const admin = await checkAdminAccess(saved.token);
      if (!admin) {
        setDenied(true);
        setLoading(false);
        return;
      }
      await loadMetrics(saved.token);
    } catch {
      clearSession();
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [loadMetrics]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const next = await login(username, password);
      saveSession(next);
      setSession(next);
      const admin = await checkAdminAccess(next.token);
      if (!admin) {
        setDenied(true);
        return;
      }
      await loadMetrics(next.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (!session?.token) return;
    setLoading(true);
    loadMetrics(session.token)
      .catch((err) => setError(err instanceof Error ? err.message : 'Refresh failed'))
      .finally(() => setLoading(false));
  };

  if (loading && !metrics) {
    return (
      <div className="admin-gate">
        <p>Loading admin…</p>
      </div>
    );
  }

  if (!session || denied) {
    return (
      <div className="admin-gate">
        <div className="admin-gate-box">
          <p className="admin-kicker">PAC-MAN ROYAL</p>
          <h1>Admin</h1>
          {denied && (
            <p className="admin-error">
              This account is not an admin. Set <code>ADMIN_USERNAMES</code> on the server (comma-separated
              usernames).
            </p>
          )}
          {error && <p className="admin-error">{error}</p>}
          <form onSubmit={handleLogin} className="admin-form">
            <label>
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button type="submit" className="admin-btn" disabled={loading}>
              Sign in
            </button>
          </form>
          <a href="/" className="admin-back">
            ← Back to game
          </a>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="admin-gate">
        <p className="admin-error">{error}</p>
        <button type="button" className="admin-btn" onClick={handleRefresh}>
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  return <MetricsDashboard metrics={metrics} onRefresh={handleRefresh} />;
}
