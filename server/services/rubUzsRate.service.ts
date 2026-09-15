/**
 * RUB → UZS kursi: O‘zbekiston Markaziy banki (cbu.uz).
 * Soatiga bir marta yangilanadi (xotira + ixtiyoriy Redis).
 */
import { getRedis } from '../lib/redis.js';
import { RUB_UZS_FALLBACK_RATE } from '../../shared/rubUzs.js';

const CBU_RUB_URL = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/RUB/';
const CACHE_TTL_SEC = 60 * 60; // 1 soat
const REDIS_KEY = 'fx:rub_uzs:cbu';
const FETCH_TIMEOUT_MS = 8_000;

export type RubUzsRateInfo = {
  /** 1 RUB = N UZS */
  rate: number;
  /** CBU sanasi (DD.MM.YYYY) yoki ISO. */
  asOf: string;
  source: 'cbu' | 'cache' | 'fallback';
  updatedAt: string;
};

type MemoryCache = {
  info: RubUzsRateInfo;
  expiresAt: number;
};

let memoryCache: MemoryCache | null = null;
let inflight: Promise<RubUzsRateInfo> | null = null;

type CbuRubRow = {
  Ccy?: string;
  Rate?: string | number;
  Nominal?: string | number;
  Date?: string;
};

function parseCbuRate(rows: unknown): { rate: number; asOf: string } | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows.find((r) => String((r as CbuRubRow).Ccy ?? '').toUpperCase() === 'RUB') as
    | CbuRubRow
    | undefined;
  if (!row) return null;
  const rawRate = Number(row.Rate);
  const nominal = Number(row.Nominal ?? 1) || 1;
  if (!Number.isFinite(rawRate) || rawRate <= 0) return null;
  // CBU: Rate = Nominal birlik uchun UZS (odatda Nominal=1).
  const rate = rawRate / nominal;
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return {
    rate: Math.round(rate * 10_000) / 10_000,
    asOf: String(row.Date ?? '').trim() || new Date().toISOString().slice(0, 10),
  };
}

async function fetchFromCbu(): Promise<RubUzsRateInfo> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(CBU_RUB_URL, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`CBU HTTP ${res.status}`);
    const json = (await res.json()) as unknown;
    const parsed = parseCbuRate(json);
    if (!parsed) throw new Error('CBU RUB parse failed');
    return {
      rate: parsed.rate,
      asOf: parsed.asOf,
      source: 'cbu',
      updatedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function readRedis(): Promise<RubUzsRateInfo | null> {
  const redis = await getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(REDIS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RubUzsRateInfo;
    if (!parsed || !Number.isFinite(parsed.rate) || parsed.rate <= 0) return null;
    return { ...parsed, source: 'cache' };
  } catch {
    return null;
  }
}

async function writeRedis(info: RubUzsRateInfo): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.set(REDIS_KEY, JSON.stringify(info), 'EX', CACHE_TTL_SEC);
  } catch {
    /* ignore */
  }
}

function fallbackInfo(): RubUzsRateInfo {
  return {
    rate: RUB_UZS_FALLBACK_RATE,
    asOf: 'fallback',
    source: 'fallback',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Joriy 1 RUB → UZS kursi (CBU, 1 soat cache).
 */
export async function getRubToUzsRate(): Promise<RubUzsRateInfo> {
  const now = Date.now();
  if (memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.info;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    const fromRedis = await readRedis();
    if (fromRedis) {
      memoryCache = { info: fromRedis, expiresAt: now + CACHE_TTL_SEC * 1000 };
      return fromRedis;
    }

    try {
      const fresh = await fetchFromCbu();
      memoryCache = { info: fresh, expiresAt: now + CACHE_TTL_SEC * 1000 };
      await writeRedis(fresh);
      return fresh;
    } catch (e) {
      console.warn('[rubUzsRate] CBU fetch failed, using fallback', e);
      // Eski xotira hali bor bo‘lsa — undan foydalanamiz (muddati o‘tgan bo‘lsa ham).
      if (memoryCache?.info) {
        return { ...memoryCache.info, source: 'cache' };
      }
      const fb = fallbackInfo();
      memoryCache = { info: fb, expiresAt: now + 5 * 60 * 1000 };
      return fb;
    }
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
