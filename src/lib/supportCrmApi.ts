import { apiUrl } from '../api';
import { supportCrmPath } from '../constants/supportCrmPath';

const TOKEN_KEY = 'supportCrmToken';

export function getSupportCrmToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSupportCrmToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSupportCrmToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

type ApiOptions = RequestInit & { skipAuthRedirect?: boolean };

export async function supportCrmApi<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { skipAuthRedirect, headers, ...rest } = options;
  const token = getSupportCrmToken();

  const mergedHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(headers as HeadersInit | undefined),
  };
  if (token) {
    (mergedHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const url = apiUrl(`/api/support-crm${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
  const res = await fetch(url, { ...rest, headers: mergedHeaders });

  if (res.status === 401) {
    clearSupportCrmToken();
    if (!skipAuthRedirect && typeof window !== 'undefined') {
      window.location.href = supportCrmPath('/login');
    }
    throw new Error('Unauthorized');
  }

  const text = await res.text();
  if (!text.trim()) {
    if (!res.ok) throw new Error(res.statusText || 'API error');
    return {} as T;
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    if (!res.ok) throw new Error(res.statusText || 'API error');
    return {} as T;
  }

  if (!res.ok) {
    const msg =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error: unknown }).error)
        : res.statusText || 'API error';
    throw new Error(msg);
  }

  return data as T;
}
