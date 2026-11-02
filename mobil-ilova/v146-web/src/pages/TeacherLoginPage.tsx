import { useState } from 'react';
import { ChevronLeft, GraduationCap, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { loginTeacherWithPassword, type AuthUser } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

function normalizeAuthUser(user: AuthUser) {
  return { ...user, progress: user.progress ?? 0, totalPoints: user.totalPoints ?? 0 };
}

export default function TeacherLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLocale();

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
      setError(err instanceof Error ? err.message : t('teachers.loginError'));
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'mt-1.5 w-full rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-app-text outline-none transition placeholder:text-app-text-secondary focus:border-app-primary focus:ring-2 focus:ring-app-primary/15';

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
            {t('common.back')}
          </button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <GraduationCap className="h-6 w-6" />
          </div>
          <p className="mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/70">FalaRus</p>
          <h1 className="text-2xl font-black leading-tight">{t('teachers.loginTitle')}</h1>
        </div>

        <div className="p-6">
          {error ? (
            <div className="mb-4 rounded-2xl bg-app-danger-bg px-4 py-3 text-sm font-semibold text-app-danger">
              {error}
            </div>
          ) : null}

          <label className="block text-sm font-bold text-app-text">
            {t('teachers.identifierLabel')}
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              className={inputCls}
            />
          </label>

          <label className="mt-4 block text-sm font-bold text-app-text">
            {t('auth.password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={inputCls}
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !identifier.trim() || !password}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-app-primary-deep px-5 py-3 font-black text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            <LogIn className="h-5 w-5" />
            {submitting ? t('teachers.loggingIn') : t('teachers.cabinetLogin')}
          </button>

          <p className="mt-5 text-center text-sm font-semibold text-app-text-muted">
            {t('auth.noAccount')}{' '}
            <Link to="/teacher-register" className="font-black text-app-primary-deep hover:underline">
              {t('auth.signUp')}
            </Link>
          </p>
        </div>
      </motion.form>
    </main>
  );
}
