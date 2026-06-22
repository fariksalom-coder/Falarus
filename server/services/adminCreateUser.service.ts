import type { DbClient } from '../types/dbClient';
import bcrypt from 'bcryptjs';
import { parseContactIdentifier, sanitizePhoneRaw } from '../../shared/authIdentifiers.js';
import {
  getCourseProductPrice,
  isSubscriptionTariffType,
  type PaymentProductCode,
} from '../../shared/paymentProducts.js';
import { isPaymentsProductCodeSchemaError } from '../../shared/paymentsCompat.js';
import * as subscriptionService from './subscription.service.js';
import { resolveRussianTariffQuote } from './promoPricing.service.js';

const MIN_PASSWORD_LEN = 8;
const ADMIN_WEEK_TRIAL_DAYS = 7;

export type AdminCreateUserInput = {
  firstName: string;
  lastName: string;
  identifier: string;
  password: string;
  adminId: number;
  russianTariff: 'month' | 'year' | 'week' | null;
  grantPatent: boolean;
  grantVnzh: boolean;
  /** To‘lov summalari (ixtiyoriy). Kiritilmasa — joriy narxlar ishlatiladi. */
  amountRussian?: number | null;
  /** Patent narxi (courseCurrency dagi valyutada) */
  amountPatent?: number | null;
  /** VNJ narxi (courseCurrency dagi valyutada) */
  amountVnzh?: number | null;
  /** Patent / VNJ uchun valyuta (Rus tili har doim UZS bo‘yicha quote) */
  courseCurrency?: 'UZS' | 'USD' | 'RUB';
};

export type AdminCreateUserResult = {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  login_identifier: string;
  password: string;
  grants: { russian: boolean; patent: boolean; vnzh: boolean; week_trial: boolean };
  access_expires_at: string | null;
};

function isCurrencyCode(v: string): v is 'UZS' | 'USD' | 'RUB' {
  return v === 'UZS' || v === 'USD' || v === 'RUB';
}

async function insertApprovedPayment(
  supabase: DbClient,
  opts: {
    userId: number;
    adminId: number;
    productCode: PaymentProductCode;
    tariffType: 'month' | 'year' | null;
    amount: number;
    currency: string;
  }
): Promise<void> {
  if (!Number.isFinite(opts.amount) || opts.amount < 0) {
    throw new Error("To'lov summasi manfiy bo'lmasligi kerak");
  }
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    user_id: opts.userId,
    tariff_type: opts.tariffType,
    product_code: opts.productCode,
    currency: opts.currency,
    amount: opts.amount,
    base_amount: opts.amount,
    discount_amount: 0,
    discount_meta: null,
    payment_proof_url: null,
    payment_time: now,
    status: 'approved',
    admin_id: opts.adminId,
    approved_at: now,
    payment_channel: 'manual',
  };

  const first = await supabase.from('payments').insert(row);
  if (!first.error) return;

  if (!isPaymentsProductCodeSchemaError(first.error)) {
    throw new Error(first.error.message || "To'lov yozilmadi");
  }

  const legacy: Record<string, unknown> = {
    ...row,
    tariff_type: opts.productCode === 'russian' ? opts.tariffType : 'month',
  };
  delete legacy.product_code;
  const second = await supabase.from('payments').insert(legacy);
  if (second.error) {
    throw new Error(second.error.message || "To'lov yozilmadi (legacy)");
  }
}

/** Admin: 7 kunlik bepul sinov — to‘lov yozilmaydi (aks holda doimiy kirish qoladi). */
async function grantRussianWeekTrial(supabase: DbClient, userId: number): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + ADMIN_WEEK_TRIAL_DAYS);

  const { error: updateUserErr } = await supabase
    .from('users')
    .update({ plan_name: '1 HAFTA', plan_expires_at: expiresAt.toISOString() })
    .eq('id', userId);
  if (updateUserErr) throw new Error(updateUserErr.message);

  await subscriptionService.createOrExtendSubscription(supabase, userId, 'monthly', expiresAt);
  return expiresAt.toISOString();
}

async function grantRussianAccess(
  supabase: DbClient,
  userId: number,
  tariffType: 'month' | 'year',
  adminId: number,
  amountUzs: number
): Promise<void> {
  if (!isSubscriptionTariffType(tariffType)) {
    throw new Error('russianTariff: month yoki year bo‘lishi kerak');
  }
  const planType = tariffType === 'year' ? 'yearly' : 'monthly';
  const daysToAdd = tariffType === 'year' ? 365 : 30;
  const planName = tariffType === 'year' ? '1 YIL' : '1 OY';
  const now = new Date();

  const { data: current } = await supabase
    .from('users')
    .select('plan_expires_at')
    .eq('id', userId)
    .single();
  const currentEnd = current?.plan_expires_at ? new Date(current.plan_expires_at as string) : null;
  const startFrom = currentEnd && currentEnd > now ? currentEnd : now;
  const ext = new Date(startFrom);
  ext.setDate(ext.getDate() + daysToAdd);

  const { error: updateUserErr } = await supabase
    .from('users')
    .update({ plan_name: planName, plan_expires_at: ext.toISOString() })
    .eq('id', userId);
  if (updateUserErr) throw new Error(updateUserErr.message);

  await subscriptionService.createOrExtendSubscription(supabase, userId, planType, ext);

  await insertApprovedPayment(supabase, {
    userId,
    adminId,
    productCode: 'russian',
    tariffType,
    amount: amountUzs,
    currency: 'UZS',
  });
}

