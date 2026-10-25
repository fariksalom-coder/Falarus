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
import { MONTH_NAMES, WEEKDAYS, WEEKDAYS_SHORT, tpl } from '../lang';
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

// Prototip ranglari: bo'sh — yashil, band — ko'k, sinov — sariq, blok — kulrang.
const SLOT_STYLE: Record<string, string> = {
  free: 'border border-[#86EFAC] bg-[#DCFCE7] text-[#166534]',
  booked: 'border border-[#93C5FD] bg-[#DBEAFE] text-[#1E40AF]',
  trial: 'border border-[#FCD34D] bg-[#FEF3C7] text-[#92400E]',
  blocked: 'border border-[#CBD5E1] bg-[#E2E8F0] text-[#334155]',
  past: 'border border-app-bg-subtle bg-[#F8FAFC] text-[#94A3B8]',
};
const EMPTY_CELL = 'border border-dashed border-app-border bg-app-surface';

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

  const period = useMemo(() => {
    if (view === 'day') return `${WEEKDAYS[lang][new Date(`${anchor}T12:00:00Z`).getUTCDay()]}, ${fmtDate(anchor, lang)}`;
    if (view === 'month') {
      const m = Number(anchor.slice(5, 7));
      return `${MONTH_NAMES[lang][m - 1] ?? ''} ${anchor.slice(0, 4)}`;
    }
    return data ? `${fmtDate(data.from, lang)} — ${fmtDate(data.to, lang)}` : '…';
  }, [data, view, anchor, lang]);

  return (
    <div>
      <PageHead
        title={t.scheduleTitle}
        subtitle={t.scheduleSubtitle}
        actions={
          <>
            <GhostButton onClick={() => setBlockOpen(true)}>{t.blockTime}</GhostButton>
            <PrimaryButton onClick={() => setAddOpen({})}>{t.addFreeTime}</PrimaryButton>
          </>
        }
      />

      {err ? <ErrorNote text={err} /> : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div role="tablist" className="flex gap-1 rounded-[14px] bg-app-bg-subtle p-1">
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
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={`min-h-[40px] rounded-[10px] px-4 text-[13.5px] font-bold transition ${
                view === key ? 'bg-app-surface text-app-text shadow-[0_1px_2px_rgba(15,23,42,0.1)]' : 'text-app-text-muted'
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
            className="h-11 w-11 rounded-[12px] border border-app-border bg-app-surface text-[16px] font-extrabold text-app-text transition hover:border-app-border-strong"
            aria-label={t.back}
          >
            ‹
          </button>
          <span className="min-w-[130px] text-center text-[14px] font-extrabold text-app-text sm:min-w-[150px]">{period}</span>
          <button
            type="button"
            onClick={() => shift(1)}
            className="h-11 w-11 rounded-[12px] border border-app-border bg-app-surface text-[16px] font-extrabold text-app-text transition hover:border-app-border-strong"
            aria-label={t.next}
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setAnchor(today)}
            className="min-h-[44px] rounded-[12px] border border-app-border bg-app-surface px-3.5 text-[14px] font-bold text-app-text transition hover:border-app-border-strong"
          >
            {t.today_}
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-3.5 text-[12px] font-bold text-app-text-secondary">
        <Legend color={SLOT_STYLE.free} label={t.slotFree} />
        <Legend color={SLOT_STYLE.booked} label={t.slotBooked} />
        <Legend color={SLOT_STYLE.trial} label={t.slotTrial} />
        <Legend color={SLOT_STYLE.blocked} label={t.slotBlocked} />
        <Legend color={SLOT_STYLE.past} label={t.slotPast} />
      </div>

      <Card className="mb-4 overflow-hidden p-3">
        <p className="mx-1.5 mb-2.5 mt-1 text-[13px] text-app-text-muted">{t.clickEmptyHint}</p>
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

      <div className="mb-4 flex flex-wrap items-start gap-4">
        <Card as="section" className="min-w-0 flex-[1_1_300px] px-5 py-[18px]">
          <h2 className="text-[17px] font-extrabold text-app-text">{t.weeklyRules}</h2>
          <p className="mt-0.5 mb-2.5 text-[13px] text-app-text-muted">{t.weeklyRulesHint}</p>
          {(data?.rules ?? []).length === 0 ? (
            <p className="border-t border-app-bg-subtle pt-3 text-[13.5px] text-app-text-muted">{t.noWeeklyRules}</p>
          ) : (
            <ul>
              {data!.rules.map((r) => (
                <li key={r.id} className="flex items-center gap-2.5 border-t border-app-bg-subtle py-2">
                  <span className="w-[96px] shrink-0 text-[14px] font-bold text-app-text">{WEEKDAYS[lang][r.weekday]}</span>
                  <span className="min-w-0 flex-1 text-[14px] text-app-text-secondary">
                    {r.start_time} — {r.end_time}
                    <span className="ml-1.5 text-[12px] text-app-text-muted">· {r.slot_minutes} {t.minutesShort}</span>
                  </span>
                  <DangerChip disabled={busy} onClick={() => void act(() => removeAvailability(token, r.id))}>{t.delete}</DangerChip>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card as="section" className="min-w-0 flex-[1_1_300px] px-5 py-[18px]">
          <h2 className="mb-2.5 text-[17px] font-extrabold text-app-text">{t.oneTimeSlots}</h2>
          {(data?.exceptions ?? []).length === 0 ? (
            <p className="border-t border-app-bg-subtle pt-3 text-[13.5px] text-app-text-muted">{t.noExceptions}</p>
          ) : (
            <ul>
              {data!.exceptions.map((x) => (
                <li key={x.id} className="flex items-center gap-2.5 border-t border-app-bg-subtle py-2">
                  <span className="min-w-0 flex-1 text-[14px] text-app-text">
                    <b>{fmtDate(x.date, lang)}</b>
                    {x.start_time ? ` · ${x.start_time} — ${x.end_time}` : ` · ${t.wholeDayBlocked}`}
                    {x.note ? <span className="block text-[12px] text-app-text-muted">{x.note}</span> : null}
                  </span>
                  <Tag tone={x.is_available ? 'green' : 'grey'}>{x.is_available ? t.openTimeTag : t.blockedTag}</Tag>
                  {x.is_available ? (
                    <DangerChip disabled={busy} onClick={() => void act(() => unblockTime(token, x.id))}>{t.delete}</DangerChip>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act(() => unblockTime(token, x.id))}
                      className="min-h-[40px] shrink-0 rounded-[10px] border border-app-border bg-app-surface px-3 text-[13px] font-bold text-app-text disabled:opacity-50"
                    >
                      {t.unblock}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card as="section" className="px-5 py-[18px]">
        <h2 className="mb-2 text-[17px] font-extrabold text-app-text">{t.historyTitle}</h2>
        {events.length === 0 ? (
          <p className="border-t border-app-bg-subtle pt-3 text-[13.5px] text-app-text-muted">{t.historyEmpty}</p>
        ) : (
          <ul>
            {events.map((e, i) => (
              <li key={`${e.type}-${e.at}-${i}`} className="flex gap-3 border-t border-app-bg-subtle py-2">
                <span
                  className={`mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full ${
                    e.type === 'cancelled' ? 'bg-[#DC2626]' : e.type === 'booked' ? 'bg-[#F59E0B]' : e.type === 'block' ? 'bg-[#64748B]' : 'bg-[#16A34A]'
                  }`}
                />
                <span className="min-w-0 flex-1 text-[14px] text-app-text">{eventText(e, t, lang)}</span>
                <span className="shrink-0 whitespace-nowrap text-[12px] text-app-text-muted">{fmtDate(e.at, lang)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

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
      <div className="min-w-[720px]">
        <div className="mb-1 grid grid-cols-[56px_repeat(7,minmax(0,1fr))] gap-1">
          <div />
          {days.map((d) => (
            <div
              key={d.date}
              className={`rounded-[10px] px-1 py-2 text-center text-[13px] font-extrabold ${
                d.date === today ? 'bg-app-primary text-white' : 'text-app-text-secondary'
              }`}
            >
              {WEEKDAYS_SHORT[lang][d.weekday]} {Number(d.date.slice(8, 10))}
            </div>
          ))}
        </div>

        {rows.map((time) => (
          <div key={time} className="mb-1 grid grid-cols-[56px_repeat(7,minmax(0,1fr))] gap-1">
            <div className="pt-2.5 text-[12px] font-bold text-app-text-muted">{time}</div>
            {days.map((d) => {
              const slot = d.slots.find((s) => s.start === time);
              const past = isPast(d.date, time);
              return (
                <div key={`${d.date}-${time}`} className="h-11">
                  {slot ? (
                    <SlotCell
                      slot={slot}
                      past={past}
                      busy={busyCell === `${d.date}-${time}`}
                      onClick={() => onToggle(d.date, time, slot)}
                    />
                  ) : past ? (
                    <div className={`h-full w-full rounded-[8px] ${SLOT_STYLE.past}`} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggle(d.date, time, null)}
                      title={t.addHere}
                      aria-label={`${t.addHere} · ${time}`}
                      className={`h-full w-full rounded-[8px] text-[15px] font-bold text-transparent transition hover:border-[#86EFAC] hover:bg-[#DCFCE7] hover:text-[#166534] active:scale-[0.97] ${EMPTY_CELL} ${
                        busyCell === `${d.date}-${time}` ? 'animate-pulse bg-[#DCFCE7]' : ''
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
      className={`flex h-full w-full flex-col justify-center gap-0.5 overflow-hidden rounded-[8px] px-1.5 text-left transition hover:brightness-95 active:scale-[0.97] disabled:cursor-default disabled:active:scale-100 ${style} ${
        past ? 'opacity-60' : ''
      } ${busy ? 'animate-pulse' : ''}`}
    >
      <span className="truncate text-[12px] font-bold">{label}</span>
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
    <ul>
      {hours.map((time) => {
        const slot = day?.slots.find((s) => s.start === time) ?? null;
        const past = isPast(date, time);
        return (
          <li key={time} className="flex items-center gap-3 border-t border-app-bg-subtle px-1 py-1.5 first:border-t-0">
            <span className="w-[52px] shrink-0 text-[14px] font-bold text-app-text-muted">{time}</span>
            <span className="h-11 min-w-0 flex-1">
              {slot ? (
                <SlotCell
                  slot={slot}
                  past={past}
                  busy={busyCell === `${date}-${time}`}
                  onClick={() => onToggle(date, time, slot)}
                />
              ) : past ? (
                <span className={`flex h-full items-center rounded-[8px] px-3 text-[13px] font-bold ${SLOT_STYLE.past}`}>
                  {t.slotPast}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggle(date, time, null)}
                  className={`h-full w-full rounded-[8px] px-3 text-left text-[13px] font-bold text-[#94A3B8] transition hover:border-[#86EFAC] hover:bg-[#DCFCE7] hover:text-[#166534] active:scale-[0.98] ${EMPTY_CELL} ${
                    busyCell === `${date}-${time}` ? 'animate-pulse bg-[#DCFCE7]' : ''
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
    <div className="overflow-x-auto">
     <div className="min-w-[560px]">
      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 0].map((w) => (
          <p key={w} className="p-1.5 text-center text-[12px] font-extrabold text-app-text-muted">
            {WEEKDAYS_SHORT[lang][w]}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
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
              className={`flex min-h-[72px] flex-col gap-1 rounded-[12px] p-2 text-left transition hover:border-app-border-strong ${
                d.date === today ? 'border-2 border-app-primary bg-[#F0FAF8]' : d.date < today ? 'border border-app-bg-subtle bg-[#F8FAFC] opacity-70' : 'border border-app-bg-subtle bg-app-surface'
              }`}
            >
              <span className="text-[14px] font-extrabold text-app-text">
                {Number(d.date.slice(8, 10))}
              </span>
              {lessons > 0 ? (
                <span className="text-[12px] font-bold text-[#1E40AF]">
                  {tpl(t.monthLessons, { n: lessons })}
                </span>
              ) : null}
              {free > 0 ? (
                <span className="text-[12px] font-bold text-[#166534]">
                  {tpl(t.monthFree, { n: free })}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
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
      <span className={`h-3 w-3 rounded-[4px] ${color}`} />
      {label}
    </span>
  );
}

function DangerChip({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-[40px] shrink-0 rounded-[10px] bg-[#FEF2F2] px-3 text-[13px] font-bold text-[#B91C1C] transition hover:bg-[#FEE2E2] disabled:opacity-50"
    >
      {children}
    </button>
  );
}
