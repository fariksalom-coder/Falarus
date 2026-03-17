import { useState, useEffect } from 'react';
import { getDashboard, type DashboardStats, type RevenueByCurrency } from '../../api/admin';
import { Users, CreditCard, TrendingUp, Wallet, Repeat, AlertCircle } from 'lucide-react';

const cards: { key: keyof DashboardStats; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'users_today', label: 'Users today', icon: Users },
  { key: 'users_this_week', label: 'Users this week', icon: Users },
  { key: 'users_this_month', label: 'Users this month', icon: Users },
  { key: 'active_users', label: 'Active users', icon: Users },
  { key: 'payments_today', label: 'Payments today', icon: CreditCard },
  { key: 'payments_this_month', label: 'Payments this month', icon: CreditCard },
  { key: 'total_revenue', label: 'Total revenue', icon: TrendingUp },
  { key: 'active_subscriptions', label: 'Active subscriptions', icon: Repeat },
  { key: 'referral_payouts_pending', label: 'Referral payouts pending', icon: Wallet },
];

function formatRevenue(rev: RevenueByCurrency | number): React.ReactNode {
  if (typeof rev === 'number') return `${rev.toLocaleString('uz-UZ')} so'm`;
  const uzs = Number(rev.UZS ?? 0).toLocaleString('uz-UZ');
  const usd = Number(rev.USD ?? 0).toLocaleString();
  const rub = Number(rev.RUB ?? 0).toLocaleString();
  return (
    <span className="block space-y-0.5 text-lg">
      <span className="block">{uzs} so'm</span>
      <span className="block text-slate-600">${usd}</span>
      <span className="block text-slate-600">{rub} ₽</span>
    </span>
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
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 flex items-center gap-2 text-red-700">
        <AlertCircle className="h-5 w-5 shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ key, label, icon: Icon }) => {
          const val = stats?.[key];
          const isRevenue = key === 'payments_today' || key === 'payments_this_month' || key === 'total_revenue';
          return (
            <div
              key={key}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-lg bg-indigo-100 p-2">
                  <Icon className="h-5 w-5 text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-slate-500">{label}</span>
              </div>
              <p className="text-2xl font-semibold text-slate-800">
                {isRevenue && val !== undefined
                  ? formatRevenue(typeof val === 'object' && val !== null && 'UZS' in val ? (val as RevenueByCurrency) : Number(val))
                  : (val ?? 0)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
