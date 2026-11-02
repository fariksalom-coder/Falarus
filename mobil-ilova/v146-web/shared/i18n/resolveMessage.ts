import { DEFAULT_APP_LOCALE, type AppLocale } from './languages';
import { MESSAGE_CATALOGS } from './catalog';
import type { MessageValues } from './catalog/types';

function getByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object' || !(part in (cur as object))) {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(template: string, values?: MessageValues): string {
  if (!values) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = values[key];
    return v == null ? '' : String(v);
  });
}

export function resolveMessage(
  locale: AppLocale,
  key: string,
  values?: MessageValues,
): string {
  const primary = getByPath(MESSAGE_CATALOGS[locale], key);
  const fallback =
    locale === DEFAULT_APP_LOCALE
      ? undefined
      : getByPath(MESSAGE_CATALOGS[DEFAULT_APP_LOCALE], key);
  const raw = primary ?? fallback ?? key;
  return interpolate(raw, values);
}
