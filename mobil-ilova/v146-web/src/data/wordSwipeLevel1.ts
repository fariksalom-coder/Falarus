/** Dev-only fallback when API is unavailable (not used in production). */
import type { WordSwipeEntry } from '../../shared/wordSwipeUtils';

export const DEV_WORD_SWIPE_FALLBACK_WORDS: WordSwipeEntry[] = [
  { id: 'ism', uz: 'ism', ru: 'ИМЯ' },
  { id: 'yosh', uz: 'yosh', ru: 'ВОЗРАСТ' },
  { id: 'telefon', uz: 'telefon', ru: 'ТЕЛЕФОН' },
  { id: 'manzil', uz: 'manzil', ru: 'АДРЕС' },
  { id: 'pochta', uz: 'pochta', ru: 'ПОЧТА' },
];

export const DEV_WORD_SWIPE_FALLBACK_ROWS = 5;
export const DEV_WORD_SWIPE_FALLBACK_COLS = 6;
