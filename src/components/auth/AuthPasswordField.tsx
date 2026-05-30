import { clsx } from 'clsx';
import { useState } from 'react';
import { useAuthLayoutMetrics } from '../../hooks/useAuthLayoutMetrics';

const fieldClass =
  'block w-full min-h-12 rounded-xl border bg-white px-4 py-3.5 pr-12 text-base font-semibold text-[#0F172A] outline-none transition placeholder:font-semibold placeholder:text-[#9B9B9B] focus:border-[#2563EB] focus:ring-[1.2px] focus:ring-[#2563EB]';

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
      <label htmlFor={inputId} className="block text-sm font-medium text-[#4B4B4B]">
        {label}
      </label>
      <div style={{ height: metrics.fieldLabelGap }} />
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={clsx(
            fieldClass,
            error ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]' : 'border-[#C8DCF3]',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={visible ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg transition hover:bg-slate-50"
        >
          <img
            src={visible ? '/auth/eye_show.svg' : '/auth/eye_hide.svg'}
            alt=""
            width={20}
            height={20}
          />
        </button>
      </div>
      {error ? <p className="mt-1.5 text-sm text-[#EF4444]">{error}</p> : null}
    </div>
  );
}
