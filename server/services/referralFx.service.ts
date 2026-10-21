/**
 * Withdrawal thresholds for the referral program: 2 000 RUB converted with the
 * official Central Bank of Uzbekistan (cbu.uz) rates.
 *
 * Deliberately no fallback rate: when cbu.uz is unreachable or its rate is
 * stale, the caller gets RATE_UNAVAILABLE and the user is asked to retry.
 */
export type ReferralCurrency = 'UZS' | 'RUB' | 'USD';

export type FxSnapshot = {
  /** 1 RUB = rubUzs UZS */
  rubUzs: number;
  /** 1 USD = usdUzs UZS */
  usdUzs: number;
  /** Date the bank published the rates (DD.MM.YYYY). */
  asOf: string;
  source: 'cbu';
};

export class RateUnavailableError extends Error {
  code = 'RATE_UNAVAILABLE' as const;
  constructor(message = "Valyuta kursini Markaziy bankdan olib bo'lmadi. Birozdan keyin qayta urinib ko'ring.") {
    super(message);
  }
}

type CbuRow = { Ccy?: string; Rate?: string | number; Nominal?: string | number; Date?: string };
type Fetcher = (url: string) => Promise<unknown>;

const CBU_URL = (ccy: string) => `https://cbu.uz/uz/arkhiv-kursov-valyut/json/${ccy}/`;
const CACHE_MS = 30 * 60 * 1000;
const MAX_AGE_DAYS = 5;

let fetcher: Fetcher = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`cbu ${res.status}`);
  return res.json();
};
let cache: { value: FxSnapshot; expires: number } | null = null;

/** Tests replace the network call; passing null restores the real one. */
export function setFxFetcherForTests(next: Fetcher | null, now?: () => number) {
  cache = null;
  if (next) fetcher = next;
  if (now) clock = now;
}
let clock = () => Date.now();

function parseCbuDate(value: string): number | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  return m ? Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
}

async function cbuRate(ccy: 'RUB' | 'USD'): Promise<{ rate: number; asOf: string }> {
  const rows = await fetcher(CBU_URL(ccy));
  const row = Array.isArray(rows) ? (rows as CbuRow[]).find((r) => String(r.Ccy ?? '').toUpperCase() === ccy) : undefined;
  const rate = Number(row?.Rate) / (Number(row?.Nominal ?? 1) || 1);
  const asOf = String(row?.Date ?? '');
  const published = parseCbuDate(asOf);
  if (!Number.isFinite(rate) || rate <= 0 || published === null) throw new Error(`cbu ${ccy} malformed`);
  if (clock() - published > MAX_AGE_DAYS * 86_400_000) throw new Error(`cbu ${ccy} stale ${asOf}`);
  return { rate, asOf };
}

export async function getFxSnapshot(): Promise<FxSnapshot> {
  if (cache && cache.expires > clock()) return cache.value;
  try {
    const [rub, usd] = await Promise.all([cbuRate('RUB'), cbuRate('USD')]);
    const value: FxSnapshot = { rubUzs: rub.rate, usdUzs: usd.rate, asOf: rub.asOf, source: 'cbu' };
    cache = { value, expires: clock() + CACHE_MS };
    return value;
  } catch (e) {
    console.warn('[referral-fx]', e instanceof Error ? e.message : e);
    throw new RateUnavailableError();
  }
}

/** Minimum withdrawal per currency, rounded up so it is never below the RUB base. */
export function withdrawalMinimums(baseRub: number, fx: FxSnapshot): Record<ReferralCurrency, number> {
  return {
    RUB: baseRub,
    UZS: Math.ceil(baseRub * fx.rubUzs),
    USD: Math.ceil((baseRub * fx.rubUzs / fx.usdUzs) * 100) / 100,
  };
}
