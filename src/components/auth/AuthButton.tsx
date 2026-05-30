import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'primaryDark' | 'secondary';

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

  const bg =
    isDisabled && (variant === 'primary' || variant === 'primaryDark')
      ? 'bg-[#A5A8D4]'
      : variant === 'secondary'
        ? 'bg-white border-[1.2px] border-[#1E3A8A] text-[#1E3A8A]'
        : 'bg-[#1E3A8A] text-white';

  const radius = shape === 'pill' ? 'rounded-full' : 'rounded-xl';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      className={[
        'flex h-[50px] w-full items-center justify-center gap-2 px-5 text-base font-semibold transition',
        radius,
        bg,
        isDisabled ? 'cursor-not-allowed' : 'hover:opacity-95 active:scale-[0.99]',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
      {label}
    </button>
  );
}
