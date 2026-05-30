import { apiUrl } from '../api';

export type AuthUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string | null;
  level: string;
  onboarded: number;
  progress?: number;
  totalPoints?: number;
  planName?: string | null;
  planExpiresAt?: string | null;
};

type AuthResponse = {
  token?: string;
  user?: AuthUser;
  isNewUser?: boolean;
  error?: string;
};

async function parseAuthResponse(res: Response): Promise<AuthResponse> {
  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    const text = await res.text();
    console.error('API returned non-JSON:', text?.slice(0, 200));
    throw new Error(res.ok ? 'Xatolik yuz berdi' : 'Server xatosi. Keyinroq urinib ko‘ring.');
  }
  try {
    return (await res.json()) as AuthResponse;
  } catch {
    throw new Error('Server javobi noto‘g‘ri');
  }
}

export async function loginWithPassword(identifier: string, password: string): Promise<AuthResponse> {
  const res = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await parseAuthResponse(res);
  if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
  if (!data.token || !data.user) throw new Error('Xatolik yuz berdi');
  return data;
}

export async function registerAccount(payload: {
  firstName: string;
  lastName: string;
  identifier: string;
  password: string;
  ref?: string;
}): Promise<AuthResponse> {
  const res = await fetch(apiUrl('/api/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseAuthResponse(res);
  if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
  if (!data.token || !data.user) throw new Error('Xatolik yuz berdi');
  return { ...data, isNewUser: true };
}

export async function loginWithGoogle(idToken: string, ref?: string): Promise<AuthResponse> {
  const res = await fetch(apiUrl('/api/auth/google'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, ref: ref || undefined }),
  });
  const data = await parseAuthResponse(res);
  if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
  if (!data.token || !data.user) throw new Error('Xatolik yuz berdi');
  return data;
}
