import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addOpenTime,
  blockTime,
  getSchedule,
  getScheduleActivity,
  removeAvailability,
  unblockTime,
  type ScheduleDay,
  type ScheduleEvent,
  type ScheduleResponse,
  type ScheduleSlot,
} from '../../../../api/teacherPanel';
import { usePanel } from '../panelContext';
import { WEEKDAYS, WEEKDAYS_SHORT, tpl } from '../lang';
import {
  Card,
  ErrorNote,
  GhostButton,
  PageHead,
  PrimaryButton,
  Skeleton,
  Tag,
  fmtDate,
  fmtDateTime,
  shiftDate,
  tashkentDate,
  tashkentParts,
  weekStart,
} from '../ui';
import { AddTimeModal, BlockTimeModal } from './scheduleModals';

type View = 'day' | 'week' | 'month';

const SLOT_STYLE: Record<string, string> = {
  free: 'border border-dashed border-[#B4E0C6] bg-[#EDF8F1] text-[#12703A]',
  booked: 'bg-app-primary text-white',
  trial: 'bg-[#E6B33E] text-[#3A2A00]',
  blocked:
    'bg-[repeating-linear-gradient(45deg,#F0EFF7,#F0EFF7_5px,#E7E6F0_5px,#E7E6F0_10px)] text-app-text-muted',
  past: 'bg-[#F8F8FC] text-[#B3B4C9]',
};

