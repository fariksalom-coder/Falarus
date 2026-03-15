import { apiUrl } from '../api';

export type TariffType = 'month' | '3months' | 'year';
export type Currency = 'UZS' | 'RUB' | 'USD';

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
  if (!res.ok) throw new Error(data?.error || 'To\'lov yuborilmadi');
  return data;
}
