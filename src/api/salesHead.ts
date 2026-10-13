import { apiUrl } from '../api';
import { adminApi } from '../lib/adminApi';
import type { SalesHeadDashboard, SalesHeadSettings } from '../../shared/salesHead';

const TOKEN_KEY = 'salesHeadToken';

export function getSalesHeadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSalesHeadToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode: the session simply is not remembered */
  }
}

export class SalesHeadAuthError extends Error {}

async function salesHeadApi<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const token = getSalesHeadToken();
  const res = await fetch(apiUrl(`/api/sales-head${endpoint}`), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && endpoint !== '/login') {
    setSalesHeadToken(null);
    throw new SalesHeadAuthError(body.error || 'Войдите снова');
  }
  if (!res.ok) throw new Error(body.error || 'Не удалось загрузить данные. Попробуйте ещё раз.');
  return body as T;
}

export const salesHeadLogin = (login: string, password: string) =>
  salesHeadApi<{ token: string; name: string }>('/login', { method: 'POST', body: JSON.stringify({ login, password }) });

export const salesHeadMe = () => salesHeadApi<{ name: string }>('/me');

export const salesHeadDashboard = (month: string) =>
  salesHeadApi<SalesHeadDashboard>(`/dashboard?month=${encodeURIComponent(month)}`);

export type SalesHeadAccount = { id: number; login: string; name: string; active: boolean; created_at: string };

export const salesHeadAdmin = {
  settings: () => adminApi<SalesHeadSettings>('/sales-head/settings'),
  saveSettings: (settings: SalesHeadSettings) =>
    adminApi<SalesHeadSettings>('/sales-head/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  dashboard: (month: string) => adminApi<SalesHeadDashboard>(`/sales-head/dashboard?month=${encodeURIComponent(month)}`),
  accounts: () => adminApi<SalesHeadAccount[]>('/sales-head/accounts'),
  createAccount: (body: { login: string; name: string; password: string }) =>
    adminApi<{ id: number }>('/sales-head/accounts', { method: 'POST', body: JSON.stringify(body) }),
  updateAccount: (id: number, body: { action: 'enable' | 'disable' | 'password'; password?: string }) =>
    adminApi<{ ok: true }>(`/sales-head/accounts/${id}`, { method: 'POST', body: JSON.stringify(body) }),
};