async function grantCourseAccess(
  supabase: DbClient,
  userId: number,
  productCode: 'patent' | 'vnzh',
  adminId: number,
  amount: number,
  currency: 'UZS' | 'USD' | 'RUB'
): Promise<void> {
  await insertApprovedPayment(supabase, {
    userId,
    adminId,
    productCode,
    tariffType: null,
    amount,
    currency,
  });
}

/**
 * Admin panel: yangi foydalanuvchi yaratish va naqd / boshqa kanal orqali to‘langan tariflarni yozish.
 */
export async function adminCreateUserWithAccess(
  supabase: DbClient,
  input: AdminCreateUserInput
): Promise<AdminCreateUserResult> {
  const {
    firstName,
    lastName,
    identifier: idRaw,
    password,
    adminId,
    russianTariff,
    grantPatent,
    grantVnzh,
  } = input;

  const identifier = typeof idRaw === 'string' ? idRaw.trim() : '';
  const parsed = parseContactIdentifier(identifier);
  if (parsed.ok === false) {
    throw new Error(parsed.error);
  }
  if (!password || typeof password !== 'string' || password.length < MIN_PASSWORD_LEN) {
    throw new Error(`Parol kamida ${MIN_PASSWORD_LEN} belgi bo‘lishi kerak`);
  }
  if (russianTariff === 'week' && !parsed.phone) {
    throw new Error("1 haftalik bepul sinov uchun telefon raqami kiritilishi kerak");
  }
  if (russianTariff === 'week' && (grantPatent || grantVnzh)) {
    throw new Error('1 haftalik sinov bilan Patent yoki VNJ bir vaqtda berilmaydi');
  }

  const ccRaw = String(input.courseCurrency ?? 'UZS');
  const courseCurrency: 'UZS' | 'USD' | 'RUB' = isCurrencyCode(ccRaw) ? ccRaw : 'UZS';

  const hashedPassword = await bcrypt.hash(password, 10);
  const insertRow: Record<string, unknown> = {
    first_name: firstName ?? '',
    last_name: lastName ?? '',
    email: parsed.email,
    phone: parsed.phone,
    password: hashedPassword,
    onboarded: 1,
  };
  if (parsed.phone) {
    insertRow.phone_raw = sanitizePhoneRaw(identifier);
    insertRow.phone_normalized = parsed.phone;
    insertRow.country_code = parsed.phoneCountryIso ?? null;
    insertRow.phone_verified = false;
    insertRow.phone_invalid = false;
  }

  const { data: user, error: insertErr } = await supabase
    .from('users')
    .insert(insertRow)
    .select('id, first_name, last_name, email, phone')
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') {
      throw new Error("Bu email yoki telefon allaqachon ro'yxatdan o'tgan");
    }
    throw new Error(insertErr.message || 'Foydalanuvchi yaratilmadi');
  }

  const userId = Number(user.id);
  const { ensureUserInLeaderboard } = await import('./leaderboard.service.js');
  await ensureUserInLeaderboard(supabase, userId).catch(() => {});

  let accessExpiresAt: string | null = null;

  try {
    if (russianTariff === 'week') {
      accessExpiresAt = await grantRussianWeekTrial(supabase, userId);
    } else if (russianTariff) {
      let amount =
        input.amountRussian != null && Number.isFinite(Number(input.amountRussian))
          ? Number(input.amountRussian)
          : 0;
      if (amount <= 0) {
        const quote = await resolveRussianTariffQuote(supabase, {
          userId,
          currency: 'UZS',
          tariffType: russianTariff,
          startPromoIfMissing: false,
        });
        amount = quote.finalAmount;
      }
      await grantRussianAccess(supabase, userId, russianTariff, adminId, amount);
    }

    if (grantPatent) {
      let amount =
        input.amountPatent != null && Number.isFinite(Number(input.amountPatent))
          ? Number(input.amountPatent)
          : 0;
      if (amount <= 0) {
        amount = getCourseProductPrice('patent', courseCurrency);
      }
      await grantCourseAccess(supabase, userId, 'patent', adminId, amount, courseCurrency);
    }

    if (grantVnzh) {
      let amount =
        input.amountVnzh != null && Number.isFinite(Number(input.amountVnzh))
          ? Number(input.amountVnzh)
          : 0;
      if (amount <= 0) {
        amount = getCourseProductPrice('vnzh', courseCurrency);
      }
      await grantCourseAccess(supabase, userId, 'vnzh', adminId, amount, courseCurrency);
    }
  } catch (e) {
    await supabase.from('users').delete().eq('id', userId);
    throw e;
  }

  subscriptionService.invalidateAccessCache(userId);
  try {
    const { invalidateLessonsCache } = await import('../cache/lessonsCache.js');
    invalidateLessonsCache(userId);
  } catch {
    /* optional */
  }

  return {
    user: {
      id: userId,
      firstName: user.first_name ?? '',
      lastName: user.last_name ?? '',
      email: user.email ?? null,
      phone: user.phone ?? null,
    },
    login_identifier: identifier,
    password,
    grants: {
      russian: Boolean(russianTariff),
      patent: grantPatent,
      vnzh: grantVnzh,
      week_trial: russianTariff === 'week',
    },
    access_expires_at: accessExpiresAt,
  };
}
