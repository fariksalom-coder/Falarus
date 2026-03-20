/** Base URL for API. Empty = same origin (dev with Express). Set VITE_API_URL on Vercel to your backend URL. */
const ENV_API_BASE = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  ?.VITE_API_URL || '';

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./i, '').toLowerCase();
}

function resolveApiBase(): string {
  if (!ENV_API_BASE) return '';
  if (typeof window === 'undefined') return ENV_API_BASE;

  try {
    const configured = new URL(ENV_API_BASE, window.location.origin);
    const current = new URL(window.location.origin);

    // If config points to the same site and differs only by alias (e.g. root vs www),
    // prefer same-origin to avoid Vercel alias drift after deploys.
    if (normalizeHost(configured.hostname) === normalizeHost(current.hostname)) {
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
