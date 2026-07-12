/** True when running inside a Capacitor WebView (APK) without a dev server. */
export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  // Capacitor Android uses https://localhost as the bundled app origin.
  return window.location.protocol === 'https:' && window.location.hostname === 'localhost';
}

/** API / Socket.io base URL for the game server. */
export function getServerUrl(): string {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  if (isCapacitorNative()) {
    return '';
  }
  return window.location.origin;
}
