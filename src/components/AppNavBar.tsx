import { useNavigate, useLocation } from 'react-router-dom';
import { prefetchRoutePath } from '../routeModules';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  {
    to: '/',
    paths: ['/', '/russian'],
    label: 'FalaRus',
    inactive: '/app-mobile/icons/nav/nav_home.svg',
    active: '/app-mobile/icons/nav/nav_home_active.svg',
    className: 'h-[22px] w-6',
  },
  {
    to: '/partner',
    paths: ['/partner'],
    label: 'Suhbat',
    inactive: '/app-mobile/icons/nav/nav_kunlik.svg',
    active: '/app-mobile/icons/nav/nav_kunlik_active.svg',
    className: 'h-6 w-6',
  },
  {
    to: '/teachers',
    paths: ['/teachers'],
    label: 'O‘qituvchilar',
    inactive: '/app-mobile/icons/nav/nav_kurslar.svg',
    active: '/app-mobile/icons/nav/nav_kurslar_active.svg',
    className: 'h-6 w-7',
  },
  {
    to: '/statistika',
    paths: ['/statistika'],
    label: 'Statistika',
    inactive: '/app-mobile/icons/nav/nav_statistika.svg',
    active: '/app-mobile/icons/nav/nav_statistika_active.svg',
    className: 'h-6 w-6',
  },
  {
    to: '/profile',
    paths: ['/profile'],
    label: 'Profil',
    inactive: '/app-mobile/icons/nav/nav_profil.svg',
    active: '/app-mobile/icons/nav/nav_profil_active.svg',
    className: 'h-6 w-6',
  },
] as const;

export default function AppNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const path = location.pathname;
  const profilePath = user?.accountType === 'teacher' ? '/teacher-cabinet' : '/profile';

  const isActive = (paths: string[]) =>
    paths.some((p) => (p === '/' ? path === '/' : path === p || path.startsWith(p + '/')));

  return (
    <header
      className="fixed bottom-0 left-0 right-0 z-50 bg-white pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="mx-auto flex h-[59px] max-w-[820px] items-center justify-between">
        {NAV_ITEMS.map((item) => {
          const itemTo = item.to === '/profile' ? profilePath : item.to;
          const itemPaths = item.to === '/profile' ? ['/profile', '/teacher-cabinet'] : [...item.paths];
          const active = isActive(itemPaths);
          return (
            <button
              key={item.to}
              type="button"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(itemTo)}
              onMouseEnter={() => prefetchRoutePath(itemTo)}
              onTouchStart={() => prefetchRoutePath(itemTo)}
              onFocus={() => prefetchRoutePath(itemTo)}
              className="flex h-[59px] min-w-0 flex-1 items-center justify-center transition-opacity active:opacity-70"
            >
              <img
                src={active ? item.active : item.inactive}
                alt=""
                aria-hidden
                className={item.className}
                decoding="async"
              />
            </button>
          );
        })}
      </div>
    </header>
  );
}
