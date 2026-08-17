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
    <Tag className={`rounded-[22px] border border-[#EFEEF8] bg-white ${className}`}>{children}</Tag>
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
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#171A3D] lg:text-[27px]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-[13px] text-[#6E7191] lg:text-[14px]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
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
      className={`min-h-[44px] rounded-[12px] bg-[#4B3BE4] px-[18px] text-[13px] font-semibold text-white transition hover:bg-[#3A2CD0] active:scale-[0.98] disabled:opacity-50 ${className}`}
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
    default: 'bg-white text-[#3E4166] border border-[#E4E3F2] hover:border-[#C9C6EC]',
    danger: 'bg-white text-[#C23A3F] border border-[#F6D9D9] hover:border-[#E9474D]',
    dark: 'bg-[#171A3D] text-white border border-[#171A3D] hover:bg-[#25295A]',
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[44px] rounded-[12px] px-[18px] text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
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
  tone?: 'violet' | 'green' | 'grey' | 'light';
}) {
  const tones = {
    violet: 'bg-[#EFEDFD] text-[#4B3BE4]',
    green: 'bg-[#E7F4EC] text-[#17A34A]',
    grey: 'bg-[#F0EFF7] text-[#6E7191]',
    light: 'bg-white/14 text-white',
  } as const;
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
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${tones[tone]}`}
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
  tone?: 'violet' | 'green' | 'amber' | 'grey' | 'red';
}) {
  const tones = {
    violet: 'bg-[#EFEDFD] text-[#4B3BE4]',
    green: 'bg-[#E7F4EC] text-[#17A34A]',
    amber: 'bg-[#FFF4DA] text-[#8A6B12]',
    grey: 'bg-[#F0EFF7] text-[#6E7191]',
    red: 'bg-[#FDECEC] text-[#C23A3F]',
  } as const;
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${tones[tone]}`}
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
}: {
  label: string;
  value: string;
  hint?: string;
  hintTone?: 'muted' | 'green' | 'violet';
}) {
  const tones = { muted: 'text-[#6E7191]', green: 'text-[#17A34A]', violet: 'text-[#4B3BE4]' } as const;
  return (
    <div className="rounded-[18px] border border-[#EFEEF8] bg-white p-4">
      <p className="text-[12.5px] text-[#6E7191]">{label}</p>
      <p className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-[#171A3D] lg:text-[26px]">
        {value}
      </p>
      <p className={`mt-1.5 min-h-[16px] text-[11.5px] font-medium ${tones[hintTone]}`}>{hint ?? ''}</p>
    </div>
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
            className={`min-h-[40px] shrink-0 rounded-full border px-[18px] text-[12.5px] font-semibold transition ${
              on
                ? 'border-[#4B3BE4] bg-[#4B3BE4] text-white'
                : 'border-[#E4E3F2] bg-white text-[#5B5E86] hover:border-[#C9C6EC]'
            }`}
          >
            {it.label}
            {it.count != null ? (
              <span className={on ? 'ml-1.5 text-white/70' : 'ml-1.5 text-[#8A8CAE]'}>{it.count}</span>
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
            className={`min-h-[40px] border px-4 text-[12.5px] font-medium transition ${
              square ? 'min-w-[60px] rounded-[12px] font-semibold' : 'rounded-full'
            } ${
              on
                ? 'border-[#4B3BE4] bg-[#4B3BE4] text-white'
                : 'border-[#E4E3F2] bg-white text-[#5B5E86] hover:border-[#C9C6EC]'
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
    <div className="h-2 overflow-hidden rounded-full bg-[#F0EFF8]">
      <div
        className={`h-full rounded-full transition-all ${tone === 'green' ? 'bg-[#17A34A]' : 'bg-[#4B3BE4]'}`}
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
      <span className={`text-[12.5px] font-semibold ${error ? 'text-[#C23A3F]' : 'text-[#3E4166]'}`}>
        {label}
        {error ? <span className="ml-1 text-[#E9474D]">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-[11.5px] font-semibold text-[#C23A3F]">{error}</span>
      ) : hint ? (
        <span className="text-[11.5px] text-[#8A8CAE]">{hint}</span>
      ) : null}
    </label>
  );
}

/** To'ldirilmagan maydon uchun qizil ramka. */
export const inputErrorClass = 'border-[#E9474D] bg-[#FFF8F8]';

export const inputClass =
  'min-h-[44px] w-full rounded-[12px] border border-[#E4E3F2] bg-white px-3.5 text-[13px] text-[#171A3D] outline-none transition focus:border-[#4B3BE4]';

export const textareaClass =
  'w-full rounded-[13px] border border-[#E4E3F2] bg-white p-3.5 text-[13px] leading-[1.6] text-[#171A3D] outline-none transition focus:border-[#4B3BE4]';

export function Empty({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-[#D9D8EC] bg-white px-5 py-10 text-center">
      <p className="text-[13.5px] font-medium text-[#6E7191]">{text}</p>
      {hint ? <p className="mx-auto mt-1.5 max-w-[420px] text-[12.5px] text-[#8A8CAE]">{hint}</p> : null}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-[72px] animate-pulse rounded-[18px] bg-white" />
      ))}
    </div>
  );
}

export function ErrorNote({ text }: { text: string }) {
  return (
    <p className="mb-3 rounded-[14px] bg-[#FDECEC] px-4 py-3 text-[13px] font-medium text-[#C23A3F]">
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(14,16,45,0.32)] p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-[24px] bg-white p-6 pb-[max(env(safe-area-inset-bottom,0px),24px)] sm:rounded-[24px] sm:pb-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[18px] font-semibold text-[#171A3D]">{title}</p>
            {subtitle ? <p className="mt-1 text-[12.5px] text-[#6E7191]">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5F5FB] text-[15px] text-[#3E4166]"
            aria-label="close"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-4">{children}</div>
        {footer ? <div className="mt-5 flex gap-2.5">{footer}</div> : null}
      </motion.div>
    </div>
  );
}

export function Toast({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-[92px] left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2.5 rounded-[14px] bg-[#12265F] px-5 py-3.5 text-white shadow-[0_12px_30px_rgba(18,38,95,0.28)] lg:bottom-7"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17A34A] text-[11px]">
        ✓
      </span>
      <span className="text-[13px] font-medium">{text}</span>
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
