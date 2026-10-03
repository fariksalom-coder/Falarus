import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, CalendarDays, ChartColumnIncreasing, ChevronLeft, ChevronRight, Clock3, HandCoins, PieChart, ReceiptText, RefreshCw, Users, Wallet } from 'lucide-react';
import { salesLedgerApi } from '../../api/salesLedger';
import { adminPath } from '../../constants/adminPath';
import {
  CURRENCIES,
  MAIN_TARIFFS,
  SOURCE_LABELS,
  addDays,
  daysBetween,
  moneyInUzs,
  zeroMoney,
  saleStatus,
  summarizeAnalyticsDay,
  tariffLabel,
  tashkentDate,
  tashkentToday,
  type AnalyticsDay,
  type AnalyticsSale,
  type Money,
  type SaleSource,
} from '../../../shared/salesLedger';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Amount,
  Card,
  ChannelBadge,
  EmptyState,
  MoneyStack,
  StatusBadge,
  formatAmount,
  formatDayLong,
  formatDayShort,
  formatMoney,
  formatTime,
  isEmptyMoney,
  secondaryButton,
  TARIFF_COLORS,
  channelColor,
} from '../../components/admin/salesLedger/ui';
import { Donut } from '../../components/admin/salesLedger/Donut';

const TARIFF_TONES: Record<string, { head: string; cell: string }> = {
  month: { head: 'bg-blue-50 text-blue-800', cell: 'bg-blue-50/40' },
  three_month: { head: 'bg-emerald-50 text-emerald-800', cell: 'bg-emerald-50/40' },
  six_month: { head: 'bg-violet-50 text-violet-800', cell: 'bg-violet-50/40' },
  year: { head: 'bg-amber-50 text-amber-800', cell: 'bg-amber-50/40' },
  none: { head: 'bg-slate-50 text-slate-700', cell: 'bg-slate-50/40' },
};
const tone = (code: string | null) => TARIFF_TONES[code ?? 'none'] ?? TARIFF_TONES.none;

function dueLabel(dueAt: string | null, today: string): { text: string; overdue: boolean } {
  if (!dueAt) return { text: 'Срок не указан', overdue: false };
  const days = daysBetween(today, tashkentDate(dueAt));
  if (days === 0) return { text: 'Доплата сегодня', overdue: false };
  if (days > 0) return { text: `через ${days} дн. · ${formatDayShort(tashkentDate(dueAt))}`, overdue: false };
  return { text: `просрочено ${-days} дн.`, overdue: true };
}

const channelName = (sale: Pick<AnalyticsSale, 'source' | 'operator_name'>) =>
  sale.source === 'operator' ? sale.operator_name : SOURCE_LABELS[sale.source];

/** Halqa markazi uchun qisqa yozuv: «3,82 млн» + birligi alohida. */
function compactUzs(value: number): { value: string; unit: string } {
  if (value >= 1_000_000) return { value: (value / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 2 }), unit: 'млн сум' };
  if (value >= 1_000) return { value: String(Math.round(value / 1_000)), unit: 'тыс. сум' };
  return { value: String(Math.round(value)), unit: 'сум' };
}

/** Ko'p valyutali summa bir qatorda: «12 000 ₽ + 1 590 000 сум». */
function MoneyInline({ value }: { value: Money }) {
  const parts = CURRENCIES.filter((c) => value[c]).map((c) => formatMoney(value[c], c));
  return <span className="whitespace-nowrap tabular-nums">{parts.length ? parts.join(' + ') : '0'}</span>;
}

/** Jadval katagi: bo'sh bo'lsa «—». */
function MoneyCell({ value, tone: toneName }: { value: Money; tone?: 'success' | 'danger' }) {
  if (isEmptyMoney(value)) return <span className="text-slate-300">—</span>;
  return <MoneyStack value={value} tone={toneName ?? 'default'} />;
}

function ClientCell({ userId, name, sub }: { userId: number; name: string; sub?: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-col">
      <Link to={adminPath(`/users/${userId}`)} className="truncate whitespace-nowrap font-semibold text-slate-900 underline-offset-2 hover:text-blue-700 hover:underline">
        {name}
      </Link>
      {sub && <span className="truncate whitespace-nowrap text-[12px] text-slate-500">{sub}</span>}
    </span>
  );
}

