import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isValidDailyCourseDay } from '../../shared/dailyCourseDay';
import { Check, ChevronLeft, ChevronRight, Crown, Edit3, FileText, RefreshCw } from 'lucide-react';
import { fetchStreak, getCachedStreak, type StreakResponse } from '../api/activity';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { useKunlikProgress, type KunlikDayProgress } from '../hooks/useKunlikProgress';
import { prefetchRoutePath } from '../routeModules';
import { TOTAL_DAYS } from '../data/dailyPlan';
import { takeKunlikRestoreDay } from '../utils/kunlikLastDay';

const DEFAULT_ROW: Omit<KunlikDayProgress, 'day_number'> = {
  grammar_1: false,
  grammar_2: false,
  grammar_3: false,
  words_learned: 0,
  words_correct: 0,
  words_match: false,
  oqish_done: false,
  speaking_level: 0,
};

const QUESTS = [
  {
    id: 'grammar',
    title: 'Grammatika',
    subtitle: 'Qoidalarni o‘rganish',
    route: (day: number) => `/kunlik-reja/kun/${day}/grammatika/test-variantlar`,
    images: {
      done: '/app-mobile/images/home/block_icons/grammar_done.png',
      active: '/app-mobile/images/home/block_icons/grammar_current.png',
      locked: '/app-mobile/images/home/block_icons/grammar_locked.png',
    },
  },
  {
    id: 'vocabulary',
    title: 'Lug‘at',
    subtitle: 'Yangi so‘zlar',
    route: (day: number) => `/kunlik-reja/kun/${day}/lugat/tanishish`,
    images: {
      done: '/app-mobile/images/home/block_icons/vocabulary_done.png',
      active: '/app-mobile/images/home/block_icons/vocabulary_current.png',
      locked: '/app-mobile/images/home/block_icons/vocabulary_locked.png',
    },
  },
  {
    id: 'reading',
    title: 'O‘qish',
    subtitle: 'Matnni tushunish',
    route: (day: number) => `/kunlik-reja/kun/${day}/oqish`,
    images: {
      done: '/app-mobile/images/home/block_icons/reading_done.png',
      active: '/app-mobile/images/home/block_icons/reading_current.png',
      locked: '/app-mobile/images/home/block_icons/reading_locked.png',
    },
  },
  {
    id: 'speaking',
    title: 'Gapirish',
    subtitle: 'Suhbat mashqi',
    route: (day: number) => `/kunlik-reja/kun/${day}/gapirish`,
    images: {
      done: '/app-mobile/images/home/block_icons/speaking_done.png',
      active: '/app-mobile/images/home/block_icons/speaking_current.png',
      locked: '/app-mobile/images/home/block_icons/speaking_locked.png',
    },
  },
] as const;

type QuestState = 'done' | 'active' | 'locked';

type QuestSlot = (typeof QUESTS)[number] & {
  state: QuestState;
  canOpen: boolean;
};

function getRow(rows: Map<number, KunlikDayProgress>, day: number): KunlikDayProgress {
  return rows.get(day) ?? { day_number: day, ...DEFAULT_ROW };
}

function isGrammarDone(row: KunlikDayProgress): boolean {
  return row.grammar_1 && row.grammar_2 && row.grammar_3;
}

function isVocabularyDone(row: KunlikDayProgress): boolean {
  return row.words_learned > 0 && row.words_correct > 0 && row.words_match;
}

function isSpeakingDone(row: KunlikDayProgress, promptCount: number): boolean {
  return promptCount <= 0 || row.speaking_level >= promptCount;
}

function buildQuestSlots(row: KunlikDayProgress, promptCount: number): QuestSlot[] {
  const raw = [
    { done: isGrammarDone(row), hasContent: true },
    { done: isVocabularyDone(row), hasContent: true },
    { done: row.oqish_done, hasContent: true },
    { done: isSpeakingDone(row, promptCount), hasContent: promptCount > 0 },
  ];

  let activeAssigned = false;
  let previousIncomplete = false;

  return QUESTS.map((quest, index) => {
    const item = raw[index];
    let state: QuestState;

    if (previousIncomplete) {
      state = 'locked';
    } else if (item.done) {
      state = 'done';
    } else if (!item.hasContent) {
      state = 'locked';
      previousIncomplete = true;
    } else if (!activeAssigned) {
      state = 'active';
      activeAssigned = true;
      previousIncomplete = true;
    } else {
      state = 'locked';
    }

    return { ...quest, state, canOpen: state !== 'locked' };
  });
}

