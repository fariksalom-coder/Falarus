import { useNavigate, useLocation } from 'react-router-dom';
import { House, BookMarked, BarChart3, Trophy, User } from 'lucide-react';

const BORDER = '#E2E8F0';
const TEXT_SECONDARY = '#64748B';
const PRIMARY = '#6D35D2';
const PRIMARY_DARK = '#0EA5E9';

export default function AppNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const isActive = (paths: string[]) =>
    paths.some((p) => (p === '/' ? path === '/' : path === p || path.startsWith(p + '/')));

  const btn = (to: string, paths: string[], label: string, Icon: typeof House) => {
    const active = isActive(paths);
    return (
      <button
        type="button"
        aria-label={label}
        onClick={() => navigate(to)}
        className="flex min-w-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-all duration-200"
        style={{
          background: active ? 'linear-gradient(135deg,#6E2DE2 0%,#7C3AED 100%)' : 'transparent',
          color: active ? '#fff' : TEXT_SECONDARY,
          boxShadow: active ? `inset 0 0 0 2px ${PRIMARY_DARK}, 0 10px 22px rgba(109,53,210,0.18)` : 'none',
        }}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="text-[10px] font-semibold leading-none sm:text-[11px]">{label}</span>
      </button>
    );
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur-sm"
      style={{ borderColor: BORDER }}
    >
      <div className="mx-auto flex h-[78px] max-w-[820px] items-center justify-between gap-2 px-4 sm:px-5">
        {btn('/', ['/'], "Bosh sahifa", House)}
        {btn('/vocabulary', ['/vocabulary'], "Lug'at", BookMarked)}
        {btn('/statistika', ['/statistika'], 'Statistika', BarChart3)}
        {btn('/reyting', ['/reyting'], 'Reyting', Trophy)}
        {btn('/profile', ['/profile'], 'Profil', User)}
      </div>
    </header>
  );
}
