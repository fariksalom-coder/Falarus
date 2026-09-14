import {
  useId,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import { AmbientMedia } from "./AmbientMedia";

export function Button({
  variant = "primary",
  loading = false,
  children,
  className,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx("ui-button", `ui-button--${variant}`, className)}
    >
      {loading && <Loader2 className="ui-spinner" size={18} aria-hidden />}
      {children}
    </button>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={clsx("ui-card", className)} />;
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <span
      {...props}
      className={clsx("ui-badge", `ui-badge--${tone}`, className)}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="ui-page-header">
      <AmbientMedia />
      <div className="ui-page-header-copy">
        {eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="ui-description">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Field({
  label,
  hint,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  const description =
    [props["aria-describedby"], error || hint ? `${fieldId}-hint` : undefined]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="ui-field">
      <label htmlFor={fieldId}>{label}</label>
      <input
        {...props}
        id={fieldId}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={description}
      />
      {(error || hint) && (
        <p id={`${fieldId}-hint`} className={error ? "ui-field-error" : ""}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function Progress({
  value,
  max = 100,
  label,
}: {
  value: number;
  max?: number;
  label: string;
}) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value)
    ? Math.min(safeMax, Math.max(0, value))
    : 0;
  return (
    <progress
      className="ui-progress"
      aria-label={label}
      max={safeMax}
      value={safeValue}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="ui-empty">
      <h2>{title}</h2>
      <p className="ui-description">{description}</p>
      {action}
    </Card>
  );
}