function isDayComplete(row: KunlikDayProgress, promptCount: number): boolean {
  return buildQuestSlots(row, promptCount).every((slot) => slot.state === 'done');
}

function findCurrentDay(rows: Map<number, KunlikDayProgress>, promptCounts: Map<number, number>): number {
  for (let day = 1; day <= TOTAL_DAYS; day += 1) {
    if (!isDayComplete(getRow(rows, day), promptCounts.get(day) ?? 0)) return day;
  }
  return TOTAL_DAYS;
}

function HomeHeader({ streak, premium }: { streak: StreakResponse; premium: boolean }) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center gap-2 px-4 pt-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <img src="/app-mobile/logo/logo_mark.svg" alt="" className="h-[34px] w-[34px] shrink-0" decoding="async" />
        <h1 className="min-w-0 truncate text-[26px] font-extrabold leading-none text-[#0B3CCB]">
          FalaRus
        </h1>
      </div>

      <div className="flex h-11 w-[88px] items-center rounded-full bg-[#F8FBFF] py-1 pl-1 pr-2 shadow-[0_8px_24px_rgba(15,23,42,0.09)]">
        <img
          src="/app-mobile/images/home/avatar.png"
          alt=""
          className="h-9 w-9 rounded-full object-cover object-[center_38%]"
          decoding="async"
        />
        <span className="ml-2 min-w-0 flex-1 text-center text-[20px] font-extrabold leading-none text-[#0F172A]">
          {streak.streak_days}
        </span>
      </div>

      {!premium ? (
        <button
          type="button"
          onClick={() => navigate('/tariflar')}
          onMouseEnter={() => prefetchRoutePath('/tariflar')}
          onTouchStart={() => prefetchRoutePath('/tariflar')}
          onFocus={() => prefetchRoutePath('/tariflar')}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#0B3CCB] px-3 text-[13px] font-black text-white shadow-[0_8px_24px_rgba(15,23,42,0.12)] active:scale-[0.98]"
        >
          <Crown className="h-[18px] w-[18px]" aria-hidden />
          Premium
        </button>
      ) : null}
    </header>
  );
}

