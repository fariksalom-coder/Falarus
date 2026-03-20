import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import * as accessApi from '../api/access';

/**
 * Same lock rules as Dashboard: server list for free tier, or all open if subscribed / fallback.
 */
export function useLessonsSubscriptionLock(): {
  isLessonLockedBySubscription: (lessonId: number) => boolean;
  loaded: boolean;
} {
  const { token } = useAuth();
  const { access } = useAccess();
  const cachedLessons = accessApi.getCachedLessons();
  const [lessonsLockMap, setLessonsLockMap] = useState<Record<number, boolean>>(() =>
    cachedLessons ? Object.fromEntries(cachedLessons.map((l) => [l.id, l.locked])) : {}
  );
  const [loaded, setLoaded] = useState(!!cachedLessons?.length);

  useEffect(() => {
    if (!token) {
      setLessonsLockMap({});
      setLoaded(true);
      return;
    }
    const cached = accessApi.getCachedLessons();
    if (cached?.length) {
      setLessonsLockMap(Object.fromEntries(cached.map((l) => [l.id, l.locked])));
      setLoaded(true);
    } else {
      setLoaded(false);
    }
    accessApi
      .getLessons(token)
      .then((list) => {
        setLessonsLockMap(Object.fromEntries(list.map((l) => [l.id, l.locked])));
        accessApi.setCachedLessons(list);
      })
      .catch(() => {
        if (access?.subscription_active) {
          setLessonsLockMap({});
        }
      })
      .finally(() => setLoaded(true));
  }, [token, access?.subscription_active]);

  const isLessonLockedBySubscription = (lessonId: number) => {
    if (access?.subscription_active) return false;
    if (lessonsLockMap[lessonId] !== undefined) return lessonsLockMap[lessonId];
    return lessonId > 3;
  };

  return { isLessonLockedBySubscription, loaded };
}
