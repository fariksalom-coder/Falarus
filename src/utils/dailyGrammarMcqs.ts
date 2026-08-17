import type { DailyCourseMcq } from '../../shared/dailyCourseDay';

/**
 * Variant — matni bilan birga BAZADAGI o'rni.
 *
 * O'rni kerak, chunki variantlar ekranda aralashtiriladi, javob esa serverga
 * yuboriladi va u yerda kalit bilan solishtiriladi: "uchinchi tugmani bosdim"
 * emas, "B variantni tanladim" degan ma'lumot ketishi shart.
 */
export type DailyChoiceOption = { text: string; index: number };

export type DailyChoiceTask = {
  /** `daily_grammar_mcqs.id` — javob shu bilan qayd etiladi. */
  id: number;
  prompt: string;
  options: DailyChoiceOption[];
  correctIndex: number;
  /** Nega shu javob to'g'ri — xato qilinganda darhol ko'rsatiladi. */
  explanation: string;
};

/** Kunlik grammatika MCQ → darsdagi «to'g'ri javobni tanlang» shakli. */
export function dailyMcqsToChoiceTasks(mcqs: DailyCourseMcq[]): DailyChoiceTask[] {
  const out: DailyChoiceTask[] = [];
  for (const m of mcqs) {
    const raw = [m.optionA, m.optionB, m.optionC, m.optionD];
    const options = raw
      .map((s, index) => ({ text: String(s ?? '').trim(), index }))
      .filter((o) => o.text.length > 0);
    if (options.length < 2) continue;
    if (!options.some((o) => o.index === m.correctIndex)) continue;
    out.push({
      id: Number(m.id),
      prompt: String(m.questionText ?? '').trim() || 'Savol',
      options,
      correctIndex: m.correctIndex,
      explanation: String(m.explanation ?? ''),
    });
  }
  return out;
}
