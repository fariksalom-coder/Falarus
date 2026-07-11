import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  MessageSquare,
  Receipt,
  Repeat,
  ScrollText,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { getDashboard, type DashboardStats, type RevenueByCurrency } from '../../api/admin';
import { adminPath } from '../../constants/adminPath';

type MetricCard = {
  label: string;
  value: string;
  hint: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'blue' | 'green' | 'amber' | 'rose' | 'slate';
};

const toneClasses = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
} as const;

const statusLabels: Record<string, string> = {
  pending: 'Kutilmoqda',
  approved: 'Tasdiqlangan',
  rejected: 'Rad etilgan',
  refunded: 'Qaytarilgan',
};

const channelLabels: Record<string, string> = {
  click_button: 'Click tugma',
  click_auto_token: 'Click token',
  click_auto_cron: 'Click avto',
  manual: "Qo'lda",
  rahmat: 'Rahmat',
};

function formatNumber(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('uz-UZ');
}

function formatMoney(value: number, currency: keyof RevenueByCurrency): string {
  const amount = Number(value ?? 0).toLocaleString(currency === 'UZS' ? 'uz-UZ' : 'en-US');
  if (currency === 'UZS') return `${amount} so'm`;
  if (currency === 'RUB') return `${amount} RUB`;
  return `$${amount}`;
}

