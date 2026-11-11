/**
 * ILOVA KONFIGURATSIYASI — narxlar, maxsus taklif va videolar.
 *
 * Bularning hammasi BAZADA saqlanadi va admin paneldan o'zgartiriladi. Sayt va
 * mobil ilovalar ularni `GET /api/app-config` dan oladi — shuning uchun narx,
 * taklif vaqti yoki video almashtirilganda ilovani qayta chiqarish kerak emas.
 *
 * Bu fayldagi qiymatlar faqat ZAXIRA: server javob bermasa (internet yo'q)
 * yoki bazada yozuv bo'lmasa ishlatiladi.
 */
import {
  FIRST_1000_PROMO,
  buildRussianTariffPlans,
  isRussianTariffCode,
  type RussianTariffCode,
  type RussianTariffRubPlan,
} from './russianTariffs';

export type WelcomeOfferSettings = {
  /** Ro'yxatdan o'tgandan keyin necha daqiqa ichida video ketma-ketligi ochiladi. */
  eligibilityMinutes: number;
  /** Bonus ochilgandan keyin taklifni sotib olish uchun necha daqiqa beriladi. */
  offerMinutes: number;
  /** Kurs videosi tugashiga necha soniya qolganda bonus ochiladi. */
  revealSecondsBeforeEnd: number;
  /** Qaysi tarif narxi to'lanadi (masalan, 3 oy). */
  payTariff: RussianTariffCode;
  /** Qaysi tarif muddati beriladi (masalan, 6 oy). */
  accessTariff: RussianTariffCode;
  /** Taklifning o'z narxi. `null` — `payTariff` narxi olinadi. */
  priceUzs: number | null;
  priceRub: number | null;
};

export type AppMediaSettings = {
  courseOfferVideo: string;
  courseOfferPoster: string;
  paymentGuideVideo: string;
  paymentGuidePoster: string;
};

/** Mijozga boradigan, hisob-kitobi bajarilgan taklif. */
export type WelcomeOfferView = WelcomeOfferSettings & {
  /** Haqiqatda to'lanadigan narx. */
  finalPriceUzs: number;
  finalPriceRub: number;
  /** "Eski" narx — beriladigan muddatning oylik narxdagi qiymati. */
  oldPriceUzs: number;
  oldPriceRub: number;
  discountPercent: number;
  /** Bepul qo'shiladigan oylar (6 − 3 = 3). */
  freeMonths: number;
};

/** Aksiya «birinchi 1000 yangi o‘quvchi»: 3/6 oylik tarif −50%. */
export type First1000PromoView = {
  code: string;
  limit: number;
  /** Qolgan o‘rinlar; `null` — server javob bermagan (zaxira). */
  left: number | null;
  prices: Partial<Record<RussianTariffCode, { rub: number; uzs: number }>>;
};

export const DEFAULT_FIRST_1000_PROMO: First1000PromoView = {
  code: FIRST_1000_PROMO.code,
  limit: FIRST_1000_PROMO.limit,
  left: null,
  prices: { ...FIRST_1000_PROMO.prices },
};

export function normalizeFirst1000Promo(raw: unknown): First1000PromoView | null {
  if (raw === null) return null;
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const left = Number(r.left);
  const prices: First1000PromoView['prices'] = {};
  const rawPrices = (r.prices && typeof r.prices === 'object' ? r.prices : {}) as Record<string, { rub?: unknown; uzs?: unknown }>;
  for (const code of ['three_month', 'six_month'] as const) {
    const fallback = DEFAULT_FIRST_1000_PROMO.prices[code]!;
    prices[code] = {
      rub: positiveOrNull(rawPrices[code]?.rub) ?? fallback.rub,
      uzs: positiveOrNull(rawPrices[code]?.uzs) ?? fallback.uzs,
    };
  }
  return {
    code: DEFAULT_FIRST_1000_PROMO.code,
    limit: positiveOrNull(r.limit) ?? DEFAULT_FIRST_1000_PROMO.limit,
    left: r.left === undefined || r.left === null || !Number.isFinite(left) ? null : Math.max(0, Math.round(left)),
    prices,
  };
}

export type AppConfig = {
  plans: RussianTariffRubPlan[];
  /** `null` — aksiya tugagan yoki o‘chirilgan. */
  promo: First1000PromoView | null;
  welcomeOffer: WelcomeOfferView;
  media: AppMediaSettings;
  /** Konfiguratsiya oxirgi o'zgargan vaqt (ISO). */
  updatedAt: string | null;
};

export const DEFAULT_WELCOME_OFFER: WelcomeOfferSettings = {
  eligibilityMinutes: 10,
  offerMinutes: 10,
  revealSecondsBeforeEnd: 20,
  payTariff: 'three_month',
  accessTariff: 'six_month',
  priceUzs: null,
  priceRub: null,
};

