/**
 * JSON shapes stored in `question_content.content` / `question_content.answer`
 * and returned by GET /api/lessons/path/.../tasks/:taskNumber (see scripts/extract_lesson_tasks.ts).
 *
 * DB `questions.type` is one of: choice | matching | sentence | fill | reorder
 */

export type GrammarAnswerString = {
  type: 'string';
  value: string;
  alternatives: string[];
};

export type GrammarAnswerPairs = {
  type: 'pairs';
  value: unknown;
  alternatives: unknown[];
};

export type GrammarChoiceContent = {
  options: string[];
};

export type GrammarMatchingContent = {
  pairs: { left: string; right: string }[];
};

export type GrammarSentenceContent = {
  words: string[];
};

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseChoicePayload(content: unknown, answer: unknown): { options: string[]; correct: string } | null {
  if (!isRecord(content) || !isRecord(answer)) return null;
  const options = Array.isArray(content.options) ? content.options.filter((x): x is string => typeof x === 'string') : [];
  const correct =
    typeof answer.value === 'string'
      ? answer.value
      : typeof (answer as { correct?: string }).correct === 'string'
        ? (answer as { correct: string }).correct
        : '';
  if (options.length === 0 || !correct) return null;
  return { options, correct };
}

export function parseMatchingPayload(
  content: unknown,
  answer: unknown,
): { pairs: { left: string; right: string }[] } | null {
  if (!isRecord(content) || !isRecord(answer)) return null;
  const rawPairs = Array.isArray(content.pairs) ? content.pairs : Array.isArray(answer.value) ? answer.value : [];
  const pairs: { left: string; right: string }[] = [];
  for (const p of rawPairs) {
    if (!isRecord(p)) continue;
    const left = typeof p.left === 'string' ? p.left : '';
    const right = typeof p.right === 'string' ? p.right : '';
    if (left && right) pairs.push({ left, right });
  }
  return pairs.length ? { pairs } : null;
}

export function parseSentencePayload(content: unknown, answer: unknown): { words: string[]; correct: string } | null {
  if (!isRecord(content) || !isRecord(answer)) return null;
  const words = Array.isArray(content.words) ? content.words.filter((x): x is string => typeof x === 'string') : [];
  const correct = typeof answer.value === 'string' ? answer.value : '';
  if (words.length === 0 || !correct) return null;
  return { words, correct };
}

const SUPPORTED_TYPES = new Set(['choice', 'matching', 'sentence', 'fill', 'reorder']);

/**
 * Admin/import uchun: `fill` va `reorder` hali UI da emas — lekin JSON saqlashga ruxsat.
 */
export function validateGrammarQuestionPayload(
  type: string,
  content: unknown,
  answer: unknown,
): string | null {
  if (!SUPPORTED_TYPES.has(type)) return `Noma'lum type: ${type}`;
  if (type === 'choice') {
    return parseChoicePayload(content, answer) ? null : 'choice: content.options va answer.value/correct kerak';
  }
  if (type === 'matching') {
    return parseMatchingPayload(content, answer) ? null : 'matching: juftlar topilmadi';
  }
  if (type === 'sentence') {
    return parseSentencePayload(content, answer) ? null : 'sentence: content.words va answer.value kerak';
  }
  if (!isRecord(content) || !isRecord(answer)) return `${type}: content va answer obyekt bo‘lishi kerak`;
  return null;
}
