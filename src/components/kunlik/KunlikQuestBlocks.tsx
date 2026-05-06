import { useEffect, useRef, type RefObject } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, Brain, Check, FileText, Lock, Mic, Play, Star } from 'lucide-react';
import { motion } from 'motion/react';
import type { DayBlock, DayPlan } from '../../data/dailyPlan';
import {
  isBlockDoneLocallyForPlan,
  type KunlikQuestSlice,
  type PlanLessonResults,
} from '../../utils/kunlikPlanDayProgress';

/** Kunlar rejada «O'qish» kartochkasida ikkinchi qator (matn nomi) chiqmasin */
export const KUNLIK_PLAN_HIDE_READING_TOPIC_LABEL = new Set([14, 21, 28, 35]);

export const BLOCK_CONFIG = {
  grammar: {
    icon: BookOpen,
    label: 'Grammatika',
    sub: 'Qoidalar va mashqlar',
    gradient: 'from-blue-500 to-indigo-600',
    softGradient: 'from-blue-50 to-indigo-50',
    iconColor: 'text-blue-600',
    dot: 'bg-blue-500',
  },
  vocabulary: {
    icon: Brain,
    label: "Lug'at",
    sub: "Yangi so'zlar",
    gradient: 'from-violet-500 to-purple-600',
    softGradient: 'from-violet-50 to-purple-50',
    iconColor: 'text-violet-600',
    dot: 'bg-violet-500',
  },
  text: {
    icon: FileText,
    label: "O'qish",
    sub: 'Matn va tushunish',
    gradient: 'from-emerald-500 to-teal-600',
    softGradient: 'from-emerald-50 to-teal-50',
    iconColor: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  review: {
    icon: Star,
    label: 'Takrorlash',
    sub: "O'tilganlarni mustahkamlash",
    gradient: 'from-amber-400 to-orange-500',
    softGradient: 'from-amber-50 to-orange-50',
    iconColor: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  speaking: {
    icon: Mic,
    label: 'Gapirish',
    sub: 'Talaffuz mashqi',
    gradient: 'from-rose-400 to-orange-400',
    softGradient: 'from-rose-50 to-orange-50',
    iconColor: 'text-rose-500',
    dot: 'bg-rose-400',
  },
} as const;

export type QuestState = 'done' | 'active' | 'locked';

export type QuestStep = {
  kind: string;
  label: string;
  sub: string;
  icon: LucideIcon;
  gradient: string;
  softGradient: string;
  iconColor: string;
  state: QuestState;
  onPress: () => void;
};

export function buildKunlikQuestSteps(params: {
  day: DayPlan;
  quest: KunlikQuestSlice;
  results: PlanLessonResults;
  reviewVisits: Record<number, true>;
  isServerDone: (dayNum: number, kind: string) => boolean;
  reviewDone: boolean;
  navigate: NavigateFunction;
  onNavigateBlock: (block: DayBlock) => void;
  onMarkReview: () => void;
}): QuestStep[] {
  const {
    day,
    quest,
    results,
    reviewVisits,
    isServerDone,
    reviewDone,
    navigate,
    onNavigateBlock,
    onMarkReview,
  } = params;

  const textBlock = day.blocks.find((b): b is Extract<DayBlock, { kind: 'text' }> => b.kind === 'text');
  const readingTopicUnderPlan =
    textBlock && !KUNLIK_PLAN_HIDE_READING_TOPIC_LABEL.has(day.day) ? textBlock.label : null;

  const { blocksForGrid, readingDone, speakingDone } = quest;

  type RawStep = {
    kind: string;
    done: boolean;
    onPress: () => void;
    cfgKey: keyof typeof BLOCK_CONFIG;
    subOverride?: string;
  };

  const rawSteps: RawStep[] = [
    ...blocksForGrid.map((block) => ({
      kind: block.kind,
      cfgKey: (block.kind in BLOCK_CONFIG ? block.kind : 'review') as keyof typeof BLOCK_CONFIG,
      done:
        isBlockDoneLocallyForPlan(block, results, reviewVisits, day.day) ||
        isServerDone(day.day, block.kind),
      onPress: () => {
        if (block.kind === 'review') {
          if (!reviewDone) onMarkReview();
          return;
        }
        onNavigateBlock(block);
      },
    })),
    {
      kind: 'text',
      cfgKey: 'text',
      done: readingDone,
      subOverride: readingTopicUnderPlan ?? undefined,
      onPress: () => navigate(`/kunlik-reja/kun/${day.kunlikDay ?? day.day}/oqish`),
    },
    {
      kind: 'speaking',
      cfgKey: 'speaking',
      done: speakingDone,
      onPress: () => navigate(`/kunlik-reja/kun/${day.kunlikDay ?? day.day}/gapirish`),
    },
  ];

  let foundActive = false;
  return rawSteps.map((s) => {
    const cfg = BLOCK_CONFIG[s.cfgKey];
    let state: QuestState;
    if (s.done) {
      state = 'done';
    } else if (!foundActive) {
      foundActive = true;
      state = 'active';
    } else {
      state = 'locked';
    }
    return {
      kind: s.kind,
      label: cfg.label,
      sub: s.subOverride ?? cfg.sub,
      icon: cfg.icon,
      gradient: cfg.gradient,
      softGradient: cfg.softGradient,
      iconColor: cfg.iconColor,
      state,
      onPress: s.onPress,
    };
  });
}

export function QuestBlocks({ steps }: { steps: QuestStep[] }) {
  const activeStepRef = useRef<HTMLDivElement | null>(null);
  const activeIdx = steps.findIndex((s) => s.state === 'active');
  const activeAnchor: ScrollLogicalPosition =
    activeIdx <= 0 ? 'start' : activeIdx <= 2 ? 'center' : 'end';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 640) return;
    if (!activeStepRef.current) return;

    const raf = window.requestAnimationFrame(() => {
      activeStepRef.current?.scrollIntoView({
        block: activeAnchor,
        inline: 'nearest',
        behavior: 'smooth',
      });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [steps, activeAnchor]);

  return (
    <div className="relative">
      <div className="absolute bottom-8 left-[19px] top-8 w-0.5 bg-gradient-to-b from-gray-200 via-gray-200 to-transparent" />

      <div className="space-y-2">
        {steps.map((step, i) => (
          <QuestTimelineStep
            key={`${step.kind}-${i}`}
            step={step}
            idx={i}
            isLast={i === steps.length - 1}
            rootRef={step.state === 'active' ? activeStepRef : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function QuestTimelineStep({
  step,
  idx,
  isLast,
  rootRef,
}: {
  step: QuestStep;
  idx: number;
  isLast: boolean;
  rootRef?: RefObject<HTMLDivElement | null>;
}) {
  const { state, icon: Icon } = step;

  return (
    <motion.div
      ref={state === 'active' ? rootRef : undefined}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * idx, duration: 0.2 }}
      className="flex scroll-mb-24 items-stretch gap-3"
    >
      <div className="flex flex-col items-center">
        <div
          className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
            state === 'done'
              ? 'border-green-400 bg-green-500'
              : state === 'active'
                ? `border-transparent bg-gradient-to-br ${step.gradient} shadow-md`
                : 'border-gray-200 bg-white'
          }`}
        >
          {state === 'done' && <Check className="h-5 w-5 text-white" strokeWidth={3} />}
          {state === 'active' && (
            <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
              <Icon className="h-4 w-4 text-white" strokeWidth={2} />
            </motion.div>
          )}
          {state === 'locked' && <Lock className="h-4 w-4 text-gray-300" strokeWidth={2} />}
        </div>
        {!isLast && (
          <div className={`mt-1 h-2 w-0.5 ${state === 'done' ? 'bg-green-300' : 'bg-gray-200'}`} />
        )}
      </div>

      <div className="mb-2 flex-1">
        {state === 'active' ? (
          <ActiveStepCard step={step} />
        ) : state === 'done' ? (
          <DoneStepCard step={step} />
        ) : (
          <LockedStepCard step={step} />
        )}
      </div>
    </motion.div>
  );
}

function ActiveStepCard({ step }: { step: QuestStep }) {
  const { icon: Icon } = step;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={step.onPress}
      className={`group relative w-full overflow-hidden rounded-[24px] bg-gradient-to-br ${step.gradient} text-left shadow-lg`}
      style={{ boxShadow: '0 16px 34px rgba(37,99,235,0.30)' }}
    >
      <div className="pointer-events-none absolute -right-3 -top-3 h-20 w-16 rounded-2xl border border-white/14 bg-white/5 rotate-[8deg]" />
      <div className="pointer-events-none absolute right-6 top-1 h-20 w-16 rounded-2xl border border-white/12 bg-white/[0.04] rotate-[11deg]" />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)',
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPositionX: ['200%', '-200%'] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'linear', repeatDelay: 1.2 }}
      />

      <div className="pointer-events-none absolute -right-8 -bottom-10 h-36 w-36 rounded-full bg-blue-300/25 blur-2xl" />

      <div className="relative z-10 px-4 pb-3 pt-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/16 backdrop-blur-sm ring-1 ring-white/10">
            <Icon className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <span className="leading-none font-extrabold tracking-tight text-white [font-size:clamp(18px,4.6vw,26px)]">
            {step.label}
          </span>
        </div>

        <motion.div
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[16px] bg-white py-2.5 shadow-[0_10px_20px_rgba(2,6,23,0.18)]"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        >
          <Play className="h-3.5 w-3.5 fill-current text-blue-600" />
          <span className="text-[13px] font-extrabold text-blue-600">Boshlash</span>
        </motion.div>
      </div>
    </motion.button>
  );
}

function DoneStepCard({ step }: { step: QuestStep }) {
  const { icon: Icon } = step;
  return (
    <button
      type="button"
      onClick={step.onPress}
      className="flex w-full appearance-none items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100">
        <Icon className="h-4 w-4 text-green-500" strokeWidth={2} />
      </div>
      <span className="flex-1 text-[14px] font-bold text-green-700">{step.label}</span>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500">
        <Check className="h-3 w-3 text-white" strokeWidth={3} />
      </div>
    </button>
  );
}

function LockedStepCard({ step }: { step: QuestStep }) {
  const { icon: Icon } = step;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
        <Icon className="h-4 w-4 text-gray-300" strokeWidth={2} />
      </div>
      <span className="flex-1 text-[14px] font-bold text-gray-300">{step.label}</span>
      <Lock className="h-4 w-4 shrink-0 text-gray-300" />
    </div>
  );
}
