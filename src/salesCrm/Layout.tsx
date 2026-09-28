import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Home, ListOrdered, LogOut, Menu, PhoneCall, Target, Users, X } from 'lucide-react';
import { useSalesCrmAuth } from './auth';

const nav = [
  { to: '/', label: 'Asosiy', icon: Home, end: true },
  { to: '/leads', label: 'Lidlar', icon: ListOrdered },
  { to: '/tasks', label: 'Qo‘ng‘iroqlar', icon: PhoneCall },
  { to: '/plan', label: 'Reja', icon: Target },
  { to: '/stats', label: 'Hisobot', icon: BarChart3 },
  { to: '/operators', label: 'Operatorlar', icon: Users, adminOnly: true },
];

export default function SalesCrmLayout() {
  const { agent, tasks, logout } = useSalesCrmAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const badge = (tasks?.overdue ?? 0) + (tasks?.today ?? 0);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wide text-blue-600">FalaRus</p>
          <h1 className="truncate text-sm font-black leading-tight">Sales CRM</h1>
        </div>
        <div className="flex items-center gap-2">
          {badge > 0 ? (
            <NavLink
              to="/tasks"
              className="inline-flex min-h-10 items-center rounded-2xl bg-orange-50 px-3 text-sm font-black text-orange-700 ring-1 ring-orange-100"
            >
              {badge}
            </NavLink>
          ) : null}
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="sales-crm-navigation"
            aria-label={menuOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
            onClick={() => setMenuOpen((open) => !open)}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <aside
        id="sales-crm-navigation"
        className={`${menuOpen ? 'flex' : 'hidden'} z-20 w-full shrink-0 flex-col bg-[#071B3A] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[244px]`}
      >
        <div className="flex min-h-[96px] items-center gap-3 border-b border-white/10 px-5">
          <img src="/landing/falarus-mark.svg" alt="" className="h-[22px] w-[30px] brightness-0 invert" />
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-blue-300">FalaRus</p>
            <h1 className="truncate text-[15px] font-black leading-tight text-white">Sales CRM</h1>
            <p className="truncate text-[12px] font-semibold text-blue-100/70">{agent?.name || 'CRM Admin'}</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.filter((item) => !item.adminOnly || agent?.role === 'admin').map((item) => {
            const Icon = item.icon;
            const showBadge = item.to === '/tasks' && badge > 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13.5px] font-bold transition ${
                    isActive
                      ? 'bg-white text-[#071B3A] shadow-sm'
                      : 'text-blue-100/62 hover:bg-white/8 hover:text-white'
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {showBadge ? (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-500 px-2 text-[11px] font-black text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[13.5px] font-bold text-blue-100/62 hover:bg-white/8 hover:text-white"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut className="h-[18px] w-[18px]" />
            Chiqish
          </button>
        </div>
      </aside>

      <main className="mx-auto max-w-[1440px] px-4 py-4 pb-28 lg:ml-[244px] lg:px-6 lg:py-6">
        <Outlet />
      </main>
    </div>
  );
}
