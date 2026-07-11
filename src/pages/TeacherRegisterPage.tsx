import { useState } from 'react';
import { GraduationCap, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { registerTeacherAccount, type AuthUser } from '../api/auth';
import { useAuth } from '../context/AuthContext';

function normalizeAuthUser(user: AuthUser) {
  return { ...user, progress: user.progress ?? 0, totalPoints: user.totalPoints ?? 0 };
}

export default function TeacherRegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
      const data = await registerTeacherAccount({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        identifier: identifier.trim(),
        password,
      });
      login(data.token!, normalizeAuthUser(data.user!));
      navigate('/teacher-cabinet', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ro'yxatdan o'tishda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#071B5E] text-white">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#071B5E]">FalaRus</p>
            <h1 className="text-2xl font-black text-slate-950">O'qituvchi ro'yxatdan o'tishi</h1>
          </div>
        </div>

        {error ? <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ism" value={firstName} onChange={setFirstName} autoComplete="given-name" />
          <Field label="Familiya" value={lastName} onChange={setLastName} autoComplete="family-name" />
        </div>
        <Field label="Email yoki telefon" value={identifier} onChange={setIdentifier} autoComplete="username" className="mt-4" />
        <Field label="Parol" type="password" value={password} onChange={setPassword} autoComplete="new-password" className="mt-4" />

        <button
          type="submit"
          disabled={submitting || !firstName.trim() || !lastName.trim() || !identifier.trim() || password.length < 6}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071B5E] px-5 py-3 font-black text-white disabled:opacity-50"
        >
          <UserPlus className="h-5 w-5" />
          {submitting ? 'Yaratilmoqda...' : "O'qituvchi hisobini yaratish"}
        </button>

        <p className="mt-5 text-center text-sm font-semibold text-slate-600">
          Hisobingiz bormi?{' '}
          <Link to="/teacher-login" className="text-[#071B5E]">
            Kirish
          </Link>
        </p>
      </form>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-bold text-slate-700 ${className}`}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-950 outline-none focus:border-[#0B2A6B]"
      />
    </label>
  );
}
