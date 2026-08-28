import { SkeletonKarta } from '../components/ui/Skeleton';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isValidDailyCourseDay, FREE_KUNLIK_DAY_LIMIT } from '../../shared/dailyCourseDay';
import { isKunlikDayRowFullyComplete } from '../../shared/kunlikDayCompletion';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Edit3,
  FileText,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import {
  fetchMyRank,
  getCachedMyRank,
  MY_RANK_EVENT,
  type MyRankResponse,
} from '../api/leaderboard';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { useLocale } from '../context/LocaleContext';
import { useKunlikProgress, type KunlikDayProgress } from '../hooks/useKunlikProgress';
import { prefetchRoutePath } from '../routeModules';
import { TOTAL_DAYS } from '../data/dailyPlan';
import { takeKunlikRestoreDay } from '../utils/kunlikLastDay';
import UserAvatar from '../components/UserAvatar';
import type { UserGender } from '../components/UserAvatar';
import KunlikFreeLimitCta from '../components/KunlikFreeLimitCta';
import KunlikFreeLimitModal from '../components/KunlikFreeLimitModal';
import InstallAppCard from '../components/InstallAppCard';
import LiveStreamBanner from '../components/live/LiveStreamBanner';
import { canEnterKunlikDayContent } from '../../shared/dailyCourseDay';

const DEFAULT_ROW: Omit<KunlikDayProgress, 'day_number'> = {
  grammar_1: false,
  grammar_2: false,
  grammar_3: false,
  grammar_correct: 0,
  words_learned: 0,
  words_correct: 0,
  words_match: false,
  phrases_done: false,
  phrases_correct: 0,
  text_questions_correct: 0,
  speaking_tasks_done: 0,
  oqish_done: false,
  suhbat_done: false,
  speaking_level: 0,
};

