import { apiUrl } from '../api';
import type { PaymentProductCode, SubscriptionTariffType } from '../../shared/paymentProducts';

export type RahmatPaymentCreateResponse = {
  success: true;
  payment_id: number;
  payment_url: string;
  amount: number;
  currency: 'UZS';
};

export async function createRahmatPayment(
  token: string,
  payload: {
    tariffType?: SubscriptionTariffType | null;
    productCode: PaymentProductCode;
  }
): Promise<RahmatPaymentCreateResponse> {
  const res = await fetch(apiUrl('/api/payments/rahmat/create'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      tariff_type: payload.tariffType ?? null,
      product_code: payload.productCode,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || 'Rahmat to‘lovi yaratilmadi') as Error & {
      code?: string;
    };
    err.code = data?.error;
    throw err;
  }
  return data;
}
