import { useNavigate, useLocation } from 'react-router-dom';
import { House, BookMarked, BarChart3, Trophy, User } from 'lucide-react';

const BORDER = '#E2E8F0';
const TEXT_SECONDARY = '#64748B';
const PRIMARY = '#6366F1';

export default function AppNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const isActive = (paths: string[]) =>
    paths.some((p) => (p === '/' ? path === '/' : path === p || path.startsWith(p + '/')));

  const btn = (to: string, paths: string[], ariaLabel: string, Icon: typeof House) => {
    const active = isActive(paths);
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => navigate(to)}
        className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
        style={{
          backgroundColor: active ? PRIMARY : 'transparent',
          color: active ? '#fff' : TEXT_SECONDARY,
        }}
      >
        <Icon className="h-5 w-5" />
      </button>
    );
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur-sm"
      style={{ borderColor: BORDER }}
    >
      <div className="mx-auto flex h-14 max-w-[720px] items-center justify-between px-4">
        {btn('/', ['/'], "Bosh sahifa", House)}
        {btn('/vocabulary', ['/vocabulary'], "Lug'at", BookMarked)}
        {btn('/statistika', ['/statistika'], 'Statistika', BarChart3)}
        {btn('/reyting', ['/reyting'], 'Reyting', Trophy)}
        {btn('/profile', ['/profile'], 'Profil', User)}
      </div>
    </header>
  );
}
