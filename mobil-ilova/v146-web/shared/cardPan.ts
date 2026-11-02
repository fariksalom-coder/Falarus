/** Humo/UzCard uchun umumiy PAN uzunligi */
export const CARD_PAN_DIGITS_UZ = 16;

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
