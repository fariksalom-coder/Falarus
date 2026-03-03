/** Base URL for API. Empty = same origin (dev with Express). Set VITE_API_URL on Vercel to your backend URL. */
export const API_BASE = import.meta.env.VITE_API_URL || '';

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
