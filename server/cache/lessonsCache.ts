/**
 * In-memory cache for GET /api/lessons response per user.
 * Reduces DB + access checks when user revisits the main lessons page.
 */
const TTL_MS = 60 * 1000; // 1 minute
const cache = new Map<number, { list: unknown[]; until: number }>();

export function getCachedLessonsList(userId: number): unknown[] | null {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return null;
  const entry = cache.get(uid);
  if (!entry || Date.now() > entry.until) return null;
  return entry.list;
}

export function setCachedLessonsList(userId: number, list: unknown[]): void {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return;
  cache.set(uid, { list, until: Date.now() + TTL_MS });
}

export function invalidateLessonsCache(userId: number): void {
  const uid = Number(userId);
  if (Number.isFinite(uid)) cache.delete(uid);
}
