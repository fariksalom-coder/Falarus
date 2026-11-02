import { useState } from 'react';
import { ChevronLeft, GraduationCap, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { registerTeacherAccount, type AuthUser } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import TeacherField from '../components/teacher/TeacherField';

function normalizeAuthUser(user: AuthUser) {
  return { ...user, progress: user.progress ?? 0, totalPoints: user.totalPoints ?? 0 };
}

export default function TeacherRegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  /*
   * ORQAGA.
   *
   * NIMA UCHUN `navigate(-1)` EMAS: bu sahifaga ko'pincha `/teacherinfo`
   * dan kelishadi, u esa React marshruti emas — server beradigan alohida
   * statik hujjat. `navigate(-1)` faqat SPA ichida orqaga qaytadi va
   * `/teacherinfo` ni topa olmay 404 sahifasini chizadi (sinovda aynan
   * shunday bo'ldi).
   *
   * Shuning uchun `location.assign` bilan TO'LIQ yuklash qilinadi — u
   * statik sahifa uchun ham, SPA sahifasi uchun ham bir xil ishlaydi.
   * Manzil `document.referrer` dan olinadi va faqat o'z saytimiz bo'lsa
   * ishlatiladi; aks holda bosh sahifaga chiqamiz.
   */
  function orqaga() {
    const kelgan = document.referrer;
    if (kelgan && kelgan.startsWith(window.location.origin) && !kelgan.startsWith(window.location.href)) {
      window.location.assign(kelgan);
      return;
    }
    navigate('/');
  }
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
    <main className="flex min-h-screen items-center justify-center bg-app-bg-muted px-5 py-10">
      <motion.form
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 24 }}
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-[24px] bg-app-surface shadow-app-card ring-1 ring-app-border"
      >
        <div className="px-6 pb-6 pt-6 text-white" style={{ background: 'var(--app-brand-gradient)' }}>
          <button
            type="button"
            onClick={orqaga}
            className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-bold text-white ring-1 ring-white/25 transition hover:bg-white/25"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.6} />
            Orqaga
          </button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <GraduationCap className="h-6 w-6" />
          </div>
          <p className="mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/70">FalaRus</p>
          <h1 className="text-2xl font-black leading-tight">O'qituvchi ro'yxatdan o'tishi</h1>
        </div>

        <div className="p-6">
          {error ? (
            <div className="mb-4 rounded-2xl bg-app-danger-bg px-4 py-3 text-sm font-semibold text-app-danger">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <TeacherField label="Ism" value={firstName} onChange={setFirstName} autoComplete="given-name" />
            <TeacherField label="Familiya" value={lastName} onChange={setLastName} autoComplete="family-name" />
          </div>
          <TeacherField
            label="Email yoki telefon"
            value={identifier}
            onChange={setIdentifier}
            autoComplete="username"
            className="mt-4"
          />
          <TeacherField
            label="Parol"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            hint="Kamida 6 belgi"
            className="mt-4"
          />

          <button
            type="submit"
            disabled={submitting || !firstName.trim() || !lastName.trim() || !identifier.trim() || password.length < 6}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-app-primary-deep px-5 py-3 font-black text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            <UserPlus className="h-5 w-5" />
            {submitting ? 'Yaratilmoqda...' : "O'qituvchi hisobini yaratish"}
          </button>

          <p className="mt-5 text-center text-sm font-semibold text-app-text-muted">
            Hisobingiz bormi?{' '}
            <Link to="/teacher-login" className="font-black text-app-primary-deep hover:underline">
              Kirish
            </Link>
          </p>
        </div>
      </motion.form>
    </main>
  );
}
