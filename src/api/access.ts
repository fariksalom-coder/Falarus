import { apiUrl } from '../api';
import { cachedRequest } from '../utils/requestCache';

export type AccessInfo = {
  lessons_free_limit: number;
  vocabulary_free_topic: number;
  vocabulary_free_subtopic: number;
  subscription_active: boolean;
  patent_course_active: boolean;
  vnzh_course_active: boolean;
  vocabulary_free_topic_id?: string | null;
  vocabulary_free_subtopic_id?: string | null;
  /** OLTIN A'ZO: hech qanday qulf yo'q — na to'lov, na ketma-ketlik. */
  golden?: boolean;
};

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

const CACHE_ACCESS = 'vocab_access';
const ACCESS_REQUEST_TTL_MS = 30_000;

export function getCachedAccess(): AccessInfo | null {
  try {
    const raw = sessionStorage.getItem(CACHE_ACCESS);
    if (!raw) return null;
    const data = JSON.parse(raw) as AccessInfo;
    return data && typeof data.subscription_active === 'boolean' ? data : null;
  } catch {
    return null;
  }
}

export function setCachedAccess(data: AccessInfo): void {
  try {
    sessionStorage.setItem(CACHE_ACCESS, JSON.stringify(data));
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






