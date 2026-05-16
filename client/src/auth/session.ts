import type { AuthSession, AuthUser } from './types';

const SESSION_KEY = 'pacRoyalSession';
const ONBOARDING_KEY = 'pacRoyalOnboarded';

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function hasCompletedOnboarding(userId: string) {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    if (!raw) return false;
    const ids = JSON.parse(raw) as string[];
    return ids.includes(userId);
  } catch {
    return false;
  }
}

export function markOnboardingComplete(userId: string) {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    if (!ids.includes(userId)) ids.push(userId);
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(ids));
  } catch {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify([userId]));
  }
}

export type { AuthUser };
