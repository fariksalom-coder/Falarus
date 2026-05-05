/**
 * Exact paths that participate in main layout section index + horizontal swipe (mobile).
 * Order matches `AppNavBar` tabs. `/kurslar` is not a bottom tab — omit from swipe ring.
 */
export const MAIN_SECTION_PATHS = [
  '/',
  '/partner',
  '/statistika',
  '/help',
  '/profile',
] as const;

export function mainSectionIndex(pathname: string): number {
  return MAIN_SECTION_PATHS.findIndex((p) => p === pathname);
}

export function isMainSectionPath(pathname: string): boolean {
  return mainSectionIndex(pathname) >= 0;
}
