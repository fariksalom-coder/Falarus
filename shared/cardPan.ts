/** Humo/UzCard uchun umumiy PAN uzunligi */
export const CARD_PAN_DIGITS_UZ = 16;

export function normalizeCardPanDigits(raw: string, maxLen = CARD_PAN_DIGITS_UZ): string {
  return raw.replace(/\D/g, '').slice(0, maxLen);
}

export function formatCardPanGroups(digits: string): string {
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

/**
 * Luhn algoritmi — haqiqiy kartochka raqamlari uchun standart tekshiruv.
 * Tasodifiy 16 ta raqam odatda bu tekshiruvdan o‘tmaydi.
 */
export function isValidPanLuhn(panDigits: string): boolean {
  if (!/^\d+$/.test(panDigits)) return false;
  const len = panDigits.length;
  if (len !== CARD_PAN_DIGITS_UZ) return false;

  let sum = 0;
  let alternate = false;
  for (let i = len - 1; i >= 0; i--) {
    let n = panDigits.charCodeAt(i) - 48;
    if (n < 0 || n > 9) return false;
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}
