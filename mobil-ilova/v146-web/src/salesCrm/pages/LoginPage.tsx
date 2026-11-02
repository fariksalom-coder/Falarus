import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useSalesCrmAuth } from '../auth';

export default function LoginPage() {
  const { agent, login, loading } = useSalesCrmAuth();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && agent) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(user.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-xl"
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">FalaRus</p>
        <h1 className="mt-1 text-xl font-black text-slate-900">Sales CRM</h1>
        <p className="mt-1 text-sm text-slate-500">Lidlar va qo‘ng‘iroqlar paneli</p>
        <label className="mt-5 block text-xs font-bold text-slate-600">
          Login
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="mt-3 block text-xs font-bold text-slate-600">
          Parol
          <input
            type="password"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? 'Kirilmoqda…' : 'Kirish'}
        </button>
      </form>
    </div>
  );
}
