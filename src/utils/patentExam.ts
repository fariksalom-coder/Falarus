import type { PatentExamVariant } from '../data/patentExamData';

export type PatentExamAnswerMap = Record<string, string | number | undefined>;

function normalizeWrittenAnswer(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

function isAnswered(value: string | number | undefined): boolean {
  if (typeof value === 'number') return true;
  return typeof value === 'string' && value.trim().length > 0;
}

export function isImageAssetOption(option: string): boolean {
  return /^\/courses\/patent\/media\/.+\.(png|jpg|jpeg)$/i.test(option);
}

export function evaluatePatentVariant(variant: PatentExamVariant, answers: PatentExamAnswerMap) {
  let totalCount = 0;
  let correctCount = 0;
  let answeredCount = 0;

  for (const block of variant.blocks) {
    if (block.kind === 'audio-double') {
      for (const question of block.subQuestions) {
        totalCount += 1;
        const answer = answers[question.key];
        if (isAnswered(answer)) answeredCount += 1;
        if (typeof answer === 'number' && answer === question.correctIndex) {
          correctCount += 1;
        }
      }
      continue;
    }

    if (block.kind === 'written') {
      totalCount += 1;
      const answer = answers[block.blockId];
      if (isAnswered(answer)) answeredCount += 1;
      if (
        typeof answer === 'string' &&
        block.correctAnswers.some((candidate) => normalizeWrittenAnswer(candidate) === normalizeWrittenAnswer(answer))
      ) {
        correctCount += 1;
      }
      continue;
    }

    totalCount += 1;
    const answer = answers[block.question.key];
    if (isAnswered(answer)) answeredCount += 1;
    if (typeof answer === 'number' && answer === block.question.correctIndex) {
      correctCount += 1;
    }
  }

  const percent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return {
    totalCount,
    correctCount,
    answeredCount,
    percent,
  };
}
