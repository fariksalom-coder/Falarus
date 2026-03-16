import { apiUrl } from '../api';

const ADMIN_TOKEN_KEY = 'adminToken';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

type AdminApiOptions = RequestInit & { skipAuthRedirect?: boolean };

export async function adminApi<T = unknown>(
  endpoint: string,
  options: AdminApiOptions = {}
): Promise<T> {
  const { skipAuthRedirect, headers, ...rest } = options;
  const token = getAdminToken();

  const mergedHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(headers as HeadersInit | undefined),
  };
  if (token) {
    (mergedHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const url = apiUrl(`/api/admin${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
  const res = await fetch(url, { ...rest, headers: mergedHeaders });

  if (res.status === 401) {
    clearAdminToken();
    if (!skipAuthRedirect && typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
    throw new Error('Unauthorized');
  }

  const text = await res.text();
  if (!text.trim()) {
    if (!res.ok) throw new Error(res.statusText || 'API error');
    return {} as T;
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    if (!res.ok) throw new Error(res.statusText || 'API error');
    return {} as T;
  }

  if (!res.ok) {
    const msg = data?.error || res.statusText || 'API error';
    throw new Error(msg);
  }

  return data as T;
}

