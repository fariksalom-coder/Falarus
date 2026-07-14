export type CurrencyCode = 'UZS' | 'RUB' | 'USD';
/**
 * Russian language course subscription plans.
 *   • three_month — 3 oy (90 days) entry-level plan.
 *   • year        — 1 yil (365 days) full plan.
 *
 * Legacy value 'month' (30-day plan, deprecated 2026-07) is still recognised
 * by getSubscriptionTariffLabel so historic payment history renders correctly,
 * but new checkouts must use 'three_month' or 'year'.
 */
export type SubscriptionTariffType = 'three_month' | 'year';
export type CourseProductCode = 'patent' | 'vnzh';
export type TeacherListingProductCode = 'teacher_listing';
export type TeacherTrialProductCode = 'teacher_trial';
export type TeacherProductCode = TeacherListingProductCode | TeacherTrialProductCode;
export type PaymentProductCode = 'russian' | CourseProductCode | TeacherProductCode;
export type PaymentProvider = 'manual' | 'click' | 'rahmat';

export const SUBSCRIPTION_PRODUCT_CODE = 'russian' as const;
export const TEACHER_LISTING_PRODUCT_CODE = 'teacher_listing' as const;
export const TEACHER_TRIAL_PRODUCT_CODE = 'teacher_trial' as const;

export const TEACHER_LISTING_PLAN_FIRST = 'teacher_listing_first_month_uzs' as const;
export const TEACHER_LISTING_PLAN_MONTH = 'teacher_listing_month_uzs' as const;

export type TeacherListingPlanCode =
  | typeof TEACHER_LISTING_PLAN_FIRST
  | typeof TEACHER_LISTING_PLAN_MONTH;

export const TEACHER_LISTING_PRICES_UZS: Record<TeacherListingPlanCode, number> = {
  [TEACHER_LISTING_PLAN_FIRST]: 69_000,
  [TEACHER_LISTING_PLAN_MONTH]: 299_000,
};

export function isTeacherListingPlanCode(value: unknown): value is TeacherListingPlanCode {
  return value === TEACHER_LISTING_PLAN_FIRST || value === TEACHER_LISTING_PLAN_MONTH;
}

export function resolveTeacherListingPlanCode(firstDiscountUsed: boolean): TeacherListingPlanCode {
  return firstDiscountUsed ? TEACHER_LISTING_PLAN_MONTH : TEACHER_LISTING_PLAN_FIRST;
}

export function getTeacherListingPriceUzs(planCode: TeacherListingPlanCode): number {
  return TEACHER_LISTING_PRICES_UZS[planCode];
}

export function getTeacherListingPlanLabel(planCode: TeacherListingPlanCode): string {
  if (planCode === TEACHER_LISTING_PLAN_FIRST) {
    return "O'qituvchi ro'yxati · 1 oy (birinchi oy)";
  }
  return "O'qituvchi ro'yxati · 1 oy";
}

/** Sinov darsi — 490 ₽, UZS hisobida (150 kurs). */
export const TEACHER_TRIAL_PRICE_RUB = 490;
export const TEACHER_TRIAL_PRICE_UZS = 73_500;

export function getTeacherTrialPriceRub(): number {
  return TEACHER_TRIAL_PRICE_RUB;
}

export function getTeacherTrialPriceUzs(): number {
  return TEACHER_TRIAL_PRICE_UZS;
}

export function getTeacherTrialPrice(currency: CurrencyCode): number {
  if (currency === 'RUB') return TEACHER_TRIAL_PRICE_RUB;
  return TEACHER_TRIAL_PRICE_UZS;
}

export const COURSE_PRODUCT_CODES: readonly CourseProductCode[] = ['patent', 'vnzh'] as const;
export const TEACHER_PRODUCT_CODES: readonly TeacherProductCode[] = [
  TEACHER_LISTING_PRODUCT_CODE,
  TEACHER_TRIAL_PRODUCT_CODE,
] as const;
export const PAYMENT_PRODUCT_CODES: readonly PaymentProductCode[] = [
  SUBSCRIPTION_PRODUCT_CODE,
  ...COURSE_PRODUCT_CODES,
  ...TEACHER_PRODUCT_CODES,
] as const;

