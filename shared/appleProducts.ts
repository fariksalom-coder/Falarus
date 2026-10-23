import type { PaymentProductCode, SubscriptionTariffType } from './paymentProducts';

export const APPLE_PRODUCTS = {
  'falarus.premium.monthly': { productCode: 'russian', tariffType: 'month', label: '1 oy' },
  'falarus.premium.three_month': { productCode: 'russian', tariffType: 'three_month', label: '3 oy' },
  'falarus.premium.six_month': { productCode: 'russian', tariffType: 'six_month', label: '6 oy' },
  'falarus.premium.yearly': { productCode: 'russian', tariffType: 'year', label: '1 yil' },
  'falarus.patent': { productCode: 'patent', tariffType: null, label: 'Patent imtihoni' },
  'falarus.vnzh': { productCode: 'vnzh', tariffType: null, label: 'VNJ imtihoni' },
} as const;

export type AppleProductId = keyof typeof APPLE_PRODUCTS;
export function isAppleProductId(value: string): value is AppleProductId {
  return Object.prototype.hasOwnProperty.call(APPLE_PRODUCTS, value);
}

export function appleProductId(productCode: PaymentProductCode, tariffType?: SubscriptionTariffType | null): AppleProductId | null {
  return (Object.keys(APPLE_PRODUCTS) as AppleProductId[]).find(id => {
    const product = APPLE_PRODUCTS[id];
    return product.productCode === productCode && product.tariffType === (tariffType ?? null);
  }) ?? null;
}

export function requiresApplePurchase(product: PaymentProductCode): boolean {
  // Jonli o'qituvchi bilan darslar (sinov va pullik) — shaxsdan-shaxsga xizmat, App Store 3.1.3(d).
  return product !== 'teacher_trial' && product !== 'teacher_lesson';
}
