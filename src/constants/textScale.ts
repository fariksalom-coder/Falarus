export const TEXT_SCALE_STORAGE_KEY = 'falarus-text-scale';

export type TextScaleLevel = 1 | 2 | 3;

export const TEXT_SCALE_LEVELS: TextScaleLevel[] = [1, 2, 3];

/** Actual size multiplier: +25% per step from base (1 → 1.25 → 1.5). */
export const TEXT_SCALE_MULTIPLIERS: Record<TextScaleLevel, number> = {
  1: 1,
  2: 1.25,
  3: 1.5,
};

export function textScaleLabel(level: TextScaleLevel): string {
  return `${level}x`;
}

export function readStoredTextScale(): TextScaleLevel | null {
  try {
    const value = localStorage.getItem(TEXT_SCALE_STORAGE_KEY);
    if (value === '1' || value === '2' || value === '3') {
      return Number(value) as TextScaleLevel;
    }
    return null;
  } catch {
    return null;
  }
}

export function resolveTextScaleLevel(stored: TextScaleLevel | null): TextScaleLevel {
  return stored ?? 1;
}

export function cycleTextScaleLevel(current: TextScaleLevel): TextScaleLevel {
  const idx = TEXT_SCALE_LEVELS.indexOf(current);
  const next = TEXT_SCALE_LEVELS[(idx + 1) % TEXT_SCALE_LEVELS.length];
  return next;
}

export function applyTextScaleToDocument(level: TextScaleLevel) {
  const multiplier = TEXT_SCALE_MULTIPLIERS[level];
  const root = document.documentElement;
  root.style.setProperty('--app-text-scale', String(multiplier));
  root.dataset.textScale = String(level);
}
