/**
 * UMUMIY HOLAT — admin panelining birinchi sahifasi.
 *
 * Tushum va 30 kunlik grafik «Аналитика продаж» bilan BIR manbadan olinadi
 * (/sales-ledger/period): operator cheklari + Rahmat + admin to'lovlari.
 * Ilgari bu yerda faqat `payments` jadvali sanalardi — operator orqali
 * tushgan pul ko'rinmas, oy tushumi kam chiqardi (2026-10-24 tuzatildi).
 * Valyutalar aralashtirilmaydi; so'mdagi umumiy ekvivalent faqat taxminiy.
 */
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, BarChart3, Banknote, BadgePercent, Repeat, Tags, TrendingUp, Users, Wallet } from 'lucide-react';
import RegistrationReport from './RegistrationReport';
import { getDashboard, getPaymentMethods, getTariffPrices, type DashboardStats, type PaymentMethodRow, type TariffPriceRow } from '../../api/admin';
import { salesLedgerApi } from '../../api/salesLedger';
import { adminPath } from '../../constants/adminPath';
import { CURRENCIES, addDays, moneyInUzs, tashkentDate, tashkentToday, tariffLabel, zeroMoney, type AnalyticsPeriod, type Currency, type Money } from '../../../shared/salesLedger';

const CARD = 'rounded-[24px] border border-app-border bg-app-surface p-5 shadow-app-card';
const CURRENCY_SUFFIX: Record<Currency, string> = { UZS: "so'm", RUB: '₽', USD: '$' };

const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU');

/** So'm birinchi: tushumning asosiy qismi. `sep` — kartada har valyuta alohida qatorda. */
const SHOW_ORDER: Currency[] = ['UZS', 'RUB', 'USD'];
function moneyText(m: Money, sep = ' · '): string {
  const parts = SHOW_ORDER.filter((c) => m[c] > 0).map((c) => `${fmt(m[c])} ${CURRENCY_SUFFIX[c]}`);
  return parts.length ? parts.join(sep) : "0 so'm";
}

function dayLabel(day: string, long = false): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString('ru-RU', long ? { day: 'numeric', month: 'long', weekday: 'short' } : { day: '2-digit', month: '2-digit' });
}

type DayRow = { day: string; count: number; money: Money };

/** Tasdiqlangan to'lovlar kunlar bo'yicha (Toshkent sanasi). */
function buildDays(period: AnalyticsPeriod | null, from: string, to: string): DayRow[] {
  const rows: DayRow[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) rows.push({ day: d, count: 0, money: zeroMoney() });
  const index = new Map(rows.map((r) => [r.day, r]));
  for (const p of period?.payments ?? []) {
    if (p.status !== 'approved') continue;
    const row = index.get(tashkentDate(p.paid_at));
    if (!row) continue;
    row.count += 1;
    row.money[p.currency] += p.amount;
  }
  return rows;
}

function sumDays(rows: DayRow[]): { count: number; money: Money } {
  return rows.reduce((acc, r) => {
    acc.count += r.count;
    for (const c of CURRENCIES) acc.money[c] += r.money[c];
    return acc;
  }, { count: 0, money: zeroMoney() });
}

