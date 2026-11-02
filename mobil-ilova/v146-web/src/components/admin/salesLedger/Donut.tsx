import { useState, type ReactNode } from 'react';

export type DonutSegment = {
  key: string;
  label: string;
  /** Ulush shu qiymatdan hisoblanadi (bir xil birlikda bo'lishi shart). */
  value: number;
  color: string;
  /** Legendada qiymat o'rnida ko'rsatiladigan matn (masalan, asl valyutadagi summa). */
  detail: ReactNode;
};

const SIZE = 168;
const STROKE = 36;
/** Faol segment qalinlashadi — chetidan joy qoldiramiz, kesilib qolmasin. */
const HOVER_GROW = 6;
const RADIUS = (SIZE - STROKE - HOVER_GROW) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const percent = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 1000) / 10 : 0);

/**
 * Halqa diagramma: bir qismning butunga nisbati (≤ 6 segment). Segment yoki
 * legenda qatoriga sichqoncha/fokus — markazda o'sha qismning nomi va foizi.
 * Har segment legendada nomi, summasi va foizi bilan — rang yagona belgi emas.
 */
export function Donut({
  segments,
  centerValue,
  centerLabel,
  emptyText,
  ariaLabel,
}: {
  segments: DonutSegment[];
  centerValue: ReactNode;
  centerLabel: string;
  emptyText: string;
  ariaLabel: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);
  const activeSegment = visible.find((s) => s.key === active) ?? null;

  let offset = 0;
  const arcs = visible.map((segment) => {
    const length = (segment.value / total) * CIRCUMFERENCE;
    const arc = {
      segment,
      dash: Math.max(0.5, length),
      offset,
    };
    offset += length;
    return arc;
  });

  return (
    <div className="flex flex-col items-center gap-5 p-4 sm:flex-row sm:items-start sm:p-5">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={ariaLabel} className="-rotate-90">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#F1F5F9" strokeWidth={STROKE} />
          {arcs.map(({ segment, dash, offset: start }) => (
            <circle
              key={segment.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={active === segment.key ? STROKE + HOVER_GROW : STROKE}
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              strokeDashoffset={-start}
              opacity={active && active !== segment.key ? 0.35 : 1}
              className="cursor-pointer transition-[opacity,stroke-width] duration-150"
              onMouseEnter={() => setActive(segment.key)}
              onMouseLeave={() => setActive(null)}
            >
              <title>{`${segment.label}: ${percent(segment.value, total)}%`}</title>
            </circle>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {activeSegment ? (
            <>
              <span className="text-[24px] font-extrabold tabular-nums text-slate-900">{percent(activeSegment.value, total)}%</span>
              <span className="line-clamp-2 text-[11.5px] leading-tight text-slate-500">{activeSegment.label}</span>
            </>
          ) : (
            <>
              <span className="text-[26px] font-extrabold leading-none tabular-nums text-slate-900">{centerValue}</span>
              <span className="text-[11.5px] leading-tight text-slate-500">{centerLabel}</span>
            </>
          )}
        </div>
      </div>

      {visible.length ? (
        <ul className="flex w-full min-w-0 flex-1 flex-col gap-0.5">
          {visible.map((segment) => (
            <li key={segment.key}>
              <button
                type="button"
                onMouseEnter={() => setActive(segment.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(segment.key)}
                onBlur={() => setActive(null)}
                onClick={() => setActive((current) => (current === segment.key ? null : segment.key))}
                className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors ${active === segment.key ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
              >
                <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: segment.color }} aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium text-slate-800">{segment.label}</span>
                  <span className="truncate text-[11.5px] text-slate-500">{segment.detail}</span>
                </span>
                <span className="w-12 shrink-0 text-right text-[13px] font-bold tabular-nums text-slate-900">{percent(segment.value, total)}%</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="self-center text-[13px] text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}
