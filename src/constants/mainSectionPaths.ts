/** Top-tab section routes (exact match only — not nested `/vocabulary/...`). */
export const MAIN_SECTION_PATHS = [
  '/',
  '/partner',
  '/statistika',
  '/kurslar',
  '/profile',
] as const;

export function mainSectionIndex(pathname: string): number {
  return MAIN_SECTION_PATHS.findIndex((p) => p === pathname);
}

export function isMainSectionPath(pathname: string): boolean {
  return mainSectionIndex(pathname) >= 0;
}
