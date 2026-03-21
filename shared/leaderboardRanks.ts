export function assignCompetitionRanks<T extends { points: number }>(
  items: T[]
): Array<T & { rank: number }> {
  let previousPoints: number | null = null;
  let currentRank = 0;

  return items.map((item, index) => {
    if (previousPoints === null || item.points < previousPoints) {
      currentRank = index + 1;
      previousPoints = item.points;
    }
    return { ...item, rank: currentRank };
  });
}
