import type { Question } from '../schema/questions';

/**
 * Javoblarni avtomatik baholash.
 *
 * Test savoli uchun variant harfi yoki variant matni solishtiriladi.
 * Ochiq savol uchun javob normallashtiriladi va sonli qiymat bo'yicha
 * taqqoslanadi, chunki o'quvchi "0,25", "$0{,}25$", "1/4" yoki
 * "25 foiz" deb yozishi mumkin va bularning hammasi bir xil javob.
 */

export type Verdict = 'correct' | 'incorrect' | 'needs-review';

export interface GradedAnswer {
  questionId: string;
  given: string;
  expected: string;
  verdict: Verdict;
  /** Nima uchun shunday baholanganini tushuntiruvchi izoh. */
  note?: string;
}

export interface GradeReport {
  total: number;
  correct: number;
  incorrect: number;
  needsReview: number;
  /** Foizda, faqat aniq baholangan savollar bo'yicha. */
  score: number;
  answers: GradedAnswer[];
}

// ---------------------------------------------------------------------------
// Normalizatsiya
// ---------------------------------------------------------------------------

/** Javob oxirida keladigan va ma'noga ta'sir qilmaydigan so'zlar. */
const UNIT_WORDS = [
  "so'm",
  'som',
  'ta',
  'dona',
  'kishi',
  'bet',
  'kg',
  'kilogramm',
  'gramm',
  'litr',
  'km',
  'metr',
  'm',
  'sm',
  'santimetr',
  'mm',
  'soat',
  'daqiqa',
  'minut',
  'kun',
  'gradus',
  'foiz',
  'qism',
  'birlik',
  'quti',
  'marta',
  'xil',
];

/**
 * LaTeX va o'zbekcha yozuv xilma-xilligini bir ko'rinishga keltiradi.
 */
