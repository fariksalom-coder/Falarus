/** Base URL for API. Empty = same origin (dev with Express). Set VITE_API_URL on Vercel to your backend URL. */
const ENV_API_BASE = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  ?.VITE_API_URL || '';

function resolveApiBase(): string {
  if (!ENV_API_BASE) return '';
  if (typeof window === 'undefined') return ENV_API_BASE;

  try {
    const configured = new URL(ENV_API_BASE, window.location.origin);
    const current = new URL(window.location.origin);

    // Only use relative `/api` when origins match exactly (same host + scheme).
    // Treating www vs apex as "same" forces requests to www, which may be static-only
    // while API lives on the apex (or vice versa) → 404 on vocabulary routes.
    if (configured.origin === current.origin) {
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
