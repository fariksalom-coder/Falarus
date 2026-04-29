import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Repeat,
  Wallet,
  MessageSquare,
  Settings,
  Banknote,
  DollarSign,
  LogOut,
  BookOpen,
  Video,
} from 'lucide-react';
import { getAdminHelpChats } from '../../api/admin';

const nav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/fossils-payments', label: 'Fossils Payments', icon: Video },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: Repeat },
  { to: '/admin/referrals', label: 'Referrals', icon: Wallet },
  { to: '/admin/support', label: 'Yozishmalar', icon: MessageSquare },
  { to: '/admin/payment-methods', label: 'Payment Methods', icon: Banknote },
  { to: '/admin/tariff-pricing', label: 'Tariff Pricing', icon: DollarSign },
  { to: '/admin/pricing', label: 'Pricing', icon: Settings },
  { to: '/admin/grammar', label: 'Grammar', icon: BookOpen },
];

export default function AdminLayout() {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const run = async () => {
      try {
        const chats = await getAdminHelpChats();
        const totalUnread = (chats ?? []).reduce((acc, c) => acc + Number(c.unread_count ?? 0), 0);
        if (!cancelled) setUnreadSupportCount(totalUnread);
      } catch {
        // Keep previous counter on transient errors.
      } finally {
        if (!cancelled) timer = window.setTimeout(() => void run(), 10_000);
      }
    };

    void run();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-56 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <span className="font-semibold text-slate-100">FalaRus Admin</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {to === '/admin/support' && unreadSupportCount > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadSupportCount > 99 ? '99+' : unreadSupportCount}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 w-full"
          >
            <LogOut className="h-5 w-5" />
            Chiqish
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
