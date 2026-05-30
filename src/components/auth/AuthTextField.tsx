import { clsx } from 'clsx';
import { useAuthLayoutMetrics } from '../../hooks/useAuthLayoutMetrics';

const fieldClass =
  'block w-full min-h-12 rounded-xl border bg-white px-4 py-3.5 text-base font-semibold text-[#0F172A] outline-none transition placeholder:font-semibold placeholder:text-[#9B9B9B] focus:border-[#2563EB] focus:ring-[1.2px] focus:ring-[#2563EB]';

type Props = {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function AuthTextField({ label, hint, error, className, id, ...props }: Props) {
  const metrics = useAuthLayoutMetrics();
  const inputId = id ?? props.name;

  return (
    <div>
      {label ? (
        <>
          <label htmlFor={inputId} className="block text-sm font-medium text-[#4B4B4B]">
            {label}
          </label>
          <div style={{ height: metrics.fieldLabelGap }} />
        </>
      ) : null}
      <input
        id={inputId}
        className={clsx(
          fieldClass,
          error ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]' : 'border-[#C8DCF3]',
          className,
        )}
        {...props}
      />
      {error ? <p className="mt-1.5 text-sm text-[#EF4444]">{error}</p> : null}
      {!error && hint ? <p className="mt-1.5 text-sm text-[#4B4B4B]">{hint}</p> : null}
    </div>
  );
}
