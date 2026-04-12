import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, type LucideIcon, ListChecks } from 'lucide-react';
import { getExpectedLessonTaskCount } from '../../data/unifiedLessonVazifaRegistry';
import type { TaskResult } from '../../utils/lessonTaskResults';
import { isTaskResultGood } from '../../utils/lessonTaskResults';
import {
  getCurrentTaskNumberFree,
  getCurrentTaskNumberSequential,
  getTaskResultsMap,
  isTaskLockedSequential,
} from './lessonTaskSquareUtils';

export type LessonTaskSquareItem = {
  path: string;
  taskNum: number;
  /** Karta sarlavhasi, masalan "Vazifa 1" yoki "Topshiriq 2" */
  label: string;
  /** Pastki qisqa matn */
  hint: string;
  Icon?: LucideIcon;
};

type LessonTaskSquareGridProps = {
  lessonPath: string;
  tasks: LessonTaskSquareItem[];
  /** 1-dars kabi: oldingi topshiriq ≥70% bo‘lmaguncha keyingisi qulflanadi */
  sequentialLock?: boolean;
  /** Joriy kartada "Boshlash" tugmasi (odatda sequentialLock bilan) */
  showBoshlashOnCurrent?: boolean;
  resultsOverride?: Record<number, TaskResult> | null;
  mashqlarHeading?: boolean;
  /** GET /api/grammar/catalog dan kelgan savollar soni (bor bo‘lsa, statik reestr o‘rniga). */
  questionCountByTask?: Partial<Record<number, number>>;
};

function squareClass(
  taskNum: number,
  current: number | null,
  sequentialLock: boolean,
  results: Record<number, TaskResult>,
): string {
  const result = results[taskNum];
  const passed = result && isTaskResultGood(result);
  const locked = sequentialLock && isTaskLockedSequential(taskNum, results);
  const isCurrent = !passed && !locked && current === taskNum;

  /**
   * Karta kengligi: faqat `min(100%,14rem)` bo‘lsa, 2 ustunda katak keng, ramka 14rem gacha katta bo‘lardi;
   * 4 ustunda esa tor — breakpoint bo‘yicha o‘lcham sakrab ketardi (11/15/17 va ko‘p vazifali hub).
   * `w-full max-w-[10rem]` — maksimum bir xil, tor ekranda katak bo‘yicha kichrayadi.
   */
  const base =
    'relative box-border flex h-full min-h-[11rem] w-full max-w-[10rem] shrink-0 justify-self-center flex-col items-center gap-1 rounded-[24px] border-2 p-2.5 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:min-h-[12rem] sm:gap-1.5 sm:p-3';

  if (passed) {
    return `${base} border-emerald-500 bg-gradient-to-br from-emerald-100 via-emerald-50 to-white text-emerald-950 shadow-[0_12px_36px_rgba(34,197,94,0.35)] ring-2 ring-emerald-400/70 hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(34,197,94,0.4)] active:scale-[0.98] focus-visible:ring-emerald-500`;
  }
  if (locked) {
    return `${base} cursor-not-allowed border-slate-200/90 bg-slate-100/80 text-slate-400 opacity-[0.72] shadow-none grayscale hover:translate-y-0`;
  }
  if (isCurrent) {
    return `${base} border-blue-500 bg-gradient-to-br from-blue-100 via-blue-50 to-white text-blue-950 shadow-[0_12px_36px_rgba(37,99,235,0.28)] ring-2 ring-blue-400/55 hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(37,99,235,0.38)]`;
  }
  return `${base} border-indigo-200/90 bg-gradient-to-br from-white via-white to-indigo-50/80 text-indigo-900 shadow-[0_14px_34px_rgba(148,163,184,0.12)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(148,163,184,0.18)] active:scale-[0.98] focus-visible:ring-indigo-500`;
}

function iconWrapClass(
  taskNum: number,
  current: number | null,
  sequentialLock: boolean,
  results: Record<number, TaskResult>,
): string {
  const result = results[taskNum];
  const passed = result && isTaskResultGood(result);
  const locked = sequentialLock && isTaskLockedSequential(taskNum, results);
  const isCurrent = !passed && !locked && current === taskNum;

  const base = 'flex h-9 w-9 items-center justify-center rounded-2xl shadow-inner ring-1 sm:h-11 sm:w-11';
  if (passed) {
    return `${base} bg-white text-emerald-600 shadow-emerald-200/60 ring-emerald-300`;
  }
  if (locked) {
    return `${base} bg-slate-200/80 text-slate-400 ring-slate-200`;
  }
  if (isCurrent) {
    return `${base} bg-white text-blue-600 shadow-blue-200/70 ring-blue-300`;
  }
  if (!result) {
    return `${base} bg-white/90 text-indigo-600 shadow-slate-200/80 ring-indigo-100`;
  }
  return `${base} bg-white/90 text-orange-600 shadow-orange-100/80 ring-orange-100`;
}

function labelClass(
  taskNum: number,
  current: number | null,
  sequentialLock: boolean,
  results: Record<number, TaskResult>,
): string {
  const result = results[taskNum];
  const passed = result && isTaskResultGood(result);
  const locked = sequentialLock && isTaskLockedSequential(taskNum, results);
  const isCurrent = !passed && !locked && current === taskNum;
  const base = 'text-[11px] font-bold uppercase tracking-wide sm:text-xs';
  if (isCurrent) return `${base} text-blue-900`;
  if (locked) return `${base} text-slate-400`;
  return `${base} opacity-80`;
}

