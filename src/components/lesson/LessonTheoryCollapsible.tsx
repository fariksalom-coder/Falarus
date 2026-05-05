import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

type LessonTheoryCollapsibleProps = {
  children: ReactNode;
  /** To‘liq ochilganda ko‘rinadi (masalan, ruscha misol). */
  example?: ReactNode;
  /** Asosiy matn qutisi (children) uchun classlar */
  bodyClassName?: string;
  /** `white` — dars hubidagi kabi oq kartochka + violet aksentlar */
  surface?: 'muted' | 'white';
  /** Bosilganda ochilish holati (masalan, kunlik sahifa uchun yopiq boshlash). */
  defaultExpanded?: boolean;
  /** `false` bo‘lsa toggle yonidagi «Batafsil» / «Yopish» yashirib, faqat strelka qoladi */
  showToggleText?: boolean;
};

/**
 * Boshlang‘ich holat: faqat «Tushuntirish» qatori.
 * Bosilganda matn ochiladi, yana bosilsa yopiladi — barcha darslarda bir xil.
 */
export function LessonTheoryCollapsible({
  children,
  example,
  bodyClassName = 'mt-4 space-y-4 text-sm leading-relaxed text-slate-800',
  surface = 'muted',
  defaultExpanded = false,
  showToggleText = true,
}: LessonTheoryCollapsibleProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const shell =
    surface === 'white'
      ? 'rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(148,163,184,0.12)] sm:p-6'
      : 'rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6';

  const accent = surface === 'white' ? 'text-violet-600' : 'text-indigo-600';
  const hoverBg = surface === 'white' ? 'hover:bg-violet-50/40' : 'hover:bg-white/60';

  return (
    <div className={shell}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`-m-1 flex w-full min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-2xl p-1 text-left transition-colors ${hoverBg}`}
        aria-expanded={expanded}
      >
        <div className={`flex min-w-0 flex-1 items-center gap-2 ${accent}`}>
          <Lightbulb className="h-5 w-5 shrink-0" aria-hidden />
          <span className="text-sm font-bold uppercase tracking-wider">Tushuntirish</span>
        </div>
        <span className={`flex shrink-0 items-center gap-1 text-sm font-semibold ${accent}`}>
          {expanded ? (
            <>
              {showToggleText ? <span className="hidden sm:inline">Yopish</span> : null}
              <ChevronUp className="h-5 w-5" aria-hidden />
            </>
          ) : (
            <>
              {showToggleText ? <span className="hidden sm:inline">Batafsil</span> : null}
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
