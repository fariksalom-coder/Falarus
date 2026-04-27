import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import * as accessApi from '../api/access';

type LessonsLockSnapshot = {
  token: string | null;
  map: Record<number, boolean>;
  loaded: boolean;
};

let shared: LessonsLockSnapshot = {
  token: null,
  map: {},
  loaded: false,
};
let inFlight: Promise<void> | null = null;
const listeners = new Set<(snapshot: LessonsLockSnapshot) => void>();

function emitShared() {
  listeners.forEach((listener) => listener(shared));
}

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
  const initialMap = cachedLessons ? Object.fromEntries(cachedLessons.map((l) => [l.id, l.locked])) : {};
  const [lessonsLockMap, setLessonsLockMap] = useState<Record<number, boolean>>(
    () => (shared.token === token ? shared.map : initialMap)
  );
  const [loaded, setLoaded] = useState(shared.token === token ? shared.loaded : !!cachedLessons?.length);

  useEffect(() => {
    const onUpdate = (snapshot: LessonsLockSnapshot) => {
      if (snapshot.token !== token) return;
      setLessonsLockMap(snapshot.map);
      setLoaded(snapshot.loaded);
    };
    listeners.add(onUpdate);
    return () => {
      listeners.delete(onUpdate);
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      shared = { token: null, map: {}, loaded: true };
      emitShared();
      return;
    }
    if (shared.token === token && shared.loaded) {
      setLessonsLockMap(shared.map);
      setLoaded(true);
      return;
    }
    const cached = accessApi.getCachedLessons();
    if (cached?.length) {
      const map = Object.fromEntries(cached.map((l) => [l.id, l.locked]));
      shared = { token, map, loaded: true };
      emitShared();
    } else {
      setLoaded(false);
    }
    if (!inFlight) {
      inFlight = accessApi
        .getLessons(token)
        .then((list) => {
          const map = Object.fromEntries(list.map((l) => [l.id, l.locked]));
          shared = { token, map, loaded: true };
          accessApi.setCachedLessons(list);
        })
        .catch(() => {
          if (access?.subscription_active) {
            shared = { token, map: {}, loaded: true };
          } else {
            shared = { token, map: shared.token === token ? shared.map : {}, loaded: true };
          }
        })
        .finally(() => {
          inFlight = null;
          emitShared();
        });
    }
  }, [token, access?.subscription_active]);

  const isLessonLockedBySubscription = (lessonId: number) => {
    if (access?.subscription_active) return false;
    if (lessonsLockMap[lessonId] !== undefined) return lessonsLockMap[lessonId];
    return lessonId > 3;
  };

  return { isLessonLockedBySubscription, loaded };
}
