import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAccess, getCachedAccess, setCachedAccess, type AccessInfo } from '../api/access';
import { useAuth } from './AuthContext';

const defaultAccess: AccessInfo = {
  lessons_free_limit: 3,
  vocabulary_free_topic: 1,
  vocabulary_free_subtopic: 1,
  subscription_active: false,
  patent_course_active: false,
  vnzh_course_active: false,
  vocabulary_free_topic_id: null,
  vocabulary_free_subtopic_id: null,
};

interface AccessContextType {
  /** Current access info. Use this for lock/unlock UI; do not call getAccess() on every page. */
  access: AccessInfo | null;
  /** True once access has been fetched at least once (or user has no token). */
  accessLoaded: boolean;
  /** Re-fetch access from server. Call after payment confirmation or when subscription may have changed. */
  refreshAccess: () => Promise<void>;
}

const AccessContext = createContext<AccessContextType | undefined>(undefined);

function isExpiredByProfile(planExpiresAt?: string | null): boolean {
  if (!planExpiresAt) return false;
  const ts = Date.parse(planExpiresAt);
  if (!Number.isFinite(ts)) return false;
  return ts <= Date.now();
}

function normalizeAccessForExpiredPlan(
  access: AccessInfo,
  planExpiresAt?: string | null
): AccessInfo {
  if (!isExpiredByProfile(planExpiresAt)) return access;
  return {
    ...access,
    subscription_active: false,
    patent_course_active: false,
    vnzh_course_active: false,
  };
}

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [access, setAccessState] = useState<AccessInfo | null>(() => {
    const cached = getCachedAccess();
    return cached ? normalizeAccessForExpiredPlan(cached, user?.planExpiresAt) : null;
  });
  const [accessLoaded, setAccessLoaded] = useState(!!getCachedAccess());

  const refreshAccess = useCallback(async () => {
    const t = token ?? localStorage.getItem('token');
    if (!t) {
      setAccessState(null);
      setAccessLoaded(true);
      return;
    }
    try {
      const data = await getAccess(t);
      const normalized = normalizeAccessForExpiredPlan(data, user?.planExpiresAt);
      setAccessState(normalized);
      setCachedAccess(normalized);
    } catch {
      setAccessState(defaultAccess);
    } finally {
      setAccessLoaded(true);
    }
  }, [token, user?.planExpiresAt]);

  useEffect(() => {
    if (!token) {
      setAccessState(null);
      setAccessLoaded(true);
      return;
    }
    const cached = getCachedAccess();
    if (cached) {
      setAccessState(normalizeAccessForExpiredPlan(cached, user?.planExpiresAt));
      setAccessLoaded(true);
    } else {
      setAccessLoaded(false);
    }
    getAccess(token)
      .then((data) => {
        const normalized = normalizeAccessForExpiredPlan(data, user?.planExpiresAt);
        setAccessState(normalized);
        setCachedAccess(normalized);
      })
      .catch(() => setAccessState(defaultAccess))
      .finally(() => setAccessLoaded(true));
  }, [token, user?.planExpiresAt]);

  return (
    <AccessContext.Provider value={{ access, accessLoaded, refreshAccess }}>
      {children}
    </AccessContext.Provider>
  );
}

/**
 * Returns access state and refresh. Access is fetched once when the provider mounts (if token exists);
 * use refreshAccess() after login, payment confirm, or when access may have changed.
 */
export function useAccess() {
  const context = useContext(AccessContext);
  if (context === undefined) {
    throw new Error('useAccess must be used within an AccessProvider');
  }
  return context;
}

export { defaultAccess };