type CourseProductMeta = {
  label: string;
  buyButtonLabel: string;
  paywallTitle: string;
  paywallDescription: string;
  freeDescription: string;
  prices: Record<CurrencyCode, number>;
};

export const COURSE_PRODUCT_META: Record<CourseProductCode, CourseProductMeta> = {
  patent: {
    label: 'Patent imtihoni',
    buyButtonLabel: 'Kursni sotib olish',
    paywallTitle: 'Patent imtihoni',
    paywallDescription:
      'Qolgan kurs variantlarini ochish uchun «Patent imtihoni» kursini toʻlash kerak.',
    freeDescription: 'Faqat Variant 1 bepul ochiq.',
    prices: {
      UZS: 67_500,
      RUB: 450,
      USD: 7,
    },
  },
  vnzh: {
    label: 'ВНЖ imtihoni',
    buyButtonLabel: 'Kursni sotib olish',
    paywallTitle: 'ВНЖ imtihoni',
    paywallDescription:
      'Qolgan topshiriqlarni ochish uchun «ВНЖ imtihoni» kursini toʻlash kerak.',
    freeDescription: 'Faqat 4-topshiriq (Gapirish) bepul ochiq.',
    prices: {
      UZS: 435_000,
      RUB: 2_900,
      USD: 43,
    },
  },
};

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return value === 'UZS' || value === 'RUB' || value === 'USD';
}

export function isSubscriptionTariffType(value: unknown): value is SubscriptionTariffType {
  return value === 'three_month' || value === 'year';
}

export function isCourseProductCode(value: unknown): value is CourseProductCode {
  return value === 'patent' || value === 'vnzh';
}

export function isTeacherProductCode(value: unknown): value is TeacherProductCode {
  return value === TEACHER_LISTING_PRODUCT_CODE || value === TEACHER_TRIAL_PRODUCT_CODE;
}

export function isPaymentProductCode(value: unknown): value is PaymentProductCode {
  return value === SUBSCRIPTION_PRODUCT_CODE || isCourseProductCode(value) || isTeacherProductCode(value);
}

export function normalizePaymentProductCode(value: unknown): PaymentProductCode {
  return isPaymentProductCode(value) ? value : SUBSCRIPTION_PRODUCT_CODE;
}

export function getCourseProductPrice(
  productCode: CourseProductCode,
  currency: CurrencyCode
): number {
  return COURSE_PRODUCT_META[productCode].prices[currency];
}

export function getPaymentProductLabel(productCode: PaymentProductCode): string {
  if (productCode === SUBSCRIPTION_PRODUCT_CODE) return 'Курс русского языка';
  if (productCode === TEACHER_LISTING_PRODUCT_CODE) return 'O‘qituvchi ro‘yxati';
  if (productCode === TEACHER_TRIAL_PRODUCT_CODE) return 'O‘qituvchi bilan sinov darsi';
  return COURSE_PRODUCT_META[productCode].label;
}

export function getSubscriptionTariffLabel(tariffType: SubscriptionTariffType): string {
  if (tariffType === 'year') return '1 YIL';
  return '3 OY';
}

/** Historic-friendly label — accepts legacy 'month' from payment history. */
export function getSubscriptionTariffLabelLoose(tariffType: string | null | undefined): string {
  if (tariffType === 'year') return '1 YIL';
  if (tariffType === 'three_month') return '3 OY';
  if (tariffType === 'month') return '1 OY';
  return '';
}

export function getPaymentDisplayLabel(
  productCode: PaymentProductCode,
  tariffType?: string | null
): string {
  if (productCode !== SUBSCRIPTION_PRODUCT_CODE) {
    return getPaymentProductLabel(productCode);
  }
  if (isSubscriptionTariffType(tariffType)) {
    return getSubscriptionTariffLabel(tariffType);
  }
  // Legacy 'month' rows in payment history still need a readable label.
  const looseLabel = getSubscriptionTariffLabelLoose(tariffType);
  return looseLabel || getPaymentProductLabel(productCode);
}
