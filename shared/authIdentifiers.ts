import { normalizePhoneInputToE164, sanitizePhoneRaw } from './phoneE164.js';

export { sanitizePhoneRaw, normalizePhoneInputToE164 };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

/** Max raw identifier length before normalization (paste buffers). */
export const PHONE_MAX_LENGTH = 128;

export function isValidNormalizedEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Legacy trim-only sanitizer (profile/display). Prefer {@link normalizePhoneInputToE164} for auth.
 */
export function sanitizePhoneForDb(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.length > PHONE_MAX_LENGTH) return null;
  return s;
}

/** @deprecated Same as sanitizePhoneForDb — old name from regional formatting era. */
export const normalizePhone = sanitizePhoneForDb;
export const normalizeUzPhone = sanitizePhoneForDb;

export type ParsedContact =
  | {
      ok: true;
      email: string | null;
      /** E.164 when phone login/register */
      phone: string | null;
      /** ISO 3166-1 alpha-2 when phone branch succeeded */
      phoneCountryIso?: string | null;
    }
  | { ok: false; error: string };

/**
 * Email or international phone (normalized to E.164 for allowed regions).
 */
export function parseContactIdentifier(raw: string): ParsedContact {
  const t = raw.trim();
  if (!t) {
    return { ok: false, error: "Email yoki telefon kiritilishi shart" };
  }
  if (t.length > PHONE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Telefon yoki email juda uzun (${PHONE_MAX_LENGTH} belgidan oshmasin)`,
    };
  }
  if (t.includes('@')) {
    const email = normalizeEmail(t);
    if (!EMAIL_RE.test(email)) {
      return { ok: false, error: "Email noto'g'ri" };
    }
    return { ok: true, email, phone: null };
  }

  const norm = normalizePhoneInputToE164(t);
  if (norm.invalid || !norm.e164) {
    return {
      ok: false,
      error: "Telefon noto'g'ri yoki mintaqa qo'llab-quvvatlanmaydi (UZ, RU, TJ, KG)",
    };
  }

  return {
    ok: true,
    email: null,
    phone: norm.e164,
    phoneCountryIso: norm.countryIso ?? null,
  };
}
