export function journeyFocusDay(trialComplete: boolean, paidAccess: boolean, currentDay: number): number {
  return trialComplete || paidAccess ? currentDay : 0;
}
