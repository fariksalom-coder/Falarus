import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

type LessonTheoryCollapsibleProps = {
  children: ReactNode;
  /** To‘liq ochilganda ko‘rinadi (masalan, ruscha misol). */
  example?: ReactNode;
  /** Asosiy matn qutisi (children) uchun classlar */
  bodyClassName?: string;
};

/**
 * Boshlang‘ich holat: faqat «Tushuntirish» qatori.
 * Bosilganda matn ochiladi, yana bosilsa yopiladi — barcha darslarda bir xil.
 */
export function LessonTheoryCollapsible({
  children,
  example,
  bodyClassName = 'mt-4 space-y-4 text-sm leading-relaxed text-slate-800',
}: LessonTheoryCollapsibleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="-m-1 flex w-full min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-2xl p-1 text-left transition-colors hover:bg-white/60"
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 text-indigo-600">
          <Lightbulb className="h-5 w-5 shrink-0" aria-hidden />
          <span className="text-sm font-bold uppercase tracking-wider">Tushuntirish</span>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-indigo-600">
          {expanded ? (
            <>
              <span className="hidden sm:inline">Yopish</span>
              <ChevronUp className="h-5 w-5" aria-hidden />
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Batafsil</span>
              <ChevronDown className="h-5 w-5" aria-hidden />
            </>
          )}
        </span>
      </button>

      {expanded ? (
        <>
          <div className={bodyClassName}>{children}</div>
          {example ?? null}
        </>
      ) : null}
    </div>
  );
}