const QUESTS = [
  {
    id: 'grammar',
    titleKey: 'home.questGrammar',
    subtitleKey: 'home.questGrammarSub',
    route: (day: number) => `/kunlik-reja/kun/${day}/grammatika`,
    images: {
      done: '/app-mobile/images/home/block_icons/grammar_done.png',
      active: '/app-mobile/images/home/block_icons/grammar_current.png',
      locked: '/app-mobile/images/home/block_icons/grammar_locked.png',
    },
  },
  {
    id: 'vocabulary',
    titleKey: 'home.questVocab',
    subtitleKey: 'home.questVocabSub',
    route: (day: number) => `/kunlik-reja/kun/${day}/lugat`,
    images: {
      done: '/app-mobile/images/home/block_icons/vocabulary_done.png',
      active: '/app-mobile/images/home/block_icons/vocabulary_current.png',
      locked: '/app-mobile/images/home/block_icons/vocabulary_locked.png',
    },
  },
  {
    id: 'reading',
    titleKey: 'home.questReading',
    subtitleKey: 'home.questReadingSub',
    route: (day: number) => `/kunlik-reja/kun/${day}/oqish`,
    images: {
      done: '/app-mobile/images/home/block_icons/reading_done.png',
      active: '/app-mobile/images/home/block_icons/reading_current.png',
      locked: '/app-mobile/images/home/block_icons/reading_locked.png',
    },
  },
  {
    id: 'speaking',
    titleKey: 'home.questSpeaking',
    subtitleKey: 'home.questSpeakingSub',
    route: (day: number) => `/kunlik-reja/kun/${day}/gapirish`,
    images: {
      done: '/app-mobile/images/home/block_icons/speaking_done.png',
      active: '/app-mobile/images/home/block_icons/speaking_current.png',
      locked: '/app-mobile/images/home/block_icons/speaking_locked.png',
    },
  },
  /*
   * 5-BLOK — ustoz bilan jonli savol-javob. Ilgari grammatika oqimining
   * ichida, uchala mashqdan keyingi bosqich edi: o'quvchi u yergacha
   * yetib bormasdi. Endi kunning mustaqil bloki.
   */
  {
    id: 'suhbat',
    titleKey: 'home.questSuhbat',
    subtitleKey: 'home.questSuhbatSub',
    route: (day: number) => `/kunlik-reja/kun/${day}/savol-javob`,
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

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

function getRow(rows: Map<number, KunlikDayProgress>, day: number): KunlikDayProgress {
  return rows.get(day) ?? { day_number: day, ...DEFAULT_ROW };
}

function isGrammarDone(row: KunlikDayProgress): boolean {
  return row.grammar_1 && row.grammar_2 && row.grammar_3;
}

function isVocabularyDone(row: KunlikDayProgress): boolean {
  return row.words_match;
}

function isSpeakingDone(row: KunlikDayProgress, promptCount: number): boolean {
  return promptCount <= 0 || row.speaking_level >= promptCount;
}

function buildQuestSlots(
  row: KunlikDayProgress,
  promptCount: number,
  oltin: boolean,
): QuestSlot[] {
  const raw = [
    { done: isGrammarDone(row), hasContent: true },
    { done: isVocabularyDone(row), hasContent: true },
    { done: row.oqish_done, hasContent: true },
    { done: isSpeakingDone(row, promptCount), hasContent: promptCount > 0 },
    { done: row.suhbat_done === true, hasContent: true },
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

    /*
     * OLTIN A'ZO (support hisobi) — FAQAT 5-BLOK zanjirdan chiqarilgan.
     *
     * Qolgan to'rt blok hammaga bir xil tartibda ochiladi; savol-javobni
     * esa support butun kunni o'tmasdan ochib ko'ra olishi kerak.
     */
    if (oltin && quest.id === 'suhbat' && state === 'locked') state = 'active';

    return { ...quest, state, canOpen: state !== 'locked' };
  });
}

function isDayComplete(row: KunlikDayProgress, promptCount: number): boolean {
  const counts = new Map<number, number>([[row.day_number, promptCount]]);
  return isKunlikDayRowFullyComplete(row, counts);
}

function findCurrentDay(rows: Map<number, KunlikDayProgress>, promptCounts: Map<number, number>): number {
  for (let day = 1; day <= TOTAL_DAYS; day += 1) {
    if (!isDayComplete(getRow(rows, day), promptCounts.get(day) ?? 0)) return day;
  }
  return TOTAL_DAYS;
}

function HomeHeader({
  myRank,
  premium,
  avatarUrl,
  gender,
  userName,
  t,
}: {
  myRank: MyRankResponse | null;
  points: number;
  premium: boolean;
  avatarUrl?: string | null;
  gender?: UserGender;
  userName?: string;
  t: TranslateFn;
}) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center gap-2 px-4 pt-3">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <img src="/app-mobile/logo/logo_mark.svg" alt="" className="h-[30px] w-[30px] shrink-0" decoding="async" />
        {/* Nom kesilib qolmasligi uchun `shrink-0`: o'rin va Premium tugmalari
            kengaygach avval o'zi qisqarib «Fal…» bo'lib qolardi. */}
        <h1 className="shrink-0 text-[22px] font-extrabold leading-none text-app-brand">
          FalaRus
        </h1>
      </div>

      {/* Platformadagi o'rin (XP emas — aynan nechanchi o'rin). Yonida bugungi
          o'zgarish: ko'tarilgan bo'lsa yashil strelka tepaga, tushgan yoki
          kimdir o'zib ketgan bo'lsa qizil strelka pastga. */}
      <button
        type="button"
        onClick={() => navigate('/statistika')}
        aria-label={
          myRank?.rank
            ? `Reytingdagi o'rningiz: ${myRank.rank}${
                (myRank.delta ?? 0) > 0
                  ? `, ${myRank.delta} pog'ona ko'tarildingiz`
                  : (myRank.delta ?? 0) < 0
                    ? `, ${Math.abs(myRank.delta)} pog'ona tushdingiz`
                    : ''
              }`
            : 'Reyting'
        }
        className="flex h-11 shrink-0 items-center rounded-full bg-app-surface-elevated py-1 pl-2 pr-1 shadow-app-soft active:scale-[0.98]"
      >
        {/* Matn CHAPDA, rasm O'NGDA. Raqam katta, «-o'rindasiz» kichikroq —
            shunda o'rin bir qarashda o'qiladi va qator ham sig'adi. */}
        <span className="mr-1.5 flex items-center gap-[1px] leading-none text-app-text">
          {myRank?.rank ? (
            <>
              <span className="text-[18px] font-extrabold tabular-nums">{myRank.rank}</span>
              <span className="text-[11px] font-black text-app-text-muted">-o‘rindasiz</span>
              {(myRank.delta ?? 0) > 0 ? (
                <ArrowUp className="ml-0.5 h-4 w-4 shrink-0 text-app-success" strokeWidth={3} aria-hidden />
              ) : (myRank.delta ?? 0) < 0 ? (
                <ArrowDown className="ml-0.5 h-4 w-4 shrink-0 text-app-danger" strokeWidth={3} aria-hidden />
              ) : null}
            </>
          ) : (
            <span className="text-[11.5px] font-black text-app-text-muted">Reyting</span>
          )}
        </span>
        <UserAvatar avatarUrl={avatarUrl} gender={gender ?? null} name={userName} className="h-8 w-8" />
      </button>

      {!premium ? (
        <button
          type="button"
          onClick={() => navigate('/tariflar')}
          onMouseEnter={() => prefetchRoutePath('/tariflar')}
          onTouchStart={() => prefetchRoutePath('/tariflar')}
          onFocus={() => prefetchRoutePath('/tariflar')}
          className="flex h-11 shrink-0 items-center gap-1 rounded-full bg-app-brand px-2.5 text-[12px] font-black text-white shadow-app-soft active:scale-[0.98]"
        >
          <Crown className="h-4 w-4" aria-hidden />
          {t('home.premium')}
        </button>
      ) : null}
    </header>
  );
}

function ExamShortcuts({ t }: { t: TranslateFn }) {
  const navigate = useNavigate();
  const cards = [
    {
      href: '/kurslar/patent',
      title: t('home.patentTitle'),
      subtitle: t('home.patentSubtitle'),
      solid: true,
      Icon: Edit3,
    },
    {
      href: '/kurslar/vnzh',
      title: t('home.vnzhTitle'),
      subtitle: t('home.vnzhSubtitle'),
      solid: false,
      Icon: FileText,
    },
  ] as const;

  /*
   * YOTIQ, PAST KARTA.
   *
   * Ilgari belgi, sarlavha va izoh ustma-ust turardi va karta 120px ga
   * yaqin bo'lardi. Bosh sahifaga beshinchi blok qo'shilgach ekran uzayib
   * ketdi — bu ikki karta esa faqat kirish nuqtasi, balandlikning shuncha
   * qismini egallashi shart emas. Belgi matnning YONIGA olindi: karta
   * ikki barobar pasaydi, bosish maydoni esa 44px dan baland qoladi.
   */
  return (
    <section className="grid grid-cols-2 gap-2.5 px-4 pt-2 min-[408px]:gap-3">
      {cards.map(({ href, title, subtitle, solid, Icon }) => (
        <button
          key={href}
          type="button"
          onClick={() => navigate(href)}
          onMouseEnter={() => prefetchRoutePath(href)}
          onTouchStart={() => prefetchRoutePath(href)}
          onFocus={() => prefetchRoutePath(href)}
          className={`flex min-h-[62px] min-w-0 items-center gap-2.5 rounded-[18px] px-3 py-2.5 text-left shadow-[0_8px_20px_-10px_rgba(15,23,42,0.18)] active:scale-[0.99] ${
            solid
              ? 'bg-[#0B2A6B] text-white'
              : 'bg-[#C89935] text-white'
          }`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${
              solid ? 'bg-white/12 ring-1 ring-white/20' : 'bg-white/22 ring-1 ring-white/30'
            }`}
          >
            <Icon className="h-[18px] w-[18px] text-white" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-extrabold leading-tight">{title}</span>
            {/*
              Izoh QIRQILMAYDI, ikki qatorgacha o'raladi: tor ekranda
              "Patentga tayyorgarlik" bir qatorga sig'masdi va oxiri
              kesilib qolardi.
            */}
            <span
              className={`mt-0.5 line-clamp-2 block text-[10.5px] font-semibold leading-[1.25] ${
                solid ? 'text-white/85' : 'text-white/90'
              }`}
            >
              {subtitle}
            </span>
          </span>
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
  t,
}: {
  selectedDay: number;
  currentDay: number;
  done: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  slots: QuestSlot[];
  day: number;
  premium: boolean;
  onPurchaseRequired: () => void;
  t: TranslateFn;
}) {
  const currentStep = done >= total ? total : done + 1;

  return (
    <section className="px-4 pt-2">
      <div className="rounded-[22px] bg-app-surface px-[22px] py-3 shadow-[0_10px_28px_-16px_rgba(15,23,42,0.18)] ring-1 ring-app-border/70">
        <div className="flex items-center justify-center gap-[18px]">
          <button
            type="button"
            onClick={onPrevious}
            disabled={selectedDay <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-app-surface text-app-text disabled:opacity-45"
            aria-label={t('home.prevDay')}
          >
            <ChevronLeft className="h-[21px] w-[21px]" aria-hidden />
          </button>
          <div className="text-[26px] font-extrabold leading-none text-app-text">
            {t('home.dayLabel', { day: selectedDay })}
          </div>
          <button
            type="button"
            onClick={onNext}
            disabled={selectedDay >= currentDay}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-app-surface text-app-text disabled:opacity-45"
            aria-label={t('home.nextDay')}
          >
            <ChevronRight className="h-[21px] w-[21px]" aria-hidden />
          </button>
        </div>

        <p className="mt-2 text-center text-[13px] font-semibold leading-snug text-app-text-muted">
          {t('home.stepLabel', { current: currentStep, total })}
          <span className="mx-1.5 text-app-text-secondary">•</span>
          {t('home.minutesLabel', { minutes: 25 })}
        </p>

        <div className="mt-3 flex h-6 items-center">
          {Array.from({ length: total }).map((_, idx) => {
            const step = idx + 1;
            const completed = step <= done;
            const active = step === currentStep && done < total;
            return (
              <div key={step} className="contents">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold leading-none ${
                    completed
                      ? 'border-[#0B2A6B] bg-[#0B2A6B] text-white'
                      : active
                        ? 'border-[#C08A2D] bg-app-surface text-[#C08A2D]'
                        : 'border-app-border bg-app-surface text-app-text-muted'
                  }`}
                >
                  {completed ? <Check className="h-[15px] w-[15px]" aria-hidden /> : step}
                </div>
                {step < total ? (
                  <div className={`mx-1 h-[3px] flex-1 rounded-full ${step <= done ? 'bg-[#0B2A6B]' : 'bg-app-border'}`} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function QuestCard({
  slot,
  index,
  day,
  premium,
  onPurchaseRequired,
  wide = false,
  t,
}: {
  slot: QuestSlot;
  index: number;
  day: number;
  premium: boolean;
  onPurchaseRequired: () => void;
  /**
   * Toq sondagi oxirgi karta — kvadrat emas, ikkala ustunni egallagan PAST
   * QATOR bo'lib chiziladi. Yolg'iz qolgan kvadrat yonida bo'shliq qoldirar
   * va bosh sahifani 188px ga uzaytirardi; qator esa 72px.
   */
  wide?: boolean;
  t: TranslateFn;
}) {
  const navigate = useNavigate();
  const done = slot.state === 'done';
  const active = slot.state === 'active';
  const locked = slot.state === 'locked';
  const requiresPurchase = !canEnterKunlikDayContent(day, premium);

  const emoji = slot.id === 'grammar'
    ? '📖'
    : slot.id === 'vocabulary'
      ? '🗂️'
      : slot.id === 'reading'
        ? '📕'
        : slot.id === 'suhbat'
          ? '💬'
          : '🎤';

  const numberBg = done ? '#12A150' : active ? '#0B2A6B' : '#94A3B8';
  // Surfaces use app-* tokens so light/dark themes are handled automatically;
  // the done/active accents are ring-only so the card body remains readable.
  const cardSurface = done
    ? 'bg-app-success-bg ring-1 ring-[#B7E8C7] dark:ring-[color:var(--app-success)]/40'
    : active
      ? 'bg-app-icon-bg ring-1 ring-[#B7CCEF] dark:ring-[color:var(--app-primary)]/40'
      : 'bg-app-surface ring-1 ring-app-border';

  const subtitleClass = done
    ? 'text-app-success-text dark:text-[color:var(--app-success)]'
    : active
      ? 'text-app-primary dark:text-[color:var(--app-brand)]'
      : 'text-app-text-muted';

  const actionLabel = done
    ? t('home.questRepeat') || 'Takrorlash'
    : active
      ? t('home.questStart') || 'Boshlash'
      : 'Yopiq';

  const questPath =
    done && slot.id === 'speaking' ? `${slot.route(day)}?retry=1` : slot.route(day);

  const handleQuestClick = () => {
    if (locked) return;
    if (requiresPurchase) {
      onPurchaseRequired();
      return;
    }
    navigate(questPath);
  };

  // Bosish xatti-harakati ikkala ko'rinishda bir xil — faqat ichki chizma boshqa.
  const tegish = {
    type: 'button' as const,
    disabled: locked,
    onClick: handleQuestClick,
    onMouseEnter: () => {
      if (!requiresPurchase && !locked) prefetchRoutePath(questPath);
    },
    onTouchStart: () => {
      if (!requiresPurchase && !locked) prefetchRoutePath(questPath);
    },
    onFocus: () => {
      if (!requiresPurchase && !locked) prefetchRoutePath(questPath);
    },
  };

  if (wide) {
    return (
      <button
        {...tegish}
        className={`col-span-2 flex min-h-[72px] w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left transition-transform active:scale-[0.99] disabled:cursor-default ${cardSurface} ${
          locked ? 'opacity-70' : ''
        }`}
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-black leading-none text-white"
          style={{ background: numberBg }}
        >
          {index}
        </span>
        <span className={`shrink-0 text-[28px] leading-none ${locked ? 'grayscale' : ''}`}>{emoji}</span>

        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[17px] font-extrabold leading-tight ${locked ? 'text-app-text-muted' : 'text-app-text'}`}>
            {t(slot.titleKey)}
          </span>
          <span className={`block truncate text-[11.5px] font-semibold leading-snug ${subtitleClass}`}>
            {t(slot.subtitleKey)}
          </span>
        </span>

        <span
          className={`flex min-h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-black leading-none ${
            done
              ? 'bg-[#12A150] text-white shadow-[0_8px_18px_-8px_rgba(18,161,80,0.45)]'
              : active
                ? 'quest-cta-active bg-[#0B2A6B] text-white'
                : 'bg-[#EEF1F6] text-app-text-muted'
          }`}
        >
          {locked ? '🔒' : null}
          <span className="truncate">{actionLabel}</span>
          {done ? (
            <RefreshCw className="h-4 w-4" aria-hidden />
          ) : active ? (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ) : null}
        </span>
      </button>
    );
  }

  return (
    <button
      {...tegish}
      className={`relative flex min-h-[188px] min-w-0 flex-col items-center rounded-[22px] p-4 text-center transition-transform active:scale-[0.99] disabled:cursor-default ${cardSurface} ${
        locked ? 'opacity-70' : ''
      }`}
    >
      <span
        className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-black leading-none text-white"
        style={{ background: numberBg }}
      >
        {index}
      </span>
      <span className="absolute right-3 top-3">
        <Check
          className="h-5 w-5"
          color={done ? '#12A150' : active ? '#0B2A6B' : '#CBD5E1'}
          aria-hidden
        />
      </span>

      <div className="flex flex-1 flex-col items-center justify-center gap-1 pb-3 pt-2">
        <span className={`flex h-[52px] w-full items-center justify-center text-[42px] leading-none ${locked ? 'grayscale' : ''}`}>
          {emoji}
        </span>
        <span className={`block truncate text-[19px] font-extrabold leading-tight ${locked ? 'text-app-text-muted' : 'text-app-text'}`}>
          {t(slot.titleKey)}
        </span>
        <span className={`block truncate text-[12px] font-semibold leading-snug ${subtitleClass}`}>
          {t(slot.subtitleKey)}
        </span>
      </div>

      <span
        className={`flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full text-[14px] font-black leading-none ${
          done
            ? 'bg-[#12A150] text-white shadow-[0_8px_18px_-8px_rgba(18,161,80,0.45)]'
            : active
              ? 'quest-cta-active bg-[#0B2A6B] text-white'
              : 'bg-[#EEF1F6] text-app-text-muted'
        }`}
      >
        {locked ? '🔒' : null}
        <span className="truncate">{actionLabel}</span>
        {done ? (
          <RefreshCw className="h-4 w-4" aria-hidden />
        ) : active ? (
          <ChevronRight className="h-4 w-4" aria-hidden />
        ) : null}
      </span>
    </button>
  );
}

export default function HomePage() {
  const { token, user } = useAuth();
  const { access } = useAccess();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { rows, loaded, practicePromptCountByDay } = useKunlikProgress();
  const premium = Boolean(access?.subscription_active);
  // OLTIN A'ZO: kunlar bo'ylab oldinga ham erkin yuradi (182 kun ochiq).
  const oltin = Boolean(access?.golden);
  const [myRank, setMyRank] = useState<MyRankResponse | null>(() => getCachedMyRank());
  const currentDay = useMemo(() => {
    if (!loaded) return null;
    return findCurrentDay(rows, practicePromptCountByDay);
  }, [loaded, rows, practicePromptCountByDay]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [freeLimitModalOpen, setFreeLimitModalOpen] = useState(false);
  const initialDayResolvedRef = useRef(false);

  /*
   * O'rin real vaqtda yangilanadi:
   *  1) sahifa ochilganda;
   *  2) XP olingan zahoti (`MY_RANK_EVENT` — masalan ibora testi yakunlangach);
   *  3) ilovaga qaytilganda (fokus/ko'rinish) — bu paytda boshqa
   *     foydalanuvchilar o'zib ketgan bo'lishi mumkin.
   */
  useEffect(() => {
    let cancelled = false;
    const pull = () => {
      void fetchMyRank(token).then((data) => {
        if (!cancelled && data) setMyRank(data);
      });
    };
    pull();

    const onPublished = (e: Event) => {
      const detail = (e as CustomEvent<MyRankResponse>).detail;
      if (detail) setMyRank(detail);
    };
    const onFocus = () => pull();
    const onVisible = () => {
      if (document.visibilityState === 'visible') pull();
    };

    window.addEventListener(MY_RANK_EVENT, onPublished as EventListener);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener(MY_RANK_EVENT, onPublished as EventListener);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token]);

  // Effect 1: `?kun=N` deep link (from course map or elsewhere) — ALWAYS wins.
  // React Router'ning searchParams'i lazy-route/Suspense'da ba'zan STALE (null) qaytaradi —
  // shu sabab xaritadan `/?kun=N` bilan kelganda kun qo'llanmay, har doim currentDay'ga
  // tushib qolardi. Shuning uchun window.location'dan ham o'qiymiz (ishonchli manba).
  const kunParam =
    searchParams.get('kun') ??
    (typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('kun')
      : null);
  useEffect(() => {
    if (currentDay == null) return;
    if (kunParam == null) return;
    const kun = Number(kunParam);
    if (!isValidDailyCourseDay(kun)) return;
    initialDayResolvedRef.current = true;
    takeKunlikRestoreDay();
    // Xarita OCHIQ kunlarni yuboradi: o'tgan/bugungi (kun <= currentDay) YOKI TUGALLANGAN
    // (currentDay'dan keyin bo'lsa ham). O'shalarga o'tishga ruxsat beramiz. Faqat
    // qulflangan kelajak kun (masalan qo'lda URL) currentDay'ga tushiriladi.
    const kunOchiq =
      kun <= currentDay ||
      isDayComplete(getRow(rows, kun), practicePromptCountByDay.get(kun) ?? 0);
    setSelectedDay(kunOchiq ? kun : currentDay);
    // Clear ?kun= from URL so subsequent day-navigator swipes are clean.
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('kun');
        return next;
      },
      { replace: true },
    );
  }, [currentDay, kunParam, setSearchParams, rows, practicePromptCountByDay]);

  // Effect 2: initial resolution when no URL param — restore from sessionStorage
  // (xaritadan goDay shu yerga ham yozadi), aks holda currentDay.
  useEffect(() => {
    if (currentDay == null) return;
    if (initialDayResolvedRef.current) return;
    // If a URL kun is present, Effect 1 handles it — don't race here.
    if (kunParam != null) return;
    initialDayResolvedRef.current = true;
    const restored = takeKunlikRestoreDay();
    if (restored != null && isValidDailyCourseDay(restored)) {
      // Ochiq kun (tugallangan yoki <= currentDay) bo'lsa — o'shanga o'tamiz.
      const ochiq =
        oltin ||
        restored <= currentDay ||
        isDayComplete(getRow(rows, restored), practicePromptCountByDay.get(restored) ?? 0);
      setSelectedDay(ochiq ? restored : currentDay);
    } else {
      setSelectedDay(currentDay);
    }
  }, [currentDay, kunParam, rows, practicePromptCountByDay, oltin]);

  // Effect 3: clamp selectedDay — faqat QULFLANGAN kelajak kunni currentDay'ga tushiradi.
  // TUGALLANGAN kunlar (currentDay'dan keyin bo'lsa ham) OCHIQ — tegilmaydi.
  useEffect(() => {
    if (currentDay == null) return;
    setSelectedDay((day) => {
      if (day == null) return day;
      const d = Math.max(1, day);
      const ochiq =
        oltin ||
        d <= currentDay ||
        isDayComplete(getRow(rows, d), practicePromptCountByDay.get(d) ?? 0);
      return ochiq ? d : currentDay;
    });
  }, [currentDay, rows, practicePromptCountByDay, oltin]);

  const progressReady = loaded && currentDay != null && selectedDay != null;
  const displayDay = selectedDay ?? currentDay ?? 1;
  const row = progressReady ? getRow(rows, displayDay) : null;
  const promptCount = progressReady ? practicePromptCountByDay.get(displayDay) ?? 0 : 0;
  const slots = row ? buildQuestSlots(row, promptCount, oltin) : [];
  const done = slots.filter((slot) => slot.state === 'done').length;
  const showFreeLimitCta =
    !premium && displayDay > FREE_KUNLIK_DAY_LIMIT;

  const userPoints = user?.totalPoints ?? 0;

  return (
    <div className="bg-app-bg">
      <main className="mx-auto w-full max-w-[820px]">
        <HomeHeader
          myRank={myRank}
          points={userPoints}
          premium={premium}
          avatarUrl={user?.avatarUrl}
          gender={user?.gender ?? null}
          userName={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || undefined}
          t={t}
        />
        {/* Jonli efir ketayotgan bo'lsa — eng tepada. Efir bo'lmasa
            komponent hech narsa chizmaydi. */}
        <div className="px-4">
          <LiveStreamBanner />
        </div>
        {/* Ilovani bosh ekranga chiqarish — eng tepada, sarlavhadan keyin.
            O'rnatilgan bo'lsa o'zi ko'rinmaydi. */}
        <InstallAppCard />
        <ExamShortcuts t={t} />

        <div className="px-4 pt-2">
          <button
            type="button"
            onClick={() => navigate('/kunlik-reja/xarita')}
            className="flex w-full items-center justify-between rounded-[22px] bg-app-surface px-[18px] py-[13px] shadow-[0_10px_28px_-16px_rgba(15,23,42,0.18)] ring-1 ring-app-border/70 transition-transform active:scale-[0.99]"
          >
            <span className="flex items-center gap-2.5">
              <span aria-hidden className="text-[19px] leading-none">🗺</span>
              <span className="text-[14px] font-black text-app-text">Butun xarita · {TOTAL_DAYS} kun</span>
            </span>
            <ChevronRight className="h-4 w-4 text-app-text-muted" />
          </button>
        </div>

        {progressReady ? (
          <>
            <DayNavigator
              selectedDay={displayDay}
              currentDay={oltin ? TOTAL_DAYS : currentDay}
              done={done}
              total={slots.length}
              onPrevious={() => setSelectedDay((day) => Math.max(1, (day ?? displayDay) - 1))}
              onNext={() =>
                setSelectedDay((day) => Math.min(oltin ? TOTAL_DAYS : currentDay, (day ?? displayDay) + 1))
              }
              slots={slots}
              day={displayDay}
              premium={premium}
              onPurchaseRequired={() => setFreeLimitModalOpen(true)}
              t={t}
            />

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="grid grid-cols-2 gap-3 px-4 pt-2"
            >
              {slots.map((slot, index) => (
                <QuestCard
                  key={slot.id}
                  slot={slot}
                  index={index + 1}
                  day={displayDay}
                  premium={premium}
                  onPurchaseRequired={() => setFreeLimitModalOpen(true)}
                  wide={index === slots.length - 1 && slots.length % 2 === 1}
                  t={t}
                />
              ))}
            </motion.section>
            {/*
              HAFTALIK TAKRORLASH — har 7-kunda. Kurs to'g'ri chiziq bo'lgani
              uchun o'tilgan mavzu qaytmasdi va unutilardi; bu karta oldingi
              olti kunning savollarini, avvalo xato qilinganlarini qaytaradi.
            */}
            {displayDay >= 7 && displayDay % 7 === 0 ? (
              <div className="px-4 pt-3">
                <button
                  type="button"
                  onClick={() => navigate(`/kunlik-reja/kun/${displayDay}/takrorlash`)}
                  className="flex w-full items-center gap-3 rounded-[20px] border border-[#DDD7F5] bg-white px-4 py-3.5 text-left shadow-[0_10px_24px_-16px_rgba(45,27,105,0.35)] transition active:scale-[0.99]"
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white"
                    style={{ background: 'linear-gradient(145deg, #8B7AF7, #5B4CE0)' }}
                  >
                    <RotateCcw className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-black text-[#2D1B69]">
                      Haftalik takrorlash
                    </span>
                    <span className="mt-0.5 block text-[12.5px] font-semibold text-[#8B7FAB]">
                      {Math.max(1, displayDay - 6)}–{displayDay}-kunlar · 10 ta savol
                    </span>
                  </span>
                  <span className="text-[18px] font-black text-[#5B4CE0]">→</span>
                </button>
              </div>
            ) : null}
            {showFreeLimitCta ? <KunlikFreeLimitCta /> : null}
            {freeLimitModalOpen ? (
              <KunlikFreeLimitModal onClose={() => setFreeLimitModalOpen(false)} />
            ) : null}
          </>
        ) : (
          <div className="px-4 pt-6">
            <SkeletonKarta />
          </div>
        )}
      </main>
    </div>
  );
}