/** "09:00" → daqiqa. */
function toMin(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Oyning birinchi kuni. */
function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function daysInMonth(date: string): number {
  const [y, m] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export default function Schedule() {
  const { token, t, lang, go, refresh, toast } = usePanel();
  const today = tashkentDate();

  // Telefonda hafta setkasi tor — kun ko'rinishi bilan ochiladi.
  const [view, setView] = useState<View>(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024 ? 'day' : 'week'
  );
  const [anchor, setAnchor] = useState(() => today);
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyCell, setBusyCell] = useState('');
  const [err, setErr] = useState('');
  const [addOpen, setAddOpen] = useState<{ date?: string; start?: string; end?: string } | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);

  /** Ko'rinishga qarab qaysi kundan nechta kun so'raladi. */
  const range = useMemo(() => {
    if (view === 'day') return { from: anchor, days: 1 };
    if (view === 'month') return { from: monthStart(anchor), days: daysInMonth(anchor) };
    return { from: weekStart(anchor), days: 7 };
  }, [view, anchor]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        setData(await getSchedule(token, range.from, range.days));
        setErr('');
      } catch (e) {
        setErr(e instanceof Error ? e.message : t.errorGeneric);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token, range.from, range.days, t.errorGeneric]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    void getScheduleActivity(token)
      .then((r) => alive && setEvents(r.events))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [token]);

  const reload = useCallback(() => {
    void load();
    void getScheduleActivity(token)
      .then((r) => setEvents(r.events))
      .catch(() => undefined);
    refresh();
  }, [load, token, refresh]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  /**
   * Katakni bosish — vaqtni ochish/yopish.
   *
   * Bo'sh katak → o'sha soat ochiladi (yashil). Yashil katak → yopiladi:
   * bir martalik yozuv bo'lsa o'chadi, haftalik qoidadan chiqqan bo'lsa
   * o'sha soatga blok qo'yiladi. Bloklangan katak → blok olib tashlanadi.
   */
  const toggleCell = async (date: string, time: string, slot: ScheduleSlot | null) => {
    if (slot && (slot.state === 'booked' || slot.state === 'trial')) {
      go('lessons');
      return;
    }
    const key = `${date}-${time}`;
    if (busyCell) return;
    setBusyCell(key);
    setErr('');
    // Optimistik: katak darrov o'zgaradi, so'ng server javobi bilan aniqlanadi.
    setData((prev) => (prev ? optimistic(prev, date, time, slot) : prev));
    try {
      if (!slot) {
        await addOpenTime(token, {
          date,
          start_time: time,
          end_time: toTime(toMin(time) + 60),
          slot_minutes: 60,
        });
      } else if (slot.state === 'free') {
        if (slot.source === 'exception' && slot.exception_id) {
          await unblockTime(token, slot.exception_id);
        } else {
          await blockTime(token, { date, start_time: slot.start, end_time: slot.end });
        }
      } else if (slot.state === 'blocked' && slot.block_id) {
        await unblockTime(token, slot.block_id);
      }
      void getScheduleActivity(token)
        .then((r) => setEvents(r.events))
        .catch(() => undefined);
    } catch (e) {
      // Xato jim qolmasin: katak eski holatiga qaytadi va sabab ko'rinadi.
      const matn = e instanceof Error ? e.message : t.errorGeneric;
      setErr(matn);
      toast(matn);
    } finally {
      await load(true);
      setBusyCell('');
    }
  };

  const shift = (dir: -1 | 1) => {
    if (view === 'day') setAnchor(shiftDate(anchor, dir));
    else if (view === 'week') setAnchor(shiftDate(weekStart(anchor), dir * 7));
    else {
      const first = monthStart(anchor);
      setAnchor(dir === 1 ? shiftDate(first, daysInMonth(first)) : monthStart(shiftDate(first, -1)));
    }
  };

  /**
   * Setka qatorlari: qoidalardan chiqqan barcha boshlanish vaqtlari + kamida
   * 09:00—20:00 oralig'i. Shunda bo'sh vaqt belgilanmagan bo'lsa ham kalendar
   * ko'rinadi va bo'sh katakni bosib vaqt qo'shish mumkin.
   */
  const rows = useMemo(() => {
    const set = new Set<number>();
    for (const d of data?.calendar ?? []) for (const s of d.slots) set.add(toMin(s.start));
    let from = 9 * 60;
    let to = 20 * 60;
    if (set.size) {
      from = Math.min(from, Math.min(...set));
      to = Math.max(to, Math.max(...set));
    }
    for (let m = from; m <= to; m += 60) set.add(m);
    return [...set].sort((a, b) => a - b).map(toTime);
  }, [data]);

  const nowMin = (() => {
    const p = tashkentParts(new Date());
    return p.hour * 60 + p.minute;
  })();

  const isPast = (date: string, start: string) =>
    date < today || (date === today && toMin(start) + 30 < nowMin);

  const title = useMemo(() => {
    if (!data) return t.scheduleSubtitle;
    if (view === 'day') return `${WEEKDAYS[lang][new Date(`${anchor}T12:00:00Z`).getUTCDay()]}, ${fmtDate(anchor, lang)}`;
    return `${fmtDate(data.from, lang)} — ${fmtDate(data.to, lang)} · ${t.scheduleSubtitle}`;
  }, [data, view, anchor, lang, t.scheduleSubtitle]);

  return (
    <div>
      <PageHead
        title={t.scheduleTitle}
        subtitle={title}
        actions={
          <>
            <GhostButton onClick={() => setBlockOpen(true)}>{t.blockTime}</GhostButton>
            <PrimaryButton onClick={() => setAddOpen({})}>{t.addFreeTime}</PrimaryButton>
          </>
        }
      />

      {err ? <ErrorNote text={err} /> : null}

      <Card className="mb-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border p-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-0.5 rounded-[12px] bg-app-bg-muted p-[3px]">
              {(
                [
                  ['day', t.viewDay],
                  ['week', t.viewWeek],
                  ['month', t.viewMonth],
                ] as Array<[View, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  className={`min-h-[36px] rounded-[9px] px-4 text-[12.5px] font-semibold transition ${
                    view === key ? 'bg-app-surface text-app-text shadow-sm' : 'text-app-text-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => shift(-1)}
                className="h-9 w-9 rounded-[9px] bg-app-bg-muted text-app-text"
                aria-label={t.back}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setAnchor(today)}
                className="min-h-[36px] rounded-[9px] bg-app-bg-muted px-3.5 text-[12.5px] font-semibold text-app-text"
              >
                {view === 'week' ? t.weekThis : t.today_}
              </button>
              <button
                type="button"
                onClick={() => shift(1)}
                className="h-9 w-9 rounded-[9px] bg-app-bg-muted text-app-text"
                aria-label={t.next}
              >
                ›
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 text-[11.5px] text-app-text-muted">
            <Legend color="bg-[#EDF8F1] border border-[#B4E0C6]" label={t.slotFree} />
            <Legend color="bg-app-primary" label={t.slotBooked} />
            <Legend color="bg-[#E6B33E]" label={t.slotTrial} />
            <Legend color="bg-[#E7E6F0]" label={t.slotBlocked} />
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <Skeleton rows={3} />
          </div>
        ) : view === 'month' ? (
          <MonthGrid
            data={data}
            today={today}
            onPickDay={(date) => {
              setAnchor(date);
              setView('day');
            }}
          />
        ) : view === 'day' ? (
          <DayList
            day={data?.calendar?.[0] ?? null}
            date={anchor}
            isPast={isPast}
            busyCell={busyCell}
            onToggle={toggleCell}
          />
        ) : (
          <WeekGrid
            data={data}
            rows={rows}
            today={today}
            isPast={isPast}
            busyCell={busyCell}
            onToggle={toggleCell}
          />
        )}
      </Card>

      <p className="mb-4 text-center text-[11.5px] text-app-text-muted">{t.clickEmptyHint}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[15.5px] font-semibold text-app-text">{t.weeklyRules}</p>
            <p className="mt-1 mb-3 text-[12px] text-app-text-muted">{t.weeklyRulesHint}</p>
            {(data?.rules ?? []).length === 0 ? (
              <p className="py-4 text-center text-[12.5px] text-app-text-muted">{t.noWeeklyRules}</p>
            ) : (
              <ul className="space-y-2">
                {data!.rules.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 rounded-[13px] border border-app-border bg-app-bg-muted px-3.5 py-3"
                  >
                    <span className="min-w-0 flex-1 text-[13px] font-medium text-app-text">
                      {WEEKDAYS[lang][r.weekday]}
                      <span className="ml-2 text-[12.5px] font-normal text-app-text-muted">
                        {r.start_time} — {r.end_time} · {r.slot_minutes} {t.minutesShort}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act(() => removeAvailability(token, r.id))}
                      className="shrink-0 text-[12px] font-semibold text-[#C23A3F] disabled:opacity-50"
                    >
                      {t.delete}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <p className="mb-3 text-[15.5px] font-semibold text-app-text">{t.oneTimeSlots}</p>
            {(data?.exceptions ?? []).length === 0 ? (
              <p className="py-4 text-center text-[12.5px] text-app-text-muted">{t.noExceptions}</p>
            ) : (
              <ul className="space-y-2">
                {data!.exceptions.map((x) => (
                  <li
                    key={x.id}
                    className="flex items-center gap-3 rounded-[13px] border border-app-border bg-app-bg-muted px-3.5 py-3"
                  >
                    <Tag tone={x.is_available ? 'green' : 'grey'}>
                      {x.is_available ? t.openTimeTag : t.blockedTag}
                    </Tag>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-app-text">
                      {fmtDate(x.date, lang)}
                      {x.start_time ? ` · ${x.start_time}—${x.end_time}` : ` · ${t.wholeDayBlocked}`}
                      {x.note ? ` · ${x.note}` : ''}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act(() => unblockTime(token, x.id))}
                      className="shrink-0 text-[12px] font-semibold text-app-brand disabled:opacity-50"
                    >
                      {x.is_available ? t.delete : t.unblock}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="p-5">
          <p className="mb-3 text-[15.5px] font-semibold text-app-text">{t.historyTitle}</p>
          {events.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-app-text-muted">{t.historyEmpty}</p>
          ) : (
            <ul className="space-y-3">
              {events.map((e, i) => (
                <li key={`${e.type}-${e.at}-${i}`} className="flex gap-3">
                  <span
                    className={`mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full ${
                      e.type === 'cancelled'
                        ? 'bg-[#E9474D]'
                        : e.type === 'booked'
                          ? 'bg-app-primary'
                          : e.type === 'block'
                            ? 'bg-[#8A8CAE]'
                            : 'bg-[#17A34A]'
                    }`}
                  />
                  <p className="text-[12.5px] leading-[1.6] text-app-text">
                    {eventText(e, t, lang)}
                    <span className="ml-1.5 text-app-text-muted">· {fmtDate(e.at, lang)}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {addOpen ? (
        <AddTimeModal initial={addOpen} onClose={() => setAddOpen(null)} onSaved={reload} />
      ) : null}
      {blockOpen ? <BlockTimeModal onClose={() => setBlockOpen(false)} onSaved={reload} /> : null}
    </div>
  );
}

/* --------------------------------- Hafta --------------------------------- */

function WeekGrid({
  data,
  rows,
  today,
  isPast,
  busyCell,
  onToggle,
}: {
  data: ScheduleResponse | null;
  rows: string[];
  today: string;
  isPast: (date: string, start: string) => boolean;
  busyCell: string;
  onToggle: (date: string, time: string, slot: ScheduleSlot | null) => void;
}) {
  const { t, lang } = usePanel();
  const days = data?.calendar ?? [];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[820px]">
        <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-app-border">
          <div />
          {days.map((d) => (
            <div
              key={d.date}
              className={`border-l border-app-border px-2 py-3 text-center ${
                d.date === today ? 'bg-[#F5F3FF]' : ''
              }`}
            >
              <p className="text-[11.5px] font-medium text-app-text-muted">{WEEKDAYS_SHORT[lang][d.weekday]}</p>
              <p
                className={`text-[16px] font-semibold ${
                  d.date === today ? 'text-app-brand' : 'text-app-text'
                }`}
              >
                {Number(d.date.slice(8, 10))}
              </p>
            </div>
          ))}
        </div>

        {rows.map((time) => (
          <div key={time} className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
            <div className="border-b border-[#F6F5FC] px-2.5 py-2 text-right text-[11px] text-app-text-muted">
              {time}
            </div>
            {days.map((d) => {
              const slot = d.slots.find((s) => s.start === time);
              const past = isPast(d.date, time);
              return (
                <div
                  key={`${d.date}-${time}`}
                  className="h-[54px] border-b border-l border-[#F6F5FC] p-[3px]"
                >
                  {slot ? (
                    <SlotCell
                      slot={slot}
                      past={past}
                      busy={busyCell === `${d.date}-${time}`}
                      onClick={() => onToggle(d.date, time, slot)}
                    />
                  ) : past ? (
                    <div className="h-full w-full rounded-[9px] bg-[#FCFCFE]" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggle(d.date, time, null)}
                      title={t.addHere}
                      className={`h-full w-full rounded-[9px] text-[15px] font-semibold text-transparent transition hover:bg-[#EDF8F1] hover:text-[#17A34A] active:scale-[0.97] ${
                        busyCell === `${d.date}-${time}` ? 'animate-pulse bg-[#EDF8F1]' : ''
                      }`}
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotCell({
  slot,
  past,
  busy,
  onClick,
}: {
  slot: ScheduleSlot;
  past: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const { t } = usePanel();
  const band = slot.state === 'booked' || slot.state === 'trial';
  const style = past && !band ? SLOT_STYLE.past : (SLOT_STYLE[slot.state] ?? '');
  const label =
    slot.label ||
    (slot.state === 'free' ? t.slotFree : slot.state === 'blocked' ? t.slotBlocked : '');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={past && !band}
      title={band ? label : slot.state === 'free' ? t.slotFree : t.slotBlocked}
      className={`flex h-full w-full flex-col justify-center gap-0.5 overflow-hidden rounded-[9px] px-2 text-left transition hover:brightness-95 active:scale-[0.97] disabled:cursor-default disabled:active:scale-100 ${style} ${
        past ? 'opacity-60' : ''
      } ${busy ? 'animate-pulse' : ''}`}
    >
      <span className="truncate text-[11.5px] font-semibold">{label}</span>
      {band ? (
        <span className="truncate text-[10px] opacity-70">
          {slot.start}—{slot.end}
        </span>
      ) : null}
    </button>
  );
}

/* ---------------------------------- Kun ---------------------------------- */

function DayList({
  day,
  date,
  isPast,
  busyCell,
  onToggle,
}: {
  day: ScheduleDay | null;
  date: string;
  isPast: (date: string, start: string) => boolean;
  busyCell: string;
  onToggle: (date: string, time: string, slot: ScheduleSlot | null) => void;
}) {
  const { t } = usePanel();
  const hours = useMemo(() => {
    const set = new Set<number>();
    for (const s of day?.slots ?? []) set.add(toMin(s.start));
    for (let m = 9 * 60; m <= 20 * 60; m += 60) set.add(m);
    return [...set].sort((a, b) => a - b).map(toTime);
  }, [day]);

  return (
    <ul className="divide-y divide-[#F6F5FC]">
      {hours.map((time) => {
        const slot = day?.slots.find((s) => s.start === time) ?? null;
        const past = isPast(date, time);
        return (
          <li key={time} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-[52px] shrink-0 text-[12.5px] font-medium text-app-text-muted">{time}</span>
            <span className="h-[46px] min-w-0 flex-1">
              {slot ? (
                <SlotCell
                  slot={slot}
                  past={past}
                  busy={busyCell === `${date}-${time}`}
                  onClick={() => onToggle(date, time, slot)}
                />
              ) : past ? (
                <span className="flex h-full items-center px-2 text-[12px] text-[#C9CADD]">
                  {t.slotPast}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggle(date, time, null)}
                  className={`h-full w-full rounded-[10px] border border-dashed border-app-border text-[12px] font-semibold text-app-text-muted transition hover:border-[#17A34A] hover:bg-[#EDF8F1] hover:text-[#17A34A] active:scale-[0.98] ${
                    busyCell === `${date}-${time}` ? 'animate-pulse border-[#17A34A] bg-[#EDF8F1]' : ''
                  }`}
                >
                  {t.addHere}
                </button>
              )}
            </span>
          </li>
        );
      })}
      {(day?.slots.length ?? 0) === 0 ? (
        <li className="px-4 py-3 text-center text-[12.5px] text-app-text-muted">{t.dayEmpty}</li>
      ) : null}
    </ul>
  );
}

/* ----------------------------------- Oy ----------------------------------- */

function MonthGrid({
  data,
  today,
  onPickDay,
}: {
  data: ScheduleResponse | null;
  today: string;
  onPickDay: (date: string) => void;
}) {
  const { t, lang } = usePanel();
  const days = data?.calendar ?? [];
  if (!days.length) return null;

  // Oy dushanbadan boshlanadigan setkaga tushishi uchun oldiga bo'sh katak.
  const lead = (days[0].weekday + 6) % 7;

  return (
    <div className="p-3">
      <div className="mb-2 grid grid-cols-7 gap-2">
        {[1, 2, 3, 4, 5, 6, 0].map((w) => (
          <p key={w} className="text-center text-[11.5px] font-medium text-app-text-muted">
            {WEEKDAYS_SHORT[lang][w]}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: lead }).map((_, i) => (
          <div key={`lead-${i}`} />
        ))}
        {days.map((d) => {
          const lessons = d.slots.filter((s) => s.state === 'booked' || s.state === 'trial').length;
          const free = d.slots.filter((s) => s.state === 'free').length;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => onPickDay(d.date)}
              className={`flex min-h-[86px] flex-col gap-1.5 rounded-[14px] border p-2.5 text-left transition hover:border-app-border-strong ${
                d.date === today ? 'border-app-brand bg-[#F5F3FF]' : 'border-app-border bg-app-surface'
              }`}
            >
              <span
                className={`text-[14px] font-semibold ${
                  d.date === today ? 'text-app-brand' : 'text-app-text'
                }`}
              >
                {Number(d.date.slice(8, 10))}
              </span>
              {lessons > 0 ? (
                <span className="rounded-full bg-app-icon-bg px-2 py-0.5 text-[10.5px] font-semibold text-app-brand">
                  {tpl(t.monthLessons, { n: lessons })}
                </span>
              ) : null}
              {free > 0 ? (
                <span className="rounded-full bg-[#E7F4EC] px-2 py-0.5 text-[10.5px] font-semibold text-[#17A34A]">
                  {tpl(t.monthFree, { n: free })}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------- Yordamchi --------------------------------- */

function eventText(
  e: ScheduleEvent,
  t: ReturnType<typeof usePanel>['t'],
  lang: ReturnType<typeof usePanel>['lang']
): string {
  const when = e.date
    ? e.date.length === 10
      ? `${fmtDate(e.date, lang)}${e.start_time ? ` ${e.start_time}—${e.end_time}` : ''}`
      : fmtDateTime(e.date, lang)
    : '';
  switch (e.type) {
    case 'booked':
      return tpl(t.evBooked, { student: e.student_name ?? '', when });
    case 'cancelled':
      return tpl(t.evCancelled, { student: e.student_name ?? '', when });
    case 'open':
      return tpl(t.evOpen, { when });
    case 'block':
      return tpl(t.evBlock, { when });
    default:
      return tpl(t.evRule, {
        weekday: WEEKDAYS[lang][e.weekday ?? 0] ?? '',
        from: e.start_time ?? '',
        to: e.end_time ?? '',
      });
  }
}

/**
 * Katak bosilganda darhol ko'rinadigan holat. Server javobi kelgach
 * `load(true)` haqiqiy holatni qo'yadi.
 */
function optimistic(
  prev: ScheduleResponse,
  date: string,
  time: string,
  slot: ScheduleSlot | null
): ScheduleResponse {
  return {
    ...prev,
    calendar: prev.calendar.map((d) => {
      if (d.date !== date) return d;
      if (!slot) {
        const yangi: ScheduleSlot = {
          start: time,
          end: toTime(toMin(time) + 60),
          state: 'free',
          label: '',
          source: 'exception',
          exception_id: null,
          block_id: null,
        };
        return { ...d, slots: [...d.slots, yangi].sort((a, b) => a.start.localeCompare(b.start)) };
      }
      if (slot.state === 'free' && slot.source === 'exception') {
        return { ...d, slots: d.slots.filter((x) => x.start !== time) };
      }
      const keyingi = slot.state === 'free' ? 'blocked' : 'free';
      return {
        ...d,
        slots: d.slots.map((x) => (x.start === time ? { ...x, state: keyingi, label: '' } : x)),
      };
    }),
  };
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-[11px] w-[11px] rounded-[4px] ${color}`} />
      {label}
    </span>
  );
}
