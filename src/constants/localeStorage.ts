export const LOCALE_STORAGE_KEY = 'falarus_locale_v1';

export function readStoredLocale(): string | null {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredLocale(code: string): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
}
