import { NativePurchases, PURCHASE_TYPE, type Transaction } from '@capgo/native-purchases';
import { apiUrl } from '../api';
import { APPLE_PRODUCTS, isAppleProductId, type AppleProductId } from '../../shared/appleProducts';
import { invalidateCacheByPrefix } from '../utils/requestCache';
import { isNativeIOS } from './platform';

const confirmations = new Map<string, Promise<void>>();
let billingBusy = false;

export async function confirmAppleTransaction(token: string, transaction: Transaction): Promise<void> {
  if (!isAppleProductId(transaction.productIdentifier)) return;
  const key = `${token}:${transaction.transactionId}`;
  const pending = confirmations.get(key);
  if (pending) return pending;
  const request = (async () => {
    const product = APPLE_PRODUCTS[transaction.productIdentifier as AppleProductId];
    const response = await fetch(apiUrl('/api/payments/store/confirm'), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ product_code: product.productCode, tariff_type: product.tariffType,
        store_product_id: transaction.productIdentifier, purchase_id: transaction.transactionId,
        verification_source: 'app_store' }),
    });
    const data = await response.json();
    if (!response.ok || data.success !== true) {
      const message = /ANOTHER_ACCOUNT|ACCOUNT_MISMATCH/.test(data.error ?? '')
        ? 'Bu Apple xaridi boshqa FalaRus hisobiga tegishli. Xarid qilingan hisobga kiring.'
        : /EXPIRED|REVOKED/.test(data.error ?? '') ? 'Bu xaridning amal qilish muddati tugagan yoki bekor qilingan.'
        : 'Xaridni tasdiqlab bo‘lmadi. Pul qayta to‘lanmasligi uchun «Xaridlarni tiklash»ni bosing.';
      throw new Error(message);
    }
    invalidateCacheByPrefix('');
    sessionStorage.removeItem('vocab_access');
    // Content has been granted durably by the server before finishing StoreKit.
    await NativePurchases.acknowledgePurchase({ purchaseToken: transaction.transactionId });
  })();
  confirmations.set(key, request);
  try { await request; } finally { confirmations.delete(key); }
}

export async function purchaseAppleProduct(token: string, id: AppleProductId): Promise<void> {
  if (!isNativeIOS()) throw new Error('Apple xaridlari iPhone ilovasida mavjud.');
  if (billingBusy) throw new Error('Oldingi xarid yakunlanishini kuting.');
  billingBusy = true;
  try {
    const response = await fetch(apiUrl('/api/payments/store/account'), { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok || typeof data.appAccountToken !== 'string') throw new Error('Xaridni boshlab bo‘lmadi. Keyinroq urinib ko‘ring.');
    const transaction = await NativePurchases.purchaseProduct({ productIdentifier: id,
      productType: APPLE_PRODUCTS[id].productCode === 'russian' ? PURCHASE_TYPE.SUBS : PURCHASE_TYPE.INAPP,
      appAccountToken: data.appAccountToken, autoAcknowledgePurchases: false });
    await confirmAppleTransaction(token, transaction);
  } finally { billingBusy = false; }
}

export async function syncApplePurchases(token: string, restore = false): Promise<number> {
  if (!isNativeIOS()) return 0;
  if (restore) await NativePurchases.restorePurchases();
  const { purchases } = await NativePurchases.getPurchases();
  // StoreKit can return historical renewals: newest first, active only.
  const active = purchases.filter(item => isAppleProductId(item.productIdentifier)
    && !item.revocationDate && !item.isUpgraded
    && (APPLE_PRODUCTS[item.productIdentifier as AppleProductId].productCode !== 'russian'
      || (item.expirationDate && Date.parse(item.expirationDate) > Date.now())))
    .sort((a, b) => Date.parse(b.purchaseDate) - Date.parse(a.purchaseDate));
  const seen = new Set<string>();
  let restored = 0;
  for (const transaction of active) {
    if (seen.has(transaction.productIdentifier)) continue;
    seen.add(transaction.productIdentifier);
    await confirmAppleTransaction(token, transaction);
    restored++;
  }
  return restored;
}

export function isApplePurchaseCancelled(error: unknown): boolean {
  return /cancel|bekor|userCancelled|USER_CANCELED/i.test(error instanceof Error ? error.message : String(error));
}
