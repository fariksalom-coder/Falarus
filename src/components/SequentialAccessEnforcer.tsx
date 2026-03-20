import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSequentialLesson } from '../context/SequentialLessonContext';
import { parseTaskNumberFromPathname } from '../lib/lessonUrlTaskMapping';
import { LESSONS } from '../data/lessonsList';
import { useLessonsSubscriptionLock } from '../hooks/useLessonsSubscriptionLock';

/**
 * Redirects away from lesson routes that are not allowed by subscription or sequential progress.
 */
export function SequentialAccessEnforcer() {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isReady, isLessonAccessible, isTaskAccessible } = useSequentialLesson();
  const { isLessonLockedBySubscription, loaded: subLoaded } = useLessonsSubscriptionLock();

  useEffect(() => {
    if (!token || !isReady || !subLoaded) return;
    const pathname = location.pathname;
    if (!pathname.startsWith('/lesson-')) return;

    const parsed = parseTaskNumberFromPathname(pathname);
    if (!parsed) return;

    const { lessonPath, taskNumber } = parsed;
    const lessonMeta = LESSONS.find((l) => l.path === lessonPath);
    if (!lessonMeta) return;

    if (isLessonLockedBySubscription(lessonMeta.id)) {
      navigate('/', { replace: true });
      return;
    }

    if (!isLessonAccessible(lessonPath)) {
      navigate('/', { replace: true });
      return;
    }

    if (taskNumber != null && !isTaskAccessible(lessonPath, taskNumber)) {
      navigate(lessonPath, { replace: true });
    }
  }, [
    token,
    isReady,
    subLoaded,
    location.pathname,
    navigate,
    isLessonAccessible,
    isTaskAccessible,
    isLessonLockedBySubscription,
  ]);

  return null;
}
