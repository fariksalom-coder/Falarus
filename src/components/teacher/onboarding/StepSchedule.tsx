/** 7-qadam: haftalik jadval. Har kunda bir nechta oraliq; ustma-ust tushish taqiqlanadi (server ham tekshiradi). */
import { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, RotateCcw, X } from 'lucide-react';
import { Card, ErrorNote, Field, GhostButton, PrimaryButton, inputClass, inputErrorClass } from '../panel/ui';
import { DEFAULT_SCHEDULE, TIMEZONES, type ScheduleData, type ScheduleSlot } from '../../../../shared/teacherOnboarding';
import { ONBOARDING_TEXT } from './text';
import type { StepProps } from './OnboardingWizard';

type Props = StepProps & { busy: boolean; onSubmit: (body: unknown) => void; initial: unknown };

const sortSlots = (s: ScheduleSlot[]) => [...s].sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));

export default function StepSchedule({ state, onDraft, errors, lang, busy, onSubmit, initial, nextLabel }: Props) {
  const t = ONBOARDING_TEXT[lang];
  const [sched, setSched] = useState<ScheduleData>(() => {
    const s = (initial as { schedule?: ScheduleData } | null)?.schedule ?? state.data.schedule ?? DEFAULT_SCHEDULE;
    return { ...s, slots: sortSlots(s.slots) };
  });
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } onDraft({ schedule: sched }); }, [JSON.stringify(sched)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Xatolar kalitlari saralangan ro'yxat indeksida (server bilan bir xil tartib).
  const slots = sched.slots;
  const setSlots = (next: ScheduleSlot[]) => setSched((s) => ({ ...s, slots: sortSlots(next) }));
  const update = (i: number, p: Partial<ScheduleSlot>) => setSlots(slots.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const add = (weekday: number) => {
    const last = slots.filter((s) => s.weekday === weekday).at(-1);
    const start = last ? last.end : '09:00';
    const h = Math.min(23, Number(start.slice(0, 2)) + 1);
    setSlots([...slots, { weekday, start, end: `${String(h).padStart(2, '0')}:${start.slice(3)}` }]);
  };

  return (
    <>
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold text-app-text">{t.scheduleTitle}</h2>
            <p className="mt-1 text-[13px] text-app-text-muted">{t.scheduleHint}</p>
          </div>
          <GhostButton onClick={() => setSched({ ...DEFAULT_SCHEDULE, timezone: sched.timezone })}><RotateCcw className="mr-1 inline h-4 w-4" />{t.resetTemplate}</GhostButton>
        </div>
        <Field label={t.timezone} error={errors.timezone} className="max-w-xs">
          <select className={`${inputClass} ${errors.timezone ? inputErrorClass : ''}`} value={sched.timezone} onChange={(e) => setSched((s) => ({ ...s, timezone: e.target.value }))}>
            {TIMEZONES.map((z) => <option key={z} value={z}>{z.replace('_', ' ')}</option>)}
          </select>
        </Field>
        {errors.schedule && <ErrorNote text={errors.schedule} />}
        <ul className="divide-y divide-app-border">
          {t.days.map((day, d) => {
            const weekday = d + 1;
            return (
              <li key={weekday} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
                <span className="w-32 shrink-0 pt-2.5 text-[13.5px] font-semibold text-app-text">{day}</span>
                <div className="flex-1 space-y-2">
                  {slots.map((s, i) => s.weekday !== weekday ? null : (
                    <div key={`${i}-${s.start}`}>
                      <div className="flex items-center gap-2">
                        <input type="time" step={900} aria-label={`${day} start`} className={`${inputClass} max-w-[130px] ${errors[`slots.${i}`] ? inputErrorClass : ''}`} value={s.start} onChange={(e) => update(i, { start: e.target.value })} />
                        <span className="text-app-text-muted">—</span>
                        <input type="time" step={900} aria-label={`${day} end`} className={`${inputClass} max-w-[130px] ${errors[`slots.${i}`] ? inputErrorClass : ''}`} value={s.end} onChange={(e) => update(i, { end: e.target.value })} />
                        <button type="button" aria-label={t.remove} onClick={() => setSlots(slots.filter((_, j) => j !== i))} className="flex min-h-11 min-w-11 items-center justify-center rounded-[12px] text-app-text-muted hover:bg-app-bg-subtle"><X className="h-4 w-4" /></button>
                      </div>
                      {errors[`slots.${i}`] && <p className="mt-1 text-[12px] font-semibold text-[#C23A3F]">{errors[`slots.${i}`]}</p>}
                    </div>
                  ))}
                  {!slots.some((s) => s.weekday === weekday) && <p className="pt-2.5 text-[13px] text-app-text-muted">{t.dayOff}</p>}
                </div>
                <button type="button" onClick={() => add(weekday)} className="inline-flex min-h-11 items-center gap-1 self-start rounded-[12px] px-3 text-[12.5px] font-semibold text-app-primary hover:bg-app-bg-subtle">
                  <Plus className="h-4 w-4" />{t.addInterval}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
      <div className="flex justify-end">
        <PrimaryButton onClick={() => onSubmit({ schedule: sched })} disabled={busy} className="w-full sm:w-auto">{busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : nextLabel ?? t.next}</PrimaryButton>
      </div>
    </>
  );
}
