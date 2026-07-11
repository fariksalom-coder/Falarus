import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { useKunlikProgress, type KunlikDayProgress } from '../hooks/useKunlikProgress';
import { TOTAL_DAYS } from '../data/dailyPlan';
import { isKunlikDayRowFullyComplete } from '../../shared/kunlikDayCompletion';
import { FREE_KUNLIK_DAY_LIMIT } from '../../shared/dailyCourseDay';

/** 6 stages of 30 days each (last one = 32 days to cover 182). */
const STAGES = [
  { num: 1, title: 'Asoslar', range: [1, 30] as const },
  { num: 2, title: "Kunlik so'zlashuv", range: [31, 60] as const },
  { num: 3, title: 'Grammatika chuqurroq', range: [61, 90] as const },
  { num: 4, title: 'Amaliy nutq', range: [91, 120] as const },
  { num: 5, title: 'Test va yozma javob', range: [121, 150] as const },
  { num: 6, title: 'Imtihonga tayyorlik', range: [151, TOTAL_DAYS] as const },
];

function isDayDone(row: KunlikDayProgress | undefined, promptCounts: Map<number, number>): boolean {
  if (!row) return false;
  return isKunlikDayRowFullyComplete(row, promptCounts);
}

function findCurrentDay(rows: Map<number, KunlikDayProgress>, promptCounts: Map<number, number>): number {
  for (let day = 1; day <= TOTAL_DAYS; day++) {
    if (!isDayDone(rows.get(day), promptCounts)) return day;
  }
  return TOTAL_DAYS;
}

