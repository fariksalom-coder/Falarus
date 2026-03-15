import { createContext, useContext, useState, useEffect } from 'react';
import { getAdminToken, setAdminToken, clearAdminToken } from '../api/admin';
import { apiUrl } from '../api';

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
    fetch(apiUrl('/api/admin/dashboard'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) setIsAdmin(true);
        else {
          clearAdminToken();
          setIsAdmin(false);
        }
      })
      .catch(() => {
        clearAdminToken();
        setIsAdmin(false);
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