export const DEFAULT_MEDIA: AppMediaSettings = {
  courseOfferVideo: '/videos/welcome-combined.mp4',
  courseOfferPoster: '/videos/welcome-poster.jpg',
  paymentGuideVideo: '/payment-guide/russia.mp4',
  paymentGuidePoster: '/payment-guide/russia.jpg',
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

function positiveOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Bazadan yoki admin formadan kelgan qiymatni xavfsiz shaklga keltiradi. */
export function normalizeWelcomeOffer(raw: unknown): WelcomeOfferSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_WELCOME_OFFER;
  return {
    eligibilityMinutes: clampInt(r.eligibilityMinutes, 1, 60 * 24 * 30, d.eligibilityMinutes),
    offerMinutes: clampInt(r.offerMinutes, 1, 60 * 24 * 7, d.offerMinutes),
    revealSecondsBeforeEnd: clampInt(r.revealSecondsBeforeEnd, 0, 600, d.revealSecondsBeforeEnd),
    payTariff: isRussianTariffCode(r.payTariff) ? r.payTariff : d.payTariff,
    accessTariff: isRussianTariffCode(r.accessTariff) ? r.accessTariff : d.accessTariff,
    priceUzs: positiveOrNull(r.priceUzs),
    priceRub: positiveOrNull(r.priceRub),
  };
}

/** Faqat sayt ichidagi yo'l (`/videos/...`) yoki https manzil qabul qilinadi. */
function mediaPath(value: unknown, fallback: string): string {
  const s = typeof value === 'string' ? value.trim() : '';
  // `?v=...` — server qo'shadigan fayl versiyasi (keshni yangilash uchun); u ham qabul qilinadi.
  if (/^\/[A-Za-z0-9._~\-/]+(\?v=[A-Za-z0-9._-]+)?$/.test(s) && !s.includes('..')) return s;
  if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
  return fallback;
}

export function normalizeMedia(raw: unknown): AppMediaSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    courseOfferVideo: mediaPath(r.courseOfferVideo, DEFAULT_MEDIA.courseOfferVideo),
    courseOfferPoster: mediaPath(r.courseOfferPoster, DEFAULT_MEDIA.courseOfferPoster),
    paymentGuideVideo: mediaPath(r.paymentGuideVideo, DEFAULT_MEDIA.paymentGuideVideo),
    paymentGuidePoster: mediaPath(r.paymentGuidePoster, DEFAULT_MEDIA.paymentGuidePoster),
  };
}

export function buildWelcomeOfferView(settings: WelcomeOfferSettings, plans: RussianTariffRubPlan[]): WelcomeOfferView {
  const plan = (code: RussianTariffCode) => plans.find((p) => p.code === code)!;
  const pay = plan(settings.payTariff);
  const access = plan(settings.accessTariff);
  const monthly = plan('month');
  const finalPriceUzs = settings.priceUzs ?? pay.priceUzs;
  const finalPriceRub = settings.priceRub ?? pay.priceRub;
  const oldPriceUzs = monthly.priceUzs * access.months;
  const oldPriceRub = monthly.priceRub * access.months;
  return {
    ...settings,
    finalPriceUzs,
    finalPriceRub,
    oldPriceUzs,
    oldPriceRub,
    discountPercent: oldPriceRub > 0 ? Math.max(0, Math.round((1 - finalPriceRub / oldPriceRub) * 100)) : 0,
    freeMonths: Math.max(0, access.months - pay.months),
  };
}

export function buildAppConfig(input: {
  prices?: Parameters<typeof buildRussianTariffPlans>[0];
  welcomeOffer?: unknown;
  media?: unknown;
  promo?: unknown;
  updatedAt?: string | null;
}): AppConfig {
  const plans = buildRussianTariffPlans(input.prices ?? {});
  return {
    plans,
    promo: input.promo === undefined ? DEFAULT_FIRST_1000_PROMO : normalizeFirst1000Promo(input.promo),
    welcomeOffer: buildWelcomeOfferView(normalizeWelcomeOffer(input.welcomeOffer), plans),
    media: normalizeMedia(input.media),
    updatedAt: input.updatedAt ?? null,
  };
}

export const DEFAULT_APP_CONFIG: AppConfig = buildAppConfig({});

/** Bonus ochilgan paytdan taklif tugaydigan vaqt. */
export function welcomeOfferExpiresAt(nowMs: number, offerMinutes: number): string {
  return new Date(nowMs + offerMinutes * 60_000).toISOString();
}

/** Kurs videosida bonusgacha qolgan soniyalar (`null` — davomiylik hali noma'lum). */
export function secondsUntilBonus(duration: number, currentTime: number, revealSecondsBeforeEnd: number): number | null {
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(currentTime)) return null;
  return Math.ceil(Math.max(0, duration - revealSecondsBeforeEnd - currentTime));
}
