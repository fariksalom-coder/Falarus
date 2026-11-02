import { apiUrl } from '../api';
import { cachedRequest } from '../utils/requestCache';

export type AccessInfo = {
  lessons_free_limit: number;
  vocabulary_free_topic: number;
  vocabulary_free_subtopic: number;
  subscription_active: boolean;
  kunlik_review_days?: number[];
  patent_course_active: boolean;
  vnzh_course_active: boolean;
  vocabulary_free_topic_id?: string | null;
  vocabulary_free_subtopic_id?: string | null;
  /** OLTIN A'ZO: hech qanday qulf yo'q — na to'lov, na ketma-ketlik. */
  golden?: boolean;
  /** Obuna qachon tugashi (ISO). Muddat banneri shu asosda ko'rsatiladi. */
  subscription_expires_at?: string | null;
};

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/*
 * Last known access lives in localStorage, not sessionStorage: the mobile app starts a new session on every
 * launch, and without it a paying user saw locks and "Tariflarni ko'rish" until /api/user/access answered.
 * The entry is bound to the token, so another account on the same phone never reads it.
 */
export const CACHE_ACCESS = 'falarus:access:v1';
const ACCESS_REQUEST_TTL_MS = 30_000;

const cacheOwner = (token: string | null) => (token ? token.slice(-24) : '');

export function getCachedAccess(): AccessInfo | null {
  try {
    const raw = localStorage.getItem(CACHE_ACCESS);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { owner?: string; data?: AccessInfo };
    const owner = cacheOwner(localStorage.getItem('token'));
    const data = entry?.data;
    return owner && entry.owner === owner && data && typeof data.subscription_active === 'boolean' ? data : null;
  } catch {
    return null;
  }
}

export function setCachedAccess(data: AccessInfo): void {
  try {
    const owner = cacheOwner(localStorage.getItem('token'));
    if (owner) localStorage.setItem(CACHE_ACCESS, JSON.stringify({ owner, data }));
  } catch {
    /* ignore */
  }
}

export function clearCachedAccess(): void {
  try {
    localStorage.removeItem(CACHE_ACCESS);
  } catch {
    /* ignore */
  }
}

export async function getAccess(token: string | null): Promise<AccessInfo> {
  const cacheKey = `access:${token ?? 'guest'}`;
  return cachedRequest(cacheKey, ACCESS_REQUEST_TTL_MS, async () => {
    const res = await fetch(apiUrl('/api/user/access'), { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Access yuklanmadi');
    return res.json();
  });
}






