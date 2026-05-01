import { apiUrl } from '../api';
import type { CourseProductCode, SubscriptionTariffType } from '../../shared/paymentProducts';

export type ClickPaymentCreateResponse = {
  success: true;
  payment_id: number;
  payment_url: string;
  amount: number;
  currency: 'UZS';
};

export type ClickCardTokenRequestResponse = {
  phone_number: string;
  card_token: string;
  temporary: number;
};

export async function requestClickCardToken(
  token: string,
  payload: {
    card_number: string;
    expire_date: string;
    plan_type: SubscriptionTariffType;
  }
): Promise<ClickCardTokenRequestResponse> {
  const res = await fetch(apiUrl('/api/payments/click/card-token/request'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      card_number: payload.card_number,
      expire_date: payload.expire_date,
      plan_type: payload.plan_type,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'SMS yuborilmadi');
  }
  return data as ClickCardTokenRequestResponse;
}

export async function verifyClickCardToken(
  token: string,
  payload: {
    card_token: string;
    sms_code: string;
    plan_type: SubscriptionTariffType;
  }
): Promise<{ success: boolean; auto_pay_enabled?: boolean; message?: string }> {
  const res = await fetch(apiUrl('/api/payments/click/card-token/verify'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      card_token: payload.card_token,
      sms_code: payload.sms_code,
      plan_type: payload.plan_type,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || 'Tasdiqlash yoki to‘lov amalga oshmadi') as Error & {
      code?: string;
    };
    err.code = data?.error;
    throw err;
  }
  return data;
}

export async function deleteClickCardToken(token: string): Promise<void> {
  const res = await fetch(apiUrl('/api/payments/click/card-token/delete'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Avtomatik to‘lov o‘chirilmadi');
  }
}

export async function createClickPayment(
  token: string,
  payload: {
    tariffType?: SubscriptionTariffType | null;
    /** Patent / VNZH bir martalik Click — `russian` bu yerda boʻlmasligi kerak */
    productCode: CourseProductCode;
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
      product_code: payload.productCode,
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
