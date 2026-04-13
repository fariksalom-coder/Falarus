/** Base URL for API. Empty = same origin (dev with Express). Set VITE_API_URL on Vercel to your backend URL. */
const ENV_API_BASE = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  ?.VITE_API_URL || '';

function resolveApiBase(): string {
  if (!ENV_API_BASE) return '';
  if (typeof window === 'undefined') return ENV_API_BASE;

  try {
    const configured = new URL(ENV_API_BASE, window.location.origin);
    const current = new URL(window.location.origin);

    const normalizeHost = (h: string) => h.replace(/^www\./, '');
    const sameHostFamily =
      normalizeHost(configured.hostname) === normalizeHost(current.hostname) &&
      configured.protocol === current.protocol;

    // Keep API same-origin for same host family (apex <-> www).
    // This avoids CORS preflight redirects between www and apex domains.
    if (configured.origin === current.origin || sameHostFamily) {
      return '';
    }

    return configured.origin;
  } catch {
    return ENV_API_BASE;
  }
}

export const API_BASE = resolveApiBase();

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
