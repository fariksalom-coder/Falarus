export function calculateImprovementDelta(
  previousBest: number,
  nextScore: number
): number {
  return Math.max(0, Math.floor(nextScore) - Math.floor(previousBest));
}

export function calculateCappedMatchPoints(
  alreadyCompleted: boolean,
  correctPairs: number,
  totalWords: number
): number {
  if (alreadyCompleted) return 0;
  return Math.min(Math.max(0, Math.floor(correctPairs)), Math.max(0, totalWords));
}
