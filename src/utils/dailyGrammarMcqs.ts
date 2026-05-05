import type { DailyCourseMcq } from '../../shared/dailyCourseDay';

export type DailyChoiceTask = {
  prompt: string;
  options: string[];
  correct: string;
};

/** Kunlik grammatika MCQ → darsdagi «to'g'ri javobni tanlang» shakli. */
export function dailyMcqsToChoiceTasks(mcqs: DailyCourseMcq[]): DailyChoiceTask[] {
  const out: DailyChoiceTask[] = [];
  for (const m of mcqs) {
    const raw = [m.optionA, m.optionB, m.optionC, m.optionD];
    const options = raw.map((s) => String(s ?? '').trim()).filter((s) => s.length > 0);
    if (options.length < 2) continue;
    const correctRaw = raw[m.correctIndex];
    const correct = String(correctRaw ?? '').trim();
    if (!correct || !options.includes(correct)) continue;
    out.push({
      prompt: String(m.questionText ?? '').trim() || 'Savol',
      options,
      correct,
    });
  }
  return out;
}