function Kpi({ label, value, hint, toneClass, icon }: { label: string; value: ReactNode; hint?: ReactNode; toneClass: string; icon: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-500">
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${toneClass}`}>{icon}</span>
        {label}
      </div>
      <div>{value}</div>
      {hint && <div className="text-[12px] leading-snug text-slate-500">{hint}</div>}
    </div>
  );
}

type ColorOf = (source: SaleSource, operatorId: number | null) => string;

function SalesTable({ sales, tariffs, today, colorOf }: { sales: AnalyticsSale[]; tariffs: string[]; today: string; colorOf: ColorOf }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] border-collapse text-left text-[13.5px] [&_th]:whitespace-nowrap">
        <thead>
          <tr className="border-b border-slate-200 text-[12px] font-semibold text-slate-500">
            <th className="w-10 px-4 py-2.5">№</th>
            <th className="px-3 py-2.5">Клиент</th>
            <th className="px-3 py-2.5">Оператор / канал</th>
            {tariffs.map((code) => {
              const plan = MAIN_TARIFFS.find((t) => t.code === code);
              return (
                <th key={code} className={`px-3 py-2 ${tone(code).head}`}>
                  <span className="block font-bold">{tariffLabel(code === 'none' ? null : code)}</span>
                  {plan && <span className="block text-[11px] font-medium opacity-80">{formatMoney(plan.priceRub ?? 0, 'RUB')} · {formatAmount(plan.priceUzs ?? 0)} сум</span>}
                </th>
              );
            })}
            <th className="px-3 py-2.5">Оплачено</th>
            <th className="px-3 py-2.5">Статус</th>
            <th className="px-3 py-2.5">Долг / доплата</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale, index) => {
            const status = saleStatus(sale);
            const due = dueLabel(sale.due_at, today);
            return (
              <tr key={sale.key} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                <td className="max-w-[230px] px-3 py-3">
                  <ClientCell userId={sale.user_id} name={sale.client_name} sub={[sale.phone, formatTime(sale.sale_at)].filter(Boolean).join(' · ')} />
                </td>
                <td className="px-3 py-3">
                  <ChannelBadge source={sale.source} color={colorOf(sale.source, sale.operator_id)} name={channelName(sale)} />
                  {sale.lead_source && <span className="mt-0.5 block pl-8 text-[11.5px] text-slate-400">{sale.lead_source}</span>}
                </td>
                {tariffs.map((code) => (
                  <td key={code} className={`px-3 py-3 ${tone(code).cell}`}>
                    {(sale.tariff ?? 'none') === code ? <Amount value={sale.total} currency={sale.currency} /> : <span className="text-slate-300">—</span>}
                  </td>
                ))}
                <td className="px-3 py-3">
                  <span className="flex flex-col">
                    <Amount value={sale.paid} currency={sale.currency} tone={sale.paid > 0 ? 'default' : 'muted'} />
                    {sale.pending > 0 && <span className="whitespace-nowrap text-[11.5px] text-slate-500">+ {formatMoney(sale.pending, sale.currency)} на проверке</span>}
                  </span>
                </td>
                <td className="px-3 py-3"><StatusBadge sale={sale} /></td>
                <td className="min-w-[170px] px-3 py-3 text-[12.5px]">
                  {status === 'paid' ? (
                    <span className="text-slate-500">Полная оплата</span>
                  ) : (
                    <>
                      <span className="block whitespace-nowrap font-semibold text-red-600">Осталось {formatMoney(sale.debt, sale.currency)}</span>
                      <span className={`block whitespace-nowrap ${due.overdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{due.text}</span>
                    </>
                  )}
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[126px] rounded-[20px]" />)}
      </div>
      <Skeleton className="h-[320px] rounded-[20px]" />
      <div className="grid gap-4 xl:grid-cols-2">
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
  const [day, setDay] = useState<AnalyticsDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const visibleDay = day && day.date === date ? day : null;
  const summary = useMemo(() => (visibleDay ? summarizeAnalyticsDay(visibleDay) : null), [visibleDay]);

  // Asosiy uchta tarif doim; «1 год» va tarifsizlari faqat shu kuni uchrasa.
  const tariffColumns = useMemo(() => {
    const extra = Object.keys(summary?.byTariff ?? {}).filter(
      (code) => !MAIN_TARIFFS.some((t) => t.code === code) && (summary?.byTariff[code] ?? 0) > 0,
    );
    return [...MAIN_TARIFFS.map((t) => t.code), ...extra];
  }, [summary]);

  const colorOf = useCallback<ColorOf>(
    (source, operatorId) => channelColor(source, operatorId, (visibleDay?.operators ?? []).map((o) => o.id)),
    [visibleDay],
  );

  const compactReceived = compactUzs(summary ? moneyInUzs(summary.received, visibleDay?.rub_uzs_rate ?? null) : 0);

  const soldByTariff = useMemo(() => {
    const map = new Map<string, Money>();
    for (const sale of visibleDay?.sales ?? []) {
      const key = sale.tariff ?? 'none';
      const money = map.get(key) ?? zeroMoney();
      money[sale.currency] += sale.total;
      map.set(key, money);
    }
    return map;
  }, [visibleDay]);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 pb-10 text-slate-900">
      <header className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0b2445] via-[#123a72] to-[#1d4ed8] px-5 py-5 text-white shadow-[0_18px_44px_rgba(37,99,235,0.22)] sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">Аналитика продаж</h1>
            <p className="mt-1 text-[13.5px] text-blue-100/90">Операторы (бот) · автоплатежи Rahmat · оплаты через админа — курс русского языка</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-2xl bg-white/10 p-1 ring-1 ring-white/15">
              <button type="button" aria-label="Предыдущий день" onClick={() => setDate(addDays(date, -1))} className="grid h-11 w-11 place-items-center rounded-xl transition hover:bg-white/15 active:scale-95">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <label className="relative flex h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-[14px] font-semibold transition hover:bg-white/10">
                <CalendarDays className="h-4 w-4 opacity-80" />
                {formatDayLong(date)}
                <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Выбрать дату" />
              </label>
              <button type="button" aria-label="Следующий день" disabled={date >= today} onClick={() => setDate(addDays(date, 1))} className="grid h-11 w-11 place-items-center rounded-xl transition hover:bg-white/15 active:scale-95 disabled:opacity-40">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            {date !== today && (
              <button type="button" onClick={() => setDate(today)} className="min-h-[44px] rounded-2xl bg-white/10 px-4 text-[13.5px] font-semibold ring-1 ring-white/15 transition hover:bg-white/20 active:scale-[0.98]">
                Сегодня
              </button>
            )}
            <button type="button" aria-label="Обновить" onClick={() => void load(date, true)} className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95">
              <RefreshCw className={`h-4 w-4 ${loading && visibleDay ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {error && !visibleDay ? (
        <div className="flex flex-col items-center gap-3 rounded-[20px] border border-red-100 bg-white px-6 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-[15px] font-semibold text-slate-800">{error}</p>
          <button type="button" className={secondaryButton} onClick={() => void load(date)}>Повторить</button>
        </div>
      ) : loading && !visibleDay ? (
        <LoadingState />
      ) : visibleDay && summary ? (
        <motion.div key={date} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="flex flex-col gap-4">
          {summary.pendingReviewCount > 0 && (
            <Link to={adminPath('/operators')} className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-100">
              <Clock3 className="h-4 w-4 shrink-0" />
              <b>{summary.pendingReviewCount} чек(ов) операторов ждут проверки</b>
              <span className="text-amber-800/80">— в поступления не включены, пока админ не подтвердит. Открыть «Operatorlar va cheklar» →</span>
            </Link>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Поступило за день"
              toneClass="bg-emerald-50 text-emerald-600"
              icon={<Wallet className="h-4 w-4" />}
              value={<MoneyStack value={summary.received} tone="success" size="lg" />}
              hint={<>Из них погашение долгов: <b className="text-slate-700"><MoneyInline value={summary.collectedDebt} /></b></>}
            />
            <Kpi
              label="Продаж за день"
              toneClass="bg-blue-50 text-blue-600"
              icon={<ReceiptText className="h-4 w-4" />}
              value={<span className="text-[26px] font-semibold tracking-tight tabular-nums">{summary.salesCount}</span>}
              hint={<>Полностью {summary.paidCount} · частично {summary.partialCount} · чек на проверке {summary.checkingCount}</>}
            />
            <Kpi
              label="Стоимость продаж"
              toneClass="bg-violet-50 text-violet-600"
              icon={<PieChart className="h-4 w-4" />}
              value={<MoneyStack value={summary.sold} size="lg" />}
              hint={isEmptyMoney(summary.newDebt) ? 'Без новых долгов' : <>Из них в долг: <b className="text-amber-700"><MoneyInline value={summary.newDebt} /></b></>}
            />
            <Kpi
              label="Открытые долги"
              toneClass="bg-amber-50 text-amber-600"
              icon={<HandCoins className="h-4 w-4" />}
              value={<MoneyStack value={summary.openDebt} tone={isEmptyMoney(summary.openDebt) ? 'muted' : 'danger'} size="lg" />}
              hint={<>{summary.openDebtCount} клиент(ов){isEmptyMoney(summary.overdueDebt) ? '' : <> · просрочено <b className="text-red-600"><MoneyInline value={summary.overdueDebt} /></b></>}</>}
            />
          </div>

          <Card
            title={<>Продажи — {formatDayLong(date)}</>}
            icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
            action={<span className="text-[12.5px] text-slate-500">{summary.salesCount ? `${summary.salesCount} продаж` : ''}</span>}
          >
            {visibleDay.sales.length ? (
              <SalesTable sales={visibleDay.sales} tariffs={tariffColumns} today={today} colorOf={colorOf} />
            ) : (
              <EmptyState title="За этот день продаж нет" hint="Здесь появятся продажи операторов из бота, автоплатежи Rahmat и оплаты, подтверждённые админом." />
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Продажи по тарифам" icon={<ChartColumnIncreasing className="h-5 w-5 text-blue-600" />}>
              <Donut
                ariaLabel="Доля продаж по тарифам"
                centerValue={summary.salesCount}
                centerLabel="продаж"
                emptyText="За этот день продаж нет."
                segments={tariffColumns.map((code) => {
                  const sold = soldByTariff.get(code);
                  return {
                    key: code,
                    label: tariffLabel(code === 'none' ? null : code),
                    value: summary.byTariff[code] ?? 0,
                    color: TARIFF_COLORS[code] ?? TARIFF_COLORS.none,
                    detail: <>{summary.byTariff[code] ?? 0} шт.{sold ? <> · <MoneyInline value={sold} /></> : null}</>,
                  };
                })}
              />
            </Card>

            <Card title="Доля в обороте по каналам" icon={<ChartColumnIncreasing className="h-5 w-5 text-blue-600" />}>
              <Donut
                ariaLabel="Доля операторов и каналов в поступлениях за день"
                centerValue={compactReceived.value}
                centerLabel={`${summary.received.RUB > 0 ? '≈ ' : ''}${compactReceived.unit}`}
                emptyText="Поступлений за этот день нет."
                segments={summary.channels.map((c) => ({
                  key: c.key,
                  label: c.label,
                  value: moneyInUzs(c.received, visibleDay.rub_uzs_rate),
                  color: colorOf(c.source, c.operatorId),
                  detail: <MoneyInline value={c.received} />,
                }))}
              />
              <p className="border-t border-slate-100 px-4 py-2.5 text-[11.5px] leading-snug text-slate-500 sm:px-5">
                Доля считается по поступлениям за день.{' '}
                {summary.received.RUB > 0 && visibleDay.rub_uzs_rate
                  ? `Рубли пересчитаны в сумы по курсу ЦБ: 1 ₽ = ${visibleDay.rub_uzs_rate.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} сум.`
                  : summary.received.RUB > 0
                    ? 'Курс ЦБ недоступен — рублёвые поступления в долю не вошли.'
                    : ''}
                {summary.received.USD > 0 ? ' Поступления в $ в долю не входят.' : ''}
              </p>
            </Card>
          </div>

          <Card title="По операторам и каналам" icon={<Users className="h-5 w-5 text-blue-600" />}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[13px] [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 text-[12px] font-semibold text-slate-500">
                    <th className="px-4 py-2.5">Оператор / канал</th>
                    <th className="px-3 py-2.5 text-right">Продаж</th>
                    <th className="px-3 py-2.5 text-right">Сумма продаж</th>
                    <th className="px-3 py-2.5 text-right">Поступило</th>
                    <th className="px-3 py-2.5 text-right">Собрано долгов</th>
                    <th className="px-3 py-2.5 text-right">Открытый долг</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.channels.map((s) => (
                    <tr key={s.key} className={`border-b border-slate-100 align-top last:border-0 ${s.active ? '' : 'opacity-60'}`}>
                      <td className="px-4 py-2.5">
                        <ChannelBadge source={s.source} color={colorOf(s.source, s.operatorId)} name={s.label} />
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{s.salesCount}</td>
                      <td className="px-3 py-2.5 text-right"><MoneyCell value={s.sold} /></td>
                      <td className="px-3 py-2.5 text-right">
                        <MoneyCell value={s.received} tone="success" />
                        {!isEmptyMoney(s.pendingReview) && <span className="block text-[11px] text-slate-500">+ <MoneyInline value={s.pendingReview} /> на проверке</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right"><MoneyCell value={s.collectedDebt} /></td>
                      <td className="px-3 py-2.5 text-right"><MoneyCell value={s.openDebt} tone="danger" /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50/70 align-top font-bold">
                    <td className="px-4 py-2.5">Итого</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{summary.salesCount}</td>
                    <td className="px-3 py-2.5 text-right"><MoneyCell value={summary.sold} /></td>
                    <td className="px-3 py-2.5 text-right"><MoneyCell value={summary.received} tone="success" /></td>
                    <td className="px-3 py-2.5 text-right"><MoneyCell value={summary.collectedDebt} /></td>
                    <td className="px-3 py-2.5 text-right"><MoneyCell value={summary.openDebt} tone="danger" /></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card
              title="Долги — ожидают оплату"
              icon={<HandCoins className="h-5 w-5 text-amber-600" />}
              action={summary.openDebtCount ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[12px] font-bold text-white">{summary.openDebtCount}</span> : null}
            >
              {visibleDay.debts.length ? (
                <ul className="divide-y divide-slate-100">
                  {visibleDay.debts.map((sale) => {
                    const due = dueLabel(sale.due_at, today);
                    return (
                      <li key={sale.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                        <div className="min-w-[200px] flex-1">
                          <ClientCell
                            userId={sale.user_id}
                            name={sale.client_name}
                            sub={`${tariffLabel(sale.tariff)} · ${sale.operator_name} · продажа ${formatDayShort(tashkentDate(sale.sale_at))}${sale.phone ? ` · ${sale.phone}` : ''}`}
                          />
                        </div>
                        <div className="text-right">
                          <Amount value={sale.debt} currency={sale.currency} tone="danger" />
                          <p className="text-[11.5px] text-slate-500">из {formatMoney(sale.total, sale.currency)}{sale.pending > 0 ? ` · ${formatMoney(sale.pending, sale.currency)} на проверке` : ''}</p>
                          <p className={`text-[11.5px] ${due.overdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{due.text}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState title="Долгов нет" hint="Все продажи операторов до этой даты оплачены полностью." />
              )}
            </Card>

            <Card
              title="Поступления за день"
              icon={<Wallet className="h-5 w-5 text-emerald-600" />}
              action={visibleDay.payments.length ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[12px] font-bold text-emerald-700">{visibleDay.payments.length}</span> : null}
            >
              {visibleDay.payments.length ? (
                <>
                  <ul className="divide-y divide-slate-100">
                    {visibleDay.payments.map((p) => {
                      const badge = p.status === 'pending'
                        ? { text: 'Чек на проверке', cls: 'bg-slate-100 text-slate-600' }
                        : p.sale_date < date
                          ? { text: `Долг от ${formatDayShort(p.sale_date)}`, cls: 'bg-amber-50 text-amber-700' }
                          : { text: 'Новая продажа', cls: 'bg-blue-50 text-blue-700' };
                      return (
                        <li key={p.key} className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 sm:px-5 ${p.status === 'pending' ? 'opacity-70' : ''}`}>
                          <div className="min-w-[180px] flex-1">
                            <ClientCell
                              userId={p.user_id}
                              name={p.client_name}
                              sub={`${formatTime(p.paid_at)} · ${tariffLabel(p.tariff)} · ${p.source === 'operator' ? p.operator_name : SOURCE_LABELS[p.source]}`}
                            />
                          </div>
                          <span className={`whitespace-nowrap rounded-lg px-2 py-1 text-[11.5px] font-semibold ${badge.cls}`}>{badge.text}</span>
                          <Amount value={p.amount} currency={p.currency} tone={p.status === 'pending' ? 'muted' : 'success'} />
                        </li>
                      );
                    })}
                  </ul>
                  <div className="m-4 mt-1 rounded-2xl bg-emerald-50 px-4 py-3 text-[13.5px] text-emerald-900 ring-1 ring-emerald-100 sm:mx-5">
                    <p className="font-bold">Всего поступлений: <MoneyInline value={summary.received} /></p>
                    <p className="text-[12.5px] text-emerald-800/80">
                      Новые продажи: <MoneyInline value={summary.receivedFromNewSales} /> · погашено долгов: <MoneyInline value={summary.collectedDebt} />
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
    </div>
  );
}
