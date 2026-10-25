import { useEffect, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { MONTHS, type PanelLang } from './lang';

/**
 * Panelning umumiy qismlari: ranglar, kichik komponentlar va sana/son
 * formatlash. Prototipdagi inline-stil bu yerda Tailwind sinflariga
 * ko'chirilgan — bir joyda turgani uchun butun panel bir xil ko'rinadi.
 */

/* ------------------------------- Formatlash ------------------------------- */

const TZ = 'Asia/Tashkent';

/**
 * Sanani `Date` ga aylantiradi.
 *
 * Server Postgres formatini beradi ("2026-08-11 14:00:00+05") — Safari uni
 * tushunmaydi, shuning uchun bo'sh joy `T` ga almashtiriladi. Faqat kun
 * berilsa (YYYY-MM-DD), mintaqa siljishi kunni o'zgartirmasligi uchun
 * peshin vaqti olinadi.
 */
function toDate(value: string | Date): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const iso = raw.length === 10 ? `${raw}T12:00:00Z` : raw.replace(' ', 'T');
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Toshkent kalendari bo'yicha kun/oy/yil. Sana yaroqsiz bo'lsa — nollar. */
export function tashkentParts(value: string | Date): {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
} {
  const date = toDate(value);
  if (!date) return { day: 0, month: 0, year: 0, hour: 0, minute: 0 };
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return {
    day: get('day'),
    month: get('month'),
    year: get('year'),
    hour: get('hour') % 24,
    minute: get('minute'),
  };
}

/** `YYYY-MM-DD` (Toshkent kuni). */
export function tashkentDate(value: string | Date = new Date()): string {
  const { day, month, year } = tashkentParts(value);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function fmtTime(iso: string | null): string {
  if (!iso || !toDate(iso)) return '—';
  const { hour, minute } = tashkentParts(iso);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** "10 avgust" / "10 августа". */
export function fmtDate(iso: string | null, lang: PanelLang): string {
  if (!iso || !toDate(iso)) return '—';
  const { day, month } = tashkentParts(iso);
  return `${day} ${MONTHS[lang][month - 1] ?? ''}`;
}

export function fmtDateTime(iso: string | null, lang: PanelLang): string {
  if (!iso || !toDate(iso)) return '—';
  return `${fmtDate(iso, lang)}, ${fmtTime(iso)}`;
}


/** 4850000 → "4 850 000". */
export function fmtSum(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function initials(name: string): string {
  return (
    name
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

/** Berilgan vaqtgacha qolgan daqiqa (o'tib ketgan bo'lsa manfiy). */
export function minutesUntil(iso: string | null, from = Date.now()): number | null {
  const d = iso ? toDate(iso) : null;
  return d ? Math.round((d.getTime() - from) / 60000) : null;
}

/** Berilgan sanagacha qolgan to'liq kun (o'tib ketgan bo'lsa 0). */
export function daysUntil(iso: string | null): number | null {
  const d = iso ? toDate(iso) : null;
  return d ? Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000)) : null;
}

/** Sanani `YYYY-MM-DD` ko'rinishida siljitadi. */
export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Berilgan kun tushgan haftaning DUSHANBASI. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return shiftDate(date, -((d.getUTCDay() + 6) % 7));
}

/* ------------------------------ Komponentlar ------------------------------ */

export function Card({
  children,
  className = '',
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section';
}) {
  const Tag = as;
  return (
    <Tag className={`rounded-[22px] border border-app-border bg-app-surface ${className}`}>{children}</Tag>
  );
}

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  // Prototip: oddiy sarlavha (26/800) + kulrang izoh, amallar o'ngda — umumiy platforma «hero»si emas.
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 lg:mb-5">
      <div className="min-w-0">
        <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.01em] text-app-text lg:text-[26px]">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-[14px] text-app-text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** Segment-tablar (Balans · Komissiya, Profil · Anketa …). */
export function SegmentTabs<T extends string>({
  items,
  active,
  onChange,
}: {
  items: Array<{ key: T; label: string }>;
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div role="tablist" className="mb-4 flex w-fit max-w-full gap-1 overflow-x-auto rounded-[14px] bg-app-bg-subtle p-1 lg:mb-5">
      {items.map((it) => {
        const on = it.key === active;
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.key)}
            className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-[10px] px-4 text-[13.5px] font-bold transition active:scale-[0.98] ${
              on ? 'bg-app-surface text-app-text shadow-[0_1px_2px_rgba(15,23,42,0.1)]' : 'text-app-text-muted hover:text-app-text'
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[46px] rounded-[12px] bg-app-primary px-[18px] text-[14px] font-bold text-white transition hover:bg-app-primary-deep active:scale-[0.98] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
  className = '',
  tone = 'default',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  tone?: 'default' | 'danger' | 'dark';
}) {
  const tones = {
    default: 'bg-app-surface text-app-text border border-app-border hover:border-app-border-strong hover:bg-[var(--app-row-hover)]',
    danger: 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FEF2F2] hover:border-[#FECACA]',
    dark: 'bg-[#134E4A] text-white border border-[#134E4A] hover:bg-[#115E59]',
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[44px] rounded-[12px] px-4 text-[14px] font-bold transition active:scale-[0.98] disabled:opacity-50 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

export type AvatarTone = 'violet' | 'teal' | 'green' | 'amber' | 'blue' | 'pink' | 'grey' | 'light';

/** Ism bo'yicha barqaror rang — ro'yxatda hamma bir xil ko'rinmasin (prototipdagidek). */
export function toneFor(name: string): AvatarTone {
  const palette: AvatarTone[] = ['amber', 'teal', 'blue', 'pink', 'grey'];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

export function Avatar({
  name,
  size = 40,
  url,
  tone = 'violet',
}: {
  name: string;
  size?: number;
  url?: string | null;
  tone?: AvatarTone;
}) {
  const tones: Record<AvatarTone, string> = {
    violet: 'bg-[#D5EFEA] text-[#115E59]',
    teal: 'bg-[#D5EFEA] text-[#115E59]',
    green: 'bg-[#DCFCE7] text-[#166534]',
    amber: 'bg-[#FDE68A] text-[#78350F]',
    blue: 'bg-[#DBEAFE] text-[#1E40AF]',
    pink: 'bg-[#FCE7F3] text-[#9D174D]',
    grey: 'bg-app-bg-subtle text-app-text-muted',
    light: 'bg-white/14 text-white',
  };
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.32)) }}
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold ${tones[tone]}`}
    >
      {initials(name)}
    </span>
  );
}

export function Tag({
  children,
  tone = 'violet',
}: {
  children: ReactNode;
  tone?: 'violet' | 'teal' | 'blue' | 'green' | 'amber' | 'grey' | 'red';
}) {
  const tones = {
    violet: 'bg-[#E6F4F1] text-[#115E59]',
    teal: 'bg-[#E6F4F1] text-[#115E59]',
    blue: 'bg-[#DBEAFE] text-[#1E40AF]',
    green: 'bg-[#DCFCE7] text-[#166534]',
    amber: 'bg-[#FEF3C7] text-[#92400E]',
    grey: 'bg-[#F1F4F7] text-[#334155]',
    red: 'bg-[#FEE2E2] text-[#991B1B]',
  } as const;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-[3px] text-[12px] font-bold whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  hintTone = 'muted',
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  hintTone?: 'muted' | 'green' | 'violet' | 'amber';
  onClick?: () => void;
}) {
  const tones = { muted: 'text-app-text-muted', green: 'text-[#166534]', violet: 'text-app-brand', amber: 'text-[#92400E]' } as const;
  const body = (
    <>
      <span className="block text-[13px] font-semibold text-app-text-muted">{label}</span>
      <span className="mt-1 mb-0.5 block text-[24px] font-extrabold tracking-[-0.01em] text-app-text lg:text-[26px]">{value}</span>
      <span className={`block min-h-[16px] text-[12px] font-bold ${tones[hintTone]}`}>{hint ?? ''}</span>
    </>
  );
  const cls = 'rounded-[18px] border border-app-border bg-app-surface px-4 py-3.5 text-left';
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition hover:border-app-border-strong hover:shadow-[0_14px_34px_rgba(148,163,184,0.12)] active:scale-[0.98]`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Pills<T extends string>({
  items,
  active,
  onChange,
}: {
  items: Array<{ key: T; label: string; count?: number }>;
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
      {items.map((it) => {
        const on = it.key === active;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-bold transition active:scale-[0.97] ${
              on
                ? 'border-app-primary bg-app-primary text-white'
                : 'border-app-border-strong bg-app-surface text-app-text-secondary hover:border-app-primary'
            }`}
          >
            {it.label}
            {it.count != null ? (
              <span className="ml-1.5 opacity-70">{it.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function Chips({
  options,
  selected,
  onToggle,
  square = false,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  square?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`min-h-[40px] border px-3.5 text-[13px] font-bold transition active:scale-[0.97] ${
              square ? 'min-w-[60px] rounded-[12px]' : 'rounded-full'
            } ${
              on
                ? 'border-app-primary bg-app-primary text-white'
                : 'border-app-border-strong bg-app-surface text-app-text-secondary hover:border-app-primary'
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function ProgressBar({ percent, tone = 'violet' }: { percent: number; tone?: 'violet' | 'green' }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#E6F4F1]">
      <div
        className={`h-full rounded-full transition-all ${tone === 'green' ? 'bg-[#16A34A]' : 'bg-app-primary'}`}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  error,
  className = '',
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  /** To'ldirilmagan maydon — qizil yozuv bilan ko'rsatiladi. */
  error?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className={`text-[13.5px] font-bold ${error ? 'text-[#B91C1C]' : 'text-app-text'}`}>
        {label}
        {error ? <span className="ml-1 text-[#E9474D]">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-[11.5px] font-semibold text-[#C23A3F]">{error}</span>
      ) : hint ? (
        <span className="text-[12px] font-medium text-app-text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

/** To'ldirilmagan maydon uchun qizil ramka. */
export const inputErrorClass = 'border-[#E9474D] bg-[#FFF8F8]';

export const inputClass =
  'min-h-[44px] w-full rounded-[12px] border border-app-border-strong bg-app-surface px-3 text-[14px] text-app-text outline-none transition focus:border-app-primary focus:ring-2 focus:ring-[#0F766E]/15';

export const textareaClass =
  'w-full rounded-[12px] border border-app-border-strong bg-app-surface px-3 py-2.5 text-[14px] leading-[1.55] text-app-text outline-none transition focus:border-app-primary focus:ring-2 focus:ring-[#0F766E]/15';

export function Empty({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#CBD5E1] bg-app-surface px-5 py-8 text-center">
      <p className="text-[14px] font-semibold text-app-text-muted">{text}</p>
      {hint ? <p className="mx-auto mt-1.5 max-w-[420px] text-[12.5px] text-app-text-muted">{hint}</p> : null}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-[72px] animate-pulse rounded-[18px] border border-app-border bg-app-surface" />
      ))}
    </div>
  );
}

export function ErrorNote({ text }: { text: string }) {
  return (
    <p role="alert" className="mb-3 rounded-[14px] bg-[#FEF2F2] px-4 py-3 text-[13.5px] font-semibold text-[#B91C1C]">
      {text}
    </p>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 480,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(15,23,42,0.45)] p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-[22px] bg-app-surface p-5 pb-[max(env(safe-area-inset-bottom,0px),20px)] sm:rounded-[22px] sm:pb-5"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[20px] font-extrabold text-app-text">{title}</p>
            {subtitle ? <p className="mt-0.5 text-[14px] text-app-text-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F1F4F7] text-[16px] text-app-text transition hover:bg-app-bg-subtle"
            aria-label="close"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-4">{children}</div>
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </motion.div>
    </div>
  );
}

export function Toast({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      className="fixed bottom-[96px] left-1/2 z-[70] flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2.5 rounded-[14px] bg-[#0F172A] px-[18px] py-3 text-white shadow-[0_12px_30px_rgba(15,23,42,0.25)] lg:bottom-7"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-[11px]">
        ✓
      </span>
      <span className="text-[13.5px] font-bold">{text}</span>
    </motion.div>
  );
}

/** Bo'limlar orasidagi yumshoq kirish animatsiyasi. */
export function Fade({ children, k }: { children: ReactNode; k: string }) {
  return (
    <motion.div
      key={k}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
