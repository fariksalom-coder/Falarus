/**
 * Bounded LRU cache with per-entry TTL.
 *
 * Built specifically to replace the unbounded `new Map()` + `until`
 * pattern used for short-lived in-memory caches (e.g. access checks,
 * profile snapshots). Two failure modes that pattern had:
 *
 *   1. The Map grew unbounded — a long-running Express process serving
 *      100k unique users a day eventually OOMs.
 *   2. Stale entries were only evicted when their key was looked up
 *      again. Inactive users' entries lived forever.
 *
 * This implementation evicts the least-recently-used entry once the
 * cap is reached, and `get()` skips (and removes) entries past their
 * TTL.
 *
 * Notes:
 * - Relies on `Map`'s guaranteed insertion order: re-inserting a key
 *   moves it to the "most recent" end. Cheap O(1) per access.
 * - Single-process. For multi-replica scaling use Redis instead.
 */
export class LruTtlCache<K, V> {
  private store = new Map<K, { value: V; until: number }>();
  constructor(private readonly maxEntries: number) {
    if (maxEntries <= 0) throw new Error('LruTtlCache maxEntries must be > 0');
  }

  get(key: K): V | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.until) {
      this.store.delete(key);
      return null;
    }
    // Touch: move to end of insertion order (most recently used).
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, ttlMs: number): void {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, until: Date.now() + ttlMs });
    if (this.store.size > this.maxEntries) {
      // Map iteration order = insertion order, so the first key is the
      // oldest. Drop it.
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
  }

  delete(key: K): void {
    this.store.delete(key);
  }

  /** Visible for tests / metrics. */
  get size(): number {
    return this.store.size;
  }
}
