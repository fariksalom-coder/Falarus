/**
 * Exact paths that participate in main layout section index + horizontal swipe (mobile).
 * Order matches `AppNavBar` tabs.
 */
export const MAIN_SECTION_PATHS = [
  '/',
  '/games',
  '/partner',
  '/teachers',
  '/statistika',
  '/profile',
] as const;

export function mainSectionIndex(pathname: string): number {
  return MAIN_SECTION_PATHS.findIndex((p) => p === pathname);
}

