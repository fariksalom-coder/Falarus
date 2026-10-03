import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, HandCoins, PieChart, Plus, ReceiptText, Users, Wallet } from 'lucide-react';
import { salesLedgerApi } from '../../api/salesLedger';
import {
  SALES_LEDGER_TARIFFS,
  addDays,
  daysBetween,
  saleStatus,
  salesLedgerTariff,
  summarizeSalesDay,
  tashkentToday,
  type SalesLedgerDay,
  type SalesLedgerOperator,
  type SalesLedgerSale,
} from '../../../shared/salesLedger';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Card,
  ConfirmDelete,
  EmptyState,
  MoneyStack,
  OperatorBadge,
  StatusBadge,
  formatAmount,
  formatDayLong,
  formatDayShort,
  primaryButton,
  rub,
  secondaryButton,
  uzs,
} from '../../components/admin/salesLedger/ui';
import { OperatorsModal, PaymentModal, SaleModal } from '../../components/admin/salesLedger/modals';

const TARIFF_TONES: Record<string, { head: string; cell: string; bar: string }> = {
  month: { head: 'bg-blue-50 text-blue-800', cell: 'bg-blue-50/40', bar: '#2563EB' },
  three_month: { head: 'bg-emerald-50 text-emerald-800', cell: 'bg-emerald-50/40', bar: '#16A34A' },
  six_month: { head: 'bg-violet-50 text-violet-800', cell: 'bg-violet-50/40', bar: '#7C3AED' },
};

function dueLabel(dueDate: string | null, today: string): { text: string; overdue: boolean } {
  if (!dueDate) return { text: 'Срок не указан', overdue: false };
  const days = daysBetween(today, dueDate);
  if (days === 0) return { text: 'Сегодня', overdue: false };
  if (days > 0) return { text: `через ${days} дн. · ${formatDayShort(dueDate)}`, overdue: false };
  return { text: `просрочено ${-days} дн.`, overdue: true };
}

