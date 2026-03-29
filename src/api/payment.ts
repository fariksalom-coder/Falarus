import { apiUrl } from '../api';
import {
  normalizePaymentProductCode,
  type PaymentProductCode,
  type SubscriptionTariffType,
} from '../../shared/paymentProducts';

export type TariffType = SubscriptionTariffType;
export type Currency = 'UZS' | 'RUB' | 'USD';

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export type MyPaymentRow = {
  id: number;
  tariff_type: string;
  product_code: PaymentProductCode;
  currency: string;
  amount: number;
  payment_proof_url: string | null;
  created_at: string;
  status: PaymentStatus;
  approved_at: string | null;
};

export async function getMyPayments(token: string): Promise<MyPaymentRow[]> {
  const res = await fetch(apiUrl('/api/user/payments'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'To\'lovlar yuklanmadi');
  return (data ?? []).map((row: MyPaymentRow) => ({
    ...row,
    product_code: normalizePaymentProductCode(row.product_code),
  }));
}

export async function submitPayment(
  token: string,
  payload: {
    tariffType?: TariffType | null;
    productCode: PaymentProductCode;
    currency: Currency;
    file: File;
  }
): Promise<{ success: true; id: number }> {
  const form = new FormData();
  if (payload.tariffType) form.append('tariff_type', payload.tariffType);
  form.append('product_code', payload.productCode);
  form.append('currency', payload.currency);
  form.append('payment_time', new Date().toISOString());
  form.append('upload_file', payload.file);

  const res = await fetch(apiUrl('/api/payments'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || "To'lov yuborilmadi") as Error & { code?: string };
    err.code = data?.error;
    throw err;
  }
  return data;
}
