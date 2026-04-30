import { apiUrl } from '../api';
import {
  normalizePaymentProductCode,
  type PaymentProductCode,
  type SubscriptionTariffType,
} from '../../shared/paymentProducts';

export type ClickPaymentCreateResponse = {
  success: true;
  payment_id: number;
  payment_url: string;
  amount: number;
  currency: 'UZS';
};

export async function createClickPayment(
  token: string,
  payload: {
    tariffType?: SubscriptionTariffType | null;
    productCode: PaymentProductCode;
  }
): Promise<ClickPaymentCreateResponse> {
  const res = await fetch(apiUrl('/api/payments/click/create'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      tariff_type: payload.tariffType ?? null,
      product_code: normalizePaymentProductCode(payload.productCode),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || 'Click to‘lovi yaratilmadi') as Error & {
      code?: string;
    };
    err.code = data?.error;
    throw err;
  }
  return data;
}
