import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  APP_LANGUAGES,
  DEFAULT_APP_LOCALE,
  languageMeta,
  normalizeAppLocale,
  type AppLocale,
} from '../../shared/i18n/languages';
import { resolveMessage } from '../../shared/i18n/resolveMessage';
import type { MessageValues } from '../../shared/i18n/catalog/types';
import { readStoredLocale, writeStoredLocale } from '../constants/localeStorage';

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, values?: MessageValues) => string;
  languages: typeof APP_LANGUAGES;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() =>
    normalizeAppLocale(readStoredLocale()),
  );

  useEffect(() => {
    writeStoredLocale(locale);
    const meta = languageMeta(locale);
    document.documentElement.lang = meta.bcp47;
  }, [locale]);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, values?: MessageValues) => resolveMessage(locale, key, values),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      languages: APP_LANGUAGES,
    }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: DEFAULT_APP_LOCALE,
      setLocale: () => {},
      t: (key: string, values?: MessageValues) =>
        resolveMessage(DEFAULT_APP_LOCALE, key, values),
      languages: APP_LANGUAGES,
    };
  }
  return ctx;
}
