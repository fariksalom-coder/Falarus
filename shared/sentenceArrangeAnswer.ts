/** Сравнение ответов «собери предложение»: без учёта регистра и пунктуации. */
export function normSentenceArrangeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:—–\-«»"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Kalit yoki boshqa to'g'ri tartiblardan biriga mos keladimi. */
export function isSentenceArrangeCorrect(built: string, answerRu: string, altAnswers: readonly string[] = []): boolean {
  const b = normSentenceArrangeAnswer(built);
  return [answerRu, ...altAnswers].some((a) => a.trim() !== '' && normSentenceArrangeAnswer(a) === b);
}
