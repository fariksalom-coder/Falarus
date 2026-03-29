import { normalizePaymentProductCode, type PaymentProductCode } from './paymentProducts.js';

/** Legacy DB without `payments.product_code`: encode product on proof URL query string. */
const PARAM = 'falarus_product';

export function embedFalarusProductInProofUrl(url: string | null | undefined, productCode: string): string {
  const u = String(url ?? '').trim();
  if (!u) return u;
  try {
    const parsed = new URL(u);
    parsed.searchParams.set(PARAM, productCode);
    return parsed.toString();
  } catch {
    const sep = u.includes('?') ? '&' : '?';
    return `${u}${sep}${PARAM}=${encodeURIComponent(productCode)}`;
  }
}

export function readFalarusProductFromProofUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const v = new URL(url).searchParams.get(PARAM);
    return v && v.trim().length > 0 ? v.trim() : null;
  } catch {
    return null;
  }
}

export function resolvePaymentProductFromRow(row: {
  product_code?: string | null;
  payment_proof_url?: string | null;
}): PaymentProductCode {
  if (row.product_code != null && String(row.product_code).trim() !== '') {
    return normalizePaymentProductCode(row.product_code);
  }
  const fromUrl = readFalarusProductFromProofUrl(row.payment_proof_url ?? undefined);
  if (fromUrl) return normalizePaymentProductCode(fromUrl);
  return normalizePaymentProductCode(undefined);
}
