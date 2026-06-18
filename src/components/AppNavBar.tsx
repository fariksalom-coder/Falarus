import { useNavigate, useLocation } from 'react-router-dom';
import { Gamepad2, type LucideIcon } from 'lucide-react';
import { prefetchRoutePath } from '../routeModules';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

const NAV_ITEMS: Array<{
  to: string;
  paths: string[];
  labelKey: string;
  inactive: string;
  active: string;
  className: string;
  lucideIcon?: LucideIcon;
}> = [
  {
    to: '/',
    paths: ['/', '/russian'],
    labelKey: 'nav.home',
    inactive: '/app-mobile/icons/nav/nav_home.svg',
    active: '/app-mobile/icons/nav/nav_home_active.svg',
    className: 'h-[22px] w-6',
  },
  {
    to: '/games',
    paths: ['/games'],
    labelKey: 'nav.games',
    inactive: '',
    active: '',
    className: 'h-6 w-6',
    lucideIcon: Gamepad2,
  },
  {
    to: '/partner',
    paths: ['/partner'],
    labelKey: 'nav.partner',
    inactive: '/app-mobile/icons/nav/nav_kunlik.svg',
    active: '/app-mobile/icons/nav/nav_kunlik_active.svg',
    className: 'h-6 w-6',
  },
  {
    to: '/teachers',
    paths: ['/teachers'],
    labelKey: 'nav.teachers',
    inactive: '/app-mobile/icons/nav/nav_kurslar.svg',
    active: '/app-mobile/icons/nav/nav_kurslar_active.svg',
    className: 'h-6 w-7',
  },
  {
    to: '/statistika',
    paths: ['/statistika'],
    labelKey: 'nav.stats',
    inactive: '/app-mobile/icons/nav/nav_statistika.svg',
    active: '/app-mobile/icons/nav/nav_statistika_active.svg',
    className: 'h-6 w-6',
  },
  {
    to: '/profile',
    paths: ['/profile'],
    labelKey: 'nav.profile',
    inactive: '/app-mobile/icons/nav/nav_profil.svg',
    active: '/app-mobile/icons/nav/nav_profil_active.svg',
    className: 'h-6 w-6',
  },
];

export default function AppNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLocale();
  const path = location.pathname;
  const profilePath = user?.accountType === 'teacher' ? '/teacher-cabinet' : '/profile';

  const isActive = (paths: string[]) =>
    paths.some((p) => (p === '/' ? path === '/' : path === p || path.startsWith(p + '/')));

  return (
    <header
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-app-border bg-app-nav pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="mx-auto flex h-[59px] max-w-[820px] items-center justify-between">
        {NAV_ITEMS.map((item) => {
          const itemTo = item.to === '/profile' ? profilePath : item.to;
          const itemPaths = item.to === '/profile' ? ['/profile', '/teacher-cabinet'] : [...item.paths];
          const active = isActive(itemPaths);
          const Lucide = item.lucideIcon;
          return (
            <button
              key={item.to}
              type="button"
              aria-label={t(item.labelKey)}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(itemTo)}
              onMouseEnter={() => prefetchRoutePath(itemTo)}
              onTouchStart={() => prefetchRoutePath(itemTo)}
              onFocus={() => prefetchRoutePath(itemTo)}
              className="flex h-[59px] min-w-0 flex-1 items-center justify-center outline-none transition-opacity active:opacity-70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-primary/35"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
                  active ? 'bg-app-primary/12' : ''
                }`}
              >
                {Lucide ? (
                  <Lucide
                    className={`h-6 w-6 ${active ? 'text-app-primary' : 'text-app-icon-fg'}`}
                    aria-hidden
                  />
                ) : (
                  <img
                    src={active ? item.active : item.inactive}
                    alt=""
                    aria-hidden
                    className={`${item.className} ${active ? 'nav-icon-active' : 'nav-icon'}`}
                    decoding="async"
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
