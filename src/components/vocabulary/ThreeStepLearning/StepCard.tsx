import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';

export type StepStatus = 'completed' | 'failed' | 'locked' | 'available';

export type StepCardProps = {
  title: string;
  status: StepStatus;
  icon: ReactNode;
  result?: ReactNode;
  hint?: string;
  actionLabel: string;
  disabled?: boolean;
  onClick?: () => void;
};

function statusStyles(status: StepStatus) {
  switch (status) {
    case 'completed':
      return {
        container: 'border-emerald-200 bg-emerald-50',
        iconBg: 'bg-emerald-100 text-emerald-700',
        accent: 'text-emerald-700',
      };
    case 'failed':
      return {
        container: 'border-red-200 bg-red-50',
        iconBg: 'bg-red-100 text-red-700',
        accent: 'text-red-700',
      };
    case 'locked':
      return {
        container: 'border-slate-200 bg-white',
        iconBg: 'bg-slate-100 text-slate-400',
        accent: 'text-slate-400',
      };
    case 'available':
    default:
      return {
        container: 'border-slate-200 bg-white',
        iconBg: 'bg-indigo-50 text-indigo-700',
        accent: 'text-slate-900',
      };
  }
}

export function StepCard(props: StepCardProps) {
  const {
    title,
    status,
    icon,
    result,
    hint,
    actionLabel,
    disabled,
    onClick,
  } = props;

  const styles = statusStyles(status);

  const isLocked = status === 'locked' || !!disabled;
  const statusText =
    status === 'completed'
      ? 'Tugallangan'
      : status === 'failed'
        ? "O‘tilmadi"
        : status === 'locked'
          ? 'Qulflangan'
          : null;

  return (
    <button
      type="button"
      disabled={isLocked}
      onClick={onClick}
      className={[
        'group relative w-full rounded-2xl border p-5 text-left shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-200',
        isLocked ? 'cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-sm' : '',
        styles.container,
      ].join(' ')}
    >
      <div className="flex items-start gap-4">
        <div
          className={[
            'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
            styles.iconBg,
          ].join(' ')}
          aria-hidden
        >
          {status === 'locked' ? (
            <Lock className="h-5 w-5" strokeWidth={1.8} />
          ) : (
            icon
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {statusText && (
              <div
                className="rounded-full border px-2 py-0.5 text-xs font-semibold"
                style={{
                  color:
                    status === 'completed'
                      ? '#166534'
                      : status === 'failed'
                        ? '#B91C1C'
                        : '#64748B',
                  borderColor:
                    status === 'completed'
                      ? '#BBF7D0'
                      : status === 'failed'
                        ? '#FECACA'
                        : '#E2E8F0',
                  background:
                    status === 'completed'
                      ? '#F0FDF4'
                      : status === 'failed'
                        ? '#FEF2F2'
                        : '#F8FAFC',
                }}
              >
                {statusText}
              </div>
            )}
          </div>

          <div className="mt-1 text-base font-semibold leading-tight text-slate-900">{title}</div>

          {result && <div className="mt-3">{result}</div>}

          {hint && status !== 'available' && (
            <div className="mt-3 text-xs font-medium" style={{ color: '#64748B' }}>
              {hint}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold" style={{ color: '#0F172A' }}>
          {/* left spacer for alignment */}
        </div>

        {isLocked ? (
          <div
            className="rounded-full border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: '#E2E8F0', background: '#F8FAFC', color: '#94A3B8' }}
          >
            {actionLabel}
          </div>
        ) : (
          <div
            className="rounded-full px-4 py-2 text-sm font-semibold shadow-sm"
            style={{
              background:
                status === 'failed' ? '#EF4444' : status === 'available' ? '#6366F1' : '#22c55e',
              color: '#FFFFFF',
            }}
          >
            {actionLabel}
          </div>
        )}
      </div>
    </button>
  );
}

