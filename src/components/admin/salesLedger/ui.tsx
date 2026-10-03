import type { ReactNode } from 'react';
import { Bot, UserCog } from 'lucide-react';
import { formatRubAmount } from '../../../../shared/russianTariffs';
import { CURRENCIES, saleStatus, type AnalyticsSale, type Currency, type Money, type SaleSource } from '../../../../shared/salesLedger';

export const formatAmount = (value: number) => formatRubAmount(value);

const CURRENCY_SUFFIX: Record<Currency, string> = { RUB: '₽', UZS: 'сум', USD: '$' };
export const formatMoney = (value: number, currency: Currency) => `${formatAmount(value)} ${CURRENCY_SUFFIX[currency]}`;

export function formatDayLong(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function formatDayShort(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** Toshkent vaqti bo'yicha soat:daqiqa. */
export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' });
}

export function isEmptyMoney(value: Money) {
  return CURRENCIES.every((c) => !value[c]);
}

/**
 * Har bir valyuta alohida qatorda (konvertatsiyasiz). Bo'sh bo'lsa «0 ₽».
 * Birinchi qator — asosiy (katta), qolganlari ostida.
 */
export function MoneyStack({ value, tone = 'default', size = 'sm' }: { value: Money; tone?: 'default' | 'success' | 'danger' | 'muted'; size?: 'sm' | 'lg' }) {
  const color = { default: 'text-slate-900', success: 'text-emerald-700', danger: 'text-red-600', muted: 'text-slate-400' }[tone];
  const parts = CURRENCIES.filter((c) => value[c]);
  const lines = parts.length ? parts : (['RUB'] as Currency[]);
  return (
    <span className="inline-flex flex-col whitespace-nowrap leading-tight">
      {lines.map((c) => (
        <span key={c} className={`font-semibold tabular-nums ${parts.length ? color : 'text-slate-400'} ${size === 'lg' ? 'text-[24px] tracking-tight' : 'text-[13.5px]'}`}>
          {formatMoney(value[c], c)}
        </span>
      ))}
    </span>
  );
}

/** Bitta valyutadagi summa. */
export function Amount({ value, currency, tone = 'default' }: { value: number; currency: Currency; tone?: 'default' | 'success' | 'danger' | 'muted' }) {
  const color = { default: 'text-slate-900', success: 'text-emerald-700', danger: 'text-red-600', muted: 'text-slate-400' }[tone];
  return <span className={`whitespace-nowrap font-semibold tabular-nums ${color}`}>{formatMoney(value, currency)}</span>;
}

const AVATAR_COLORS = ['#2563EB', '#16A34A', '#7C3AED', '#EA580C', '#DB2777', '#0891B2', '#CA8A04', '#4F46E5'];

/** Operator — ism bosh harfi; Rahmat — robot; qo'lda — admin belgisi. */
export function ChannelBadge({ source, operatorId, name, compact = false }: { source: SaleSource; operatorId: number | null; name: string; compact?: boolean }) {
  const background = source === 'operator' ? AVATAR_COLORS[(operatorId ?? 0) % AVATAR_COLORS.length] : source === 'rahmat' ? '#0F766E' : '#64748B';
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background }} aria-hidden="true">
        {source === 'operator' ? name.trim().charAt(0).toUpperCase() || '?' : source === 'rahmat' ? <Bot className="h-3.5 w-3.5" /> : <UserCog className="h-3.5 w-3.5" />}
      </span>
      {!compact && <span className="truncate whitespace-nowrap text-[13.5px] text-slate-800">{name}</span>}
    </span>
  );
}

export function StatusBadge({ sale }: { sale: Pick<AnalyticsSale, 'paid' | 'debt'> }) {
  const status = saleStatus(sale);
  const style = {
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    partial: 'bg-amber-50 text-amber-700 ring-amber-200',
    checking: 'bg-slate-100 text-slate-600 ring-slate-200',
  }[status];
  const label = { paid: 'Оплачено', partial: 'Частично', checking: 'Чек на проверке' }[status];
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

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <p className="text-[14px] font-semibold text-slate-700">{title}</p>
      {hint && <p className="max-w-sm text-[13px] text-slate-500">{hint}</p>}
    </div>
  );
}

export const secondaryButton =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[14px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60';
