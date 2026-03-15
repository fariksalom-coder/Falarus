import { apiUrl } from '../api';

export type TariffType = 'month' | '3months' | 'year';
export type Currency = 'UZS' | 'RUB' | 'USD';

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export type MyPaymentRow = {
  id: number;
  tariff_type: string;
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
  return data;
}

export async function submitPayment(
  token: string,
  tariffType: TariffType,
  currency: Currency,
  file: File
): Promise<{ success: true; id: number }> {
  const form = new FormData();
  form.append('tariff_type', tariffType);
  form.append('currency', currency);
  form.append('payment_time', new Date().toISOString());
  form.append('upload_file', file);

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
