/**
 * Platform UI languages (not course / teacher DB content).
 * Uzbek is the canonical default and fallback.
 */
export const APP_LOCALES = [
  'uz',
  'uzc',
  'ru',
  'en',
  'tg',
  'ky',
  'kk',
  'tk',
  'hi',
] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_APP_LOCALE: AppLocale = 'uz';

export type AppLanguageMeta = {
  code: AppLocale;
  /** Native label shown in language picker */
  label: string;
  /** BCP 47 for document / html lang */
  bcp47: string;
};

export const APP_LANGUAGES: AppLanguageMeta[] = [
  { code: 'uz', label: "O'zbek (lotin)", bcp47: 'uz' },
  { code: 'uzc', label: "O'zbek (kirill)", bcp47: 'uz-Cyrl' },
  { code: 'ru', label: 'Русский', bcp47: 'ru' },
  { code: 'en', label: 'English', bcp47: 'en' },
  { code: 'tg', label: 'Тоҷикӣ', bcp47: 'tg' },
  { code: 'ky', label: 'Кыргызча', bcp47: 'ky' },
  { code: 'kk', label: 'Қазақша', bcp47: 'kk' },
  { code: 'tk', label: 'Türkmençe', bcp47: 'tk' },
  { code: 'hi', label: 'हिन्दी', bcp47: 'hi' },
];

const LEGACY_LOCALE_MAP: Record<string, AppLocale> = {
  tj: 'tg',
  kg: 'ky',
  'uz-cyrl': 'uzc',
  uz_cyrl: 'uzc',
};

export function normalizeAppLocale(raw: string | null | undefined): AppLocale {
  if (!raw) return DEFAULT_APP_LOCALE;
  const lower = raw.trim().toLowerCase();
  if ((APP_LOCALES as readonly string[]).includes(lower)) return lower as AppLocale;
  return LEGACY_LOCALE_MAP[lower] ?? DEFAULT_APP_LOCALE;
}

export function languageMeta(code: AppLocale): AppLanguageMeta {
  return APP_LANGUAGES.find((l) => l.code === code) ?? APP_LANGUAGES[0];
}
