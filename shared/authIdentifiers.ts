const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

/** Short hint for validation errors (Latin digits in examples). */
export const REGIONAL_PHONE_HINT =
  "UZ: +998901234567; RU/KZ: 9161234567 yoki +79161234567; TJ: +99290123456; KG: +996555123456";

export function isValidNormalizedEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Normalize phone to E.164 for: Uzbekistan (+998), Russia & Kazakhstan (+7),
 * Tajikistan (+992), Kyrgyzstan (+996).
 *
 * - 9 digits starting with 9 → Uzbekistan (+998), same as before.
 * - 12 digits 9989xxxxxxxx → Uzbekistan mobile with country code.
 * - 12 digits 992 + 9 national → Tajikistan.
 * - 12 digits 996 + 9 national → Kyrgyzstan.
 * - 11 digits 8 + 10 (trunk) or 7 + 10 → Russia / Kazakhstan (+7).
 * - 10 digits (national) → +7 (RU/KZ) when not matching other patterns.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Uzbekistan: full international mobile 998 9X XXX XX XX
  if (digits.length === 12 && /^9989\d{8}$/.test(digits)) {
    return `+${digits}`;
  }

  // Tajikistan: +992 + 9-digit national
  if (digits.length === 12 && /^992\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  // Kyrgyzstan: +996 + 9-digit national
  if (digits.length === 12 && /^996\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  // Russia / Kazakhstan: 8 (trunk) + 10 digits → +7 + 10 digits
  if (digits.length === 11 && digits.startsWith('8')) {
    return `+7${digits.slice(1)}`;
  }

  // Already 7XXXXXXXXXXX (country 7 + 10-digit national)
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+${digits}`;
  }

  // National 10-digit (RU mobile 9XX…, KZ 7XX…, landlines, etc.) → +7
  if (digits.length === 10) {
    return `+7${digits}`;
  }

  // Uzbekistan: local mobile without country (9XXXXXXXX)
  if (digits.length === 9 && /^9\d{8}$/.test(digits)) {
    return `+998${digits}`;
  }

  return null;
}

/** @deprecated Use normalizePhone — kept for call sites that still import this name. */
export const normalizeUzPhone = normalizePhone;

export type ParsedContact =
  | { ok: true; email: string | null; phone: string | null }
  | { ok: false; error: string };

/**
 * Single user input: either a valid email or a supported regional phone number.
 */
export function parseContactIdentifier(raw: string): ParsedContact {
  const t = raw.trim();
  if (!t) {
    return { ok: false, error: "Email yoki telefon kiritilishi shart" };
  }
  if (t.includes('@')) {
    const email = normalizeEmail(t);
    if (!EMAIL_RE.test(email)) {
      return { ok: false, error: "Email noto'g'ri" };
    }
    return { ok: true, email, phone: null };
  }
  const phone = normalizePhone(t);
  if (!phone) {
    return {
      ok: false,
      error: `Telefon noto'g'ri. ${REGIONAL_PHONE_HINT}`,
    };
  }
  return { ok: true, email: null, phone };
}
