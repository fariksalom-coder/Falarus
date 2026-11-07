/**
 * O'QITUVCHI TESTLARI VA UY VAZIFALARI — server, o'qituvchi kabineti, dars doskasi va o'quvchi uchun
 * umumiy qoidalar.
 *
 * Test — savollar ro'yxati: matn, 2–6 ta variant (A, B, V, G, D, E), to'g'ri javob va ixtiyoriy izoh.
 * To'g'ri javob o'quvchiga oldindan yuborilmaydi: u tanlagach, server tekshirib qaytaradi.
 */

export type TestQuestion = {
  text: string;
  options: string[];
  /** To'g'ri variant tartib raqami (0 dan). */
  correct: number;
  /** Nega aynan shu javob — o'quvchi javob bergandan keyin ko'rinadi. */
  explanation?: string;
};

/** O'quvchiga ko'rinadigan savol (to'g'ri javobsiz). */
export type PublicQuestion = { text: string; options: string[] };

export type TeacherTest = {
  id: number;
  title: string;
  questions: TestQuestion[];
  created_at: string;
  updated_at: string;
};

/** Javob natijasi: tanlangan, to'g'rimi, to'g'ri variant va izoh. */
export type AnswerResult = { choice: number; correct: boolean; right: number; explanation?: string };

export const TEST_TITLE_MAX = 120;
export const TEST_MAX_QUESTIONS = 60;
export const TEST_MIN_OPTIONS = 2;
export const TEST_MAX_OPTIONS = 6;
export const QUESTION_TEXT_MAX = 500;
export const OPTION_TEXT_MAX = 200;
export const EXPLANATION_MAX = 600;

/** Variant harflari: o'quvchilarga tanish tartib (А, Б, В, Г → A, B, V, G). */
export const OPTION_LETTERS = ['A', 'B', 'V', 'G', 'D', 'E'] as const;
export const optionLetter = (i: number) => OPTION_LETTERS[i] ?? String(i + 1);

const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * Formadan yoki tarmoqdan kelgan testni tekshiradi va tozalaydi.
 * Xato bo'lsa — o'qituvchiga ko'rsatiladigan matn (qaysi savolda nima yetishmaydi).
 */
export function normalizeTest(raw: unknown): { title: string; questions: TestQuestion[] } | string {
  const o = (raw ?? {}) as { title?: unknown; questions?: unknown };
  const title = clean(o.title, TEST_TITLE_MAX);
  if (!title) return 'Test nomini yozing';
  if (!Array.isArray(o.questions) || !o.questions.length) return 'Kamida bitta savol qoʻshing';
  if (o.questions.length > TEST_MAX_QUESTIONS) return `Bitta testda koʻpi bilan ${TEST_MAX_QUESTIONS} ta savol`;
  const questions: TestQuestion[] = [];
  for (let i = 0; i < o.questions.length; i++) {
    const q = (o.questions[i] ?? {}) as { text?: unknown; options?: unknown; correct?: unknown; explanation?: unknown };
    const n = i + 1;
    const text = clean(q.text, QUESTION_TEXT_MAX);
    if (!text) return `${n}-savol matnini yozing`;
    const all = Array.isArray(q.options) ? q.options.map((x) => clean(x, OPTION_TEXT_MAX)) : [];
    // Bo'sh variantlar tashlanadi, lekin to'g'ri javob raqami shunga moslab suriladi.
    const correctRaw = Math.floor(Number(q.correct));
    let correct = -1;
    const options: string[] = [];
    all.forEach((opt, idx) => {
      if (!opt) return;
      if (idx === correctRaw) correct = options.length;
      options.push(opt);
    });
    if (options.length < TEST_MIN_OPTIONS) return `${n}-savolda kamida ${TEST_MIN_OPTIONS} ta variant boʻlsin`;
    if (options.length > TEST_MAX_OPTIONS) return `${n}-savolda koʻpi bilan ${TEST_MAX_OPTIONS} ta variant`;
    if (correct < 0) return `${n}-savolda toʻgʻri javobni belgilang`;
    const explanation = clean(q.explanation, EXPLANATION_MAX);
    questions.push({ text, options, correct, ...(explanation ? { explanation } : {}) });
  }
  return { title, questions };
}

export const publicQuestions = (questions: TestQuestion[]): PublicQuestion[] =>
  questions.map((q) => ({ text: q.text, options: [...q.options] }));

/** Javobni tekshiradi; savol yoki variant noto'g'ri bo'lsa — null. */
export function checkAnswer(questions: TestQuestion[], q: number, choice: number): AnswerResult | null {
  const question = questions[q];
  if (!question || !Number.isInteger(choice) || choice < 0 || choice >= question.options.length) return null;
  return {
    choice,
    correct: choice === question.correct,
    right: question.correct,
    ...(question.explanation ? { explanation: question.explanation } : {}),
  };
}

/* ───────────────────────── Uy vazifalari ───────────────────────── */

export type HomeworkKind = 'test' | 'words' | 'file';
export type HomeworkStatus = 'assigned' | 'done';
export type WordPair = { ru: string; uz: string };

export const HOMEWORK_KINDS: HomeworkKind[] = ['test', 'words', 'file'];
export const HOMEWORK_TITLE_MAX = 120;
export const HOMEWORK_NOTE_MAX = 1000;
export const HOMEWORK_MAX_WORDS = 200;
const WORD_MAX = 120;

/**
 * Lug'at ro'yxati matndan: har qatorda «so'z — tarjima» (ajratuvchi: —, -, :, =, tab).
 * Bo'sh qatorlar tashlanadi; tarjimasiz so'z ham qabul qilinadi.
 */
export function parseWordList(text: string): WordPair[] {
  const out: WordPair[] = [];
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(/^(.*?)\s*(?:—|–|\t|=|:|\s-\s)\s*(.*)$/);
    const ru = clean(m ? m[1] : t, WORD_MAX);
    const uz = clean(m ? m[2] : '', WORD_MAX);
    if (ru) out.push({ ru, uz });
    if (out.length >= HOMEWORK_MAX_WORDS) break;
  }
  return out;
}

export function normalizeWords(raw: unknown): WordPair[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((w) => ({ ru: clean((w as WordPair)?.ru, WORD_MAX), uz: clean((w as WordPair)?.uz, WORD_MAX) }))
    .filter((w) => w.ru)
    .slice(0, HOMEWORK_MAX_WORDS);
}

export const HOMEWORK_KIND_LABEL: Record<HomeworkKind, { uz: string; ru: string }> = {
  test: { uz: 'Test', ru: 'Тест' },
  words: { uz: 'Lugʻat', ru: 'Слова' },
  file: { uz: 'Fayl', ru: 'Файл' },
};
