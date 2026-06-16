import { useMemo, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Minus } from 'lucide-react';
import type { ActivityCalendar } from '../../api/stats';
import { useLocale } from '../../context/LocaleContext';

const BORDER = 'var(--app-border)';
const TEXT = 'var(--app-text)';
const TEXT_SECONDARY = 'var(--app-text-muted)';
const PRIMARY = 'var(--app-primary)';

const MONTH_NAMES_UZ = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentabr',
  'Oktabr',
  'Noyabr',
  'Dekabr',
];

const WEEKDAY_LABELS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

export type ActivityCalendarCardProps = {
  calendar: ActivityCalendar | null;
  loading: boolean;
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  onMonthChange: (year: number, month: number) => void;
};

function monthSelectOptions(now: Date): { key: string; y: number; m: number; label: string }[] {
  const list: { key: string; y: number; m: number; label: string }[] = [];
  let y = now.getFullYear();
  let mo = now.getMonth() + 1;
  for (let i = 0; i < 36; i++) {
    list.push({
      key: `${y}-${String(mo).padStart(2, '0')}`,
      y,
      m: mo,
      label: `${MONTH_NAMES_UZ[mo - 1]} ${y}`,
    });
    mo -= 1;
    if (mo === 0) {
      mo = 12;
      y -= 1;
    }
  }
  return list;
}

export default function ActivityCalendarCard({
  calendar,
  loading,
  year,
  month,
  onPrev,
  onNext,
  onMonthChange,
}: ActivityCalendarCardProps) {
  const { t } = useLocale();
  const today = new Date().toISOString().split('T')[0];
  const now = useMemo(() => new Date(), []);
  const monthOptions = useMemo(() => monthSelectOptions(now), [now]);

  const cells = useMemo(() => {
    if (!calendar) return [];
    const firstDate = new Date(year, month - 1, 1);
    const firstDow = (firstDate.getDay() + 6) % 7;
    const grid: Array<{ date: string; status: string; extra: number } | null> = [];
    for (let i = 0; i < firstDow; i++) grid.push(null);
    for (const d of calendar.days) {
      grid.push({ date: d.date, status: d.status, extra: d.extra_days });
    }
    return grid;
  }, [calendar, year, month]);

  const selectValue = `${year}-${String(month).padStart(2, '0')}`;

  return (
    <div
      className="overflow-hidden rounded-[24px] border bg-app-surface shadow-app-card md:rounded-[24px]"
      style={{ borderColor: BORDER }}
    >
      {/* Header — mock: title left, month + arrows right */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3.5 md:px-5" style={{ borderColor: BORDER }}>
        <h2 className="text-[17px] font-bold tracking-tight md:text-lg" style={{ color: TEXT }}>
          {t('stats.calendarTitle')}
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          <label htmlFor="stats-cal-month" className="sr-only">
            {t('stats.calendarTitle')}
          </label>
          <select
            id="stats-cal-month"
            value={selectValue}
            disabled={loading}
            onChange={(e) => {
              const [yy, mm] = e.target.value.split('-').map(Number);
              if (Number.isFinite(yy) && Number.isFinite(mm)) onMonthChange(yy, mm);
            }}
            className="max-w-[10.5rem] cursor-pointer truncate rounded-xl border bg-app-surface py-2 pl-3 pr-8 text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-app-primary/40 md:max-w-[12rem] md:text-sm"
            style={{ borderColor: BORDER, color: PRIMARY }}
          >
            {monthOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onPrev}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-app-border bg-app-surface-elevated text-app-text-muted transition-colors hover:bg-[var(--app-row-hover)] disabled:opacity-40"
            style={{ borderColor: BORDER }}
            aria-label={t('stats.calendarPrevMonth')}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={loading || (year === now.getFullYear() && month === now.getMonth() + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-app-border bg-app-surface-elevated text-app-text-muted transition-colors hover:bg-[var(--app-row-hover)] disabled:opacity-35"
            style={{ borderColor: BORDER }}
            aria-label={t('stats.calendarNextMonth')}
          >
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
      </div>

      {/* Weekday row */}
      <div
        className="grid grid-cols-7 border-b border-app-border bg-app-bg-subtle px-0 py-2 md:py-2.5"
        style={{ borderColor: BORDER }}
      >
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-semibold uppercase tracking-wide md:text-xs"
            style={{ color: TEXT_SECONDARY }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div
            className="h-7 w-7 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: PRIMARY }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-7" style={{ borderColor: BORDER }}>
          {cells.map((cell, idx) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[56px] border-r border-b border-app-border bg-app-bg-subtle/50 md:min-h-[64px]"
                  style={{ borderColor: BORDER }}
                />
              );
            }

            const { date, status, extra } = cell;
            const dayNum = parseInt(date.split('-')[2], 10);
            const isToday = date === today;

            let inner: ReactNode = (
              <span className="h-7 w-7 shrink-0 md:h-8 md:w-8" aria-hidden />
            );

            if (status === 'done') {
              inner = (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-sm md:h-8 md:w-8">
                  <Check className="h-4 w-4 text-white md:h-[18px] md:w-[18px]" strokeWidth={3} aria-hidden />
                </span>
              );
            } else if (status === 'extra') {
              inner = (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold leading-none text-white shadow-sm md:h-8 md:w-8 md:text-xs">
                  +{extra}
                </span>
              );
            } else if (status === 'missed') {
              inner = (
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-app-border bg-app-bg-subtle md:h-8 md:w-8"
                  aria-hidden
                >
                  <Minus className="h-3.5 w-3.5 text-app-text-muted md:h-4 md:w-4" strokeWidth={2.5} aria-hidden />
                </span>
              );
            }

            const mutedDayNum =
              status === 'future' || status === 'none' || status === 'today'
                ? TEXT_SECONDARY
                : status === 'missed'
                  ? TEXT_SECONDARY
                  : TEXT;

            const cellRing =
              isToday && status !== 'done' && status !== 'extra'
                ? 'ring-2 ring-blue-500/90 ring-inset'
                : '';

            return (
              <div
                key={date}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 border-r border-b border-app-border px-0.5 py-1 md:min-h-[64px] md:gap-1 md:py-1.5 ${cellRing} ${
                  status === 'done'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
                    : status === 'extra'
                      ? 'bg-blue-500/10 dark:bg-blue-500/15'
                      : status === 'missed'
                        ? 'bg-app-bg-subtle'
                        : 'bg-transparent'
                }`}
                title={date}
              >
                <span
                  className="text-[12px] font-bold tabular-nums leading-none md:text-[13px]"
                  style={{ color: mutedDayNum }}
                >
                  {dayNum}
                </span>
                {inner}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-app-border bg-app-bg-subtle px-4 py-3 md:gap-x-6 md:px-5 md:py-3.5"
      >
        <span className="flex items-center gap-2 text-[11px] font-medium md:text-xs" style={{ color: TEXT_SECONDARY }}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
            <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden />
          </span>
          {t('stats.calendarLegendOnce')}
        </span>
        <span className="flex items-center gap-2 text-[11px] font-medium md:text-xs" style={{ color: TEXT_SECONDARY }}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
            +2
          </span>
          {t('stats.calendarLegendMulti')}
        </span>
        <span className="flex items-center gap-2 text-[11px] font-medium md:text-xs" style={{ color: TEXT_SECONDARY }}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-app-border bg-app-bg-subtle">
            <Minus className="h-3 w-3 text-app-text-muted" strokeWidth={2.5} aria-hidden />
          </span>
          {t('stats.calendarLegendMissed')}
        </span>
      </div>
    </div>
  );
}
