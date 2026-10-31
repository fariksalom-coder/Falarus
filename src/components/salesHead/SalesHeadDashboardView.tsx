import { useMemo, useState } from 'react';
import { Award, CalendarDays, ChartColumnIncreasing, Clock3, PieChart, Trophy, Users, Wallet } from 'lucide-react';
import { reachedTier, type SalesHeadDashboard, type SalesHeadOperatorStats } from '../../../shared/salesHead';
import { tariffLabel } from '../../../shared/salesLedger';
import { Card, ChannelBadge, EmptyState, MoneyStack, TARIFF_COLORS, channelColor, formatDayShort, formatMoney, isEmptyMoney } from '../admin/salesLedger/ui';
import { Donut } from '../admin/salesLedger/Donut';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const uzs = (value: number) => formatMoney(value, 'UZS');
const plural = (n: number, one: string, few: string, many: string) => {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};
const salesWord = (n: number) => plural(n, 'продажа', 'продажи', 'продаж');

/** Panel: rahbar maoshi + operatorlar tahlili. Rahbar sahifasi ham, admin ko'rinishi ham shuni ishlatadi. */
export function SalesHeadDashboardView({ data }: { data: SalesHeadDashboard }) {
  const operatorIds = useMemo(() => data.operators.map((o) => o.id).sort((a, b) => a - b), [data.operators]);
  const colorOf = (id: number) => channelColor('operator', id, operatorIds);
  const allSales = data.totals.sales + data.totals.rahmatSales;

  return (
    <div className="flex flex-col gap-4">
      <SalaryCard data={data} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<ChartColumnIncreasing className="h-4 w-4" />} label="Продажи операторов" value={String(allSales)}
          hint={<Delta current={allSales} previous={data.totals.previousMonthSales} samePeriod={data.daysElapsed < data.daysInMonth} />} />
        <Kpi icon={<CalendarDays className="h-4 w-4" />} label="В среднем за день" value={data.totals.avgPerDay.toLocaleString('ru-RU')}
          hint={data.totals.bestDay ? `Лучший день: ${formatDayShort(data.totals.bestDay.day)} — ${data.totals.bestDay.sales}` : 'Продаж пока нет'} />
        <Kpi icon={<Wallet className="h-4 w-4" />} label="Поступило денег" value={<MoneyStack value={data.totals.received} tone="success" />}
          hint="Подтверждённые чеки и автоплатежи операторов" />
        <Kpi icon={<Clock3 className="h-4 w-4" />} label="Открытый долг клиентов" value={<MoneyStack value={data.totals.openDebt} tone={isEmptyMoney(data.totals.openDebt) ? 'muted' : 'danger'} />}
          hint={isEmptyMoney(data.totals.overdueDebt) ? 'Просрочек нет' : 'Есть просроченные доплаты'} />
      </div>

      {data.totals.pendingSales > 0 && (
        <p className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900 ring-1 ring-amber-200">
          <Clock3 className="h-4 w-4 shrink-0" />
          <span><b>{data.totals.pendingSales} {salesWord(data.totals.pendingSales)}</b> ждут проверки админом — засчитаются в день отправки чека после подтверждения.</span>
        </p>
      )}

      <Card title="Продажи по дням" icon={<ChartColumnIncreasing className="h-5 w-5 text-blue-600" />}>
        <DailyChart data={data} colorOf={colorOf} />
      </Card>

      <Card title="Операторы" icon={<Users className="h-5 w-5 text-blue-600" />}>
        <OperatorTable data={data} colorOf={colorOf} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Тарифы" icon={<PieChart className="h-5 w-5 text-blue-600" />}>
          <div className="p-4 sm:p-5">
            <Donut
              ariaLabel="Доля тарифов в продажах операторов"
              centerValue={allSales}
              centerLabel={salesWord(allSales)}
              emptyText="Продаж за месяц нет"
              segments={Object.entries(data.tariffs).sort(([, a], [, b]) => b - a).map(([code, n]) => ({
                key: code, label: tariffLabel(code), value: n, color: TARIFF_COLORS[code] ?? TARIFF_COLORS.none, detail: `${n} ${salesWord(n)}`,
              }))}
            />
          </div>
        </Card>
        <Card title="По дням недели" icon={<CalendarDays className="h-5 w-5 text-blue-600" />}>
          <WeekdayBars weekdays={data.weekdays} />
        </Card>
      </div>
    </div>
  );
}

