import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type LucideIcon, ListChecks } from 'lucide-react';
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
   * Karta kengligi: `max-w-[10rem]` — mobil va desktopda bir xil maksimal kenglik.
   * Bajarilgan / joriy kartalar: mobil ham `border-2` + rangli ring va soyya (desktop bilan mos).
   */
  const base =
    'relative box-border flex h-full min-h-[11rem] w-full max-w-[10rem] shrink-0 justify-self-center flex-col items-stretch rounded-2xl border border-slate-200/75 bg-white p-2.5 text-center shadow-[0_8px_28px_rgba(15,23,42,0.07)] ring-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:min-h-[12rem] sm:rounded-[24px] sm:border-2 sm:p-3 sm:shadow-[0_14px_34px_rgba(148,163,184,0.12)]';

  if (passed) {
    return `${base} border-2 border-emerald-500 bg-gradient-to-br from-emerald-100 via-emerald-50 to-white text-emerald-950 shadow-[0_10px_32px_rgba(34,197,94,0.22)] ring-2 ring-emerald-400/70 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(34,197,94,0.3)] active:scale-[0.98] focus-visible:ring-emerald-500 sm:shadow-[0_12px_36px_rgba(34,197,94,0.35)] sm:hover:shadow-[0_16px_44px_rgba(34,197,94,0.42)]`;
  }
  if (locked) {
    return `${base} cursor-not-allowed border-slate-200/80 bg-slate-100/85 text-slate-400 opacity-[0.72] shadow-none grayscale hover:translate-y-0 sm:border-slate-200/90`;
  }
  if (isCurrent) {
    return `${base} border-2 border-blue-500 bg-gradient-to-br from-blue-100 via-blue-50 to-white text-blue-950 shadow-[0_10px_32px_rgba(37,99,235,0.22)] ring-2 ring-blue-400/60 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(37,99,235,0.3)] active:scale-[0.98] focus-visible:ring-blue-500 sm:shadow-[0_12px_36px_rgba(37,99,235,0.3)] sm:hover:shadow-[0_16px_44px_rgba(37,99,235,0.4)]`;
  }
  return `${base} border-indigo-200/70 bg-gradient-to-br from-white via-white to-indigo-50/80 text-indigo-900 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(99,102,241,0.12)] active:scale-[0.98] sm:border-indigo-200/90 sm:hover:shadow-[0_18px_40px_rgba(148,163,184,0.18)] focus-visible:ring-indigo-500`;
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
  const base = 'block max-w-full text-center text-[11px] font-bold uppercase tracking-wide sm:text-xs';
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
  const base = 'block max-w-full text-center line-clamp-3 text-[10px] font-medium leading-snug sm:line-clamp-4 sm:text-[11px]';
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

/** Ikon va «Vazifa N» matni barcha kartochkalarda bir xil vertikal qatorda turishi uchun qat’iy qatorlar. */
function TaskCardStackedBody({
  label,
  hint,
  Icon,
  questionTotal,
  questionCountClassName,
  labelClassName,
  hintClassName,
  iconWrapClassName,
}: {
  label: string;
  hint: string;
  Icon: LucideIcon;
  questionTotal: number | null;
  questionCountClassName: string;
  labelClassName: string;
  hintClassName: string;
  iconWrapClassName: string;
}) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-stretch gap-1 px-0.5 pt-0.5 sm:gap-1.5">
      <div className="flex h-10 w-full shrink-0 items-center justify-center sm:h-11">
        <span className={iconWrapClassName}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />
        </span>
      </div>
      <div className="flex min-h-[2.5rem] w-full shrink-0 items-center justify-center px-0.5">
        <span className={labelClassName}>{label}</span>
      </div>
      <div className="flex h-[1.375rem] w-full shrink-0 items-center justify-center sm:h-6">
        {questionTotal != null ? (
          <span
            className={questionCountClassName}
            title={`${questionTotal} ta savol`}
            aria-label={`${questionTotal} ta savol`}
          >
            {questionTotal} ta
          </span>
        ) : (
          <span
            className="invisible rounded-full px-2 py-0.5 text-[9px] font-bold tabular-nums leading-none sm:text-[10px]"
            aria-hidden
          >
            0 ta
          </span>
        )}
      </div>
      <div className="flex min-h-[2.75rem] w-full flex-1 items-start justify-center overflow-hidden">
        <span className={hintClassName}>{hint}</span>
      </div>
    </div>
  );
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
          const staticCount = getExpectedLessonTaskCount(lessonPath, taskNum);
          const questionTotal =
            fromCatalog != null && fromCatalog > 0 ? fromCatalog : (staticCount ?? fromCatalog ?? null);

          const stacked = (
            <TaskCardStackedBody
              label={label}
              hint={hint}
              Icon={Icon}
              questionTotal={questionTotal ?? null}
              questionCountClassName={questionCountClass(taskNum, currentTask, sequentialLock, results)}
              labelClassName={labelClass(taskNum, currentTask, sequentialLock, results)}
              hintClassName={hintClass(taskNum, currentTask, sequentialLock, results)}
              iconWrapClassName={iconWrapClass(taskNum, currentTask, sequentialLock, results)}
            />
          );

          if (boshlash && isCurrent) {
            return (
              <div
                key={path}
                className={`${squareClass(taskNum, currentTask, sequentialLock, results)} justify-between gap-1 overflow-hidden py-2 sm:gap-1.5 sm:py-2.5`}
              >
                {stacked}
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
              className={`${squareClass(taskNum, currentTask, sequentialLock, results)} justify-between`}
            >
              {stacked}
            </button>
          );
        })}
      </div>
    </div>
  );
}
