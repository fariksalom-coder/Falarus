import { useState } from 'react';
import { GraduationCap, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { loginTeacherWithPassword, type AuthUser } from '../api/auth';
import { useAuth } from '../context/AuthContext';

function normalizeAuthUser(user: AuthUser) {
  return { ...user, progress: user.progress ?? 0, totalPoints: user.totalPoints ?? 0 };
}

export default function TeacherLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const data = await loginTeacherWithPassword(identifier.trim(), password);
      login(data.token!, normalizeAuthUser(data.user!));
      navigate('/teacher-cabinet', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirishda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-700 text-white">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-700">FalaRus</p>
            <h1 className="text-2xl font-black text-slate-950">O'qituvchi kirishi</h1>
          </div>
        </div>

        {error ? <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

        <label className="block text-sm font-bold text-slate-700">
          Email yoki telefon
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-950 outline-none focus:border-blue-600"
          />
        </label>

        <label className="mt-4 block text-sm font-bold text-slate-700">
          Parol
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-950 outline-none focus:border-blue-600"
          />
        </label>

        <button
          type="submit"
          disabled={submitting || !identifier.trim() || !password}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-black text-white disabled:opacity-50"
        >
          <LogIn className="h-5 w-5" />
          {submitting ? 'Kirilmoqda...' : 'Kabinetga kirish'}
        </button>

        <p className="mt-5 text-center text-sm font-semibold text-slate-600">
          Hisobingiz yo'qmi?{' '}
          <Link to="/teacher-register" className="text-blue-700">
            Ro'yxatdan o'tish
          </Link>
        </p>
      </form>
    </main>
  );
}
