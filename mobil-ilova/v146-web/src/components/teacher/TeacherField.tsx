import type { ReactNode } from 'react';

/**
 * O'qituvchi anketasi uchun umumiy input maydoni (dizayn-token'lar, dark-mode tayyor).
 * Ilgari TeacherCabinetPage va TeacherRegisterPage'da takrorlangan `Field` shu bilan almashtiriladi.
 */
export default function TeacherField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
  min,
  max,
  autoComplete,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  hint?: ReactNode;
  min?: number;
  max?: number;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 text-sm font-semibold text-app-text ${className}`}>
      <span>{label}</span>
      {hint ? <span className="block text-xs font-medium text-app-text-muted">{hint}</span> : null}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-app-border bg-app-surface px-3.5 py-3 text-app-text outline-none transition-colors placeholder:text-app-text-secondary focus:border-app-primary focus:ring-2 focus:ring-app-primary/15"
      />
    </label>
  );
}
