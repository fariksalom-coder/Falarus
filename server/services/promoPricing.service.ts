import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionTariffType } from '../../shared/paymentProducts.js';

export const RUSSIAN_PROMO_DURATION_MS = 30 * 60 * 1000;
export const RUSSIAN_PROMO_UZS_PRICE: Record<SubscriptionTariffType, number> = {
  month: 25_000,
  year: 149_000,
};

/** Aksiya narxi RUBda (oylik); yillik uchun narx bazadagi UZS nisbatidan hisoblanadi. */
export const RUSSIAN_PROMO_RUB_PRICE: Partial<Record<SubscriptionTariffType, number>> = {
  month: 200,
};

type Currency = 'UZS' | 'RUB' | 'USD';

export type RussianPromoWindow = {
  startedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  remainingSec: number;
};

export type RussianTariffQuote = {
  tariffType: SubscriptionTariffType;
  currency: Currency;
  baseAmount: number;
  finalAmount: number;
  discountAmount: number;
  promo: RussianPromoWindow;
};

function normalizeTariffType(tariffType: SubscriptionTariffType): 'month' | 'year' {
  return tariffType === 'year' ? 'year' : 'month';
}

function computeRemainingSec(expiresAt: string | null): number {
  if (!expiresAt) return 0;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.max(0, Math.floor(ms / 1000));
}

async function getTariffPrice(
  supabase: SupabaseClient,
  currency: Currency,
  tariffType: SubscriptionTariffType
): Promise<number> {
  const key = normalizeTariffType(tariffType);
  const { data } = await supabase
    .from('tariff_prices')
    .select('price')
    .eq('currency', currency)
    .eq('tariff_type', key)
    .maybeSingle();
  return data != null ? Number((data as { price: number }).price) : 0;
}

async function getUserPromoWindow(supabase: SupabaseClient, userId: number): Promise<RussianPromoWindow> {
  const { data } = await supabase
    .from('users')
    .select('russian_promo_started_at, russian_promo_expires_at')
    .eq('id', userId)
    .maybeSingle();

  const startedAt = data ? String((data as Record<string, unknown>).russian_promo_started_at ?? '') || null : null;
  const expiresAt = data ? String((data as Record<string, unknown>).russian_promo_expires_at ?? '') || null : null;
  const remainingSec = computeRemainingSec(expiresAt);
  return {
    startedAt,
    expiresAt,
    isActive: remainingSec > 0,
    remainingSec,
  };
}

export async function ensureRussianPromoWindow(supabase: SupabaseClient, userId: number): Promise<RussianPromoWindow> {
  const current = await getUserPromoWindow(supabase, userId);
  if (current.startedAt || current.expiresAt) return current;

  const startedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + RUSSIAN_PROMO_DURATION_MS).toISOString();
  const { data: updatedRow, error } = await supabase
    .from('users')
    .update({
      russian_promo_started_at: startedAt,
      russian_promo_expires_at: expiresAt,
    })
    .select('russian_promo_started_at, russian_promo_expires_at')
    .eq('id', userId);
  if (error) {
    return current;
  }

  const updated = Array.isArray(updatedRow) ? updatedRow[0] : null;
  const persistedStartedAt = updated
    ? String((updated as Record<string, unknown>).russian_promo_started_at ?? '') || null
    : null;
  const persistedExpiresAt = updated
    ? String((updated as Record<string, unknown>).russian_promo_expires_at ?? '') || null
    : null;

  if (!persistedStartedAt && !persistedExpiresAt) {
    return current;
  }

  return {
    startedAt: persistedStartedAt,
    expiresAt: persistedExpiresAt,
    isActive: computeRemainingSec(persistedExpiresAt) > 0,
    remainingSec: computeRemainingSec(persistedExpiresAt),
  };
}

export async function getRussianPromoWindow(
  supabase: SupabaseClient,
  userId: number
): Promise<RussianPromoWindow> {
  return getUserPromoWindow(supabase, userId);
}

export async function resolveRussianTariffQuote(
  supabase: SupabaseClient,
  params: {
    userId: number;
    currency: Currency;
    tariffType: SubscriptionTariffType;
    startPromoIfMissing?: boolean;
  }
): Promise<RussianTariffQuote> {
  const promo = params.startPromoIfMissing
    ? await ensureRussianPromoWindow(supabase, params.userId)
    : await getRussianPromoWindow(supabase, params.userId);
  const baseAmount = await getTariffPrice(supabase, params.currency, params.tariffType);

  if (!promo.isActive || baseAmount <= 0) {
    return {
      tariffType: params.tariffType,
      currency: params.currency,
      baseAmount,
      finalAmount: baseAmount,
      discountAmount: 0,
      promo,
    };
  }

  const promoUzsAmount = RUSSIAN_PROMO_UZS_PRICE[params.tariffType];
  let finalAmount = promoUzsAmount;

  const rubPromoFixed =
    params.currency === 'RUB' ? RUSSIAN_PROMO_RUB_PRICE[params.tariffType] : undefined;
  if (params.currency === 'UZS') {
    finalAmount = promoUzsAmount;
  } else if (rubPromoFixed != null && rubPromoFixed > 0) {
    finalAmount = rubPromoFixed;
  } else {
    const baseUzsAmount = await getTariffPrice(supabase, 'UZS', params.tariffType);
    if (baseUzsAmount > 0) {
      finalAmount = Math.max(1, Math.round(baseAmount * (promoUzsAmount / baseUzsAmount)));
    } else {
      finalAmount = baseAmount;
    }
  }

  const discountAmount = Math.max(0, baseAmount - finalAmount);

  return {
    tariffType: params.tariffType,
    currency: params.currency,
    baseAmount,
    finalAmount,
    discountAmount,
    promo,
  };
}
