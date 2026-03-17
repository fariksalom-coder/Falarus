import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAccess, getCachedAccess, setCachedAccess, type AccessInfo } from '../api/access';
import { useAuth } from './AuthContext';

const defaultAccess: AccessInfo = {
  lessons_free_limit: 3,
  vocabulary_free_topic: 1,
  vocabulary_free_subtopic: 1,
  subscription_active: false,
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

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [access, setAccessState] = useState<AccessInfo | null>(getCachedAccess);
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
      setAccessState(data);
      setCachedAccess(data);
    } catch {
      setAccessState(defaultAccess);
    } finally {
      setAccessLoaded(true);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setAccessState(null);
      setAccessLoaded(true);
      return;
    }
    const cached = getCachedAccess();
    if (cached) {
      setAccessState(cached);
      setAccessLoaded(true);
    } else {
      setAccessLoaded(false);
    }
    getAccess(token)
      .then((data) => {
        setAccessState(data);
        setCachedAccess(data);
      })
      .catch(() => setAccessState(defaultAccess))
      .finally(() => setAccessLoaded(true));
  }, [token]);

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
