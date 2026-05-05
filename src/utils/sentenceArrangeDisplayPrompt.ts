/**
 * Kunlik «gap tuzish» topshirig‘ida `prompt_text` ba’zan ruscha qavslardagi
 * so‘z ro‘yxati (`(утро, Доброе)`) ko‘rinishida saqlangan. Bunday holatda
 * foydalanuvchiga o‘zbekcha yo‘riqnoma ko‘rsatiladi.
 */
const RU_PAREN_CUE = /^\([^)]*[А-Яа-яЁё][^)]*\)\s*$/;

export function isRussianParenWordCue(promptText: string): boolean {
  const t = String(promptText ?? '').trim();
  if (!t.startsWith('(') || !t.endsWith(')')) return false;
  return RU_PAREN_CUE.test(t);
}

/** Ruscha qavsli «so‘zlar ro‘yxati» promptlari uchun bitta aniq o‘zbek gap. */
export const SENTENCE_ARRANGE_FALLBACK_PROMPT_UZ =
  'Quyidagi so‘z kartochkalaridan foydalanib, rus tilida to‘g‘ri va to‘liq gapni tuzing.';

export function getSentenceArrangeDisplayPrompt(promptText: string, promptLang: string): string {
  const raw = String(promptText ?? '').trim();
  if (promptLang === 'uz' && isRussianParenWordCue(raw)) {
    return SENTENCE_ARRANGE_FALLBACK_PROMPT_UZ;
  }
  return raw || SENTENCE_ARRANGE_FALLBACK_PROMPT_UZ;
}
