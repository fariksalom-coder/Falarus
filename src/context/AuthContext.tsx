import { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl } from '../api';
import { clearUserProgressCaches } from '../utils/clearUserProgressCaches';

/** Persisted snapshot so an intermittent network failure during /api/user/me doesn't force a logout UI. */
const AUTH_USER_CACHE_KEY = 'auth_user';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string | null;
  level: string;
  onboarded: number;
  progress: number;
  totalPoints?: number;
  planName?: string | null;
  planExpiresAt?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  awardPoints: (delta: number) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function writeCachedUser(next: User | null): void {
  try {
    if (!next) localStorage.removeItem(AUTH_USER_CACHE_KEY);
    else localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('token') : null
  );
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token') ? readCachedUser() : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const ME_RETRY_MS = [0, 450, 900];
    const MAX_ME_ATTEMPTS = ME_RETRY_MS.length;

    const finish = () => {
      if (!cancelled) setLoading(false);
    };

    const fetchMe = async (attempt: number) => {
      if (attempt > 0) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, ME_RETRY_MS[attempt] ?? 600);
        });
      }
      if (cancelled) return;

      try {
        const res = await fetch(apiUrl('/api/user/me'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;

        if (res.ok) {
          const data = (await res.json()) as User;
          const normalized = { ...data, totalPoints: data.totalPoints ?? 0 };
          setUser(normalized);
          writeCachedUser(normalized);
          finish();
          return;
        }

        if (res.status === 401) {
          clearUserProgressCaches();
          localStorage.removeItem('token');
          writeCachedUser(null);
          setToken(null);
          setUser(null);
          finish();
          return;
        }

        // Server error — keep cached profile if any.
        finish();
      } catch {
        if (cancelled) return;
        if (attempt + 1 < MAX_ME_ATTEMPTS) {
          void fetchMe(attempt + 1);
          return;
        }
        finish();
      }
    };

    void fetchMe(0);

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    clearUserProgressCaches();
    localStorage.setItem('token', newToken);
    const normalized = { ...newUser, totalPoints: newUser.totalPoints ?? 0 };
    writeCachedUser(normalized);
    setToken(newToken);
    setUser(normalized);
  };

  const logout = () => {
    clearUserProgressCaches();
    localStorage.removeItem('token');
    writeCachedUser(null);
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...updates };
      writeCachedUser(merged);
      return merged;
    });
  };

  const awardPoints = (delta: number) => {
    if (!Number.isFinite(delta) || delta <= 0) return;
    setUser((prev) => {
      if (!prev) return prev;
      const merged = {
        ...prev,
        totalPoints: Math.max(0, Number(prev.totalPoints ?? 0) + Math.floor(delta)),
      };
      writeCachedUser(merged);
      return merged;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, awardPoints, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
