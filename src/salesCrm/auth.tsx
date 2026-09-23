import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getSalesCrmToken, salesCrmApi, setSalesCrmToken, type TaskSummary } from './api';

type Agent = { id: number; login: string; name: string; role: 'admin' | 'operator' };

type Ctx = {
  agent: Agent | null;
  tasks: TaskSummary | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const SalesCrmAuthContext = createContext<Ctx | null>(null);

export function SalesCrmAuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [tasks, setTasks] = useState<TaskSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getSalesCrmToken()) {
      setAgent(null);
      setTasks(null);
      setLoading(false);
      return;
    }
    try {
      const me = await salesCrmApi.me();
      setAgent({
        id: me.agent.id,
        login: me.agent.login,
        name: me.agent.name,
        role: me.role,
      });
      setTasks(me.tasks as TaskSummary);
    } catch {
      setSalesCrmToken(null);
      setAgent(null);
      setTasks(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (loginName: string, password: string) => {
    const res = await salesCrmApi.login(loginName, password);
    setSalesCrmToken(res.token);
    setAgent(res.agent);
    await refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    setSalesCrmToken(null);
    setAgent(null);
    setTasks(null);
  }, []);

  const value = useMemo(
    () => ({ agent, tasks, loading, login, logout, refresh }),
    [agent, tasks, loading, login, logout, refresh],
  );

  return <SalesCrmAuthContext.Provider value={value}>{children}</SalesCrmAuthContext.Provider>;
}

export function useSalesCrmAuth(): Ctx {
  const ctx = useContext(SalesCrmAuthContext);
  if (!ctx) throw new Error('SalesCrmAuthProvider kerak');
  return ctx;
}
