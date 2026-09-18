import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, Crown, LayoutDashboard, ListOrdered, Loader, LogOut } from 'lucide-react';
import { useSupportCrmAuth } from '../../context/SupportCrmAuthContext';
import { supportCrmPath } from '../../constants/supportCrmPath';

const nav = [
  { to: supportCrmPath('/dashboard'), label: 'Dashboard', icon: LayoutDashboard },
  { to: supportCrmPath('/queue'), label: 'Navbat', icon: ListOrdered },
  { to: supportCrmPath('/return'), label: 'Qaytish', icon: Activity },
  { to: supportCrmPath('/premium'), label: 'Premium', icon: Crown },
  { to: supportCrmPath('/in-progress'), label: 'Jarayonda', icon: Loader },
];

export default function SupportCrmLayout() {
  const { logout } = useSupportCrmAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-app-bg-muted text-app-text">
      <header className="sticky top-0 z-20 border-b border-app-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-app-muted">FalaRus</p>
            <h1 className="text-sm font-semibold text-app-text">Support CRM</h1>
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm text-app-muted hover:bg-app-bg-muted hover:text-app-text"
            onClick={() => {
              logout();
              navigate(supportCrmPath('/login'), { replace: true });
            }}
          >
            <LogOut size={18} />
            Chiqish
          </button>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-3">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `inline-flex min-h-11 min-w-[4.5rem] flex-1 items-center justify-center gap-1.5 rounded-2xl px-2 text-xs font-medium transition sm:gap-2 sm:px-3 sm:text-sm ${
                    isActive
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'bg-white text-app-muted ring-1 ring-app-border hover:text-app-text'
                  }`
                }
              >
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5 pb-24">
        <Outlet />
      </main>
    </div>
  );
}
