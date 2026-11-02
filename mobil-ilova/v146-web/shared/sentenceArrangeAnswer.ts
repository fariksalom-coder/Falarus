/** Сравнение ответов «собери предложение»: без учёта регистра и пунктуации. */
export function normSentenceArrangeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:—–\-«»"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
