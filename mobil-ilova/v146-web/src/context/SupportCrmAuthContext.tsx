import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supportCrmMe } from '../api/supportCrm';
import { clearSupportCrmToken, getSupportCrmToken, setSupportCrmToken } from '../lib/supportCrmApi';

type SupportCrmAuthContextType = {
  isAgent: boolean;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const SupportCrmAuthContext = createContext<SupportCrmAuthContextType | undefined>(undefined);

export function SupportCrmAuthProvider({ children }: { children: ReactNode }) {
  const [isAgent, setIsAgent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getSupportCrmToken();
    if (!token) {
      setLoading(false);
      return;
    }
    supportCrmMe()
      .then(() => setIsAgent(true))
      .catch(() => setIsAgent(Boolean(getSupportCrmToken())))
      .finally(() => setLoading(false));
  }, []);

  const login = (token: string) => {
    setSupportCrmToken(token);
    setIsAgent(true);
  };

  const logout = () => {
    clearSupportCrmToken();
    setIsAgent(false);
  };

  return (
    <SupportCrmAuthContext.Provider value={{ isAgent, loading, login, logout }}>
      {children}
    </SupportCrmAuthContext.Provider>
  );
}

export function useSupportCrmAuth() {
  const ctx = useContext(SupportCrmAuthContext);
  if (!ctx) throw new Error('useSupportCrmAuth must be used within SupportCrmAuthProvider');
  return ctx;
}
