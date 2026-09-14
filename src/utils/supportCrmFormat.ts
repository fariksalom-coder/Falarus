/** Shared date/idle helpers for Support CRM UI (Asia/Tashkent). */

const MONTHS_UZ = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
] as const;

function tashkentParts(iso: string): { y: number; m: number; d: number } | null {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(dt);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
  const y = get('year');
  const m = get('month');
  const d = get('day');
  if (!y || !m || !d) return null;
  return { y, m, d };
}

/** "30 mart" or "27 fevral 2026" (year only if not current). */
export function formatCrmDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const p = tashkentParts(iso);
  if (!p) return '—';
  const month = MONTHS_UZ[p.m - 1] ?? String(p.m);
  const nowY = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', year: 'numeric' }).format(new Date())
  );
  return p.y === nowY ? `${p.d} ${month}` : `${p.d} ${month} ${p.y}`;
}

/** Whole days idle (floor). Minimum 0. */
export function idleDaysFromHours(hours: number | null | undefined): number {
  if (hours == null || !Number.isFinite(hours) || hours < 0) return 0;
  return Math.floor(hours / 24);
}

export function daysLeftUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

export function formatDurationShort(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h <= 0) return `${m} daq`;
  return `${h} soat ${m} daq`;
}
