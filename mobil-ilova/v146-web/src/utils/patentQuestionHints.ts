import { PATENT_QUESTION_HINTS } from '../data/patentExamHints';

export function getPatentQuestionHint(key: string): string | null {
  const hint = PATENT_QUESTION_HINTS[key];
  return typeof hint === 'string' && hint.trim().length > 0 ? hint.trim() : null;
}
