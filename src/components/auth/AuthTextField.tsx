import { useId } from "react";
import { clsx } from "clsx";
import { useAuthLayoutMetrics } from "../../hooks/useAuthLayoutMetrics";

const fieldClass =
  "block w-full min-h-[56px] rounded-[16px] border-[2px] bg-app-surface px-4 py-3.5 text-base font-bold text-app-text outline-none transition placeholder:font-semibold placeholder:text-[#B4BFD3] focus:border-app-brand focus:shadow-[0_0_0_4px_rgba(47,107,255,0.1)]";

type Props = {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function AuthTextField({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: Props) {
  const metrics = useAuthLayoutMetrics();
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;

  return (
    <div>
      {label ? (
        <>
          <label
            htmlFor={inputId}
            className="block text-sm font-bold text-app-text-muted"
          >
            {label}
          </label>
          <div style={{ height: metrics.fieldLabelGap }} />
        </>
      ) : null}
      <input
        id={inputId}
        className={clsx(
          fieldClass,
          error
            ? "border-[#E5484D] focus:border-[#E5484D] focus:shadow-[0_0_0_4px_rgba(229,72,77,0.1)]"
            : "border-app-border-strong",
          className,
        )}
        {...props}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={
          [props["aria-describedby"], error ? `${inputId}-error` : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {error ? (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="mt-1.5 text-sm font-semibold text-[#E5484D]"
        >
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <p className="mt-1.5 text-sm text-app-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