export function normalizeAnswer(raw: string): string {
  let s = raw.trim().toLowerCase();

  // LaTeX bezaklarini olib tashlaymiz.
  s = s.replace(/\$/g, '');
  s = s.replace(/\\left|\\right|\\!|\\;|\\ /g, '');
  s = s.replace(/\\(?:cdot|times)/g, '*');
  s = s.replace(/\\%|%/g, ' foiz ');
  s = s.replace(/\^\{?\\?circ\}?|°/g, ' gradus ');

  // Kasrlar: \frac{a}{b}, \dfrac{a}{b}, \tfrac{a}{b} -> a/b
  s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');

  // Daraja belgisi: m^2, sm^{3}
  s = s.replace(/\^\{?(\d+)\}?/g, '^$1');

  // O'nli kasr vergulini nuqtaga aylantiramiz. LaTeX da {,} ko'rinishida.
  s = s.replace(/\{,\}/g, '.');
  s = s.replace(/(\d),(\d)/g, '$1.$2');

  // Mingliklar ajratgichi: \, yoki oddiy bo'shliq raqamlar orasida.
  s = s.replace(/\\,/g, '');
  s = s.replace(/(\d)[\s ](?=\d{3}\b)/g, '$1');

  // Qolgan LaTeX buyruqlari va figurali qavslar.
  s = s.replace(/\\[a-z]+/g, ' ');
  s = s.replace(/[{}]/g, '');

  // O'lchov birliklarini olib tashlaymiz.
  for (const unit of UNIT_WORDS) {
    s = s.replace(new RegExp(`(?<=\\d|\\s)${unit}\\b`, 'g'), ' ');
  }

  // Ortiqcha tinish va bo'shliqlar.
  s = s.replace(/[.,;:]+\s*$/g, '');
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Matndan barcha sonli qiymatlarni ketma-ketlik sifatida ajratadi.
 * Oddiy kasr (a)/(b) va aralash son "3 (2)/(5)" ham qo'llab-quvvatlanadi.
 */
export function extractNumbers(normalized: string): number[] {
  const out: number[] = [];
  // Aralash son: butun qism va kasr, masalan "3 (2)/(5)".
  const mixed = /(-?\d+(?:\.\d+)?)\s*\((-?\d+(?:\.\d+)?)\)\/\((-?\d+(?:\.\d+)?)\)/g;
  let rest = normalized.replace(mixed, (_m, whole, num, den) => {
    const w = Number(whole);
    const value = w + (w < 0 ? -1 : 1) * (Number(num) / Number(den));
    out.push(value);
    return ' ';
  });

  // Oddiy kasr: (a)/(b) yoki a/b
  const fraction = /\(?(-?\d+(?:\.\d+)?)\)?\s*\/\s*\(?(-?\d+(?:\.\d+)?)\)?/g;
  rest = rest.replace(fraction, (_m, num, den) => {
    const d = Number(den);
    if (d !== 0) out.push(Number(num) / d);
    return ' ';
  });

  // Qolgan oddiy sonlar. Daraja ko'rsatkichlari hisobga olinmaydi.
  rest = rest.replace(/\^\d+/g, ' ');
  for (const match of rest.matchAll(/-?\d+(?:\.\d+)?/g)) {
    out.push(Number(match[0]));
  }

  return out;
}

const EPSILON = 1e-9;

const sameNumber = (a: number, b: number) =>
  Math.abs(a - b) <= EPSILON * Math.max(1, Math.abs(a), Math.abs(b));

// ---------------------------------------------------------------------------
// Baholash
// ---------------------------------------------------------------------------

const LETTERS = ['A', 'B', 'C', 'D'] as const;

function gradeTest(question: Extract<Question, { type: 'test' }>, given: string) {
  const trimmed = given.trim().toUpperCase();

  // O'quvchi variant harfini yozgan bo'lsa.
  if (/^[ABCD]$/.test(trimmed)) {
    return trimmed === question.correct
      ? { verdict: 'correct' as const }
      : {
          verdict: 'incorrect' as const,
          note: `Tanlangan variant ${trimmed}, to'g'risi ${question.correct}`,
        };
  }

  // O'quvchi variant matnini yozgan bo'lsa, uni harfga aylantiramiz.
  const givenNorm = normalizeAnswer(given);
  const index = question.options.findIndex(
    (opt) => normalizeAnswer(opt) === givenNorm,
  );

  if (index === -1) {
    return {
      verdict: 'needs-review' as const,
      note: 'Javob variantlarning hech biriga mos kelmadi',
    };
  }

  const letter = LETTERS[index];
  return letter === question.correct
    ? { verdict: 'correct' as const }
    : {
        verdict: 'incorrect' as const,
        note: `Tanlangan variant ${letter}, to'g'risi ${question.correct}`,
      };
}

function gradeOpen(question: Extract<Question, { type: 'open' }>, given: string) {
  const expectedNorm = normalizeAnswer(question.answer);
  const givenNorm = normalizeAnswer(given);

  if (expectedNorm === givenNorm) return { verdict: 'correct' as const };

  const expectedNums = extractNumbers(expectedNorm);
  const givenNums = extractNumbers(givenNorm);

  // Ikkala javobda ham son yo'q bo'lsa, matn bo'yicha taqqoslanadi.
  if (expectedNums.length === 0 && givenNums.length === 0) {
    return {
      verdict: 'needs-review' as const,
      note: 'Sonli qiymat topilmadi, javobni qo\'lda tekshirish kerak',
    };
  }

  if (
    expectedNums.length === givenNums.length &&
    expectedNums.every((n, i) => sameNumber(n, givenNums[i]))
  ) {
    return { verdict: 'correct' as const };
  }

  // Sonlar bir xil, lekin tartibi boshqacha bo'lishi mumkin.
  const sortedEqual =
    expectedNums.length === givenNums.length &&
    [...expectedNums]
      .sort((a, b) => a - b)
      .every((n, i) => sameNumber(n, [...givenNums].sort((a, b) => a - b)[i]));

  if (sortedEqual) {
    return {
      verdict: 'needs-review' as const,
      note: 'Sonlar mos, lekin tartibi boshqacha',
    };
  }

  return {
    verdict: 'incorrect' as const,
    note: `Kutilgan javob: ${question.answer}`,
  };
}

/** Bitta savolni baholaydi. */
export function gradeAnswer(question: Question, given: string): GradedAnswer {
  const expected =
    question.type === 'test' ? question.correct : question.answer;

  if (given.trim() === '') {
    return {
      questionId: question.id,
      given,
      expected,
      verdict: 'incorrect',
      note: 'Javob berilmagan',
    };
  }

  const result =
    question.type === 'test'
      ? gradeTest(question, given)
      : gradeOpen(question, given);

  return { questionId: question.id, given, expected, ...result };
}

/** Butun ishni baholaydi va yakuniy hisobotni qaytaradi. */
export function gradeAttempt(
  questions: Question[],
  given: Record<string, string>,
): GradeReport {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const answers: GradedAnswer[] = [];

  for (const [questionId, value] of Object.entries(given)) {
    const question = byId.get(questionId);
    if (!question) {
      answers.push({
        questionId,
        given: value,
        expected: '',
        verdict: 'needs-review',
        note: 'Bunday savol topilmadi',
      });
      continue;
    }
    answers.push(gradeAnswer(question, value));
  }

  const correct = answers.filter((a) => a.verdict === 'correct').length;
  const incorrect = answers.filter((a) => a.verdict === 'incorrect').length;
  const needsReview = answers.filter((a) => a.verdict === 'needs-review').length;
  const decided = correct + incorrect;

  return {
    total: answers.length,
    correct,
    incorrect,
    needsReview,
    score: decided === 0 ? 0 : Math.round((correct / decided) * 100),
    answers,
  };
}