function formatRevenue(revenue: RevenueByCurrency | null | undefined): string {
  const safe = revenue ?? { UZS: 0, USD: 0, RUB: 0 };
  const parts = (Object.entries(safe) as [keyof RevenueByCurrency, number][])
    .filter(([, value]) => Number(value) > 0)
    .map(([currency, value]) => formatMoney(value, currency));
  return parts.length > 0 ? parts.join(' / ') : "0 so'm";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

function statusClass(status: string): string {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  if (status === 'pending') return 'bg-amber-50 text-amber-700 ring-amber-100';
  if (status === 'rejected' || status === 'refunded') return 'bg-rose-50 text-rose-700 ring-rose-100';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

type DailyPaymentRow = DashboardStats['payments_daily_last_30'][number];

function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function formatFullDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', weekday: 'short' });
}


/** Currency conversion — 1 RUB = 150 UZS; USD approximated at 90 RUB. */
const UZS_PER_RUB = 150;
const USD_TO_RUB = 90;

function revenueToRub(r: RevenueByCurrency): number {
  return r.UZS / UZS_PER_RUB + r.RUB + r.USD * USD_TO_RUB;
}

function formatRubShort(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${m >= 10 ? Math.round(m) : m.toFixed(1)}M ₽`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `${k >= 100 ? Math.round(k) : k.toFixed(1)}K ₽`;
  }
  return `${Math.round(value)} ₽`;
}

function formatRubFull(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

function buildEmpty30(): DailyPaymentRow[] {
  const arr: DailyPaymentRow[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    arr.push({ date: key, count: 0, revenue: { UZS: 0, USD: 0, RUB: 0 } });
  }
  return arr;
}

function DailyPaymentsChart({ rows: rowsInput }: { rows: DailyPaymentRow[] }) {
  const rows = rowsInput.length > 0 ? rowsInput : buildEmpty30();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);
  const totalRevenue = rows.reduce<RevenueByCurrency>(
    (acc, r) => ({
      UZS: acc.UZS + r.revenue.UZS,
      USD: acc.USD + r.revenue.USD,
      RUB: acc.RUB + r.revenue.RUB,
    }),
    { UZS: 0, USD: 0, RUB: 0 },
  );
  const totalRub = revenueToRub(totalRevenue);

  const width = 720;
  const height = 340;
  const paddingLeft = 68;
  const paddingRight = 12;
  const paddingTop = 16;
  const paddingBottom = 32;
  const innerW = width - paddingLeft - paddingRight;
  const innerH = height - paddingTop - paddingBottom;

  const maxRevenueRub = rows.reduce((m, r) => Math.max(m, revenueToRub(r.revenue)), 0);
  const TICK_STEP_RUB = 2500;
  const yMax = Math.max(TICK_STEP_RUB, Math.ceil(maxRevenueRub / TICK_STEP_RUB) * TICK_STEP_RUB);
  const tickCount = Math.round(yMax / TICK_STEP_RUB);
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => i * TICK_STEP_RUB);
  const labelEveryN = tickCount > 20 ? 4 : tickCount > 10 ? 2 : 1;

  const barGap = 4;
  const barWidth = (innerW - barGap * (rows.length - 1)) / rows.length;

  const dateLabelStep = Math.max(1, Math.ceil(rows.length / 6));
  const isEmpty = totalCount === 0;

  const hoverRow = hoverIdx !== null ? rows[hoverIdx] : null;
  const hoverBarX = hoverIdx !== null ? paddingLeft + hoverIdx * (barWidth + barGap) + barWidth / 2 : 0;
  const tooltipLeftPct = hoverIdx !== null ? (hoverBarX / width) * 100 : 0;
  const tooltipAlign = tooltipLeftPct > 70 ? 'right' : tooltipLeftPct < 20 ? 'left' : 'center';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">To'lovlar 30 kunlik statistikasi</h2>
          <p className="text-sm text-slate-500">Kunlik tushum va sotuvlar soni.</p>
        </div>
        <BarChart3 className="h-5 w-5 shrink-0 text-slate-400" />
      </div>

      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-slate-500">30 kunda to'lovlar: </span>
          <span className="font-semibold text-slate-900">{formatNumber(totalCount)}</span>
        </div>
        <div>
          <span className="text-slate-500">Jami tushum: </span>
          <span className="font-semibold text-slate-900">{formatRubFull(totalRub)}</span>
          <span className="ml-1 text-xs text-slate-400">(1 ₽ = {UZS_PER_RUB} so'm)</span>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-[340px] w-full min-w-[640px]"
          role="img"
          aria-label="Kunlik to'lovlar grafigi"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="admin-daily-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B6FE0" />
              <stop offset="100%" stopColor="#0B2A6B" />
            </linearGradient>
            <linearGradient id="admin-daily-bar-hover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5C8EFF" />
              <stop offset="100%" stopColor="#123A8F" />
            </linearGradient>
          </defs>

          {yTicks.map((tick, idx) => {
            const y = paddingTop + innerH - (tick / yMax) * innerH;
            const showLabel = idx % labelEveryN === 0 || idx === yTicks.length - 1;
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  x2={width - paddingRight}
                  y1={y}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray={idx === 0 ? undefined : '3 3'}
                />
                {showLabel ? (
                  <text
                    x={paddingLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize={10}
                    fill="#64748B"
                  >
                    {tick === 0 ? '0 ₽' : formatRubShort(tick)}
                  </text>
                ) : null}
              </g>
            );
          })}

          {rows.map((row, idx) => {
            const value = revenueToRub(row.revenue);
            const noSale = row.count === 0;
            const barH = (value / yMax) * innerH;
            const x = paddingLeft + idx * (barWidth + barGap);
            const y = paddingTop + innerH - barH;
            const label = formatDayLabel(row.date);
            const showLabel = idx % dateLabelStep === 0 || idx === rows.length - 1;
            const isToday = idx === rows.length - 1;
            const isHover = hoverIdx === idx;
            const bw = Math.max(2, barWidth);
            return (
              <g key={row.date}>
                {/* transparent hit target — wider than bar for easier hover */}
                <rect
                  x={x - barGap / 2}
                  y={paddingTop}
                  width={bw + barGap}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(idx)}
                  style={{ cursor: 'pointer' }}
                />
                <rect
                  x={x}
                  y={noSale ? paddingTop + innerH - 3 : y}
                  width={bw}
                  height={noSale ? 3 : Math.max(3, barH)}
                  rx={2}
                  fill={noSale ? '#E2E8F0' : isHover ? 'url(#admin-daily-bar-hover)' : 'url(#admin-daily-bar)'}
                  opacity={isHover ? 1 : isToday ? 1 : 0.92}
                  pointerEvents="none"
                />
                {showLabel ? (
                  <text
                    x={x + barWidth / 2}
                    y={height - 10}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#64748B"
                    pointerEvents="none"
                  >
                    {label}
                  </text>
                ) : null}
              </g>
            );
          })}

          {isEmpty ? (
            <text
              x={width / 2}
              y={paddingTop + innerH / 2}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              fill="#94A3B8"
            >
              Bu 30 kunda tasdiqlangan to'lov yo'q
            </text>
          ) : null}
        </svg>

        {hoverRow ? (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg"
            style={{
              left: `${tooltipLeftPct}%`,
              top: 4,
              transform:
                tooltipAlign === 'right'
                  ? 'translateX(-100%)'
                  : tooltipAlign === 'left'
                    ? 'translateX(0)'
                    : 'translateX(-50%)',
              minWidth: 180,
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {formatFullDayLabel(hoverRow.date)}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {formatRubFull(revenueToRub(hoverRow.revenue))}
            </p>
            {(hoverRow.revenue.UZS > 0 || hoverRow.revenue.USD > 0 || hoverRow.revenue.RUB > 0) &&
            (Number(hoverRow.revenue.UZS > 0) + Number(hoverRow.revenue.USD > 0) + Number(hoverRow.revenue.RUB > 0) > 1 ||
              hoverRow.revenue.UZS > 0) ? (
              <p className="mt-0.5 text-[11px] text-slate-400">
                {formatRevenue(hoverRow.revenue)}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-slate-500">
              {formatNumber(hoverRow.count)} ta to'lov
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
        <AlertCircle className="h-5 w-5 shrink-0" />
        {error || 'Dashboard maʼlumotlari topilmadi'}
      </div>
    );
  }

  const cards: MetricCard[] = [
    {
      label: 'Jami foydalanuvchilar',
      value: formatNumber(stats.total_users),
      hint: `Bugun +${formatNumber(stats.users_today)}, oyda +${formatNumber(stats.users_this_month)}`,
      href: adminPath('/users'),
      icon: Users,
      tone: 'blue',
    },
    {
      label: 'Faol obunalar',
      value: formatNumber(stats.active_subscriptions || stats.active_users),
      hint: `${formatNumber(stats.subscriptions_expiring_soon)} ta obuna 7 kunda tugaydi`,
      href: adminPath('/users'),
      icon: Repeat,
      tone: 'green',
    },
    {
      label: 'Oy tushumi',
      value: formatRevenue(stats.payments_this_month),
      hint: `Bugun: ${formatRevenue(stats.payments_today)}`,
      href: adminPath('/payments'),
      icon: TrendingUp,
      tone: 'green',
    },
    {
      label: "Kutilayotgan to'lovlar",
      value: formatNumber(stats.pending_payments),
      hint: `${formatNumber(stats.payment_statuses_this_month.approved)} tasdiqlandi, ${formatNumber(stats.refunded_payments_this_month)} refund`,
      href: adminPath('/payments'),
      icon: CreditCard,
      tone: stats.pending_payments > 0 ? 'amber' : 'slate',
    },
    {
      label: 'Referral payout',
      value: formatNumber(stats.referral_payouts_pending),
      hint: 'Pul yechish soʼrovlari',
      href: adminPath('/referrals'),
      icon: Wallet,
      tone: stats.referral_payouts_pending > 0 ? 'amber' : 'slate',
    },
    {
      label: 'Ochiq chatlar',
      value: formatNumber(stats.support_chats_open),
      hint: 'Yordam boʼlimidagi aktiv yozishmalar',
      href: adminPath('/support'),
      icon: MessageSquare,
      tone: stats.support_chats_open > 0 ? 'rose' : 'slate',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Foydalanuvchilar, to'lovlar, support va referral holati.</p>
        </div>
        <Link
          to={adminPath('/users/create')}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <UserPlus className="h-4 w-4" />
          Yangi foydalanuvchi
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const content = (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-2 break-words text-2xl font-semibold leading-tight text-slate-900">{card.value}</p>
                </div>
                <span className={`rounded-lg p-2 ring-1 ${toneClasses[card.tone]}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 text-sm text-slate-500">
                <span className="min-w-0 truncate">{card.hint}</span>
                {card.href ? <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" /> : null}
              </div>
            </div>
          );
          return card.href ? (
            <Link key={card.label} to={card.href} className="block">
              {content}
            </Link>
          ) : (
            <div key={card.label}>{content}</div>
          );
        })}
      </section>

      <DailyPaymentsChart rows={stats.payments_daily_last_30 ?? []} />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Daromad mahsulotlar bo'yicha</h2>
              <p className="text-sm text-slate-500">Joriy oyda tasdiqlangan to'lovlar.</p>
            </div>
            <Receipt className="h-5 w-5 text-slate-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="py-2 pr-4 font-medium">Mahsulot</th>
                  <th className="py-2 pr-4 font-medium">Soni</th>
                  <th className="py-2 text-right font-medium">Tushum</th>
                </tr>
              </thead>
              <tbody>
                {stats.revenue_by_product_this_month.map((row) => (
                  <tr key={`${row.product_code}-${row.label}`} className="border-b border-slate-50">
                    <td className="py-3 pr-4 font-medium text-slate-800">{row.label}</td>
                    <td className="py-3 pr-4 text-slate-600">{formatNumber(row.count)}</td>
                    <td className="py-3 text-right font-semibold text-slate-900">{formatRevenue(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {stats.revenue_by_product_this_month.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Bu oy tasdiqlangan to'lov yo'q.</div>
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Click bugun</h2>
              <p className="text-sm text-slate-500">Callback va payment loglar.</p>
            </div>
            <ScrollText className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-sm text-slate-600">Jami</span>
              <span className="font-semibold text-slate-900">{formatNumber(stats.click_today.total)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
              <span className="text-sm text-emerald-700">Success</span>
              <span className="font-semibold text-emerald-800">{formatNumber(stats.click_today.success)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2">
              <span className="text-sm text-rose-700">Errors</span>
              <span className="font-semibold text-rose-800">{formatNumber(stats.click_today.errors)}</span>
            </div>
          </div>
          <Link
            to={adminPath('/click-logs')}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Loglarni ochish
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">So'nggi to'lovlar</h2>
            <Link to={adminPath('/payments')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              Hammasi
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recent_payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{payment.user}</p>
                  <p className="truncate text-xs text-slate-500">
                    {payment.product_label} · {channelLabels[payment.payment_channel ?? ''] ?? '—'} · {formatDateTime(payment.created_at)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-900">{formatMoney(payment.amount, payment.currency)}</p>
                  <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusClass(payment.status)}`}>
                    {statusLabels[payment.status] ?? payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {stats.recent_payments.length === 0 ? <div className="py-8 text-center text-sm text-slate-500">To'lovlar yo'q.</div> : null}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">Yangi foydalanuvchilar</h2>
            <Link to={adminPath('/users')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              Hammasi
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recent_users.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                <div className="min-w-0">
                  <Link to={adminPath(`/users/${user.id}`)} className="truncate text-sm font-semibold text-slate-900 hover:text-indigo-600">
                    {user.name}
                  </Link>
                  <p className="truncate text-xs text-slate-500">{user.email ?? user.phone ?? 'Kontakt yoʼq'} · {formatDateTime(user.created_at)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ring-1 ${user.subscription_status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                  {user.subscription_status === 'active' ? user.plan_name ?? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
          {stats.recent_users.length === 0 ? <div className="py-8 text-center text-sm text-slate-500">Foydalanuvchilar yo'q.</div> : null}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {Object.entries(stats.payment_statuses_this_month).map(([status, count]) => (
          <div key={status} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-500">{statusLabels[status] ?? status}</span>
              {status === 'approved' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(count)}</p>
            <p className="mt-1 text-xs text-slate-500">Joriy oy</p>
          </div>
        ))}
      </section>
    </div>
  );
}
