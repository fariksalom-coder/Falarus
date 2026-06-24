import type { PatentExamChoiceQuestion } from '../data/patentExamData';
import type { PatentQuestionKeywordHints } from '../data/patentExamKeywords';
import { PATENT_QUESTION_KEYWORDS } from '../data/patentExamKeywords';

export type { PatentQuestionKeywordHints };

export function getPatentQuestionKeywords(question: PatentExamChoiceQuestion): PatentQuestionKeywordHints {
  const fromMap = PATENT_QUESTION_KEYWORDS[question.key];
  const textKeyword = question.textKeyword ?? fromMap?.textKeyword ?? null;
  const optionKeywords = question.optionKeywords ?? fromMap?.optionKeywords ?? null;

  const hasTextKeyword = typeof textKeyword === 'string' && textKeyword.trim().length > 0;
  const hasOptionKeywords = Array.isArray(optionKeywords) && optionKeywords.some((item) => item?.trim());

  if (!hasTextKeyword && !hasOptionKeywords) {
    return {};
  }

  return {
    textKeyword: hasTextKeyword ? textKeyword.trim() : null,
    optionKeywords: hasOptionKeywords ? optionKeywords : null,
  };
}
