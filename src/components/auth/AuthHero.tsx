import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

type Props = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onBack?: () => void;
};

/** 1B auth: blue gradient top with white wing/icon, title + subtitle. */
export function AuthHero({ title, subtitle, icon, onBack }: Props) {
  return (
    <div
      className="relative mb-5 -mx-4 sm:-mx-5"
      style={{
        background: 'linear-gradient(165deg, #4C86FF 0%, #2F6BFF 100%)',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        boxShadow: '0 20px 44px -16px rgba(47,107,255,0.4)',
      }}
    >
      <div className="relative overflow-hidden px-6 pb-4 pt-2.5">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-[130px] w-[130px] rounded-full bg-white/12"
          aria-hidden
        />
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Orqaga"
            className="absolute left-3 top-3 z-[3] flex h-10 w-10 items-center justify-center text-white transition-transform hover:-translate-x-0.5 active:scale-95"
          >
            <ChevronLeft className="h-7 w-7" strokeWidth={2.5} />
          </button>
        ) : null}
        <div className="pointer-events-none relative z-[2] flex flex-col items-center text-center">
          <div className="pointer-events-auto flex flex-col items-center">
          <div className="mb-1.5 flex h-10 w-10 items-center justify-center">
            {icon ?? (
              <img
                src="/landing/falarus-mark.svg"
                alt="FalaRus"
                className="h-[32px] w-[40px]"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            )}
          </div>
          <h1 className="text-[22px] font-black leading-tight text-white">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-[13px] font-bold leading-snug text-[#D3E1FF]">
              {subtitle}
            </p>
          ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
