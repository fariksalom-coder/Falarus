import bcrypt from 'bcryptjs';
import type { DbClient } from '../types/dbClient';
import { generateSecurePassword } from '../../shared/generateSecurePassword.js';
import { isValidNormalizedEmail, normalizeEmail } from '../../shared/authIdentifiers.js';
import { isMailConfigured, sendPasswordResetEmail } from './mail.service.js';

export const PASSWORD_RESET_GENERIC_MESSAGE =
  "Agar bu email ro'yxatdan o'tgan bo'lsa, yangi parol yuborildi. Spam papkasini ham tekshiring.";

export type PasswordResetResult =
  | { ok: true; message: string }
  | { ok: false; status: number; error: string };

export async function requestPasswordResetByEmail(
  supabase: DbClient,
  rawEmail: string,
): Promise<PasswordResetResult> {
  const email = normalizeEmail(rawEmail);
  if (!email) {
    return { ok: false, status: 400, error: 'Email kiritilishi shart' };
  }
  if (!isValidNormalizedEmail(email)) {
    return { ok: false, status: 400, error: "Email noto'g'ri" };
  }
  if (!isMailConfigured()) {
    return {
      ok: false,
      status: 503,
      error: 'Email xizmati hozircha sozlanmagan. Qo‘llab-quvvatlash bilan bog‘laning.',
    };
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, first_name, email, password')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('[password-reset] lookup failed', error.message);
    return { ok: false, status: 500, error: 'Xatolik yuz berdi' };
  }

  if (!user) {
    return { ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE };
  }

  const newPassword = generateSecurePassword(12);
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const previousPassword =
    user.password === undefined || user.password === null ? null : String(user.password);
  const { error: updateErr } = await supabase
    .from('users')
    .update({ password: hashedPassword })
    .eq('id', user.id);

  if (updateErr) {
    console.error('[password-reset] update failed', updateErr.message);
    return { ok: false, status: 500, error: 'Xatolik yuz berdi' };
  }

  const mailResult = await sendPasswordResetEmail({
    to: email,
    firstName: typeof user.first_name === 'string' ? user.first_name : '',
    newPassword,
  });

  if (mailResult.ok === false) {
    console.error('[password-reset] email failed', mailResult.error);
    const { error: revertErr } = await supabase
      .from('users')
      .update({ password: previousPassword })
      .eq('id', user.id);
    if (revertErr) {
      console.error('[password-reset] revert failed', revertErr.message);
    }
    return { ok: false, status: 500, error: 'Email yuborilmadi. Keyinroq qayta urinib ko‘ring.' };
  }

  return { ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE };
}
