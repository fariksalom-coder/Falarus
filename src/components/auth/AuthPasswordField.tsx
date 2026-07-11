import { clsx } from 'clsx';
import { useState } from 'react';
import { useAuthLayoutMetrics } from '../../hooks/useAuthLayoutMetrics';

const fieldClass =
  'block w-full min-h-[56px] rounded-[16px] border-[2px] bg-white px-4 py-3.5 pr-12 text-base font-bold text-[#17224A] outline-none transition placeholder:font-semibold placeholder:text-[#B4BFD3] focus:border-[#2F6BFF] focus:shadow-[0_0_0_4px_rgba(47,107,255,0.1)]';

type Props = {
  label: string;
  error?: string;
  sharedVisible?: boolean;
  onToggleShared?: () => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function AuthPasswordField({
  label,
  error,
  sharedVisible,
  onToggleShared,
  className,
  id,
  ...props
}: Props) {
  const metrics = useAuthLayoutMetrics();
  const [localVisible, setLocalVisible] = useState(false);
  const visible = sharedVisible ?? localVisible;

  const toggle = () => {
    if (onToggleShared) onToggleShared();
    else setLocalVisible((v) => !v);
  };

  const inputId = id ?? props.name ?? 'password';

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-bold text-[#6B7BA8]">
        {label}
      </label>
      <div style={{ height: metrics.fieldLabelGap }} />
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={clsx(
            fieldClass,
            error ? 'border-[#E5484D] focus:border-[#E5484D] focus:shadow-[0_0_0_4px_rgba(229,72,77,0.1)]' : 'border-[#E1E7F1]',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={visible ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg transition hover:bg-[#F5F8FF]"
        >
          <img
            src={visible ? '/auth/eye_show.svg' : '/auth/eye_hide.svg'}
            alt=""
            width={20}
            height={20}
            className="opacity-60"
          />
        </button>
      </div>
      {error ? <p className="mt-1.5 text-sm font-semibold text-[#E5484D]">{error}</p> : null}
    </div>
  );
}
