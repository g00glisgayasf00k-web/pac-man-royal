/** Normalize a room code for display and server join */
export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

/** Read ?room=CODE from the current page URL */
export function readRoomCodeFromUrl(): string | null {
  const code = new URLSearchParams(window.location.search).get('room');
  if (!code) return null;
  const normalized = normalizeRoomCode(code);
  return normalized.length >= 4 ? normalized : null;
}

/** Full shareable link — opens the game with join code pre-filled */
export function buildRoomInviteLink(code: string): string {
  const url = new URL(window.location.origin);
  url.pathname = '/';
  url.searchParams.set('room', normalizeRoomCode(code));
  return url.toString();
}

/** Remove ?room= from the address bar after applying it */
export function clearRoomFromUrl(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('room')) return;
  url.searchParams.delete('room');
  const next = url.pathname + (url.search ? url.search : '');
  window.history.replaceState({}, '', next);
}
