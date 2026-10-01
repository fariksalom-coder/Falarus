import { SkeletonKarta } from '../components/ui/Skeleton';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { isValidDailyCourseDay, FREE_KUNLIK_DAY_LIMIT } from '../../shared/dailyCourseDay';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { useLocale } from '../context/LocaleContext';
import { useKunlikProgress } from '../hooks/useKunlikProgress';
import { prefetchRoutePath } from '../routeModules';
import { TOTAL_DAYS } from '../data/dailyPlan';
import {
  QUESTS,
  buildQuestSlots,
  findCurrentDay,
  getRow,
  isDayComplete,
  type QuestSlot,
} from '../utils/kunlikBloklar';
import { takeKunlikRestoreDay } from '../utils/kunlikLastDay';
import KunlikFreeLimitCta from '../components/KunlikFreeLimitCta';
import KunlikFreeLimitModal from '../components/KunlikFreeLimitModal';
import LiveStreamBanner from '../components/live/LiveStreamBanner';
import ObunaMuddatBanner from '../components/subscription/ObunaMuddatBanner';
import { canEnterKunlikDayContent } from '../../shared/dailyCourseDay';

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

function HomeHeader({ premium, t }: { premium: boolean; t: TranslateFn }) {
  const navigate = useNavigate();
  return (
    <header className="flex items-center justify-between gap-3 px-4 pb-1 pt-3">
      <button type="button" onClick={() => navigate('/kunlik-reja/xarita')} aria-label="Xaritaga qaytish" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-app-text hover:bg-app-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
        <ArrowLeft size={20} aria-hidden="true" />Orqaga
      </button>
      {!premium && <button type="button" onClick={() => navigate('/kurs-haqida')} onMouseEnter={() => prefetchRoutePath('/kurs-haqida')} onFocus={() => prefetchRoutePath('/kurs-haqida')} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
        <Crown size={18} aria-hidden="true" />{t('home.premium')}
      </button>}
    </header>
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
            disabled={selectedDay <= 0}
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
        className={`relative col-span-2 lg:col-span-2 grid min-h-[164px] w-full grid-cols-[64px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-[22px] p-4 text-left transition-transform active:scale-[0.99] disabled:cursor-default ${cardSurface} ${
          locked ? 'opacity-70' : ''
        }`}
      >
        <span
          className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-black leading-none text-white"
          style={{ background: numberBg }}
        >
          {index}
        </span>
        <span className={`flex h-16 items-center justify-center pt-3 text-[44px] leading-none ${locked ? 'grayscale' : ''}`}>{emoji}</span>

        <span className="min-w-0 flex-1">
          <span className={`block break-words text-[21px] font-extrabold leading-tight ${locked ? 'text-app-text-muted' : 'text-app-text'}`}>
            {t(slot.titleKey)}
          </span>
          <span className={`mt-1 block text-[13px] font-semibold leading-snug ${subtitleClass}`}>
            {t(slot.subtitleKey)}
          </span>
        </span>

        <span
          className={`col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-[14px] font-black leading-none ${
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
  /*
   * Kun endi MANZILDA: `/kunlik-reja/kun/N`. Ilgari u `?kun=N` so'rov
   * parametri edi, chunki bu sahifa ilovaning ildizi bo'lgan. Eski havolalar
   * (`/?kun=N`) hali ham ishlashi uchun ikkala manba ham o'qiladi.
   */
  const { dayNum: dayNumParam } = useParams<{ dayNum?: string }>();
  const { rows, loaded, practicePromptCountByDay } = useKunlikProgress();
  const premium = Boolean(access?.subscription_active);
  // OLTIN A'ZO: kunlar bo'ylab oldinga ham erkin yuradi (182 kun ochiq).
  const oltin = Boolean(access?.golden);
  const currentDay = useMemo(() => {
    if (!loaded) return null;
    return findCurrentDay(rows, practicePromptCountByDay);
  }, [loaded, rows, practicePromptCountByDay]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [freeLimitModalOpen, setFreeLimitModalOpen] = useState(false);
  const initialDayResolvedRef = useRef(false);

  // Effect 1: `?kun=N` deep link (from course map or elsewhere) — ALWAYS wins.
  // React Router'ning searchParams'i lazy-route/Suspense'da ba'zan STALE (null) qaytaradi —
  // shu sabab xaritadan `/?kun=N` bilan kelganda kun qo'llanmay, har doim currentDay'ga
  // tushib qolardi. Shuning uchun window.location'dan ham o'qiymiz (ishonchli manba).
  const kunParam =
    dayNumParam ??
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
      const d = Math.max(0, day);
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


  return (
    <div className="bg-app-bg">
      <main className="mx-auto w-full max-w-[1180px]">
        <HomeHeader premium={premium} t={t} />
        {/* Jonli efir ketayotgan bo'lsa — eng tepada. Efir bo'lmasa
            komponent hech narsa chizmaydi. */}
        <div className="px-4">
          <LiveStreamBanner />
        </div>
        {/* Obuna muddati tugayapti/tugadi — avto-to'lov yo'q, shuning uchun
            odam o'zi qaror qilishi uchun eslatib turamiz. Muddat uzoq bo'lsa
            komponent hech narsa chizmaydi. */}
        <div className="px-4">
          <ObunaMuddatBanner />
        </div>

        {progressReady ? (
          <>
            <DayNavigator
              selectedDay={displayDay}
              currentDay={oltin ? TOTAL_DAYS : currentDay}
              done={done}
              total={slots.length}
              onPrevious={() => setSelectedDay((day) => Math.max(0, (day ?? displayDay) - 1))}
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
              className="grid grid-cols-2 gap-3 px-4 pt-2 md:gap-5 lg:grid-cols-3"
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
