export const THEME_STORAGE_KEY = 'falarus-theme';

export type ThemeMode = 'light' | 'dark';

export function readStoredTheme(): ThemeMode | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export function resolveThemeMode(stored: ThemeMode | null): ThemeMode {
  return stored ?? 'light';
}
