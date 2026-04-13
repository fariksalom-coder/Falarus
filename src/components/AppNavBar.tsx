import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { House, Users, BarChart3, User } from 'lucide-react';
import { prefetchRoutePath } from '../routeModules';
import { useAuth } from '../context/AuthContext';
import { getPartnerStatus, getChatMessages } from '../api/partner';

const BORDER = '#E2E8F0';

export default function AppNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const { token, user } = useAuth();
  const [hasUnreadPartnerMessage, setHasUnreadPartnerMessage] = useState(false);

  const partnerLastSeenKey = user ? `partner_last_seen_at_${user.id}` : null;

  useEffect(() => {
    if (!partnerLastSeenKey) return;
    if (path.startsWith('/partner')) {
      localStorage.setItem(partnerLastSeenKey, new Date().toISOString());
      setHasUnreadPartnerMessage(false);
    }
  }, [partnerLastSeenKey, path]);

  useEffect(() => {
    if (!token || !user?.id || path.startsWith('/partner')) return;

    let cancelled = false;
    const run = async () => {
      try {
        const status = await getPartnerStatus(token);
        if (!status.match) {
          if (!cancelled) setHasUnreadPartnerMessage(false);
          return;
        }

        const messages = await getChatMessages(token, status.match.id);
        const latest = messages[messages.length - 1];
        if (!latest) {
          if (!cancelled) setHasUnreadPartnerMessage(false);
          return;
        }

        const lastSeenAt = partnerLastSeenKey ? localStorage.getItem(partnerLastSeenKey) : null;
        const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
        const latestMs = new Date(latest.created_at).getTime();
        const isUnread = latest.sender_id !== user.id && latestMs > lastSeenMs;

        if (!cancelled) setHasUnreadPartnerMessage(isUnread);
      } catch {
        // keep previous badge state on transient network errors
      }
    };

    void run();
    const interval = setInterval(() => void run(), 12000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, user?.id, path, partnerLastSeenKey]);

  const isActive = (paths: string[]) =>
    paths.some((p) => (p === '/' ? path === '/' : path === p || path.startsWith(p + '/')));

  const btn = (
    to: string,
    paths: string[],
    label: string,
    Icon: typeof House,
    showBadge?: boolean
  ) => {
    const active = isActive(paths);
    return (
      <button
        type="button"
        aria-label={label}
        onClick={() => navigate(to)}
        onMouseEnter={() => prefetchRoutePath(to)}
        onTouchStart={() => prefetchRoutePath(to)}
        onFocus={() => prefetchRoutePath(to)}
        className="flex min-h-[44px] min-w-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-colors duration-200"
      >
        <span className="relative inline-flex">
          <Icon
            className={`h-5 w-5 shrink-0 ${active ? 'text-blue-600' : 'text-slate-500'}`}
            aria-hidden
          />
          {showBadge ? (
            <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          ) : null}
        </span>
        <span
          className={`text-[10px] leading-none sm:text-[11px] ${active ? 'font-bold text-slate-900' : 'font-medium text-slate-500'}`}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <header
      className="fixed bottom-0 left-0 right-0 z-50 border-t sm:bottom-auto sm:top-0 sm:border-b sm:border-t-0 bg-white/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom,0px)] sm:pb-0 sm:pt-[env(safe-area-inset-top,0px)]"
      style={{ borderColor: BORDER }}
    >
      <div className="mx-auto flex h-[78px] max-w-[820px] items-center justify-between gap-2 px-4 sm:px-5">
        {btn('/', ['/', '/russian'], "Bosh sahifa", House)}
        {btn('/partner', ['/partner'], 'Sherik', Users, hasUnreadPartnerMessage)}
        {btn('/statistika', ['/statistika'], 'Statistika', BarChart3)}
        {btn('/profile', ['/profile'], 'Profil', User)}
      </div>
    </header>
  );
}
