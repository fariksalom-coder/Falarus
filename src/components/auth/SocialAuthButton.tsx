import { Loader2 } from 'lucide-react';
import type { ReactNode, RefCallback } from 'react';

type Props = {
  label: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  googleButtonRef?: RefCallback<HTMLDivElement>;
  googleButtonReady?: boolean;
};

export function SocialAuthButton({
  label,
  onClick,
  loading = false,
  disabled = false,
  icon,
  googleButtonRef,
  googleButtonReady = false,
}: Props) {
  const isDisabled = disabled || loading || !onClick;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        aria-busy={loading}
        className={[
          'flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[16px] border-[2px] border-[#E1E7F1] bg-white px-5 text-[15px] font-black text-[#17224A] transition',
          isDisabled && !loading ? 'cursor-not-allowed opacity-60' : 'hover:bg-[#F5F8FF]',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          icon ?? <img src="/auth/google.svg" alt="" width={24} height={24} />
        )}
        {label}
      </button>
      {googleButtonRef && !disabled && !loading ? (
        <div
          ref={googleButtonRef}
          className={[
            'absolute inset-0 z-10 h-[54px] w-full overflow-hidden rounded-full',
            googleButtonReady ? 'opacity-[0.01]' : 'pointer-events-none opacity-0',
          ].join(' ')}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
