import { apiUrl } from '../api';

/** Never reuse another account's cached /me response in the native HTTP layer. */
export function fetchSessionProfile(token: string): Promise<Response> {
  return fetch(apiUrl(`/api/user/me?sessionCheck=${Date.now()}-${Math.random().toString(36).slice(2)}`), {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache, no-store' },
  });
}
