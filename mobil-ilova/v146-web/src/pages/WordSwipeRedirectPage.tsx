import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWordSwipeProgress } from '../api/wordSwipeGame';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

export default function WordSwipeRedirectPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLocale();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        navigate('/login', { replace: true, state: { from: '/games/word-swipe' } });
        return;
      }

      const progress = await fetchWordSwipeProgress(token);
      if (cancelled) return;

      if (progress) {
        navigate(`/games/word-swipe/${progress.levelNumber}/${progress.stageNumber}`, {
          replace: true,
        });
        return;
      }

      navigate('/games/word-swipe/1/1', { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg-muted px-4">
      <p className="text-sm font-semibold text-app-text-muted">{t('common.loading')}</p>
    </div>
  );
}
