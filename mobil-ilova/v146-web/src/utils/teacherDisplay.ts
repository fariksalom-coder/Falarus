import type { TeacherProfile } from '../api/teachers';
import type { MessageValues } from '../../shared/i18n/catalog/types';
import { DEFAULT_APP_LOCALE, languageMeta, type AppLocale } from '../../shared/i18n/languages';
import { resolveMessage } from '../../shared/i18n/resolveMessage';

type TranslateFn = (key: string, values?: MessageValues) => string;

function resolveT(t?: TranslateFn, locale: AppLocale = DEFAULT_APP_LOCALE): TranslateFn {
  if (t) return t;
  return (key, values) => resolveMessage(locale, key, values);
}

export function teacherDisplayName(profile: Pick<TeacherProfile, 'display_name' | 'first_name' | 'last_name'>): string {
  const display = profile.display_name?.trim();
  if (display) return display;
  const fallback = resolveT();
  return `${profile.first_name} ${profile.last_name}`.trim() || fallback('common.user');
}

export function formatTeacherExperience(
  years: number,
  months: number,
  t?: TranslateFn,
  locale: AppLocale = DEFAULT_APP_LOCALE,
): string {
  const tr = resolveT(t, locale);
  const y = Math.max(0, years);
  const m = Math.min(11, Math.max(0, months));
  if (y && m) return `${y} yil ${m} oy`;
  if (y) return `${y} yil`;
  if (m) return `${m} oy`;
  return tr('teachers.notSpecified');
}

export function formatTeachingFormat(
  format: TeacherProfile['teaching_format'],
  t?: TranslateFn,
  locale: AppLocale = DEFAULT_APP_LOCALE,
): string {
  const tr = resolveT(t, locale);
  if (format === 'online') return tr('teachers.formatOnline');
  if (format === 'offline') return tr('teachers.formatOffline');
  return `${tr('teachers.formatOnline')} / ${tr('teachers.formatOffline')}`;
}

const LEGACY_RUB_TO_UZS = 150;

export function normalizeTeacherMonthlyPriceUzs(amount: number, currency: string): number {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (currency === 'UZS') return value;
  if (currency === 'RUB') return Math.round(value * LEGACY_RUB_TO_UZS);
  return value;
}

export function formatTeacherPrice(
  amount: number,
  currency: string,
  t?: TranslateFn,
  locale: AppLocale = DEFAULT_APP_LOCALE,
): string {
  const tr = resolveT(t, locale);
  const uzs = normalizeTeacherMonthlyPriceUzs(amount, currency);
  if (uzs <= 0) return tr('teachers.priceNegotiable');
  return `${uzs.toLocaleString(languageMeta(locale).bcp47, { maximumFractionDigits: 0 })} ${tr('payment.currency')}/oy`;
}

export function teacherInitials(profile: Pick<TeacherProfile, 'first_name' | 'last_name' | 'display_name'>): string {
  const name = teacherDisplayName(profile);
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
