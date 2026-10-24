import { useEffect, useState, type ComponentType } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminPath } from '../../constants/adminPath';
import { Bell, BookOpen, ChartColumn, CreditCard, Gift, GraduationCap, LayoutDashboard, LogOut, Menu, MessageSquare, Receipt, Users, X } from 'lucide-react';
import { getAdminUnreadCount } from '../../api/admin';
import './admin-workspace.css';

type Tab = { to: string; label: string; match?: (path: string) => boolean };
type Section = { label: string; icon: ComponentType<{ className?: string }>; tabs: Tab[] };

/*
 * Chap menyu — bo'limlar. Bir mavzudagi sahifalar bitta bo'limga yig'ilgan va
 * sahifa tepasida tab bo'lib chiqadi (2026-10-24: 21 banddan 9 taga; keyin «Bildirishnomalar» qo'shildi). Eski
 * manzillar o'zgarmagan, shuning uchun saqlangan havolalar ishlayveradi.
 * To'lov usullari, tarif narxlari va kiosk — «Umumiy holat» pastidagi kartalarda.
 */
const sections: Section[] = [
  { label: 'Umumiy holat', icon: LayoutDashboard, tabs: [
    { to: adminPath('/dashboard'), label: 'Umumiy holat' },
    { to: adminPath('/payment-methods'), label: 'To‘lov usullari' },
    { to: adminPath('/tariff-pricing'), label: 'Tarif narxlari' },
    { to: adminPath('/kiosk'), label: 'Test va chegirmalar' },
  ] },
  { label: 'Foydalanuvchilar', icon: Users, tabs: [
    { to: adminPath('/users'), label: 'Ro‘yxat', match: (p) => p === adminPath('/users') || /\/users\/\d+/.test(p) },
    { to: adminPath('/user-journey'), label: 'Foydalanuvchi yo‘li' },
    { to: adminPath('/users/manage'), label: 'Boshqaruv' },
    { to: adminPath('/users/create'), label: 'Yangi foydalanuvchi' },
    { to: adminPath('/onboarding'), label: 'So‘rovnoma' },
  ] },
  { label: 'To‘lovlar', icon: CreditCard, tabs: [{ to: adminPath('/payments'), label: 'To‘lovlar' }] },
  { label: 'Аналитика продаж', icon: ChartColumn, tabs: [{ to: adminPath('/sales-ledger'), label: 'Аналитика продаж' }] },
  { label: 'Operatorlar va cheklar', icon: Receipt, tabs: [{ to: adminPath('/operators'), label: 'Operatorlar va cheklar' }] },
  { label: 'Yozishmalar', icon: MessageSquare, tabs: [
    { to: adminPath('/support'), label: 'Yozishmalar' },
    { to: adminPath('/chat-moderation'), label: 'Chat nazorati' },
  ] },
  { label: 'Bildirishnomalar', icon: Bell, tabs: [{ to: adminPath('/notifications'), label: 'Bildirishnomalar' }] },
  { label: 'Referal dasturi', icon: Gift, tabs: [{ to: adminPath('/referrals'), label: 'Referal dasturi' }] },
  { label: 'Kurs kontenti', icon: BookOpen, tabs: [
    { to: adminPath('/content'), label: '182 kunlik kurs' },
    { to: adminPath('/dictation'), label: 'Diktant' },
    { to: adminPath('/video-lessons'), label: 'Filmlar bilan darslar' },
  ] },
  { label: "O'qituvchilar", icon: GraduationCap, tabs: [{ to: adminPath('/teachers'), label: "O'qituvchilar", match: (p) => p.startsWith(adminPath('/teachers')) }] },
];

const tabActive = (t: Tab, path: string) => (t.match ? t.match(path) : path === t.to);
const sectionOf = (path: string) => sections.find((s) => s.tabs.some((t) => tabActive(t, path)));

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
        if (document.visibilityState !== 'hidden') {
          const result = await getAdminUnreadCount();
          if (!cancelled) setUnreadSupportCount(result.count);
        }
      } catch {
        // Keep previous counter on transient errors.
      } finally {
        if (!cancelled) timer = window.setTimeout(() => void run(), 30_000);
      }
    };

    void run();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  const current = sectionOf(location.pathname);
  // Kiosk va to'lov sozlamalari menyuda yo'q — ular «Umumiy holat» kartalaridan ochiladi, tab satri kerak emas.
  const tabs = current && current.tabs.length > 1 && current.label !== 'Umumiy holat' ? current.tabs : null;

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
          {sections.map((sec) => {
            const on = current === sec;
            const Icon = sec.icon;
            const support = sec.tabs.some((t) => t.to === adminPath('/support'));
            return (
              <NavLink
                key={sec.label}
                to={sec.tabs[0].to}
                aria-current={on ? 'page' : undefined}
                className={`flex items-center gap-[11px] rounded-[9px] px-3 min-h-[44px] py-[9px] text-[13.5px] font-semibold transition-colors ${
                  on ? 'bg-[#0B2A6B] text-white' : 'text-[#8A97AD] hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon className="h-[17px] w-[17px] shrink-0" />
                <span className="min-w-0 flex-1 leading-snug">{sec.label}</span>
                {support && unreadSupportCount > 0 ? (
                  <span
                    className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[7px] text-[10px] font-extrabold text-white"
                    style={{ background: '#E5484D' }}
                  >
                    {unreadSupportCount > 99 ? '99+' : unreadSupportCount}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
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
        {tabs ? (
          <nav aria-label={current?.label} className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
            {tabs.map((t) => {
              const on = tabActive(t, location.pathname);
              return (
                <NavLink key={t.to} to={t.to} aria-current={on ? 'page' : undefined}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-2xl px-4 text-sm font-semibold transition active:scale-[0.98] ${
                    on ? 'bg-blue-600 text-white shadow-[0_12px_30px_-14px_rgba(37,99,235,0.7)]' : 'border border-app-border bg-app-surface text-app-text hover:border-blue-200 hover:bg-blue-50'
                  }`}>
                  {t.label}
                  {t.to === adminPath('/support') && unreadSupportCount > 0 ? (
                    <span className={`ml-2 rounded-full px-1.5 text-xs tabular-nums ${on ? 'bg-white/25' : 'bg-red-500 text-white'}`}>{unreadSupportCount > 99 ? '99+' : unreadSupportCount}</span>
                  ) : null}
                </NavLink>
              );
            })}
          </nav>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
}
