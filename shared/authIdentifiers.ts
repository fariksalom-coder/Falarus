const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

/** Max stored phone length (arbitrary input, still bounded for DB/API safety). */
export const PHONE_MAX_LENGTH = 128;

export function isValidNormalizedEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Phone as free-form text: trim only. Login/register compare this exact string to `users.phone`.
 * Returns null if empty or too long.
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
  | { ok: true; email: string | null; phone: string | null }
  | { ok: false; error: string };

/**
 * Single user input: valid email, or any non-empty phone string (trimmed, length-capped).
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
  const phone = sanitizePhoneForDb(t);
  if (!phone) {
    return {
      ok: false,
      error: `Telefon noto'g'ri yoki ${PHONE_MAX_LENGTH} belgidan oshmasin`,
    };
  }
  return { ok: true, email: null, phone };
}