export default function DailyCourseMapPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { access } = useAccess();
  const premium = Boolean(access?.subscription_active);
  const { rows: rowMap, loaded, practicePromptCountByDay } = useKunlikProgress();
  const todayRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  if (!user) {
    // outer guard handles redirect
  }

  const currentDay = useMemo(
    () => (loaded ? findCurrentDay(rowMap, practicePromptCountByDay) : 1),
    [rowMap, loaded, practicePromptCountByDay],
  );
  const pct = Math.round(((currentDay - 1) / TOTAL_DAYS) * 100);
  const currentStage = useMemo(
    () => STAGES.find((s) => currentDay >= s.range[0] && currentDay <= s.range[1]),
    [currentDay],
  );

  useEffect(() => {
    if (!loaded) return;
    const t = window.setTimeout(() => {
      todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 220);
    return () => window.clearTimeout(t);
  }, [loaded]);

  const goDay = (day: number) => navigate(`/?kun=${day}`);

  return (
    <div className="min-h-screen bg-[#EEF1F8] pb-16">
      {/* Sticky navy hero — premium: rounded bottom, radial gold decor, refined stats */}
      <header
        className="sticky top-0 z-20 overflow-hidden rounded-b-[28px] px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-5 text-white shadow-[0_18px_38px_-16px_rgba(11,42,107,0.55)]"
        style={{ background: 'linear-gradient(160deg, #123A8F 0%, #0B2A6B 55%, #071B5E 100%)' }}
      >
        {/* Gold radial glow decor */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-14 -top-14 h-[190px] w-[190px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(231,197,120,0.35), transparent 65%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 bottom-0 h-[130px] w-[130px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.10), transparent 60%)' }}
        />

        <div className="relative z-[2] flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Orqaga"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white/12 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#E7C578]">
              To'liq yo'l xaritasi
            </p>
            <h1 className="mt-1.5 text-[22px] font-black leading-none tracking-[-0.01em]">
              {TOTAL_DAYS} kun sayohati
            </h1>
            <p className="mt-1 text-[12px] font-bold text-[#AEBEE4]">
              Hozir <span className="font-black text-white">Kun {currentDay}</span> · {currentStage ? `Bosqich ${currentStage.num} · ${currentStage.title}` : ''}
            </p>
          </div>
        </div>

        {/* Progress bar with percent + fraction */}
        <div className="relative z-[2] mt-4">
          <div className="flex items-center justify-between text-[11px] font-black">
            <span className="text-[#AEBEE4]">Progress</span>
            <span className="text-[#E7C578]">
              {currentDay - 1} / {TOTAL_DAYS} kun · {pct}%
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/12">
            <div
              className="relative h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #F5D97C 0%, #E7C578 45%, #C08A2D 100%)',
                boxShadow: '0 0 12px rgba(231,197,120,0.55)',
              }}
            />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-md px-4 pt-6">
        {/* Vertical dashed filmstrip line — dead center */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-3 h-[calc(100%-24px)] w-[6px] -translate-x-1/2"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg, #D9D3E5 0 8px, transparent 8px 14px)',
          }}
        />

        {/* Sparkles decoration */}
        <span aria-hidden className="pointer-events-none absolute left-[14%] top-[220px] text-[22px]">✨</span>
        <span aria-hidden className="pointer-events-none absolute right-[10%] top-[480px] text-[18px]">✨</span>

        <div className="relative flex flex-col items-center">
          {/* Top chess flag */}
          <div className="mb-4 flex flex-col items-center">
            <span className="text-[26px]" aria-hidden>🏁</span>
          </div>

          {STAGES.map((stage) => {
            const [from, to] = stage.range;
            const days: number[] = [];
            for (let d = from; d <= to; d++) days.push(d);

            return (
              <section key={stage.num} className="mb-2 flex w-full flex-col items-center">
                {/* Stage milestone — gold circle centered, card below */}
                <div className="relative z-[2] flex h-[54px] w-[54px] items-center justify-center rounded-full text-[22px] font-black text-white shadow-[0_12px_24px_-10px_rgba(192,138,45,0.55)]"
                  style={{ background: 'linear-gradient(135deg, #F5D97C 0%, #C08A2D 65%, #A9791C 100%)' }}
                  aria-hidden
                >
                  {stage.num}
                </div>
                <div className="relative z-[2] mt-3 rounded-[16px] border border-[#E7C578]/50 bg-white px-4 py-2.5 text-center shadow-[0_10px_22px_-14px_rgba(15,23,42,0.14)]">
                  <p className="text-[15px] font-black text-app-text">
                    Bosqich {stage.num} · {stage.title}
                  </p>
                  <p className="mt-0.5 text-[10.5px] font-black uppercase tracking-[0.16em] text-[#C08A2D]">
                    {from}–{to} kun
                  </p>
                </div>

                {/* Days in this stage — zig-zag alternating sides of the filmstrip */}
                <div className="mt-4 flex w-full flex-col items-center gap-3">
                  {days.map((day) => {
                    const row = rowMap.get(day);
                    const done = isDayDone(row, practicePromptCountByDay);
                    const isToday = day === currentDay;
                    const isPast = day < currentDay;
                    const isFuture = day > currentDay;
                    const freeLocked = !premium && day > FREE_KUNLIK_DAY_LIMIT;
                    // Alternate left / right offset from vertical center — Duolingo-style path.
                    // Today marker + milestones stay centered; done + locked days zig-zag.
                    const sideShift = day % 2 === 1 ? '-36px' : '36px';

                    if (isToday) {
                      return (
                        <div
                          key={day}
                          ref={todayRef}
                          className="relative z-[2] flex w-full flex-col items-center py-3"
                        >
                          {/* "Bugun shu yerda" pill above */}
                          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-app-text shadow-[0_8px_20px_-10px_rgba(15,23,42,0.18)] ring-1 ring-app-border">
                            Bugun shu yerda <span aria-hidden>👇</span>
                          </div>

                          {/* Big navy circle with "KUN" caption + big number */}
                          <button
                            type="button"
                            onClick={() => goDay(day)}
                            className="relative flex h-[86px] w-[86px] flex-col items-center justify-center rounded-full text-white shadow-[0_18px_36px_-12px_rgba(11,42,107,0.55)] ring-4 ring-white active:scale-[0.98]"
                            style={{ background: 'linear-gradient(155deg, #123A8F, #0B2A6B)' }}
                            aria-label={`Kun ${day}`}
                          >
                            <span className="text-[9px] font-black uppercase tracking-[0.24em] text-[#E7C578]">
                              KUN
                            </span>
                            <span className="text-[28px] font-black leading-none">{day}</span>
                          </button>

                          {/* "Davom eting" pill */}
                          <button
                            type="button"
                            onClick={() => goDay(day)}
                            className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-[#0B2A6B] bg-white px-4 py-2 shadow-[0_10px_24px_-10px_rgba(11,42,107,0.35)] active:scale-[0.99]"
                          >
                            <span className="text-[13px] font-black text-[#0B2A6B]">Davom eting</span>
                            <span className="rounded-full bg-[#0B2A6B] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white">
                              Bugun
                            </span>
                          </button>
                        </div>
                      );
                    }

                    // Done past day — green ✓ circle offset to alternate side
                    if (isPast || done) {
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => goDay(day)}
                          className="relative z-[2] flex flex-col items-center py-1 active:scale-95"
                          style={{ transform: `translateX(${sideShift})` }}
                          aria-label={`Kun ${day}`}
                        >
                          <span
                            className="flex h-[40px] w-[40px] items-center justify-center rounded-full text-[16px] font-black text-white shadow-[0_8px_18px_-8px_rgba(18,161,80,0.55)] ring-4 ring-white"
                            style={{ background: 'linear-gradient(135deg, #34D577, #12A150)' }}
                            aria-hidden
                          >
                            ✓
                          </span>
                          <span className="mt-1 text-[11px] font-black text-[#12813F]">Kun {day}</span>
                        </button>
                      );
                    }

                    // Locked future day — clickable, shows toast "not yet reached"
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          showToast(`Bu kunga hali yetib bormadingiz. Hozir Kun ${currentDay}.`);
                        }}
                        className="relative z-[2] flex flex-col items-center py-1 active:scale-95"
                        style={{ transform: `translateX(${sideShift})` }}
                        aria-label={`Kun ${day} (yopiq)`}
                      >
                        <span
                          className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#E4EAF3] text-[#94A3B8] ring-4 ring-white"
                          aria-hidden
                        >
                          <Lock className="h-[15px] w-[15px]" />
                        </span>
                        <span className="mt-1 text-[11px] font-bold text-app-text-muted">Kun {day}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Bottom — finish sparkle */}
          <div className="relative z-[2] mt-2 flex flex-col items-center">
            <span aria-hidden className="text-[26px]">✨</span>
            <p className="mt-1 text-[13px] font-black text-app-text">Tugagach — sertifikat</p>
          </div>
        </div>
      </main>

      {/* Toast — appears when tapping a locked future day */}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-8 z-[100] flex justify-center px-4"
        >
          <div
            key={toast}
            className="msg-pop pointer-events-auto flex max-w-[92%] items-center gap-2 rounded-full bg-[#0B2A6B] px-5 py-3 text-[13px] font-black text-white shadow-[0_18px_38px_-14px_rgba(11,42,107,0.55)]"
          >
            <Lock className="h-4 w-4 shrink-0 text-[#E7C578]" aria-hidden />
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  );
}
