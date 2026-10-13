import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, LogOut, RefreshCw } from 'lucide-react';
import { Button, Card, Field, PageHeader } from '../components/ui/Foundation';
import { Skeleton } from '../components/ui/Skeleton';
import { MonthSwitcher, SalesHeadDashboardView, currentTashkentMonth } from '../components/salesHead/SalesHeadDashboardView';
import { secondaryButton } from '../components/admin/salesLedger/ui';
import { SalesHeadAuthError, getSalesHeadToken, salesHeadDashboard, salesHeadLogin, salesHeadMe, setSalesHeadToken } from '../api/salesHead';
import type { SalesHeadDashboard } from '../../shared/salesHead';

/** /sotuv-rahbari — sotuv bo'limi rahbarining kirishi va paneli (bitta sahifa). */
export default function SalesHeadPage() {
  const [signedIn, setSignedIn] = useState(() => Boolean(getSalesHeadToken()));
  const [name, setName] = useState('');
  const logout = useCallback(() => {
    setSalesHeadToken(null);
    setSignedIn(false);
    setName('');
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    salesHeadMe().then((me) => setName(me.name)).catch((e) => { if (e instanceof SalesHeadAuthError) logout(); });
  }, [signedIn, logout]);

  if (!signedIn) return <LoginForm onSignedIn={(n) => { setName(n); setSignedIn(true); }} />;
  return <Dashboard name={name} onLogout={logout} />;
}

function LoginForm({ onSignedIn }: { onSignedIn: (name: string) => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await salesHeadLogin(login.trim().toLowerCase(), password);
      setSalesHeadToken(res.token);
      onSignedIn(res.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg-muted p-5">
      <Card className="w-full max-w-[420px]">
        <PageHeader title="Отдел продаж" description="Кабинет руководителя: зарплата и аналитика операторов" />
        <form onSubmit={submit} className="space-y-5">
          <Field label="Логин" autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} required />
          <Field label="Пароль" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p role="alert" className="text-sm text-app-danger">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">{loading ? 'Вход…' : 'Войти'}</Button>
        </form>
      </Card>
    </div>
  );
}

function Dashboard({ name, onLogout }: { name: string; onLogout: () => void }) {
  const [month, setMonth] = useState(currentTashkentMonth);
  const [data, setData] = useState<SalesHeadDashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    salesHeadDashboard(month)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof SalesHeadAuthError) onLogout();
        else setError(e instanceof Error ? e.message : 'Не удалось загрузить данные');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month, reload, onLogout]);

  const visible = data?.month === month ? data : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
      <div className="mx-auto flex max-w-[1300px] flex-col gap-4 text-slate-900">
        <header className="rounded-[24px] bg-gradient-to-br from-[#0b2445] via-[#123a72] to-[#1d4ed8] px-4 py-5 text-white shadow-[0_18px_44px_rgba(37,99,235,0.22)] sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">Отдел продаж</h1>
              <p className="mt-1 text-[13.5px] text-blue-100/90">{name ? `${name} · ` : ''}зарплата руководителя и аналитика операторов</p>
            </div>
            <button type="button" onClick={onLogout} aria-label="Выйти" className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 text-[14px] font-semibold ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95 sm:px-4">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <MonthSwitcher month={month} onChange={setMonth} tone="dark" />
            <button type="button" aria-label="Обновить" onClick={() => setReload((n) => n + 1)}
              className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95">
              <RefreshCw className={`h-4 w-4 ${loading && visible ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {error && !visible ? (
          <div className="flex flex-col items-center gap-3 rounded-[20px] border border-red-100 bg-white px-6 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-[15px] font-semibold text-slate-800">{error}</p>
            <button type="button" className={secondaryButton} onClick={() => setReload((n) => n + 1)}>Повторить</button>
          </div>
        ) : !visible ? (
          <div className="flex flex-col gap-4" aria-busy="true" aria-label="Загрузка">
            <Skeleton className="h-56 rounded-[24px]" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-[20px]" />)}</div>
            <Skeleton className="h-72 rounded-[20px]" />
          </div>
        ) : (
          <motion.div key={month} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <SalesHeadDashboardView data={visible} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
