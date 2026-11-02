import { useMemo, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { ActivityCalendar } from '../../api/stats';
import { useLocale } from '../../context/LocaleContext';

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

const WEEKDAY_LABELS = ['DU', 'SE', 'CH', 'PA', 'JU', 'SH', 'YA'];

export type ActivityCalendarCardProps = {
  calendar: ActivityCalendar | null;
  loading: boolean;
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  onMonthChange: (year: number, month: number) => void;
};

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
  const canGoNext = !(year === now.getFullYear() && month === now.getMonth() + 1);

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

  return (
    <div className="rounded-[24px] bg-pmn-card p-4 shadow-[0_14px_28px_-16px_rgba(15,27,59,0.18)] ring-1 ring-pmn-border sm:p-5">
      {/* Header: serif title + Iyul pill + arrows */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="profile-heading text-[20px] leading-none text-pmn-text sm:text-[22px]">
          {t('stats.calendarTitle') || 'Faollik taqvimi'}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <label htmlFor="stats-cal-month" className="sr-only">
            {t('stats.calendarTitle') || 'Faollik taqvimi'}
          </label>
          <div className="relative">
            <select
              id="stats-cal-month"
              value={`${year}-${String(month).padStart(2, '0')}`}
              disabled={loading}
              onChange={(e) => {
                const [yy, mm] = e.target.value.split('-').map(Number);
                if (Number.isFinite(yy) && Number.isFinite(mm)) onMonthChange(yy, mm);
              }}
              className="appearance-none rounded-[13px] bg-[#0F1B3B] pl-3.5 pr-7 py-1.5 text-[13px] font-black text-white outline-none shadow-[0_6px_14px_-6px_rgba(15,27,59,0.4)]"
            >
              {Array.from({ length: 36 }, (_, i) => {
                let m = now.getMonth() + 1 - i;
                let y = now.getFullYear();
                while (m <= 0) { m += 12; y -= 1; }
                return { key: `${y}-${String(m).padStart(2, '0')}`, y, m, label: `${MONTH_NAMES_UZ[m - 1]} ${y}` };
              }).map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronRight
              className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-[#D4AC5C]"
              strokeWidth={2.4}
            />
          </div>
          <button
            type="button"
            onClick={onPrev}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-pmn-pill text-pmn-text ring-1 ring-pmn-border transition hover:bg-[#E5E7EB] disabled:opacity-40"
            aria-label={t('stats.calendarPrevMonth') || 'Oldingi oy'}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={loading || !canGoNext}
            className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-pmn-pill text-pmn-text ring-1 ring-pmn-border transition hover:bg-[#E5E7EB] disabled:opacity-40"
            aria-label={t('stats.calendarNextMonth') || 'Keyingi oy'}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* Weekday header row */}
      <div className="mt-5 grid grid-cols-7 gap-y-3">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-[10.5px] font-bold uppercase tracking-[0.14em] text-pmn-text-soft"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="mt-4 flex h-40 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#D4AC5C] border-t-transparent" />
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-7 gap-y-3">
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="flex h-[52px] items-center justify-center" />;
            }

            const { date, status, extra } = cell;
            const dayNum = parseInt(date.split('-')[2], 10);
            const isToday = date === today;
            const isDone = status === 'done' || status === 'extra';

            let bubble: ReactNode = null;

            if (isDone) {
              bubble = (
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#0A1638] shadow-[0_6px_14px_-6px_rgba(212,172,92,0.55)] ${
                    isToday ? 'ring-2 ring-[#0F1B3B] ring-offset-2 ring-offset-white' : ''
                  }`}
                  style={{ background: 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)' }}
                >
                  {status === 'extra' ? (
                    <span className="text-[10.5px] font-black">+{extra}</span>
                  ) : (
                    <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                  )}
                </span>
              );
            } else {
              // Missed / future / none — dashed circle (empty ring)
              bubble = (
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed ${
                    isToday ? 'border-[#0F1B3B]' : 'border-[#D8D6CE]'
                  }`}
                  aria-hidden
                />
              );
            }

            const dayNumColor = isDone
              ? '#131F44'
              : isToday
                ? '#0F1B3B'
                : status === 'future' || status === 'none'
                  ? '#B5AE97'
                  : '#B5AE97';
            const dayNumWeight = isDone || isToday ? '900' : '700';

            return (
              <div key={date} className="flex flex-col items-center gap-1">
                <span
                  className="text-[13px] leading-none tabular-nums"
                  style={{ color: dayNumColor, fontWeight: dayNumWeight }}
                >
                  {dayNum}
                </span>
                {bubble}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-pmn-border pt-4">
        <span className="flex items-center gap-2 text-[11.5px] font-bold text-pmn-text">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#0A1638]"
            style={{ background: 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)' }}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
          </span>
          Faol kun
        </span>
        <span className="flex items-center gap-2 text-[11.5px] font-bold text-pmn-text-soft">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[#D8D6CE]" />
          O'tkazilgan
        </span>
      </div>
    </div>
  );
}
