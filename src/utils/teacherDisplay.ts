import type { TeacherProfile } from '../api/teachers';

export function teacherDisplayName(profile: Pick<TeacherProfile, 'display_name' | 'first_name' | 'last_name'>): string {
  const display = profile.display_name?.trim();
  if (display) return display;
  return `${profile.first_name} ${profile.last_name}`.trim() || "O'qituvchi";
}

export function formatTeacherExperience(years: number, months: number): string {
  const y = Math.max(0, years);
  const m = Math.min(11, Math.max(0, months));
  if (y && m) return `${y} yil ${m} oy`;
  if (y) return `${y} yil`;
  if (m) return `${m} oy`;
  return 'Tajriba ko‘rsatilmagan';
}

export function formatTeachingFormat(format: TeacherProfile['teaching_format']): string {
  if (format === 'online') return 'Onlayn';
  if (format === 'offline') return 'Oflayn';
  return 'Onlayn / oflayn';
}

const LEGACY_RUB_TO_UZS = 150;

export function normalizeTeacherMonthlyPriceUzs(amount: number, currency: string): number {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (currency === 'UZS') return value;
  if (currency === 'RUB') return Math.round(value * LEGACY_RUB_TO_UZS);
  return value;
}

export function formatTeacherPrice(amount: number, currency: string): string {
  const uzs = normalizeTeacherMonthlyPriceUzs(amount, currency);
  if (uzs <= 0) return 'Narx kelishiladi';
  return `${uzs.toLocaleString('uz-UZ', { maximumFractionDigits: 0 })} so'm/oy`;
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
