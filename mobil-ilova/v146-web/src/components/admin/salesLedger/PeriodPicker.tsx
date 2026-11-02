import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { MAX_PERIOD_DAYS, addDays, daysBetween, isIsoDate, monthRange } from '../../../../shared/salesLedger';
import { formatDayLong, formatDayShort } from './ui';

export type PeriodMode = 'day' | 'month' | 'range';
export type Period = { mode: PeriodMode; from: string; to: string };

const MODES: { mode: PeriodMode; label: string }[] = [
  { mode: 'day', label: 'День' },
  { mode: 'month', label: 'Месяц' },
  { mode: 'range', label: 'Период' },
];

export function periodForMode(mode: PeriodMode, anchor: string): Period {
  if (mode === 'day') return { mode, from: anchor, to: anchor };
  if (mode === 'month') return { mode, ...monthRange(anchor) };
  // Ixtiyoriy davr — boshlanishiga oxirgi 7 kun.
  return { mode, from: addDays(anchor, -6), to: anchor };
}

/** URL dan davr (?mode=&from=&to=) — noto'g'ri bo'lsa bugungi kun. */
export function periodFromUrl(today: string): Period {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const from = params.get('from');
  const to = params.get('to');
  if ((mode === 'day' || mode === 'month' || mode === 'range') && isIsoDate(from) && isIsoDate(to) && from <= to && daysBetween(from, to) < MAX_PERIOD_DAYS) {
    return { mode, from, to };
  }
  return periodForMode('day', today);
}

export function formatPeriod(period: Period): string {
  if (period.mode === 'day' || period.from === period.to) return formatDayLong(period.from);
  if (period.mode === 'month') {
    const label = new Date(`${period.from}T00:00:00Z`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return `${formatDayShort(period.from)} – ${formatDayLong(period.to)}`;
}

function shift(period: Period, direction: -1 | 1): Period {
  if (period.mode === 'month') {
    const anchor = direction < 0 ? addDays(period.from, -1) : addDays(period.to, 1);
    return periodForMode('month', anchor);
  }
  const length = daysBetween(period.from, period.to) + 1;
  return { ...period, from: addDays(period.from, direction * length), to: addDays(period.to, direction * length) };
}

const navButton = 'grid h-11 w-11 shrink-0 place-items-center rounded-xl transition hover:bg-white/15 active:scale-95 disabled:opacity-40';
const dateInput =
  'h-11 rounded-xl border-0 bg-white/10 px-3 text-[14px] font-semibold text-white outline-none ring-1 ring-white/15 [color-scheme:dark] focus:ring-2 focus:ring-white/60';

export function PeriodPicker({ period, today, onChange }: { period: Period; today: string; onChange: (period: Period) => void }) {
  const isCurrent = period.mode === 'month' ? period.from <= today && today <= period.to : period.to === today;
  const nextDisabled = period.to >= today;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="tablist" aria-label="Период" className="flex rounded-2xl bg-white/10 p-1 ring-1 ring-white/15">
        {MODES.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={period.mode === mode}
            onClick={() => period.mode !== mode && onChange(periodForMode(mode, period.to > today ? today : period.to))}
            className={`min-h-[40px] rounded-xl px-3.5 text-[13.5px] font-semibold transition active:scale-[0.97] ${
              period.mode === mode ? 'bg-white text-blue-700 shadow-sm' : 'text-white/85 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {period.mode === 'range' ? (
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-white/80">
          <label className="flex items-center gap-1.5">
            с
            <input
              type="date"
              value={period.from}
              max={period.to}
              aria-label="Начало периода"
              onChange={(e) => {
                const from = e.target.value;
                if (isIsoDate(from) && from <= period.to && daysBetween(from, period.to) < MAX_PERIOD_DAYS) onChange({ ...period, from });
              }}
              className={dateInput}
            />
          </label>
          <label className="flex items-center gap-1.5">
            по
            <input
              type="date"
              value={period.to}
              min={period.from}
              max={today}
              aria-label="Конец периода"
              onChange={(e) => {
                const to = e.target.value;
                if (isIsoDate(to) && to >= period.from && daysBetween(period.from, to) < MAX_PERIOD_DAYS) onChange({ ...period, to });
              }}
              className={dateInput}
            />
          </label>
        </div>
      ) : (
        <div className="flex items-center rounded-2xl bg-white/10 p-1 ring-1 ring-white/15">
          <button type="button" aria-label={period.mode === 'month' ? 'Предыдущий месяц' : 'Предыдущий день'} onClick={() => onChange(shift(period, -1))} className={navButton}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <label className="relative flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-3 text-[14px] font-semibold transition hover:bg-white/10">
            <CalendarDays className="h-4 w-4 opacity-80" />
            {formatPeriod(period)}
            <input
              type={period.mode === 'month' ? 'month' : 'date'}
              value={period.mode === 'month' ? period.from.slice(0, 7) : period.from}
              max={period.mode === 'month' ? today.slice(0, 7) : today}
              onChange={(e) => {
                const value = period.mode === 'month' ? `${e.target.value}-01` : e.target.value;
                if (isIsoDate(value)) onChange(periodForMode(period.mode, value));
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label={period.mode === 'month' ? 'Выбрать месяц' : 'Выбрать дату'}
            />
          </label>
          <button type="button" aria-label={period.mode === 'month' ? 'Следующий месяц' : 'Следующий день'} disabled={nextDisabled} onClick={() => onChange(shift(period, 1))} className={navButton}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {!isCurrent && period.mode !== 'range' && (
        <button
          type="button"
          onClick={() => onChange(periodForMode(period.mode, today))}
          className="min-h-[44px] rounded-2xl bg-white/10 px-4 text-[13.5px] font-semibold ring-1 ring-white/15 transition hover:bg-white/20 active:scale-[0.98]"
        >
          {period.mode === 'month' ? 'Этот месяц' : 'Сегодня'}
        </button>
      )}
    </div>
  );
}
