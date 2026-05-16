import type { AdminMetrics } from '../../../shared/adminTypes';
import type { AuthSession } from '../auth/types';

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

export async function checkAdminAccess(token: string): Promise<boolean> {
  try {
    const data = await request<{ ok: boolean; admin: boolean }>('/api/admin/check', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.ok && data.admin;
  } catch {
    return false;
  }
}

export async function fetchAdminMetrics(token: string): Promise<AdminMetrics> {
  return request<AdminMetrics>('/api/admin/metrics', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export type { AuthSession };
