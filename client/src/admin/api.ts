import type {
  AdminLiveRoomsResponse,
  AdminMetrics,
  AdminUsersResponse,
} from '../../../shared/adminTypes';
import type { AuthSession } from '../auth/types';

const API_BASE =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Request failed');
  return data as T;
}

export async function checkAdminAccess(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/check`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { ok?: boolean; admin?: boolean };
    return Boolean(data.ok && data.admin);
  } catch {
    return false;
  }
}

export async function fetchAdminMetrics(token: string): Promise<AdminMetrics> {
  return request<AdminMetrics>('/api/admin/metrics', token);
}

export async function fetchAdminUsers(token: string, search = ''): Promise<AdminUsersResponse> {
  const q = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : '';
  return request<AdminUsersResponse>(`/api/admin/users${q}`, token);
}

export async function fetchAdminLiveRooms(token: string): Promise<AdminLiveRoomsResponse> {
  return request<AdminLiveRoomsResponse>('/api/admin/rooms', token);
}

export async function deleteAdminUser(token: string, userId: string): Promise<void> {
  await request<{ ok: boolean }>(`/api/admin/users/${encodeURIComponent(userId)}`, token, {
    method: 'DELETE',
  });
}

export type { AuthSession };