function Kpi({ label, value, hint, tone, icon }: { label: string; value: ReactNode; hint?: ReactNode; tone: string; icon: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-500">
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${tone}`}>{icon}</span>
        {label}
      </div>
      <div>{value}</div>
      {hint && <div className="text-[12px] leading-snug text-slate-500">{hint}</div>}
    </div>
  );
}

function SalesTable({
  sales,
  operators,
  today,
  onEdit,
  onPay,
  onDelete,
  busy,
}: {
  sales: SalesLedgerSale[];
  operators: SalesLedgerOperator[];
  today: string;
  onEdit: (sale: SalesLedgerSale) => void;
  onPay: (sale: SalesLedgerSale) => void;
  onDelete: (sale: SalesLedgerSale) => void;
  busy: boolean;
}) {
  const autoIds = new Set(operators.filter((o) => o.is_auto).map((o) => o.id));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] border-collapse text-left text-[13.5px] [&_th]:whitespace-nowrap">
        <thead>
          <tr className="border-b border-slate-200 text-[12px] font-semibold text-slate-500">
            <th className="w-10 px-4 py-2.5">№</th>
            <th className="px-3 py-2.5">Клиент</th>
            <th className="px-3 py-2.5">Оператор</th>
            {SALES_LEDGER_TARIFFS.map((t) => (
              <th key={t.code} className={`px-3 py-2 ${TARIFF_TONES[t.code].head}`}>
                <span className="block font-bold">{t.label}</span>
                <span className="block text-[11px] font-medium opacity-80">{rub(t.priceRub)} ({formatAmount(t.priceUzs)})</span>
              </th>
            ))}
            <th className="px-3 py-2.5">Оплачено</th>
            <th className="px-3 py-2.5">Статус</th>
            <th className="px-3 py-2.5">Долг / доплата</th>
            <th className="bg-white px-3 py-2.5 sm:sticky sm:right-0" aria-label="Действия" />
          </tr>
        </thead>
        <tbody>
          {sales.map((sale, index) => {
            const status = saleStatus(sale);
            const due = dueLabel(sale.due_date, today);
            return (
              <tr key={sale.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                <td className="px-3 py-3">
                  <span className="block whitespace-nowrap font-semibold text-slate-900">{sale.client_name}</span>
                  <span className="block whitespace-nowrap text-[12px] text-slate-500">{sale.phone || '—'}</span>
                </td>
                <td className="px-3 py-3">
                  <OperatorBadge operator={{ id: sale.operator_id, name: sale.operator_name, is_auto: autoIds.has(sale.operator_id) }} />
                </td>
                {SALES_LEDGER_TARIFFS.map((t) => (
                  <td key={t.code} className={`px-3 py-3 ${TARIFF_TONES[t.code].cell}`}>
                    {sale.tariff === t.code ? (
                      <span className="flex items-center gap-2.5">
                        <span className="grid h-7 min-w-7 place-items-center rounded-lg bg-white px-1.5 text-[13px] font-bold text-slate-900 ring-1 ring-slate-200">{sale.quantity}</span>
                        <MoneyStack value={{ rub: sale.price_rub, uzs: sale.price_uzs }} />
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                ))}
                <td className="px-3 py-3">
                  <MoneyStack value={{ rub: sale.paid_rub, uzs: sale.paid_uzs }} tone={sale.paid_rub > 0 ? 'default' : 'muted'} />
                </td>
                <td className="px-3 py-3"><StatusBadge sale={sale} /></td>
                <td className="min-w-[170px] max-w-[220px] px-3 py-3 text-[12.5px]">
                  {status === 'paid' ? (
                    <span className="text-slate-600">{sale.note || 'Полная оплата'}</span>
                  ) : (
                    <>
                      <span className="block whitespace-nowrap font-semibold text-red-600">Осталось {rub(sale.debt_rub)}</span>
                      <span className={`block ${due.overdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{due.text}</span>
                      {sale.note && <span className="block truncate text-slate-400">{sale.note}</span>}
                    </>
                  )}
                </td>
                <td className="bg-white px-3 py-3 sm:sticky sm:right-0 sm:shadow-[-12px_0_16px_-14px_rgba(15,23,42,0.25)]">
                  <div className="flex items-center justify-end gap-1">
                    {status !== 'paid' && (
                      <button type="button" onClick={() => onPay(sale)} className="min-h-[36px] rounded-lg bg-emerald-50 px-2.5 text-[12.5px] font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.97]">
                        Оплата
                      </button>
                    )}
                    <button type="button" onClick={() => onEdit(sale)} className="min-h-[36px] rounded-lg px-2.5 text-[12.5px] font-semibold text-blue-700 transition hover:bg-blue-50 active:scale-[0.97]">
                      Изменить
                    </button>
                    <ConfirmDelete disabled={busy} onConfirm={() => onDelete(sale)} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Загрузка">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[118px] rounded-[20px]" />)}
      </div>
      <Skeleton className="h-[320px] rounded-[20px]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[240px] rounded-[20px]" />
        <Skeleton className="h-[240px] rounded-[20px]" />
      </div>
    </div>
  );
}

