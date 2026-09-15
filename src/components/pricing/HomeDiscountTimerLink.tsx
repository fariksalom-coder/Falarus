import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Sparkles } from 'lucide-react';
import { getDiscountRemaining, type DiscountRemaining } from '../../utils/discountDeadline';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Bosh ekran (xarita) headeridagi ixcham chegirma taymeri.
 * Tariflar sahifasiga olib boradi; muddat tugagach yashirinadi.
 */
export default function HomeDiscountTimerLink({ className = '' }: { className?: string }) {
  const [remaining, setRemaining] = useState<DiscountRemaining>(() => getDiscountRemaining());

  useEffect(() => {
    const tick = () => setRemaining(getDiscountRemaining());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!remaining.active) return null;

  const totalHours = remaining.days * 24 + remaining.hours;
  const clock = `${pad2(totalHours)}:${pad2(remaining.minutes)}:${pad2(remaining.seconds)}`;

  return (
    <Link
      to="/tariflar"
      className={`block rounded-[18px] p-3 transition active:scale-[0.985] ${className}`}
      style={{
        background: 'linear-gradient(135deg, #F97316 0%, #EF4444 48%, #DC2626 100%)',
        boxShadow:
          '0 10px 24px -8px rgba(220,38,38,0.7), 0 0 0 2px rgba(255,255,255,0.35), inset 0 1px 0 rgba(255,255,255,0.35)',
      }}
      aria-label={`Chegirma tugashiga ${clock} qoldi. Chegirmani olish`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#DC2626] shadow-[0_6px_14px_-4px_rgba(0,0,0,0.35)]">
            <Clock className="h-[18px] w-[18px]" strokeWidth={2.8} aria-hidden />
          </span>
          <p className="text-[13px] font-black leading-tight tracking-tight text-white">
            TEJAMLI TARIF
          </p>
        </div>

        <div
          className="shrink-0 rounded-[12px] px-2.5 py-1.5"
          style={{
            background: '#FFFBEB',
            boxShadow: '0 6px 14px -6px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(251,191,36,0.55)',
          }}
        >
          <span className="block text-[17px] font-black tabular-nums leading-none tracking-tight text-[#B91C1C]">
            {clock}
          </span>
        </div>
      </div>

      <span
        className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black text-[#0A1638] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.45)] ring-2 ring-white/90 transition hover:brightness-105"
        style={{
          background: 'linear-gradient(150deg, #FFF4C2 0%, #F5D48F 35%, #E7C578 70%, #D4AC5C 100%)',
        }}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-[#92400E]" strokeWidth={2.5} aria-hidden />
        Chegirmani olish
        <span className="text-[#92400E]" aria-hidden>
          →
        </span>
      </span>
    </Link>
  );
}
