import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Bot, X } from 'lucide-react';
import { formatRubAmount } from '../../../../shared/russianTariffs';
import { saleStatus, type SalesLedgerOperator, type SalesLedgerSale, type Money } from '../../../../shared/salesLedger';

export const formatAmount = (value: number) => formatRubAmount(value);
export const rub = (value: number) => `${formatAmount(value)} ₽`;
export const uzs = (value: number) => `${formatAmount(value)} сум`;

export function formatDayLong(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function formatDayShort(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** «3 000 ₽» va ostida kulrang «400 000 сум». */
export function MoneyStack({ value, tone = 'default', size = 'sm' }: { value: Money; tone?: 'default' | 'success' | 'danger' | 'muted'; size?: 'sm' | 'lg' }) {
  const color = { default: 'text-slate-900', success: 'text-emerald-700', danger: 'text-red-600', muted: 'text-slate-400' }[tone];
  return (
    <span className="inline-flex flex-col whitespace-nowrap leading-tight">
      <span className={`font-semibold tabular-nums ${color} ${size === 'lg' ? 'text-[26px] tracking-tight' : 'text-[13.5px]'}`}>{rub(value.rub)}</span>
      <span className={`tabular-nums text-slate-500 ${size === 'lg' ? 'text-[13px]' : 'text-[11.5px]'}`}>{uzs(value.uzs)}</span>
    </span>
  );
}

const AVATAR_COLORS = ['#2563EB', '#16A34A', '#7C3AED', '#EA580C', '#DB2777', '#0891B2', '#CA8A04', '#4F46E5'];

export function operatorColor(operator: Pick<SalesLedgerOperator, 'id' | 'is_auto'>) {
  return operator.is_auto ? '#64748B' : AVATAR_COLORS[operator.id % AVATAR_COLORS.length];
}

export function OperatorBadge({ operator, compact = false }: { operator: Pick<SalesLedgerOperator, 'id' | 'name' | 'is_auto'>; compact?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
        style={{ background: operatorColor(operator) }}
        aria-hidden="true"
      >
        {operator.is_auto ? <Bot className="h-3.5 w-3.5" /> : operator.name.trim().charAt(0).toUpperCase()}
      </span>
      {!compact && <span className="truncate text-[13.5px] text-slate-800">{operator.name}</span>}
    </span>
  );
}

export function StatusBadge({ sale }: { sale: Pick<SalesLedgerSale, 'paid_rub' | 'debt_rub'> }) {
  const status = saleStatus(sale);
  const style = {
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    partial: 'bg-amber-50 text-amber-700 ring-amber-200',
    waiting: 'bg-slate-100 text-slate-600 ring-slate-200',
  }[status];
  const label = { paid: 'Оплачено', partial: 'Частично', waiting: 'Ожидает оплаты' }[status];
  return <span className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset ${style}`}>{label}</span>;
}

export function Card({ title, icon, action, children, className = '' }: { title: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_34px_rgba(148,163,184,0.12)] ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <h2 className="flex items-center gap-2.5 text-[15.5px] font-bold text-slate-900">
          {icon}
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <p className="text-[14px] font-semibold text-slate-700">{title}</p>
      {hint && <p className="max-w-sm text-[13px] text-slate-500">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Modal({ open, title, subtitle, onClose, children }: { open: boolean; title: string; subtitle?: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Portal: admin yon paneli `fixed`, portalsiz oynacha uning ostida qolardi.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[24px] bg-white pb-[env(safe-area-inset-bottom,0px)] text-slate-900 shadow-2xl sm:max-w-[560px] sm:rounded-[24px]"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-[17px] font-bold">{title}</h3>
                {subtitle && <div className="mt-0.5 text-[13px] text-slate-500">{subtitle}</div>}
              </div>
              <button type="button" onClick={onClose} aria-label="Закрыть" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 disabled:bg-slate-50';

export function Field({ label, hint, children, className = '' }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[12.5px] font-semibold text-slate-600">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-slate-500">{hint}</span>}
    </label>
  );
}

/** Ikki bosqichli o'chirish: brauzer confirm() o'rniga. */
export function ConfirmDelete({ onConfirm, disabled, label = 'Удалить' }: { onConfirm: () => void; disabled?: boolean; label?: string }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
          return;
        }
        setArmed(true);
        timer.current = window.setTimeout(() => setArmed(false), 3000);
      }}
      className={`min-h-[36px] rounded-lg px-2.5 text-[12.5px] font-semibold transition active:scale-[0.97] disabled:opacity-50 ${
        armed ? 'bg-red-600 text-white hover:bg-red-700' : 'text-slate-500 hover:bg-red-50 hover:text-red-600'
      }`}
    >
      {armed ? 'Точно удалить?' : label}
    </button>
  );
}

export const primaryButton =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)] transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60';
export const secondaryButton =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[14px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60';
export const chipButton =
  'min-h-[36px] rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 active:scale-[0.97]';
