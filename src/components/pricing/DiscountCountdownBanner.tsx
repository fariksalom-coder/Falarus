import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { getDiscountRemaining, type DiscountRemaining } from '../../utils/discountDeadline';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

type UnitProps = {
  value: number;
  label: string;
};

function TimerUnit({ value, label }: UnitProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-[16px] bg-white px-2 py-3 shadow-[0_10px_24px_-8px_rgba(185,28,28,0.35)] ring-2 ring-[#FCA5A5]/80 sm:rounded-[18px] sm:px-3 sm:py-3.5">
      <span
        key={value}
        className="animate-[timerPop_0.28s_ease-out] text-[32px] font-black tabular-nums leading-none tracking-tight text-[#B91C1C] sm:text-[40px]"
        style={{ textShadow: '0 1px 0 rgba(255,255,255,0.7), 0 2px 10px rgba(185,28,28,0.22)' }}
      >
        {pad2(value)}
      </span>
      <span className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#7F1D1D] sm:text-[12px]">
        {label}
      </span>
    </div>
  );
}

type DiscountCountdownBannerProps = {
  /** Hero sarlavha (masalan, «15-sentabr 24:00 da…»). */
  title?: string;
  /** Qisqa izoh. */
  subtitle?: string;
  className?: string;
};

/**
 * Chegirma tugashiga qolgan vaqt: soat / daqiqa / soniya.
 * Muddat o'tganda butun blok yashirinadi.
 */
export default function DiscountCountdownBanner({
  title = '15-sentyabr 24:00 da tariflar yangilanadi',
  subtitle = 'Shu vaqtgacha 50% chegirma bilan eski narxda obuna bo‘lishingiz mumkin.',
  className = '',
}: DiscountCountdownBannerProps) {
  const [remaining, setRemaining] = useState<DiscountRemaining>(() => getDiscountRemaining());

  useEffect(() => {
    const tick = () => setRemaining(getDiscountRemaining());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!remaining.active) return null;

  const totalHours = remaining.days * 24 + remaining.hours;

  return (
    <div className={`mb-8 ${className}`}>
      <style>{`
        @keyframes timerPop {
          0% { transform: scale(1.12); opacity: 0.72; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-left">
          <h2 className="text-[20px] font-black leading-tight tracking-tight text-[#0F172A] sm:text-[26px]">
            {title}
          </h2>
          <p className="mt-2 max-w-[34rem] text-[13px] font-medium leading-snug text-[#64748B] sm:text-[14.5px]">
            {subtitle}
          </p>
        </div>

        <div
          className="relative mt-0.5 flex h-[72px] w-[72px] shrink-0 items-center justify-center sm:h-[88px] sm:w-[88px]"
          aria-hidden
        >
          <div
            className="absolute inset-0 rotate-[-8deg] rounded-[18px]"
            style={{
              background: 'linear-gradient(145deg, #EF4444 0%, #DC2626 55%, #B91C1C 100%)',
              boxShadow: '0 14px 28px -10px rgba(220,38,38,0.55)',
            }}
          />
          <div className="relative flex flex-col items-center text-center text-white">
            <span className="text-[18px] font-black leading-none sm:text-[22px]">-50%</span>
            <span className="mt-0.5 text-[8px] font-black uppercase tracking-[0.12em] sm:text-[9px]">
              Chegirma
            </span>
          </div>
        </div>
      </div>

      <div
        className="rounded-[22px] p-3.5 sm:rounded-[24px] sm:p-5"
        style={{
          background: 'linear-gradient(180deg, #FEE2E2 0%, #FECACA 100%)',
          boxShadow: '0 14px 34px rgba(248,113,113,0.18)',
        }}
        role="timer"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`Chegirma tugashiga qoldi: ${totalHours} soat, ${remaining.minutes} daqiqa, ${remaining.seconds} soniya`}
      >
        <div className="mb-3.5 flex items-center justify-center gap-1.5">
          <Clock className="h-4 w-4 text-[#DC2626]" strokeWidth={2.5} aria-hidden />
          <p className="text-[13px] font-extrabold text-[#7F1D1D] sm:text-[14px]">
            Chegirma tugashiga qoldi:
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
          <TimerUnit value={totalHours} label="Soat" />
          <TimerUnit value={remaining.minutes} label="Daqiqa" />
          <TimerUnit value={remaining.seconds} label="Soniya" />
        </div>
      </div>
    </div>
  );
}