function SalaryCard({ data }: { data: SalesHeadDashboard }) {
  const { salary, settings, forecast } = data;
  const next = salary.nextTier;
  const progressBase = salary.currentTier?.sales ?? 0;
  const progress = next ? Math.min(100, Math.max(0, ((salary.countedSales - progressBase) / (next.sales - progressBase)) * 100)) : 100;
  const hasTiers = salary.tiers.some((t) => t.amount > 0);
  return (
    <section className="grid gap-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(148,163,184,0.12)] sm:p-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col gap-3">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500">Ваша зарплата за месяц</p>
        <p className="text-[32px] font-extrabold leading-none tracking-tight text-slate-900 tabular-nums sm:text-[38px]">{uzs(salary.totalAmount)}</p>
        {forecast && (
          <p className="text-[13px] text-slate-500">
            Прогноз на конец месяца при текущем темпе: <b className="text-slate-800">{uzs(forecast.totalAmount)}</b> · ≈{forecast.sales} {salesWord(forecast.sales)}
          </p>
        )}
        <dl className="mt-1 grid gap-2 text-[14px]">
          <Row label="Фиксированная часть" value={uzs(salary.fixedSalary)} />
          <Row label={`Продажи операторов: ${salary.countedSales} × ${uzs(salary.perSale)}`} value={uzs(salary.salesAmount)} />
          <Row label={salary.bonusPeriod === 'day' ? `Бонус за дни с планом: ${salary.bonusDays.length}` : salary.currentTier ? `Бонус за ${salary.currentTier.sales}+ продаж` : 'Бонус'}
            value={uzs(salary.bonusAmount)} accent />
        </dl>
        <p className="text-[12.5px] text-slate-500">
          Продажа засчитывается в день, когда оператор отправил чек на проверку.{' '}
          {settings.includeRahmatClaims ? 'Автоплатежи Rahmat, привязанные оператором, тоже учитываются.' : 'Автоплатежи Rahmat не учитываются.'}
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-[20px] bg-slate-50 p-4">
        <p className="flex items-center gap-2 text-[14px] font-bold text-slate-900"><Award className="h-4 w-4 text-amber-500" /> Бонусы {salary.bonusPeriod === 'day' ? 'за день' : 'за месяц'}</p>
        {hasTiers ? (
          <>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {salary.tiers.filter((tier) => tier.amount > 0).map((tier) => {
                const daysReached = salary.bonusDays.filter((d) => reachedTier(salary.tiers, d.sales)?.sales === tier.sales).length;
                const reached = salary.bonusPeriod === 'month' ? salary.currentTier?.sales === tier.sales : daysReached > 0;
                return (
                  <li key={tier.sales} className={`rounded-2xl px-3 py-2.5 text-center ring-1 ${reached ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-white text-slate-600 ring-slate-200'}`}>
                    <p className="text-[12px] font-semibold">{tier.sales}+ {salary.bonusPeriod === 'day' ? 'в день' : 'продаж'}</p>
                    <p className="mt-0.5 text-[13.5px] font-bold tabular-nums">{uzs(tier.amount)}</p>
                    {salary.bonusPeriod === 'day' && <p className="mt-0.5 text-[11.5px] tabular-nums opacity-80">{daysReached} дн.</p>}
                  </li>
                );
              })}
            </ul>
            {salary.bonusPeriod === 'day' && (salary.bonusDays.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5" aria-label="Дни с бонусом">
                {salary.bonusDays.map((d) => (
                  <li key={d.day} className="rounded-full bg-white px-2.5 py-1 text-[12px] text-slate-700 ring-1 ring-slate-200 tabular-nums">
                    {formatDayShort(d.day)} · {d.sales} {salesWord(d.sales)} · <b className="text-emerald-700">+{uzs(d.amount)}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-slate-600">В этом месяце пока нет дня, когда достигнут план по продажам.</p>
            ))}
            {salary.bonusPeriod === 'month' && (next ? (
              <div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Прогресс до следующего бонуса">
                  <div className="h-full rounded-full bg-blue-600 transition-[width] duration-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-2 text-[13px] text-slate-600">Ещё <b>{salary.remainingToNext}</b> {salesWord(salary.remainingToNext)} до бонуса <b>{uzs(next.amount)}</b></p>
              </div>
            ) : (
              <p className="text-[13px] font-semibold text-emerald-700">Максимальный бонус достигнут.</p>
            ))}
          </>
        ) : (
          <p className="text-[13px] text-slate-500">Бонусы ещё не настроены администратором.</p>
        )}
      </div>
    </section>
  );
}

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-slate-200 pb-2 last:border-0">
      <dt className="text-slate-600">{label}</dt>
      <dd className={`whitespace-nowrap font-bold tabular-nums ${accent ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</dd>
    </div>
  );
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
      <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500">{icon}{label}</p>
      <div className="text-[24px] font-extrabold leading-tight tracking-tight text-slate-900 tabular-nums">{value}</div>
      <p className="text-[12px] text-slate-500">{hint}</p>
    </div>
  );
}

function Delta({ current, previous, samePeriod }: { current: number; previous: number; samePeriod: boolean }) {
  const label = samePeriod ? 'Те же дни прошлого месяца' : 'Прошлый месяц';
  if (!previous) return <>{label}: {previous}</>;
  const diff = Math.round(((current - previous) / previous) * 100);
  return (
    <>
      {label}: {previous} ·{' '}
      <span className={diff >= 0 ? 'font-semibold text-emerald-700' : 'font-semibold text-red-600'}>{diff >= 0 ? '+' : ''}{diff}%</span>
    </>
  );
}

const CHART_H = 180;

/** Kunlik ustunlar operatorlar bo'yicha qatlamlangan; ustun ustiga kelganda — o'sha kun tafsiloti. */
function DailyChart({ data, colorOf }: { data: SalesHeadDashboard; colorOf: (id: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const days = data.days;
  const active = data.operators.filter((o) => o.sales + o.rahmatSales > 0);
  if (!days.length || !active.length) return <EmptyState title="Продаж за месяц пока нет" hint="Как только операторы отправят чеки, здесь появится график по дням." />;
  const max = Math.max(1, ...days.map((d) => d.total));
  const step = max <= 5 ? 1 : max <= 10 ? 2 : Math.ceil(max / 5);
  const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
  const top = Math.max(max, ticks[ticks.length - 1]);
  const avg = data.totals.avgPerDay;
  const hovered = hover == null ? null : days[hover];

  return (
    <div className="p-4 sm:p-5">
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Операторы">
        {active.map((o) => (
          <li key={o.id} className="flex items-center gap-1.5 text-[12.5px] text-slate-700">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorOf(o.id) }} aria-hidden="true" />{o.name}
          </li>
        ))}
        <li className="flex items-center gap-1.5 text-[12.5px] text-slate-500"><span className="h-0 w-4 border-t-2 border-dashed border-slate-400" aria-hidden="true" />среднее {avg}</li>
      </ul>
      <div className="relative flex gap-2">
        <div className="relative w-6 shrink-0 text-right text-[11px] text-slate-400" style={{ height: CHART_H }} aria-hidden="true">
          {ticks.map((t) => <span key={t} className="absolute right-0 -translate-y-1/2 tabular-nums" style={{ top: CHART_H - (t / top) * CHART_H }}>{t}</span>)}
        </div>
        <div className="relative min-w-0 flex-1" onMouseLeave={() => setHover(null)}>
          <div className="relative" style={{ height: CHART_H }}>
            {ticks.map((t) => <div key={t} className="absolute inset-x-0 border-t border-slate-100" style={{ top: CHART_H - (t / top) * CHART_H }} aria-hidden="true" />)}
            {avg > 0 && <div className="absolute inset-x-0 border-t-2 border-dashed border-slate-400/70" style={{ top: CHART_H - (avg / top) * CHART_H }} aria-hidden="true" />}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {days.map((d, i) => (
                <button
                  key={d.day}
                  type="button"
                  className={`group flex h-full min-w-0 flex-1 flex-col justify-end rounded-t-[4px] focus:outline-none ${hover === i ? 'bg-blue-50/70' : ''}`}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  aria-label={`${formatDayShort(d.day)}: ${d.total} ${salesWord(d.total)}`}
                >
                  <span className="flex w-full flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px]" style={{ height: `${(d.total / top) * 100}%` }}>
                    {active.filter((o) => d.byOperator[o.id]).map((o) => (
                      <span key={o.id} style={{ flexGrow: d.byOperator[o.id], background: colorOf(o.id) }} />
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-1.5 flex gap-[2px] text-[10.5px] text-slate-400" aria-hidden="true">
            {days.map((d, i) => (
              <span key={d.day} className="min-w-0 flex-1 text-center tabular-nums">{i === 0 || (i + 1) % 5 === 0 ? Number(d.day.slice(8)) : ''}</span>
            ))}
          </div>
          {hovered && (
            <div
              className="pointer-events-none absolute top-0 z-10 w-48 rounded-xl bg-slate-900 px-3 py-2 text-[12px] text-white shadow-lg"
              style={{ left: `clamp(0px, calc(${((hover! + 0.5) / days.length) * 100}% - 96px), calc(100% - 192px))` }}
              role="status"
            >
              <p className="font-semibold">{formatDayShort(hovered.day)} · {hovered.total} {salesWord(hovered.total)}</p>
              {active.filter((o) => hovered.byOperator[o.id]).map((o) => (
                <p key={o.id} className="mt-0.5 flex items-center justify-between gap-2 text-slate-200">
                  <span className="flex min-w-0 items-center gap-1.5"><span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: colorOf(o.id) }} /><span className="truncate">{o.name}</span></span>
                  <b className="tabular-nums text-white">{hovered.byOperator[o.id]}</b>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OperatorTable({ data, colorOf }: { data: SalesHeadDashboard; colorOf: (id: number) => string }) {
  const total = data.totals.sales + data.totals.rahmatSales;
  if (!data.operators.length) return <EmptyState title="Операторов пока нет" />;
  const leader = data.operators[0];
  const leaderSales = leader.sales + leader.rahmatSales;
  return (
    <>
      {leaderSales > 0 && (
        <p className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-amber-50/60 px-4 py-3 text-[13.5px] text-slate-800 sm:px-5">
          <Trophy className="h-4 w-4 text-amber-500" />
          Лучший оператор месяца: <b>{leader.name}</b> — {leaderSales} {salesWord(leaderSales)}
          {total > 0 && <span className="text-slate-500">({Math.round((leaderSales / total) * 100)}% всех продаж)</span>}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-[13.5px]">
          <thead className="text-[12px] text-slate-500">
            <tr className="border-b border-slate-100">
              {['Оператор', 'Продажи', 'Доля', 'В среднем / раб. день', 'Лучший день', 'Продано на сумму', 'Поступило', 'Долг клиентов'].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold first:pl-4 sm:first:pl-5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.operators.map((o) => <OperatorRow key={o.id} op={o} total={total} color={colorOf(o.id)} />)}
          </tbody>
        </table>
      </div>
    </>
  );
}

function OperatorRow({ op, total, color }: { op: SalesHeadOperatorStats; total: number; color: string }) {
  const sales = op.sales + op.rahmatSales;
  const share = total ? Math.round((sales / total) * 100) : 0;
  return (
    <tr className="border-b border-slate-100 align-top last:border-0">
      <td className="py-3 pl-4 pr-3 sm:pl-5">
        <ChannelBadge source="operator" color={color} name={op.name} />
        {!op.active && <span className="mt-0.5 block pl-8 text-[11.5px] text-slate-400">отключён</span>}
      </td>
      <td className="px-3 py-3">
        <span className="font-bold tabular-nums text-slate-900">{sales}</span>
        <span className="block text-[11.5px] text-slate-500">
          {op.rahmatSales ? `свои ${op.sales} · Rahmat ${op.rahmatSales}` : 'свои чеки'}
          {op.pendingSales ? ` · на проверке ${op.pendingSales}` : ''}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${share}%`, background: color }} /></div>
          <span className="tabular-nums text-slate-700">{share}%</span>
        </div>
      </td>
      <td className="px-3 py-3 tabular-nums text-slate-700">
        {op.activeDays ? (Math.round((sales / op.activeDays) * 10) / 10).toLocaleString('ru-RU') : '—'}
        {op.activeDays > 0 && <span className="block text-[11.5px] text-slate-500">{op.activeDays} дн. с продажами</span>}
      </td>
      <td className="px-3 py-3 text-slate-700">{op.bestDay ? `${formatDayShort(op.bestDay.day)} — ${op.bestDay.sales}` : '—'}</td>
      <td className="px-3 py-3"><MoneyStack value={op.sold} /></td>
      <td className="px-3 py-3"><MoneyStack value={op.received} tone="success" /></td>
      <td className="px-3 py-3">
        <MoneyStack value={op.openDebt} tone={isEmptyMoney(op.openDebt) ? 'muted' : 'danger'} />
        {!isEmptyMoney(op.overdueDebt) && <span className="block text-[11.5px] font-semibold text-red-600">есть просрочка</span>}
      </td>
    </tr>
  );
}

