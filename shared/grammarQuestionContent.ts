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

function stringListFromUnknown(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => (typeof x === 'string' ? x : x != null && (typeof x === 'number' || typeof x === 'boolean') ? String(x) : ''))
    .filter((s) => s.length > 0);
}

export function parseChoicePayload(content: unknown, answer: unknown): { options: string[]; correct: string } | null {
  if (!isRecord(content) || !isRecord(answer)) return null;
  const options = stringListFromUnknown(content.options);
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
  const words = stringListFromUnknown(content.words);
  const correct =
    typeof answer.value === 'string'
      ? answer.value
      : typeof (answer as { correct?: string }).correct === 'string'
        ? (answer as { correct: string }).correct
        : '';
  if (words.length === 0 || !correct) return null;
  return { words, correct };
}

const SUPPORTED_TYPES = new Set(['choice', 'matching', 'sentence', 'fill', 'reorder']);

/** Admin/import uchun: `fill` / `reorder` JSON shakli `choice` bilan mos. */
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
  if (type === 'fill' || type === 'reorder') {
    return parseChoicePayload(content, answer)
      ? null
      : `${type}: content.options va answer.value (yoki correct) kerak`;
  }
  if (!isRecord(content) || !isRecord(answer)) return `${type}: content va answer obyekt bo‘lishi kerak`;
  return null;
}
