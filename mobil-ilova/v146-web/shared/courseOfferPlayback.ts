export const COURSE_VIDEO_SRC = '/videos/welcome-combined.mp4';
// Duration of welcome-combined.mp4; media metadata takes precedence in the UI.
export const COURSE_VIDEO_DURATION_SECONDS = 298.607;
export const COURSE_BONUS_REMAINING_SECONDS = 20;

export function secondsUntilCourseBonus(duration: number, currentTime: number): number | null {
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(currentTime)) return null;
  return Math.ceil(Math.max(0, duration - COURSE_BONUS_REMAINING_SECONDS - currentTime));
}