function WeekdayBars({ weekdays }: { weekdays: number[] }) {
  const max = Math.max(0, ...weekdays);
  if (!max) return <EmptyState title="Нет данных" />;
  return (
    <ul className="flex flex-col gap-2 p-4 sm:p-5">
      {weekdays.map((n, i) => (
        <li key={WEEKDAYS[i]} className="grid grid-cols-[28px_1fr_36px] items-center gap-3 text-[13px]" title={`${WEEKDAYS[i]}: ${n} ${salesWord(n)}`}>
          <span className="font-semibold text-slate-600">{WEEKDAYS[i]}</span>
          <span className="h-3 overflow-hidden rounded-r-[4px] bg-slate-100">
            <span className={`block h-full rounded-r-[4px] ${n === max ? 'bg-blue-600' : 'bg-blue-400/70'}`} style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <span className="text-right font-semibold tabular-nums text-slate-800">{n}</span>
        </li>
      ))}
    </ul>
  );
}

export const currentTashkentMonth = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 7);

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** «‹ Октябрь 2026 ›» — kelajakdagi oyga o'tib bo'lmaydi. */
export function MonthSwitcher({ month, onChange, tone = 'light' }: { month: string; onChange: (month: string) => void; tone?: 'light' | 'dark' }) {
  const date = new Date(`${month}-01T00:00:00Z`);
  const label = `${new Intl.DateTimeFormat('ru-RU', { month: 'long', timeZone: 'UTC' }).format(date)} ${date.getUTCFullYear()}`;
  const atCurrent = month >= currentTashkentMonth();
  const btn = tone === 'dark'
    ? 'bg-white/10 ring-white/15 hover:bg-white/20 text-white'
    : 'bg-white ring-slate-200 hover:bg-slate-50 text-slate-700';
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Предыдущий месяц" onClick={() => onChange(shiftMonth(month, -1))}
        className={`grid h-11 w-11 place-items-center rounded-2xl ring-1 transition active:scale-95 ${btn}`}>‹</button>
      <span className={`min-w-[120px] text-center text-[15px] font-bold capitalize sm:min-w-[150px] ${tone === 'dark' ? 'text-white' : 'text-slate-900'}`}>{label}</span>
      <button type="button" aria-label="Следующий месяц" disabled={atCurrent} onClick={() => onChange(shiftMonth(month, 1))}
        className={`grid h-11 w-11 place-items-center rounded-2xl ring-1 transition active:scale-95 disabled:opacity-40 ${btn}`}>›</button>
    </div>
  );
}
