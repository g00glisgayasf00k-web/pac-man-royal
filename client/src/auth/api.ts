import type {
  LeaderboardEntry,
  LeaderboardMode,
  LeaderboardResponse,
} from '../../../shared/leaderboardTypes';
import type { AuthSession } from './types';

const API_BASE =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Request failed');
  return data as T;
}

export async function register(
  username: string,
  password: string,
  displayName: string
): Promise<AuthSession> {
  return request<AuthSession>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, displayName }),
  });
}

export async function login(username: string, password: string): Promise<AuthSession> {
  return request<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function fetchMe(token: string): Promise<AuthSession['user']> {
  const data = await request<{ user: AuthSession['user'] }>('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.user;
}

export async function logout(token: string) {
  await request('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

export async function fetchLeaderboard(
  mode: LeaderboardMode,
  limit = 10
): Promise<LeaderboardEntry[]> {
  const data = await request<LeaderboardResponse>(
    `/api/leaderboard?mode=${mode}&limit=${limit}`
  );
  return data.entries;
}

export async function recordGameResult(
  token: string,
  payload: { score: number; won: boolean; mode: LeaderboardMode }
): Promise<void> {
  await request('/api/leaderboard/record', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}
