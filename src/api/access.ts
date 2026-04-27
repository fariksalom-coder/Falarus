import { apiUrl } from '../api';
import { cachedRequest, invalidateCacheByPrefix } from '../utils/requestCache';

export type AccessInfo = {
  lessons_free_limit: number;
  vocabulary_free_topic: number;
  vocabulary_free_subtopic: number;
  subscription_active: boolean;
  patent_course_active: boolean;
  vnzh_course_active: boolean;
  vocabulary_free_topic_id?: string | null;
  vocabulary_free_subtopic_id?: string | null;
};

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

const CACHE_ACCESS = 'vocab_access';
const ACCESS_REQUEST_TTL_MS = 30_000;
const LESSONS_REQUEST_TTL_MS = 30_000;

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

export type LessonWithLock = {
  id: number;
  level?: string;
  module_name?: string;
  title?: string;
  locked: boolean;
  tasks_count?: number;
};

const CACHE_LESSONS = 'lessons_list';

export function getCachedLessons(): LessonWithLock[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_LESSONS);
    if (!raw) return null;
    const data = JSON.parse(raw) as LessonWithLock[];
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function setCachedLessons(list: LessonWithLock[]): void {
  try {
    sessionStorage.setItem(CACHE_LESSONS, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export async function getLessons(token: string | null): Promise<LessonWithLock[]> {
  const cacheKey = `lessons:${token ?? 'guest'}`;
  return cachedRequest(cacheKey, LESSONS_REQUEST_TTL_MS, async () => {
    const res = await fetch(apiUrl('/api/lessons'), { headers: authHeaders(token) });
    if (!res.ok) throw new Error('Darslar yuklanmadi');
    return res.json();
  });
}

export function invalidateAccessAndLessonsRequestCache(): void {
  invalidateCacheByPrefix('access:');
  invalidateCacheByPrefix('lessons:');
}

export type LessonPreview = {
  title: string;
  description: string;
  preview_words: Array<{ word: string; translation: string }>;
  tasks_preview: number;
};

export async function getLessonPreview(
  token: string | null,
  lessonId: number
): Promise<LessonPreview> {
  const q = encodeURIComponent(String(lessonId));
  const res = await fetch(apiUrl(`/api/lessons/preview?lesson_id=${q}`), {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Preview yuklanmadi');
  return res.json();
}

export type SubtopicPreview = {
  title: string;
  preview_words: Array<{ word: string; translation: string }>;
};

export async function getSubtopicPreview(
  token: string | null,
  subtopicId: string
): Promise<SubtopicPreview> {
  const q = encodeURIComponent(String(subtopicId).trim());
  const res = await fetch(apiUrl(`/api/vocabulary/preview?subtopic=${q}`), {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Preview yuklanmadi');
  return res.json();
}