function hintClass(
  taskNum: number,
  current: number | null,
  sequentialLock: boolean,
  results: Record<number, TaskResult>,
): string {
  const result = results[taskNum];
  const passed = result && isTaskResultGood(result);
  const locked = sequentialLock && isTaskLockedSequential(taskNum, results);
  const isCurrent = !passed && !locked && current === taskNum;
  const base = 'line-clamp-3 text-[10px] font-medium leading-snug sm:line-clamp-4 sm:text-[11px]';
  if (isCurrent) return `${base} font-medium text-blue-900`;
  if (passed) return `${base} font-semibold text-emerald-900`;
  if (locked) return `${base} text-slate-400`;
  return `${base} opacity-90`;
}

function questionCountClass(
  taskNum: number,
  current: number | null,
  sequentialLock: boolean,
  results: Record<number, TaskResult>,
): string {
  const result = results[taskNum];
  const passed = result && isTaskResultGood(result);
  const locked = sequentialLock && isTaskLockedSequential(taskNum, results);
  const isCurrent = !passed && !locked && current === taskNum;
  const base =
    'shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold tabular-nums leading-none sm:text-[10px]';
  if (isCurrent) return `${base} bg-blue-600/15 text-blue-900 ring-1 ring-blue-500/25`;
  if (passed) return `${base} bg-emerald-600/12 text-emerald-900 ring-1 ring-emerald-500/25`;
  if (locked) return `${base} bg-slate-200/80 text-slate-400 ring-1 ring-slate-200`;
  return `${base} bg-slate-100/95 text-slate-600 ring-1 ring-slate-200/90`;
}

function defaultGridClass(taskCount: number): string {
  if (taskCount <= 3) return 'grid-cols-3';
  if (taskCount <= 6) return 'grid-cols-2 sm:grid-cols-3';
  return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
}

export function LessonTaskSquareGrid({
  lessonPath,
  tasks,
  sequentialLock = false,
  showBoshlashOnCurrent,
  resultsOverride,
  mashqlarHeading = true,
  questionCountByTask,
}: LessonTaskSquareGridProps) {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  const boshlash = showBoshlashOnCurrent ?? sequentialLock;

  useEffect(() => {
    const onSaved = () => setTick((n) => n + 1);
    window.addEventListener('lesson-task-saved', onSaved);
    return () => window.removeEventListener('lesson-task-saved', onSaved);
  }, []);

  const taskNums = useMemo(() => tasks.map((t) => t.taskNum), [tasks]);

  const results = useMemo(() => {
    void tick;
    return getTaskResultsMap(lessonPath, resultsOverride);
  }, [lessonPath, resultsOverride, tick]);

  const currentTask = useMemo(() => {
    if (sequentialLock) {
      return getCurrentTaskNumberSequential(taskNums, results);
    }
    return getCurrentTaskNumberFree(taskNums, results);
  }, [sequentialLock, taskNums, results]);

  const gridClass = defaultGridClass(tasks.length);

  return (
    <div className="mt-6">
      {mashqlarHeading ? <p className="mb-3 text-sm font-semibold text-slate-500">Mashqlar</p> : null}
      <div className={`grid items-stretch justify-items-center gap-2 sm:gap-4 ${gridClass}`}>
        {tasks.map(({ path, taskNum, label, hint, Icon = ListChecks }) => {
          const locked = sequentialLock && isTaskLockedSequential(taskNum, results);
          const passed = !!(results[taskNum] && isTaskResultGood(results[taskNum]!));
          const isCurrent = !passed && !locked && currentTask === taskNum;
          const fromCatalog = questionCountByTask?.[taskNum];
          const questionTotal =
            fromCatalog !== undefined ? fromCatalog : getExpectedLessonTaskCount(lessonPath, taskNum);

          const body = (
            <>
              {passed ? (
                <span
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-emerald-500 shadow-md ring-2 ring-emerald-400/80 sm:right-2.5 sm:top-2.5 sm:h-8 sm:w-8"
                  aria-label="Bajarildi"
                >
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.25} aria-hidden />
                </span>
              ) : null}
              <span className={iconWrapClass(taskNum, currentTask, sequentialLock, results)}>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />
              </span>
              <span className={labelClass(taskNum, currentTask, sequentialLock, results)}>{label}</span>
              {questionTotal != null ? (
                <span
                  className={questionCountClass(taskNum, currentTask, sequentialLock, results)}
                  title={`${questionTotal} ta savol`}
                  aria-label={`${questionTotal} ta savol`}
                >
                  {questionTotal} ta
                </span>
              ) : null}
              <span className={hintClass(taskNum, currentTask, sequentialLock, results)}>{hint}</span>
            </>
          );

          if (boshlash && isCurrent) {
            return (
              <div
                key={path}
                className={`${squareClass(taskNum, currentTask, sequentialLock, results)} justify-between gap-1 overflow-hidden py-2 sm:gap-1.5 sm:py-2.5`}
              >
                <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-0.5 px-0.5 sm:flex-1">
                  {body}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(path)}
                  className="w-full shrink-0 rounded-2xl bg-[#2563EB] px-2 py-1.5 text-[11px] font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] transition-all hover:bg-blue-700 active:scale-[0.98] sm:py-2 sm:text-xs"
                >
                  Boshlash
                </button>
              </div>
            );
          }

          return (
            <button
              key={path}
              type="button"
              disabled={locked}
              onClick={() => {
                if (!locked) navigate(path);
              }}
              className={`${squareClass(taskNum, currentTask, sequentialLock, results)} justify-center`}
            >
              {body}
            </button>
          );
        })}
      </div>
    </div>
  );
}
