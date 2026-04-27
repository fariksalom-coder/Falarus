type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const inflightRequests = new Map<string, Promise<unknown>>();
const memoryCache = new Map<string, CacheEntry<unknown>>();

function nowMs(): number {
  return Date.now();
}

export function getCachedValue<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= nowMs()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number): void {
  if (ttlMs <= 0) return;
  memoryCache.set(key, { value, expiresAt: nowMs() + ttlMs });
}

export function invalidateCachedValue(key: string): void {
  memoryCache.delete(key);
  inflightRequests.delete(key);
}

export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of Array.from(memoryCache.keys())) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
  for (const key of Array.from(inflightRequests.keys())) {
    if (key.startsWith(prefix)) inflightRequests.delete(key);
  }
}

export async function cachedRequest<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const fromCache = getCachedValue<T>(key);
  if (fromCache !== null) return fromCache;

  const inFlight = inflightRequests.get(key);
  if (inFlight) return inFlight as Promise<T>;

  const pending = fetcher()
    .then((value) => {
      setCachedValue(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, pending);
  return pending;
}
