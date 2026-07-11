import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminPath } from '../../constants/adminPath';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CreditCard,
  Wallet,
  MessageSquare,
  Banknote,
  DollarSign,
  LogOut,
  ScrollText,
  GraduationCap,
  ClipboardList,
} from 'lucide-react';
import { getAdminHelpChats } from '../../api/admin';

const nav = [
  { to: adminPath('/dashboard'), label: 'Dashboard', icon: LayoutDashboard },
  { to: adminPath('/users'), label: 'Users', icon: Users },
  { to: adminPath('/users/create'), label: 'Yangi foydalanuvchi', icon: UserPlus },
  { to: adminPath('/payments'), label: 'Payments', icon: CreditCard },
  { to: adminPath('/teachers'), label: "O'qituvchilar", icon: GraduationCap },
  { to: adminPath('/teacher-trials'), label: 'Sinov darslari', icon: ClipboardList },
  { to: adminPath('/click-logs'), label: 'Click logs', icon: ScrollText },
  { to: adminPath('/referrals'), label: 'Referrals', icon: Wallet },
  { to: adminPath('/support'), label: 'Yozishmalar', icon: MessageSquare },
  { to: adminPath('/payment-methods'), label: 'Payment Methods', icon: Banknote },
  { to: adminPath('/tariff-pricing'), label: 'Tariff Pricing', icon: DollarSign },
] as const;

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
    navigate(adminPath('/login'), { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <aside
        className="fixed inset-y-0 left-0 flex w-[216px] shrink-0 flex-col text-white"
        style={{ background: '#0C1526' }}
      >
        <div
          className="flex items-center gap-2.5 px-[18px] py-4"
          style={{ borderBottom: '1px solid #1C2740' }}
        >
          <img
            src="/landing/falarus-mark.svg"
            alt=""
            className="h-[18px] w-[24px]"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <span className="text-[15px] font-extrabold text-white">FalaRus Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-[2px] p-[10px]">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === adminPath('/users')}
              className={({ isActive }) =>
                `flex items-center gap-[11px] rounded-[9px] px-3 py-[9px] text-[13.5px] font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#0B2A6B] text-white'
                    : 'text-[#8A97AD] hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <Icon className="h-[17px] w-[17px] shrink-0" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {to === adminPath('/support') && unreadSupportCount > 0 ? (
                <span
                  className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[7px] text-[10px] font-extrabold text-white"
                  style={{ background: '#E5484D' }}
                >
                  {unreadSupportCount > 99 ? '99+' : unreadSupportCount}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="p-[10px]" style={{ borderTop: '1px solid #1C2740' }}>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-[11px] rounded-[9px] px-3 py-[9px] text-[13.5px] font-semibold text-[#8A97AD] hover:bg-white/8 hover:text-white"
          >
            <LogOut className="h-[17px] w-[17px]" />
            Chiqish
          </button>
        </div>
      </aside>
      <main className="min-h-screen ml-[216px] overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
