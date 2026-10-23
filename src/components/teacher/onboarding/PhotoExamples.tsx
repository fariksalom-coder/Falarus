/**
 * Surat namunalari: bitta «shunday kerak» va uchta «mumkin emas». Haqiqiy odam
 * surati o'rniga chizma — kimningdir yuzini namuna qilib ko'rsatmaslik uchun.
 */
import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { ONBOARDING_TEXT } from './text';

const SKIN = '#F2C7A5';
const HAIR = '#3B2A20';
const SHIRT = '#0F766E';

/** Yelkagacha odam: (cx, cy) — bosh markazi, s — o'lcham. */
function Person({ cx, cy, s, shirt = SHIRT, hair = HAIR, glasses = false }: { cx: number; cy: number; s: number; shirt?: string; hair?: string; glasses?: boolean }) {
  return (
    <g>
      <path d={`M${cx - s * 1.9} ${cy + s * 3.2} Q${cx - s * 1.8} ${cy + s * 1.35} ${cx} ${cy + s * 1.3} Q${cx + s * 1.8} ${cy + s * 1.35} ${cx + s * 1.9} ${cy + s * 3.2} Z`} fill={shirt} />
      <rect x={cx - s * 0.32} y={cy + s * 0.75} width={s * 0.64} height={s * 0.7} fill={SKIN} />
      <ellipse cx={cx} cy={cy} rx={s * 0.82} ry={s} fill={SKIN} />
      <path d={`M${cx - s * 0.86} ${cy - s * 0.05} Q${cx - s * 0.95} ${cy - s * 1.15} ${cx} ${cy - s * 1.12} Q${cx + s * 0.95} ${cy - s * 1.15} ${cx + s * 0.86} ${cy - s * 0.05} Q${cx + s * 0.55} ${cy - s * 0.7} ${cx} ${cy - s * 0.62} Q${cx - s * 0.55} ${cy - s * 0.7} ${cx - s * 0.86} ${cy - s * 0.05} Z`} fill={hair} />
      {glasses ? (
        <g fill="#111827">
          <rect x={cx - s * 0.68} y={cy - s * 0.2} width={s * 0.58} height={s * 0.36} rx={s * 0.12} />
          <rect x={cx + s * 0.1} y={cy - s * 0.2} width={s * 0.58} height={s * 0.36} rx={s * 0.12} />
          <rect x={cx - s * 0.12} y={cy - s * 0.1} width={s * 0.24} height={s * 0.06} />
        </g>
      ) : (
        <g fill="#1F2937">
          <circle cx={cx - s * 0.3} cy={cy - s * 0.02} r={s * 0.08} />
          <circle cx={cx + s * 0.3} cy={cy - s * 0.02} r={s * 0.08} />
        </g>
      )}
      <path d={`M${cx - s * 0.25} ${cy + s * 0.42} Q${cx} ${cy + s * 0.6} ${cx + s * 0.25} ${cy + s * 0.42}`} stroke="#9A3412" strokeWidth={s * 0.07} fill="none" strokeLinecap="round" />
    </g>
  );
}

function Frame({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 100 100" className="block aspect-square w-full" aria-hidden="true">
      <rect width="100" height="100" fill={bg} />
      {children}
    </svg>
  );
}

const SAMPLES: { good: boolean; art: ReactNode }[] = [
  { good: true, art: <Frame bg="#E6F4F1"><Person cx={50} cy={44} s={19} /></Frame> },
  { good: false, art: <Frame bg="#FDE68A"><Person cx={50} cy={44} s={19} glasses /></Frame> },
  {
    good: false,
    art: (
      <Frame bg="#DBEAFE">
        <Person cx={22} cy={52} s={13} shirt="#DB2777" hair="#78350F" />
        <Person cx={78} cy={52} s={13} shirt="#2563EB" hair="#111827" />
        <Person cx={50} cy={46} s={14} />
      </Frame>
    ),
  },
  {
    good: false,
    art: (
      <Frame bg="#94A3B8">
        <rect x="0" y="62" width="100" height="38" fill="#64748B" />
        <rect x="8" y="18" width="22" height="44" fill="#CBD5E1" />
        <rect x="70" y="26" width="20" height="36" fill="#CBD5E1" />
        <Person cx={50} cy={58} s={6} />
      </Frame>
    ),
  },
];

export default function PhotoExamples({ lang }: { lang: 'uz' | 'ru' }) {
  const t = ONBOARDING_TEXT[lang];
  return (
    <div>
      <p className="mb-2 text-[12.5px] font-bold text-app-text">{t.examplesTitle}</p>
      <ul className="grid grid-cols-4 gap-2">
        {SAMPLES.map((s, i) => (
          <li key={i} className="min-w-0">
            <div className={`relative overflow-hidden rounded-[14px] ring-2 ${s.good ? 'ring-[#16A34A]' : 'ring-[#EF4444]/70'}`}>
              {s.art}
              <span className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-white ${s.good ? 'bg-[#16A34A]' : 'bg-[#EF4444]'}`}>
                {s.good ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
              </span>
            </div>
            <p className={`mt-1 text-center text-[11px] font-semibold leading-tight ${s.good ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>{t.examples[i]}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
