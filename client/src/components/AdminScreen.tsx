import { useCallback, useEffect, useState } from 'react';
import { AdminDashboard } from '../admin/AdminDashboard';
import { checkAdminAccess } from '../admin/api';
import { fetchMe, login } from '../auth/api';
import { clearSession, loadSession, saveSession } from '../auth/session';
import type { AuthSession } from '../auth/types';
import '../styles/admin.css';

export function AdminScreen() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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
    } catch {
      clearSession();
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
              This account is not an admin. Set <code>ADMIN_USERNAMES</code> on the server.
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

  return <AdminDashboard token={session.token} />;
}
