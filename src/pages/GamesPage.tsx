import { useEffect, useState } from 'react';
import { ArrowRight, Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchWordSwipeProgress } from '../api/wordSwipeGame';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { prefetchRoutePath } from '../routeModules';

const GAMES = [
  {
    id: 'word-swipe',
    href: '/games/word-swipe',
    titleKey: 'games.wordSwipeTitle',
    subtitleKey: 'games.wordSwipeSubtitle',
    accent: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 48%, #E0E7FF 100%)',
  },
] as const;

export default function GamesPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { token } = useAuth();
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [continueHref, setContinueHref] = useState('/games/word-swipe');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        setProgressLabel(null);
        setContinueHref('/games/word-swipe');
        return;
      }

      const progress = await fetchWordSwipeProgress(token);
      if (cancelled) return;

      if (progress) {
        setContinueHref(`/games/word-swipe/${progress.levelNumber}/${progress.stageNumber}`);
        setProgressLabel(
          t('games.currentProgress', {
            level: progress.levelNumber,
            stage: progress.stageNumber,
          }),
        );
      } else {
        setContinueHref('/games/word-swipe/1/1');
        setProgressLabel(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [t, token]);

  const handleContinue = () => {
    if (!token) {
      navigate('/login', { state: { from: continueHref } });
      return;
    }
    navigate(continueHref);
  };

  const handleOpenGame = () => {
    prefetchRoutePath('/games/word-swipe');
    if (!token) {
      navigate('/login', { state: { from: '/games/word-swipe' } });
      return;
    }
    navigate('/games/word-swipe');
  };

  return (
    <div className="min-h-screen bg-app-bg-muted pb-[84px]">
      <main className="mx-auto w-full max-w-[820px] px-4 pt-4">
        <h1 className="text-[26px] font-extrabold text-app-text">{t('games.title')}</h1>
        <p className="mt-1 text-sm font-medium text-app-text-muted">{t('games.wordSwipeSubtitle')}</p>

        <div className="mt-5 space-y-3">
          {GAMES.map((game) => (
            <div
              key={game.id}
              className="overflow-hidden rounded-[24px] border border-app-border shadow-app-card"
              style={{ background: game.accent }}
            >
              <button
                type="button"
                onClick={handleOpenGame}
                onMouseEnter={() => prefetchRoutePath(game.href)}
                onTouchStart={() => prefetchRoutePath(game.href)}
                onFocus={() => prefetchRoutePath(game.href)}
                className="w-full px-4 py-4 text-left transition-transform active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-white/90 text-[#2563EB] shadow-[0_12px_28px_rgba(37,99,235,0.18)]">
                    <Gamepad2 className="h-8 w-8" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[20px] font-extrabold leading-tight text-app-text">
                      {t(game.titleKey)}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-app-text-muted">{t(game.subtitleKey)}</p>
                    {token && progressLabel ? (
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#2563EB]">
                        {progressLabel}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/85 text-slate-500">
                    <ArrowRight className="h-5 w-5" aria-hidden />
                  </div>
                </div>
              </button>

              <div className="border-t border-white/50 px-4 pb-4">
                <button
                  type="button"
                  onClick={handleContinue}
                  onMouseEnter={() => prefetchRoutePath(continueHref)}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] text-sm font-bold text-white"
                >
                  {token ? t('games.continue') : t('games.loginToPlay')}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
