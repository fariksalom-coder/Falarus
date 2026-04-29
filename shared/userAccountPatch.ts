import type { SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import {
  isValidNormalizedEmail,
  normalizeEmail,
  sanitizePhoneRaw,
  PHONE_MAX_LENGTH,
  normalizePhoneInputToE164,
} from './authIdentifiers.js';

export type AccountPatchResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * PATCH body: optional email, phone; newPassword + newPasswordConfirm to change password.
 * currentPassword is required only when setting a new password (email/phone use session auth only).
 * Empty string for email/phone clears the field if the other contact remains.
 */
export async function applyUserAccountPatch(
  supabase: SupabaseClient,
  userId: number,
  body: Record<string, unknown>
): Promise<AccountPatchResult> {
  const newPassRaw = typeof body.newPassword === 'string' ? body.newPassword : '';
  const newPass2Raw = typeof body.newPasswordConfirm === 'string' ? body.newPasswordConfirm : '';
  const wantsPasswordChange = Boolean(newPassRaw || newPass2Raw);

  const { data: user, error: fetchErr } = await supabase
    .from('users')
    .select('id, email, phone, phone_normalized, password')
    .eq('id', userId)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, status: 500, error: "Xatolik yuz berdi" };
  }
  if (!user || typeof user.password !== 'string') {
    return { ok: false, status: 404, error: 'User topilmadi' };
  }

  if (wantsPasswordChange) {
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    if (!currentPassword) {
      return { ok: false, status: 400, error: "Parolni almashtirish uchun joriy parol kiritilishi shart" };
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return { ok: false, status: 401, error: "Parol noto'g'ri" };
    }
  }

  let nextEmail: string | null =
    user.email === undefined || user.email === null ? null : String(user.email);
  let nextPhone: string | null =
    user.phone === undefined || user.phone === null ? null : String(user.phone);
  let nextPhoneRaw: string | null = null;
  let nextCountryIso: string | null = null;

  if ('email' in body) {
    const v = body.email;
    if (v === null || v === '') {
      nextEmail = null;
    } else if (typeof v === 'string') {
      const em = normalizeEmail(v);
      if (!isValidNormalizedEmail(em)) {
        return { ok: false, status: 400, error: "Email noto'g'ri" };
      }
      nextEmail = em;
    } else {
      return { ok: false, status: 400, error: "Email noto'g'ri" };
    }
  }

  if ('phone' in body) {
    const v = body.phone;
    if (v === null || v === '') {
      nextPhone = null;
      nextPhoneRaw = null;
      nextCountryIso = null;
    } else if (typeof v === 'string') {
      const rawSnap = sanitizePhoneRaw(v);
      if (!rawSnap || rawSnap.length > PHONE_MAX_LENGTH) {
        return {
          ok: false,
          status: 400,
          error: `Telefon bo'sh yoki ${PHONE_MAX_LENGTH} belgidan oshmasin`,
        };
      }
      const norm = normalizePhoneInputToE164(rawSnap);
      if (norm.invalid || !norm.e164) {
        return {
          ok: false,
          status: 400,
          error: "Telefon noto'g'ri yoki mintaqa qo'llab-quvvatlanmaydi (UZ, RU, TJ, KG)",
        };
      }
      nextPhone = norm.e164;
      nextPhoneRaw = rawSnap;
      nextCountryIso = norm.countryIso ?? null;
    } else {
      return { ok: false, status: 400, error: "Telefon noto'g'ri" };
    }
  }

  if (!nextEmail && !nextPhone) {
    return {
      ok: false,
      status: 400,
      error: "Email yoki telefon kamida bittasi bo'lishi kerak",
    };
  }

  if (nextEmail !== user.email && nextEmail) {
    const { data: taken } = await supabase
      .from('users')
      .select('id')
      .eq('email', nextEmail)
      .neq('id', userId)
      .maybeSingle();
    if (taken) {
      return { ok: false, status: 400, error: 'Bu email allaqachon band' };
    }
  }

  const prevNorm =
    user.phone_normalized != null ? String(user.phone_normalized) : null;

  if ('phone' in body && nextPhone) {
    const unchanged = nextPhone === prevNorm || nextPhone === String(user.phone ?? '');
    if (!unchanged) {
      const { data: byNorm } = await supabase
        .from('users')
        .select('id')
        .eq('phone_normalized', nextPhone)
        .neq('id', userId)
        .maybeSingle();
      if (byNorm) {
        return { ok: false, status: 400, error: 'Bu telefon allaqachon band' };
      }
      const { data: byLegacy } = await supabase
        .from('users')
        .select('id')
        .eq('phone', nextPhone)
        .neq('id', userId)
        .maybeSingle();
      if (byLegacy) {
        return { ok: false, status: 400, error: 'Bu telefon allaqachon band' };
      }
    }
  }

  const newPass = newPassRaw;
  const newPass2 = newPass2Raw;

  const updates: Record<string, unknown> = {
    email: nextEmail,
    phone: nextPhone,
  };

  if ('phone' in body) {
    updates.phone_normalized = nextPhone;
    updates.phone_raw = nextPhoneRaw;
    updates.country_code = nextCountryIso;
    updates.phone_invalid = false;
  }

  if (newPass || newPass2) {
    if (newPass.length < 6) {
      return { ok: false, status: 400, error: "Yangi parol kamida 6 belgi bo'lsin" };
    }
    if (newPass !== newPass2) {
      return { ok: false, status: 400, error: 'Yangi parollar mos kelmadi' };
    }
    updates.password = await bcrypt.hash(newPass, 10);
  }

  const { error: upErr } = await supabase.from('users').update(updates).eq('id', userId);
  if (upErr) {
    if (upErr.code === '23505') {
      return { ok: false, status: 400, error: 'Bu email yoki telefon allaqachon band' };
    }
    return { ok: false, status: 500, error: "Xatolik yuz berdi" };
  }

  return { ok: true };
}
