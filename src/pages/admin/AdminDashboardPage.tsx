import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
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
