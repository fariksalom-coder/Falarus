import { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl } from '../api';
import { clearUserProgressCaches } from '../utils/clearUserProgressCaches';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  level: string;
  onboarded: number;
  progress: number;
  planName?: string | null;
  planExpiresAt?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch(apiUrl('/api/user/me'), {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) return res.json().then((data) => setUser(data));
          if (res.status === 401) {
            clearUserProgressCaches();
            localStorage.removeItem('token');
            setToken(null);
            return;
          }
          setUser(null);
        })
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    clearUserProgressCaches();
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    clearUserProgressCaches();
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) setUser({ ...user, ...updates });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
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
