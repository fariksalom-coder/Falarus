import { createContext, useContext, useState, useEffect } from 'react';
import { adminApi, getAdminToken, setAdminToken, clearAdminToken } from '../lib/adminApi';

interface AdminAuthContextType {
  isAdmin: boolean;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setLoading(false);
      return;
    }
    adminApi('/dashboard', { skipAuthRedirect: true })
      .then(() => {
        setIsAdmin(true);
      })
      .catch(() => {
        // 401: adminApi clears the token already. Network/5xx: keep stored token so a flaky connection doesn't log the admin out.
        setIsAdmin(Boolean(getAdminToken()));
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token: string) => {
    setAdminToken(token);
    setIsAdmin(true);
  };

  const logout = () => {
    clearAdminToken();
    setIsAdmin(false);
  };

  return (
    <AdminAuthContext.Provider value={{ isAdmin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (ctx === undefined) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
