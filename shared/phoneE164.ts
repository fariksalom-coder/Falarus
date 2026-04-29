/**
 * Phone normalization for UZ / RU / TJ / KG (+998, +7, +992, +996).
 */
import { parsePhoneNumberFromString } from 'libphonenumber-js';

/** Allowed ITU-T calling codes (without +). */
export const ALLOWED_CALLING_CODES = new Set(['998', '7', '992', '996']);

export type PhoneNormalizeResult = {
  e164: string | null;
  /** ISO 3166-1 alpha-2 */
  countryIso: string | null;
  invalid: boolean;
};

function invalid(): PhoneNormalizeResult {
  return { e164: null, countryIso: null, invalid: true };
}

/**
 * Strip formatting; preserve leading + semantics via digits-only extraction.
 */
function toDigitsAndPlus(raw: string): { digitsOnly: string; hadPlus: boolean } {
  const t = raw.trim();
  const hadPlus = t.startsWith('+');
  const digitsOnly = t.replace(/\D/g, '');
  return { digitsOnly, hadPlus };
}

/**
 * Snapshot for phone_raw column (human-ish paste).
 */
export function sanitizePhoneRaw(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.length > 160) return null;
  return s;
}

/**
 * Normalize arbitrary user input (login/register/paste) to E.164 when possible.
 */
export function normalizePhoneInputToE164(raw: string): PhoneNormalizeResult {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes('@')) return invalid();

  let { digitsOnly, hadPlus } = toDigitsAndPlus(trimmed);
  if (!digitsOnly) return invalid();

  let t = hadPlus ? `+${digitsOnly}` : digitsOnly;

  // Legacy: 998XXXXXXXXXXX without +
  if (!hadPlus && digitsOnly.startsWith('998') && digitsOnly.length >= 12) {
    t = `+${digitsOnly}`;
  }
  // RU trunk 8 + 10 digits national (11 digits total)
  else if (/^8\d{10}$/.test(digitsOnly)) {
    t = `+7${digitsOnly.slice(1)}`;
  }
  // UZ: 9 digits without country code
  else if (/^\d{9}$/.test(digitsOnly)) {
    t = `+998${digitsOnly}`;
  }
  // RU mobile national (10 digits, leading 9)
  else if (/^9\d{9}$/.test(digitsOnly)) {
    t = `+7${digitsOnly}`;
  }
  else if (!hadPlus) {
    t = `+${digitsOnly}`;
  }

  const pn = parsePhoneNumberFromString(t);
  if (!pn || !pn.isValid()) return invalid();

  const cc = String(pn.countryCallingCode);
  if (!ALLOWED_CALLING_CODES.has(cc)) return invalid();

  return {
    e164: pn.format('E.164'),
    countryIso: pn.country ?? null,
    invalid: false,
  };
}
