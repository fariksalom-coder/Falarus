import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Home, ListOrdered, LogOut, PhoneCall } from 'lucide-react';
import { useSalesCrmAuth } from './auth';

const nav = [
  { to: '/', label: 'Asosiy', icon: Home, end: true },
  { to: '/leads', label: 'Doska', icon: ListOrdered },
  { to: '/tasks', label: 'Vazifalar', icon: PhoneCall },
  { to: '/stats', label: 'Statistika', icon: BarChart3 },
];

export default function SalesCrmLayout() {
  const { agent, tasks, logout } = useSalesCrmAuth();
  const navigate = useNavigate();
  const badge = (tasks?.overdue ?? 0) + (tasks?.today ?? 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-2.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">FalaRus</p>
            <h1 className="text-sm font-bold">Sales CRM · {agent?.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {badge > 0 ? (
              <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
                {badge}
              </span>
            ) : null}
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm text-slate-500 hover:bg-slate-100"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              <LogOut size={18} />
              Chiqish
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-4 pb-3">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `inline-flex min-h-11 min-w-[4.5rem] flex-1 items-center justify-center gap-1.5 rounded-2xl px-2 text-xs font-semibold transition sm:text-sm ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-900'
                  }`
                }
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-5 pb-28">
        <Outlet />
      </main>
    </div>
  );
}
