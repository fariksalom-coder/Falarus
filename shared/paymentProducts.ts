export type CurrencyCode = 'UZS' | 'RUB' | 'USD';
export type SubscriptionTariffType = 'month' | '3months' | 'year';
export type CourseProductCode = 'patent' | 'vnzh';
export type PaymentProductCode = 'russian' | CourseProductCode;

export const SUBSCRIPTION_PRODUCT_CODE = 'russian' as const;

export const COURSE_PRODUCT_CODES: readonly CourseProductCode[] = ['patent', 'vnzh'] as const;
export const PAYMENT_PRODUCT_CODES: readonly PaymentProductCode[] = [
  SUBSCRIPTION_PRODUCT_CODE,
  ...COURSE_PRODUCT_CODES,
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
  return value === 'month' || value === '3months' || value === 'year';
}

export function isCourseProductCode(value: unknown): value is CourseProductCode {
  return value === 'patent' || value === 'vnzh';
}

export function isPaymentProductCode(value: unknown): value is PaymentProductCode {
  return value === SUBSCRIPTION_PRODUCT_CODE || isCourseProductCode(value);
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
  return COURSE_PRODUCT_META[productCode].label;
}

export function getSubscriptionTariffLabel(tariffType: SubscriptionTariffType): string {
  if (tariffType === 'year') return '1 YIL';
  if (tariffType === '3months') return '3 OY';
  return '1 OY';
}

export function getPaymentDisplayLabel(
  productCode: PaymentProductCode,
  tariffType?: string | null
): string {
  if (productCode !== SUBSCRIPTION_PRODUCT_CODE) {
    return getPaymentProductLabel(productCode);
  }
  return isSubscriptionTariffType(tariffType)
    ? getSubscriptionTariffLabel(tariffType)
    : getPaymentProductLabel(productCode);
}
