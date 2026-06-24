import type { PatentExamChoiceQuestion } from '../data/patentExamData';
import type { PatentQuestionKeywordHints } from '../data/patentExamKeywords';
import { PATENT_QUESTION_KEYWORDS } from '../data/patentExamKeywords';

export type { PatentQuestionKeywordHints };

export function getPatentQuestionKeywords(question: PatentExamChoiceQuestion): PatentQuestionKeywordHints {
  const fromMap = PATENT_QUESTION_KEYWORDS[question.key];
  const textKeyword = question.textKeyword ?? fromMap?.textKeyword ?? null;
  const hasTextKeyword = typeof textKeyword === 'string' && textKeyword.trim().length > 0;

  if (!hasTextKeyword) {
    return {};
  }

  return { textKeyword: textKeyword.trim() };
}
