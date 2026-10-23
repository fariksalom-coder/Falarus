/**
 * Ustozning bo'sh vaqtlari: 7 ustun, BUGUNDAN boshlab (dushanbadan emas), har ustun
 * ostida o'sha kunning boshlanish vaqtlari. Vaqtlar o'quvchi qurilmasining soatida.
 */
import { useMemo } from 'react';
import { WD_SHORT, dayKey, hm } from './parts';

export default function WeekSlots({ slots, onPick }: { slots: string[]; onPick: (iso: string) => void }) {
  const days = useMemo(() => {
    const now = new Date();
    const byDay = new Map<string, string[]>();
    for (const iso of slots) {
      const k = dayKey(new Date(iso));
      byDay.set(k, [...(byDay.get(k) ?? []), iso]);
    }
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      return { date: d, today: i === 0, times: (byDay.get(dayKey(d)) ?? []).sort() };
    });
  }, [slots]);
  const empty = days.every((d) => !d.times.length);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((d) => (
          <div key={dayKey(d.date)} className="min-w-0">
            <div className={`mb-1.5 rounded-xl py-1.5 text-center ${d.today ? 'bg-app-primary-deep text-white' : 'bg-app-bg-subtle text-app-text'}`}>
              <p className="text-[11px] font-bold uppercase opacity-80">{d.today ? 'Bugun' : WD_SHORT[d.date.getDay()]}</p>
              <p className="text-[15px] font-black tabular-nums leading-tight">{d.date.getDate()}</p>
            </div>
            <div className="flex flex-col gap-1">
              {d.times.length ? d.times.map((iso) => (
                <button key={iso} type="button" onClick={() => onPick(iso)}
                  className="flex h-11 items-center justify-center rounded-xl border border-app-border bg-app-surface text-[12.5px] font-bold tabular-nums text-app-text transition hover:border-app-primary hover:bg-app-icon-bg active:scale-95 sm:text-sm">
                  {hm(new Date(iso))}
                </button>
              )) : <span className="py-3 text-center text-xs text-app-text-secondary" aria-label="Boʻsh vaqt yoʻq">—</span>}
            </div>
          </div>
        ))}
      </div>
      {empty && <p className="mt-3 rounded-2xl bg-app-bg-subtle p-4 text-center text-sm font-semibold text-app-text-muted">Shu haftada boʻsh vaqt qolmagan. Keyinroq qayta qarang.</p>}
      <p className="mt-3 text-xs font-medium text-app-text-secondary">Vaqtlar sizning soatingiz boʻyicha · dars 50 daqiqa</p>
    </div>
  );
}
