import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'primaryDark' | 'secondary' | 'success';

type Props = {
  label: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  shape?: 'pill' | 'rounded12';
  icon?: ReactNode;
};

export function AuthButton({
  label,
  onClick,
  type = 'button',
  loading = false,
  disabled = false,
  variant = 'primary',
  shape = 'pill',
  icon,
}: Props) {
  const isDisabled = disabled || loading || (type === 'button' && !onClick);

  const classes =
    isDisabled && (variant === 'primary' || variant === 'primaryDark' || variant === 'success')
      ? 'bg-[#B9C1D8] text-white shadow-none'
      : variant === 'secondary'
        ? 'bg-white text-[#2F6BFF] border-[2px] border-[#E1E7F1]'
        : variant === 'success'
          ? 'bg-[#18B45C] text-white shadow-[0_8px_0_#12934A] hover:bg-[#15A053] active:translate-y-1 active:shadow-[0_2px_0_#12934A]'
          : 'bg-[#2F6BFF] text-white shadow-[0_8px_0_#1B4FE0] hover:bg-[#2860F0] active:translate-y-1 active:shadow-[0_2px_0_#1B4FE0]';

  const radius = shape === 'pill' ? 'rounded-full' : 'rounded-[16px]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      className={[
        'flex h-[54px] w-full items-center justify-center gap-2 px-5 text-base font-extrabold transition-all',
        radius,
        classes,
        isDisabled ? 'cursor-not-allowed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
      {label}
    </button>
  );
}