function Metric({ label, value, hint, href, icon: Icon, tone }: { label: string; value: string; hint: string; href: string; icon: ComponentType<{ className?: string }>; tone: string }) {
  return (
    <Link to={href} className={`${CARD} group block transition hover:-translate-y-0.5 hover:border-blue-200 active:scale-[0.99]`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-app-text-muted">{label}</p>
          <p className={`mt-2 whitespace-pre-line break-words font-semibold leading-tight text-app-text tabular-nums ${value.includes('\n') ? 'text-xl' : 'text-2xl'}`}>{value}</p>
        </div>
        <span className={`rounded-xl p-2 ring-1 ${tone}`}><Icon className="h-5 w-5" /></span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 text-sm text-app-text-muted">
        <span className="min-w-0">{hint}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function PaymentsChart({ rows, loading }: { rows: DayRow[]; loading: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = sumDays(rows);
  const max = Math.max(1, ...rows.map((r) => r.count));
  const active = hover !== null ? rows[hover] : null;
  return (
    <section className={CARD} aria-labelledby="pay30">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="pay30" className="text-base font-semibold text-app-text">To‘lovlar · oxirgi 30 kun</h2>
          <p className="text-sm text-app-text-muted">Operator cheklari, Rahmat va qo‘lda tasdiqlangan to‘lovlar · Toshkent vaqti</p>
        </div>
        <BarChart3 className="h-5 w-5 shrink-0 text-slate-400" />
      </div>
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span><span className="text-app-text-muted">To‘lovlar: </span><b className="tabular-nums text-app-text">{fmt(total.count)}</b></span>
        <span><span className="text-app-text-muted">Tushum: </span><b className="tabular-nums text-app-text">{moneyText(total.money)}</b></span>
      </div>
      {loading ? <div className="h-[220px] animate-pulse rounded-2xl bg-slate-100" aria-busy="true" /> : (
        <div className="relative" onMouseLeave={() => setHover(null)}>
          <div className="flex h-[220px] items-end gap-[3px] border-b border-app-border" role="img" aria-label="Kunlik to‘lovlar soni">
            {rows.map((r, i) => (
              <button key={r.day} type="button" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)}
                aria-label={`${dayLabel(r.day, true)}: ${r.count} ta to‘lov`}
                className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                {r.count > 0 && <span className="mb-1 text-[10px] font-bold tabular-nums text-app-text-muted max-sm:hidden">{r.count}</span>}
                <span className={`w-full rounded-t-[4px] transition-colors ${r.count === 0 ? 'bg-slate-200' : hover === i ? 'bg-blue-500' : 'bg-blue-600'}`}
                  style={{ height: r.count === 0 ? 3 : `${Math.max(4, (r.count / max) * 88)}%` }} />
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-app-text-muted tabular-nums">
            <span>{rows[0] ? dayLabel(rows[0].day) : ''}</span>
            <span>{rows[Math.floor(rows.length / 2)] ? dayLabel(rows[Math.floor(rows.length / 2)].day) : ''}</span>
            <span>Bugun</span>
          </div>
          {active && (
            <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-center shadow-lg">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{dayLabel(active.day, true)}</p>
              <p className="mt-0.5 text-sm font-bold text-app-text">{active.count} ta to‘lov</p>
              <p className="text-xs text-app-text-muted">{moneyText(active.money)}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Pastki kartalar: kamdan-kam o'zgartiriladigan sozlamalar — chap menyuda joy egallamasin. */
function SettingsCards() {
  const [methods, setMethods] = useState<PaymentMethodRow[] | null>(null);
  const [prices, setPrices] = useState<TariffPriceRow[] | null>(null);
  useEffect(() => {
    getPaymentMethods().then(setMethods).catch(() => setMethods([]));
    getTariffPrices().then(setPrices).catch(() => setPrices([]));
  }, []);
  const activeMethods = (methods ?? []).filter((m) => m.status === 'active');
  const shownPrices = (prices ?? []).filter((p) => p.currency === 'UZS' || p.currency === 'RUB').slice(0, 6);
  const cards = [
    {
      to: adminPath('/payment-methods'), title: 'To‘lov usullari', icon: Banknote,
      body: methods === null ? 'Yuklanmoqda…' : activeMethods.length === 0 ? 'Faol karta yo‘q'
        : activeMethods.slice(0, 3).map((m) => `${m.currency} · ${m.bank_name} ••${m.card_number.replace(/\D/g, '').slice(-4)}`).join('\n'),
      foot: methods ? `${activeMethods.length} faol / ${methods.length} jami` : '',
    },
    {
      to: adminPath('/tariff-pricing'), title: 'Tarif narxlari', icon: Tags,
      body: prices === null ? 'Yuklanmoqda…' : shownPrices.length === 0 ? 'Narxlar kiritilmagan'
        : shownPrices.map((p) => `${tariffLabel(p.tariff_type)} — ${fmt(p.price)} ${CURRENCY_SUFFIX[p.currency as Currency] ?? p.currency}`).join('\n'),
      foot: 'Narxni o‘zgartirish',
    },
    {
      to: adminPath('/kiosk'), title: 'Test va chegirmalar', icon: BadgePercent,
      body: 'Daraja testi va chegirma kuponlari', foot: 'Ochish',
    },
  ];
  return (
    <section aria-labelledby="settings-cards">
      <h2 id="settings-cards" className="mb-3 text-base font-semibold text-app-text">To‘lov va tariflar</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className={`${CARD} group flex flex-col transition hover:-translate-y-0.5 hover:border-blue-200 active:scale-[0.99]`}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><c.icon className="h-5 w-5" /></span>
              <span className="font-semibold text-app-text">{c.title}</span>
            </div>
            <p className="mt-3 flex-1 whitespace-pre-line text-sm leading-6 text-app-text-muted">{c.body}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">{c.foot}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function AdminDashboardPage() {
  const today = tashkentToday();
  const monthStart = `${today.slice(0, 7)}-01`;
  const chartFrom = addDays(today, -29);
  const from = monthStart < chartFrom ? monthStart : chartFrom;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod | null>(null);
  const [loadingPeriod, setLoadingPeriod] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard().then(setStats).catch((e: Error) => setError(e.message));
    salesLedgerApi.period(from, today).then(setPeriod).catch((e: Error) => setError(e.message)).finally(() => setLoadingPeriod(false));
  }, [from, today]);

  const days = useMemo(() => buildDays(period, from, today), [period, from, today]);
  const chart = days.filter((d) => d.day >= chartFrom);
  const month = sumDays(days.filter((d) => d.day >= monthStart));
  const todayRow = days[days.length - 1] ?? { count: 0, money: zeroMoney() };
  const rate = period?.rub_uzs_rate ?? null;
  const monthUzs = moneyInUzs(month.money, rate);
  const dash = (v: string) => (stats ? v : '…');

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-app-text">Umumiy holat</h1>
        <Link to={adminPath('/kiosk')} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-app-border bg-app-surface px-4 text-sm font-semibold text-app-text transition hover:border-blue-200 hover:bg-blue-50 active:scale-[0.98]">
          <BadgePercent className="h-4 w-4 text-blue-700" />Test va chegirmalar
        </Link>
      </div>

      {error && <p role="alert" className="flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</p>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Jami foydalanuvchilar" value={dash(fmt(stats?.total_users ?? 0))} icon={Users} tone="bg-blue-50 text-blue-700 ring-blue-100"
          hint={stats ? `Bugun +${fmt(stats.users_today)} · oyda +${fmt(stats.users_this_month)}` : 'Yuklanmoqda…'} href={adminPath('/users')} />
        <Metric label="Faol obunalar" value={dash(fmt(stats?.active_subscriptions || stats?.active_users || 0))} icon={Repeat} tone="bg-emerald-50 text-emerald-700 ring-emerald-100"
          hint={stats ? `${fmt(stats.subscriptions_expiring_soon)} tasi 7 kunda tugaydi` : 'Yuklanmoqda…'} href={adminPath('/users')} />
        <Metric label="Oy tushumi" value={loadingPeriod ? '…' : moneyText(month.money, '\n')} icon={TrendingUp} tone="bg-emerald-50 text-emerald-700 ring-emerald-100"
          hint={loadingPeriod ? 'Yuklanmoqda…' : `${fmt(month.count)} ta to‘lov${month.money.RUB > 0 && rate ? ` · ≈ ${fmt(monthUzs)} so‘m` : ''}`} href={adminPath('/sales-ledger')} />
        <Metric label="Bugun" value={loadingPeriod ? '…' : `${fmt(todayRow.count)} ta to‘lov`} icon={Wallet} tone="bg-amber-50 text-amber-700 ring-amber-100"
          hint={loadingPeriod ? 'Yuklanmoqda…' : moneyText(todayRow.money)} href={adminPath('/sales-ledger')} />
      </section>

      <PaymentsChart rows={chart} loading={loadingPeriod} />
      <RegistrationReport />
      <SettingsCards />
    </div>
  );
}
