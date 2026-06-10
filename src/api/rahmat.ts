import { apiUrl } from '../api';
import type {
  PaymentProductCode,
  SubscriptionTariffType,
  TeacherListingPlanCode,
} from '../../shared/paymentProducts';

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
    listingPlanCode?: TeacherListingPlanCode;
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
      listing_plan_code: payload.listingPlanCode ?? null,
    }),
  });
  const raw = await res.text();
  let data: {
    message?: string;
    user_message?: string;
    error?: string;
    success?: boolean;
    payment_url?: string;
  } = {};
  if (raw) {
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      /* ignore */
    }
  }
  if (!res.ok) {
    const userFacing =
      typeof data.user_message === 'string' && data.user_message.trim()
        ? data.user_message.trim()
        : typeof data.message === 'string' && data.message.trim()
          ? data.message.trim()
          : typeof data.error === 'string' && data.error.trim()
            ? data.error.trim()
            : 'Rahmat to‘lovi yaratilmadi';
    const err = new Error(userFacing) as Error & { code?: string };
    err.code = data.error;
    throw err;
  }
  return data as RahmatPaymentCreateResponse;
}

/**
 * Rahmat checkout: yangi oynada checkout URL (popup bloklansa — joriy oyna).
 * Xatolikda popup yopiladi, chaqiruvchi catch qiladi.
 */
export async function openRahmatCheckout(params: {
  token: string;
  productCode: PaymentProductCode;
  tariffType?: SubscriptionTariffType | null;
  listingPlanCode?: TeacherListingPlanCode;
  /** To‘lov yaratilgach, redirectdan oldin (masalan, modal yopish / cache yangilash) */
  afterCreate?: () => void | Promise<void>;
}): Promise<void> {
  if (params.productCode === 'russian' && !params.tariffType) {
    throw new Error('Tarif turi topilmadi. Sahifani yangilang.');
  }
  if (params.productCode === 'teacher_listing' && !params.listingPlanCode) {
    throw new Error('To‘lov rejasi topilmadi. Sahifani yangilang.');
  }
  const popup = window.open('', '_blank');
  try {
    const result = await createRahmatPayment(params.token, {
      tariffType: params.productCode === 'russian' ? params.tariffType ?? null : null,
      productCode: params.productCode,
      listingPlanCode: params.listingPlanCode,
    });
    await params.afterCreate?.();
    const url = result.payment_url;
    if (popup && !popup.closed) {
      popup.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch (e) {
    popup?.close();
    throw e;
  }
}