export default function AdminSalesLedgerPage() {
  const today = tashkentToday();
  const [date, setDate] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('date');
    return fromUrl && /^\d{4}-\d{2}-\d{2}$/.test(fromUrl) ? fromUrl : today;
  });
  const [day, setDay] = useState<SalesLedgerDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saleModal, setSaleModal] = useState<{ sale: SalesLedgerSale | null } | null>(null);
  const [paying, setPaying] = useState<SalesLedgerSale | null>(null);
  const [operatorsOpen, setOperatorsOpen] = useState(false);

  const latestDate = useRef(date);
  const load = useCallback(async (target: string, quiet = false) => {
    latestDate.current = target;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const next = await salesLedgerApi.day(target);
      // Tez sana almashtirilsa eski javob yangisini bosib ketmasin.
      if (latestDate.current === target) setDay(next);
    } catch (e) {
      if (latestDate.current === target) setError(e instanceof Error ? e.message : 'Не удалось загрузить данные.');
    } finally {
      if (latestDate.current === target) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(date);
    const url = new URL(window.location.href);
    if (date === today) url.searchParams.delete('date');
    else url.searchParams.set('date', date);
    window.history.replaceState(window.history.state, '', url);
  }, [date, load, today]);

  const reload = () => load(date, true);
  const summary = useMemo(() => (day && day.date === date ? summarizeSalesDay(day) : null), [day, date]);
  const visibleDay = day && day.date === date ? day : null;

  const runAction = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setActionError('');
    try {
      await action();
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Не удалось выполнить действие.');
    } finally {
      setBusy(false);
    }
  };

  const maxOperatorReceived = Math.max(1, ...(summary?.perOperator.map((s) => s.received.rub) ?? [0]));

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 pb-10 text-slate-900">
      <header className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0b2445] via-[#123a72] to-[#1d4ed8] px-5 py-5 text-white shadow-[0_18px_44px_rgba(37,99,235,0.22)] sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">Аналитика продаж</h1>
            <p className="mt-1 text-[13.5px] text-blue-100/90">Продажи операторов · предоплаты и долги · поступления за день</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-2xl bg-white/10 p-1 ring-1 ring-white/15">
              <button type="button" aria-label="Предыдущий день" onClick={() => setDate(addDays(date, -1))} className="grid h-11 w-11 place-items-center rounded-xl transition hover:bg-white/15 active:scale-95">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <label className="relative flex h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-[14px] font-semibold transition hover:bg-white/10">
                <CalendarDays className="h-4 w-4 opacity-80" />
                {formatDayLong(date)}
                <input
                  type="date"
                  value={date}
                  max={addDays(today, 365)}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Выбрать дату"
                />
              </label>
              <button type="button" aria-label="Следующий день" onClick={() => setDate(addDays(date, 1))} className="grid h-11 w-11 place-items-center rounded-xl transition hover:bg-white/15 active:scale-95">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            {date !== today && (
              <button type="button" onClick={() => setDate(today)} className="min-h-[44px] rounded-2xl bg-white/10 px-4 text-[13.5px] font-semibold ring-1 ring-white/15 transition hover:bg-white/20 active:scale-[0.98]">
                Сегодня
              </button>
            )}
            <button
              type="button"
              disabled={!visibleDay}
              onClick={() => setSaleModal({ sale: null })}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-white px-4 text-[14px] font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-[0.98] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> Добавить продажу
            </button>
          </div>
        </div>
      </header>

      {actionError && (
        <div role="alert" className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {actionError}
        </div>
      )}

      {error && !visibleDay ? (
        <div className="flex flex-col items-center gap-3 rounded-[20px] border border-red-100 bg-white px-6 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-[15px] font-semibold text-slate-800">{error}</p>
          <p className="max-w-md text-[13px] text-slate-500">Если раздел открыт впервые — на сервере нужно применить миграцию 199_sales_ledger.sql.</p>
          <button type="button" className={secondaryButton} onClick={() => void load(date)}>Повторить</button>
        </div>
      ) : loading && !visibleDay ? (
        <LoadingState />
      ) : visibleDay && summary ? (
        <motion.div key={date} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Поступило за день"
              tone="bg-emerald-50 text-emerald-600"
              icon={<Wallet className="h-4 w-4" />}
              value={<MoneyStack value={summary.received} tone="success" size="lg" />}
              hint={<>Новые продажи: <b className="text-slate-700">{rub(summary.receivedFromNewSales.rub)}</b> · Долги: <b className="text-slate-700">{rub(summary.collectedDebt.rub)}</b></>}
            />
            <Kpi
              label="Продаж за день"
              tone="bg-blue-50 text-blue-600"
              icon={<ReceiptText className="h-4 w-4" />}
              value={<span className="text-[26px] font-semibold tracking-tight tabular-nums">{summary.salesCount}<span className="ml-2 text-[13px] font-medium text-slate-500">({summary.units} курс.)</span></span>}
              hint={<>Полностью {summary.paidCount} · частично {summary.partialCount} · без оплаты {summary.waitingCount}</>}
            />
            <Kpi
              label="Стоимость продаж"
              tone="bg-violet-50 text-violet-600"
              icon={<PieChart className="h-4 w-4" />}
              value={<MoneyStack value={summary.sold} size="lg" />}
              hint={summary.newDebt.rub > 0 ? <>Из них в долг: <b className="text-amber-700">{rub(summary.newDebt.rub)}</b></> : 'Всё оплачено сразу'}
            />
            <Kpi
              label="Открытые долги"
              tone="bg-amber-50 text-amber-600"
              icon={<HandCoins className="h-4 w-4" />}
              value={<MoneyStack value={summary.openDebt} tone={summary.openDebt.rub > 0 ? 'danger' : 'muted'} size="lg" />}
              hint={`${summary.openDebtCount} клиент(ов) ожидают доплаты`}
            />
          </div>

          <Card
            title={<>Продажи — {formatDayLong(date)}</>}
            icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
            action={<span className="text-[12.5px] text-slate-500">{summary.salesCount ? `${summary.salesCount} запис.` : ''}</span>}
          >
            {visibleDay.sales.length ? (
              <SalesTable
                sales={visibleDay.sales}
                operators={visibleDay.operators}
                today={today}
                busy={busy}
                onEdit={(sale) => setSaleModal({ sale })}
                onPay={setPaying}
                onDelete={(sale) => void runAction(() => salesLedgerApi.deleteSale(sale.id))}
              />
            ) : (
              <EmptyState
                title="За этот день продаж нет"
                hint="Добавьте продажу: полная оплата или предоплата с датой доплаты."
                action={<button type="button" className={primaryButton} onClick={() => setSaleModal({ sale: null })}><Plus className="h-4 w-4" /> Добавить продажу</button>}
              />
            )}
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Card
              title="По операторам"
              icon={<Users className="h-5 w-5 text-blue-600" />}
              action={<button type="button" className={`${secondaryButton} min-h-[36px] rounded-xl px-3 text-[12.5px]`} onClick={() => setOperatorsOpen(true)}>Операторы</button>}
            >
              {summary.perOperator.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-[13px] [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 text-[12px] font-semibold text-slate-500">
                        <th className="px-4 py-2.5">Оператор</th>
                        <th className="px-3 py-2.5 text-right">Продаж</th>
                        <th className="px-3 py-2.5 text-right">Сумма продаж</th>
                        <th className="px-3 py-2.5">Поступило сегодня</th>
                        <th className="px-3 py-2.5 text-right">Собрано долгов</th>
                        <th className="px-3 py-2.5 text-right">Открытый долг</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.perOperator.map((s) => (
                        <tr key={s.operator.id} className={`border-b border-slate-100 last:border-0 ${s.operator.active ? '' : 'opacity-60'}`}>
                          <td className="px-4 py-2.5"><OperatorBadge operator={s.operator} /></td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{s.salesCount}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{s.sold.rub ? rub(s.sold.rub) : '—'}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(s.received.rub / maxOperatorReceived) * 100}%` }} />
                              </div>
                              <span className="font-semibold tabular-nums text-emerald-700">{rub(s.received.rub)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{s.collectedDebt.rub ? rub(s.collectedDebt.rub) : '—'}</td>
                          <td className={`px-3 py-2.5 text-right tabular-nums ${s.openDebt.rub ? 'font-semibold text-red-600' : 'text-slate-400'}`}>{s.openDebt.rub ? rub(s.openDebt.rub) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50/70 font-bold">
                        <td className="px-4 py-2.5">Итого</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{summary.salesCount}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{rub(summary.sold.rub)}</td>
                        <td className="px-3 py-2.5 tabular-nums text-emerald-700">{rub(summary.received.rub)} <span className="font-medium text-slate-500">({uzs(summary.received.uzs)})</span></td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{rub(summary.collectedDebt.rub)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-red-600">{rub(summary.openDebt.rub)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <EmptyState title="Операторов пока нет" action={<button type="button" className={primaryButton} onClick={() => setOperatorsOpen(true)}>Добавить оператора</button>} />
              )}
            </Card>

            <Card title="Продажи по тарифам" icon={<PieChart className="h-5 w-5 text-blue-600" />}>
              <ul className="flex flex-col gap-3 p-4 sm:p-5">
                {SALES_LEDGER_TARIFFS.map((t) => {
                  const count = summary.byTariff[t.code];
                  const share = summary.units ? Math.round((count / summary.units) * 100) : 0;
                  return (
                    <li key={t.code} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="font-semibold text-slate-800">{t.label} <span className="font-normal text-slate-400">· {rub(t.priceRub)} / {formatAmount(t.priceUzs)} сум</span></span>
                        <span className="tabular-nums text-slate-600"><b className="text-slate-900">{count}</b> ({share}%)</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <motion.div className="h-full rounded-full" style={{ background: TARIFF_TONES[t.code].bar }} initial={{ width: 0 }} animate={{ width: `${share}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card
              title="Долги — ожидают оплату"
              icon={<HandCoins className="h-5 w-5 text-amber-600" />}
              action={summary.openDebtCount ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[12px] font-bold text-white">{summary.openDebtCount}</span> : null}
            >
              {visibleDay.debts.length ? (
                <ul className="divide-y divide-slate-100">
                  {visibleDay.debts.map((sale) => {
                    const due = dueLabel(sale.due_date, today);
                    return (
                      <li key={sale.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                        <div className="min-w-[180px] flex-1">
                          <p className="font-semibold text-slate-900">{sale.client_name}</p>
                          <p className="text-[12px] text-slate-500">
                            {salesLedgerTariff(sale.tariff).label} · {sale.operator_name} · продажа {formatDayShort(sale.sale_date)}
                            {sale.phone ? ` · ${sale.phone}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <MoneyStack value={{ rub: sale.debt_rub, uzs: Math.max(0, sale.debt_uzs) }} tone="danger" />
                          <p className={`text-[11.5px] ${due.overdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{due.text}</p>
                        </div>
                        <button type="button" onClick={() => setPaying(sale)} className="min-h-[40px] rounded-xl bg-emerald-600 px-3 text-[13px] font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.97]">
                          Принять оплату
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState title="Долгов нет" hint="Все продажи до этой даты оплачены полностью." />
              )}
            </Card>

            <Card
              title="Поступления за день"
              icon={<Wallet className="h-5 w-5 text-emerald-600" />}
              action={visibleDay.payments.length ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[12px] font-bold text-emerald-700">+{visibleDay.payments.length}</span> : null}
            >
              {visibleDay.payments.length ? (
                <>
                  <ul className="divide-y divide-slate-100">
                    {visibleDay.payments.map((p) => {
                      const isDebt = p.sale_date < date;
                      return (
                        <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 sm:px-5">
                          <div className="min-w-[180px] flex-1">
                            <p className="font-semibold text-slate-900">{p.client_name}</p>
                            <p className="text-[12px] text-slate-500">
                              {salesLedgerTariff(p.tariff).label} · {p.operator_name}
                              {p.note ? ` · ${p.note}` : ''}
                            </p>
                          </div>
                          <span className={`rounded-lg px-2 py-1 text-[11.5px] font-semibold ${isDebt ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                            {isDebt ? `Долг от ${formatDayShort(p.sale_date)}` : 'Новая продажа'}
                          </span>
                          <MoneyStack value={{ rub: p.amount_rub, uzs: p.amount_uzs }} tone="success" />
                          <ConfirmDelete disabled={busy} onConfirm={() => void runAction(() => salesLedgerApi.deletePayment(p.id))} />
                        </li>
                      );
                    })}
                  </ul>
                  <div className="m-4 mt-1 rounded-2xl bg-emerald-50 px-4 py-3 text-[13.5px] text-emerald-900 ring-1 ring-emerald-100 sm:mx-5">
                    <p className="font-bold">Всего поступлений: {rub(summary.received.rub)} ({uzs(summary.received.uzs)})</p>
                    <p className="text-[12.5px] text-emerald-800/80">
                      Новые продажи {rub(summary.receivedFromNewSales.rub)} · погашено долгов {rub(summary.collectedDebt.rub)} ({uzs(summary.collectedDebt.uzs)})
                    </p>
                  </div>
                </>
              ) : (
                <EmptyState title="Поступлений нет" hint="Здесь появятся оплаты новых продаж и погашения старых долгов за этот день." />
              )}
            </Card>
          </div>
        </motion.div>
      ) : null}

      {visibleDay && (
        <>
          <SaleModal
            open={saleModal !== null}
            date={date}
            operators={visibleDay.operators}
            sale={saleModal?.sale ?? null}
            onClose={() => setSaleModal(null)}
            onSaved={() => {
              setSaleModal(null);
              void reload();
            }}
          />
          <PaymentModal
            sale={paying}
            date={date}
            onClose={() => setPaying(null)}
            onSaved={() => {
              setPaying(null);
              void reload();
            }}
          />
          <OperatorsModal open={operatorsOpen} operators={visibleDay.operators} onClose={() => setOperatorsOpen(false)} onChanged={() => void reload()} />
        </>
      )}
    </div>
  );
}