function ExamShortcuts() {
  const navigate = useNavigate();
  const cards = [
    {
      href: '/kurslar/patent',
      title: 'Patent',
      subtitle: 'Patentga tayyorgarlik',
      dark: true,
      Icon: Edit3,
    },
    {
      href: '/kurslar/vnzh',
      title: 'ВНЖ',
      subtitle: 'ВНЖga tayyorgarlik',
      dark: false,
      Icon: FileText,
    },
  ] as const;

  return (
    <section className="grid grid-cols-2 gap-2.5 px-4 pt-3.5 min-[408px]:gap-3.5">
      {cards.map(({ href, title, subtitle, dark, Icon }) => (
        <button
          key={href}
          type="button"
          onClick={() => navigate(href)}
          onMouseEnter={() => prefetchRoutePath(href)}
          onTouchStart={() => prefetchRoutePath(href)}
          onFocus={() => prefetchRoutePath(href)}
          className={`flex h-[58px] min-w-0 items-center rounded-[18px] px-2.5 py-2 text-left shadow-[0_12px_28px_rgba(15,23,42,0.14)] active:scale-[0.99] ${
            dark
              ? 'bg-gradient-to-br from-[#1439A7] to-[#071B5E] text-white'
              : 'bg-gradient-to-br from-[#FFD43B] to-[#FFA000] text-[#0F172A]'
          }`}
        >
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${dark ? 'border-white/25 bg-white/10' : 'border-white/30 bg-white/25'}`}>
            <Icon className={`h-6 w-6 ${dark ? 'text-white' : 'text-[#0A3B9A]'}`} aria-hidden />
          </span>
          <span className="ml-2.5 min-w-0 flex-1">
            <span className="block truncate text-[15px] font-extrabold leading-none">{title}</span>
            <span className={`mt-1.5 block truncate text-[10px] font-semibold leading-none ${dark ? 'text-white/95' : 'text-[#0F172A]'}`}>
              {subtitle}
            </span>
          </span>
          <ChevronRight className="h-6 w-6 shrink-0 text-white" aria-hidden />
        </button>
      ))}
    </section>
  );
}

function DayNavigator({
  selectedDay,
  currentDay,
  done,
  total,
  onPrevious,
  onNext,
}: {
  selectedDay: number;
  currentDay: number;
  done: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const currentStep = done >= total ? total : done + 1;

  return (
    <section className="px-4 pt-3">
      <div className="h-[114px] rounded-2xl bg-white px-[22px] py-3 shadow-[0_8px_24px_rgba(15,23,42,0.09)]">
        <div className="flex items-center justify-center gap-[18px]">
          <button
            type="button"
            onClick={onPrevious}
            disabled={selectedDay <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F172A] disabled:opacity-45"
            aria-label="Oldingi kun"
          >
            <ChevronLeft className="h-[21px] w-[21px]" aria-hidden />
          </button>
          <div className="text-[24px] font-extrabold leading-none text-[#0F172A]">Kun {selectedDay}</div>
          <button
            type="button"
            onClick={onNext}
            disabled={selectedDay >= currentDay}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F172A] disabled:opacity-45"
            aria-label="Keyingi kun"
          >
            <ChevronRight className="h-[21px] w-[21px]" aria-hidden />
          </button>
        </div>

        <p className="mt-[9px] text-center text-xs font-semibold leading-none text-[#6B7280]">
          Qadam {currentStep} / {total}  •  ~25 daqiqa
        </p>

        <div className="mt-[9px] flex h-6 items-center">
          {Array.from({ length: total }).map((_, idx) => {
            const step = idx + 1;
            const completed = step <= done;
            const active = step === currentStep && done < total;
            return (
              <div key={step} className="contents">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold leading-none ${
                    completed
                      ? 'border-[#7C3AED] bg-[#7C3AED] text-white'
                      : active
                        ? 'border-[#7C3AED] bg-white text-[#7C3AED]'
                        : 'border-[#E2E8F0] bg-white text-[#94A3B8]'
                  }`}
                >
                  {completed ? <Check className="h-[15px] w-[15px]" aria-hidden /> : step}
                </div>
                {step < total ? (
                  <div className={`mx-1 h-0.5 flex-1 ${step <= done ? 'bg-[#7C3AED]' : 'bg-[#E2E8F0]'}`} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function QuestCard({ slot, index, day }: { slot: QuestSlot; index: number; day: number }) {
  const navigate = useNavigate();
  const done = slot.state === 'done';
  const active = slot.state === 'active';
  const locked = slot.state === 'locked';
  const accent = done ? '#0EAD4F' : active ? '#0D55F5' : '#6B7898';
  const image = slot.images[done ? 'done' : active ? 'active' : 'locked'];

  return (
    <button
      type="button"
      disabled={!slot.canOpen}
      onClick={() => navigate(slot.route(day))}
      onMouseEnter={() => prefetchRoutePath(slot.route(day))}
      onTouchStart={() => prefetchRoutePath(slot.route(day))}
      onFocus={() => prefetchRoutePath(slot.route(day))}
      className={`relative h-[198px] min-w-0 rounded-[18px] border p-2.5 text-center shadow-[0_8px_24px_rgba(15,23,42,0.09)] transition-transform active:scale-[0.99] disabled:cursor-default ${
        done
          ? 'border-[#ACEBC8] bg-[#F0FFF5]'
          : active
            ? 'border-[#B7CEFF] bg-[#F4F8FF]'
            : 'border-[#E2E8F0] bg-[#F9FBFF]'
      }`}
    >
      <span className="absolute left-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-black leading-none text-white" style={{ backgroundColor: accent }}>
        {index}
      </span>
      <span className={`absolute right-[13px] top-[13px] flex h-[30px] w-[30px] items-center justify-center rounded-full ${done ? 'bg-white/70' : 'bg-[#F2F6FF]'}`}>
        <Check className="h-5 w-5" color={done ? accent : '#C7D1E6'} aria-hidden />
      </span>
      <img src={image} alt="" className="mx-auto h-[82px] w-[104px] object-contain" decoding="async" />
      <span className="mt-1 block truncate text-lg font-black leading-none text-[#070D32]">{slot.title}</span>
      <span className="mt-[6px] block truncate px-1 text-[11px] font-bold leading-none text-[#667195]">{slot.subtitle}</span>
      <span
        className={`absolute bottom-2.5 left-2.5 right-2.5 flex h-[38px] items-center justify-center rounded-full pl-[18px] pr-2 text-[17px] font-black leading-none shadow-[0_12px_28px_rgba(15,23,42,0.14)] ${
          locked ? 'bg-[#E9EEF8] text-[#0F172A] shadow-none' : 'text-white'
        }`}
        style={{ backgroundColor: locked ? undefined : accent }}
      >
        <span className="min-w-0 flex-1 truncate">{done ? 'Takrorlash' : 'Boshlash'}</span>
        <span className="ml-2.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-white">
          {done ? (
            <RefreshCw className="h-5 w-5" color={locked ? '#0F172A' : accent} aria-hidden />
          ) : (
            <ChevronRight className="h-6 w-6" color={locked ? '#0F172A' : accent} aria-hidden />
          )}
        </span>
      </span>
    </button>
  );
}

export default function HomePage() {
  const { token } = useAuth();
  const { access } = useAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const { rows, loaded, practicePromptCountByDay } = useKunlikProgress();
  const [streak, setStreak] = useState<StreakResponse>(() => getCachedStreak() ?? { streak_days: 0, last_7_days: Array(7).fill(false) });
  const currentDay = useMemo(
    () => (loaded ? findCurrentDay(rows, practicePromptCountByDay) : null),
    [loaded, rows, practicePromptCountByDay],
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const initialDayResolvedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchStreak(token).then((data) => {
      if (!cancelled && data) setStreak(data);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (currentDay == null) return;

    if (!initialDayResolvedRef.current) {
      initialDayResolvedRef.current = true;
      const kunRaw = searchParams.get('kun');
      const kunFromUrl = kunRaw != null ? Number(kunRaw) : null;
      const restored = takeKunlikRestoreDay();
      let day = currentDay;
      if (restored != null && isValidDailyCourseDay(restored)) {
        day = Math.min(restored, currentDay);
      } else if (kunFromUrl != null && isValidDailyCourseDay(kunFromUrl)) {
        day = Math.min(kunFromUrl, currentDay);
      }
      setSelectedDay(day);
      if (kunRaw != null) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('kun');
            return next;
          },
          { replace: true },
        );
      }
      return;
    }

    setSelectedDay((day) => {
      if (day == null) return currentDay;
      return Math.min(Math.max(day, 1), currentDay);
    });
  }, [currentDay, searchParams, setSearchParams]);

  const progressReady = loaded && currentDay != null && selectedDay != null;
  const displayDay = selectedDay ?? currentDay ?? 1;
  const row = progressReady ? getRow(rows, displayDay) : null;
  const promptCount = progressReady ? practicePromptCountByDay.get(displayDay) ?? 0 : 0;
  const slots = row ? buildQuestSlots(row, promptCount) : [];
  const done = slots.filter((slot) => slot.state === 'done').length;
  const premium = Boolean(access?.subscription_active);

  return (
    <div className="min-h-screen bg-[#F4F9FF] pb-[84px]">
      <main className="mx-auto w-full max-w-[820px]">
        <HomeHeader streak={streak} premium={premium} />
        <ExamShortcuts />
        {progressReady ? (
          <>
            <DayNavigator
              selectedDay={displayDay}
              currentDay={currentDay}
              done={done}
              total={slots.length}
              onPrevious={() => setSelectedDay((day) => Math.max(1, (day ?? displayDay) - 1))}
              onNext={() => setSelectedDay((day) => Math.min(currentDay, (day ?? displayDay) + 1))}
            />

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="grid grid-cols-2 gap-2.5 px-4 pt-3.5"
            >
              {slots.map((slot, index) => (
                <QuestCard key={slot.id} slot={slot} index={index + 1} day={displayDay} />
              ))}
            </motion.section>
          </>
        ) : (
          <div className="px-4 pt-6">
            <div className="flex h-[114px] items-center justify-center rounded-2xl bg-white text-sm font-bold text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.09)]">
              Reja yuklanmoqda...
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
