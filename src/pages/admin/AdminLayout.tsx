import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminPath } from '../../constants/adminPath';
import {
  Menu,
  X,
  ShieldBan,
  LayoutDashboard,
  BookOpen,
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
  Video,
} from 'lucide-react';
import { getAdminHelpChats } from '../../api/admin';

const nav = [
  { to: adminPath('/dashboard'), label: 'Umumiy holat', icon: LayoutDashboard },
  { to: adminPath('/content'), label: 'Kurs kontenti', icon: BookOpen },
  { to: adminPath('/onboarding'), label: "So'rovnoma", icon: ClipboardList },
  { to: adminPath('/users'), label: 'Foydalanuvchilar', icon: Users },
  { to: adminPath('/users/create'), label: 'Yangi foydalanuvchi', icon: UserPlus },
  { to: adminPath('/payments'), label: 'To‘lovlar', icon: CreditCard },
  { to: adminPath('/operators'), label: 'Operatorlar va cheklar', icon: Users },
  { to: adminPath('/teachers'), label: "O'qituvchilar", icon: GraduationCap },
  { to: adminPath('/teacher-trials'), label: 'Sinov darslari', icon: ClipboardList },
  { to: adminPath('/meet-rooms'), label: 'Video xonalar', icon: Video },
  { to: adminPath('/teacher-documents'), label: 'Hujjat tekshiruvi', icon: ClipboardList },
  { to: adminPath('/click-logs'), label: 'Click jurnali', icon: ScrollText },
  { to: adminPath('/referrals'), label: 'Takliflar', icon: Wallet },
  { to: adminPath('/support'), label: 'Yozishmalar', icon: MessageSquare },
  { to: adminPath('/chat-moderation'), label: 'Chat nazorati', icon: ShieldBan },
  { to: adminPath('/payment-methods'), label: 'To‘lov usullari', icon: Banknote },
  { to: adminPath('/tariff-pricing'), label: 'Tarif narxlari', icon: DollarSign },
] as const;

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
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

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  function handleLogout() {
    logout();
    // Admin panelidan chiqqach saytning o'ziga qaytadi: admin login sahifasida
    // qolib ketsa, boshqa hisobga kirish uchun manzilni qo'lda yozishga to'g'ri
    // kelardi.
    navigate('/', { replace: true });
  }

  return (
    <div className="admin-workspace min-h-screen bg-app-bg-muted">
      <header className="flex items-center justify-between border-b border-app-border bg-app-surface px-4 py-3 lg:hidden">
        <strong>FalaRus Admin</strong>
        <button type="button" aria-expanded={menuOpen} aria-controls="admin-navigation" aria-label={menuOpen ? 'Menyuni yopish' : 'Menyuni ochish'} onClick={() => setMenuOpen(!menuOpen)} className="ui-button ui-button--secondary">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </header>
      <aside
        id="admin-navigation"
        className={`${menuOpen ? 'flex' : 'hidden'} relative w-full shrink-0 flex-col text-white lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[224px] lg:overflow-y-auto`}
        style={{ background: 'var(--app-primary-deep)' }}
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
                `flex items-center gap-[11px] rounded-[9px] px-3 min-h-[44px] py-[9px] text-[13.5px] font-semibold transition-colors ${
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
            className="flex w-full items-center gap-[11px] rounded-[9px] px-3 min-h-[44px] py-[9px] text-[13.5px] font-semibold text-[#8A97AD] hover:bg-white/8 hover:text-white"
          >
            <LogOut className="h-[17px] w-[17px]" />
            Chiqish
          </button>
        </div>
      </aside>
      <main className="min-h-screen min-w-0 overflow-x-auto p-4 lg:ml-[224px] lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
