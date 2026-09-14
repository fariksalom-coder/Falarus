import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, ChevronLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { apiUrl } from '../api';
import { patchUserAccount } from '../api/user';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

/**
 * Parolni o'zgartirish — har bir foydalanuvchi uchun alohida ekran.
 *
 * NEGA ALOHIDA SAHIFA: ilgari parol maydonlari «Profilni tahrirlash»
 * formasining eng pastida, ism/email/telefon bilan bir qatorda turardi va
 * ko'pchilik ularni topa olmasdi. Bitta maqsad — bitta ekran.
 *
 * PAROLSIZ HISOBLAR: Google/Telegram orqali kirganlarda parol yo'q. Ularda
 * «joriy parol» so'ralmaydi — token bilan kirgani yetarli va shu yerda
 * birinchi parolini qo'yadi (server ham xuddi shunday tekshiradi).
 *
 * Parolini UNUTGANLAR bu yerdan foydalana olmaydi — ularga support yangi
 * parol yaratib beradi (`/support/parol`).
 */

const MATN = {
  uz: {
    sarlavha: 'Parolni o‘zgartirish',
    izoh: 'Yangi parol kamida 6 belgidan iborat bo‘lsin.',
    joriy: 'Joriy parol',
    yangi: 'Yangi parol',
    takror: 'Yangi parolni takrorlang',
    saqla: 'Parolni saqlash',
    saqlanmoqda: 'Saqlanmoqda…',
    qisqa: 'Parol kamida 6 belgidan iborat bo‘lsin',
    mosEmas: 'Parollar mos kelmadi',
    joriyKerak: 'Joriy parolni kiriting',
    tayyor: 'Parol o‘zgartirildi',
    tayyorIzoh: 'Endi yangi parol bilan kiring. Uni hech kimga aytmang.',
    parolsiz: 'Hisobingizda hali parol yo‘q — quyida birinchi parolingizni o‘rnating.',
    orqaga: 'Profil',
  },
  ru: {
    sarlavha: 'Смена пароля',
    izoh: 'Новый пароль — минимум 6 символов.',
    joriy: 'Текущий пароль',
    yangi: 'Новый пароль',
    takror: 'Повторите новый пароль',
    saqla: 'Сохранить пароль',
    saqlanmoqda: 'Сохранение…',
    qisqa: 'Пароль должен быть не короче 6 символов',
    mosEmas: 'Пароли не совпадают',
    joriyKerak: 'Введите текущий пароль',
    tayyor: 'Пароль изменён',
    tayyorIzoh: 'Теперь входите с новым паролем. Никому его не сообщайте.',
    parolsiz: 'У аккаунта пока нет пароля — задайте первый пароль ниже.',
    orqaga: 'Профиль',
  },
  en: {
    sarlavha: 'Change password',
    izoh: 'Your new password must be at least 6 characters.',
    joriy: 'Current password',
    yangi: 'New password',
    takror: 'Repeat the new password',
    saqla: 'Save password',
    saqlanmoqda: 'Saving…',
    qisqa: 'Password must be at least 6 characters',
    mosEmas: 'Passwords do not match',
    joriyKerak: 'Enter your current password',
    tayyor: 'Password changed',
    tayyorIzoh: 'Sign in with the new password from now on. Keep it to yourself.',
    parolsiz: 'This account has no password yet — set your first one below.',
    orqaga: 'Profile',
  },
} as const;

function ParolMaydoni({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [ochiq, setOchiq] = useState(false);
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-app-text-muted">{label}</span>
      <div className="relative">
        <input
          type={ochiq ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full rounded-2xl border border-app-border bg-app-surface pl-3.5 pr-12 text-[15px] font-medium text-app-text outline-none transition focus:border-app-primary"
        />
        <button
          type="button"
          onClick={() => setOchiq((v) => !v)}
          aria-label={ochiq ? 'Yashirish' : 'Ko‘rsatish'}
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-app-text-muted"
        >
          {ochiq ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </div>
    </label>
  );
}

export default function ParolOzgartirishPage() {
  const { token } = useAuth();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const t = MATN[locale as keyof typeof MATN] ?? MATN.uz;

  const [parolBor, setParolBor] = useState(true);
  const [joriy, setJoriy] = useState('');
  const [yangi, setYangi] = useState('');
  const [takror, setTakror] = useState('');
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState('');
  const [tayyor, setTayyor] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(apiUrl('/api/user/me'), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { hasPassword?: boolean } | null) => {
        if (d) setParolBor(d.hasPassword !== false);
      })
      .catch(() => {});
  }, [token]);

  const yubor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (parolBor && !joriy) return setXato(t.joriyKerak);
    if (yangi.length < 6) return setXato(t.qisqa);
    if (yangi !== takror) return setXato(t.mosEmas);

    setXato('');
    setSaqlanmoqda(true);
    try {
      await patchUserAccount(token, {
        ...(parolBor ? { currentPassword: joriy } : {}),
        newPassword: yangi,
        newPasswordConfirm: takror,
      });
      setTayyor(true);
    } catch (err) {
      setXato(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setSaqlanmoqda(false);
    }
  };

  return (
    <div className="min-h-full bg-app-bg-subtle pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-app-border bg-app-bg-subtle/95 px-4 py-3 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-app-border bg-app-surface text-app-text"
          aria-label={t.orqaga}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="text-base font-extrabold text-app-text">{t.sarlavha}</h1>
      </header>

      <main className="mx-auto w-full max-w-[560px] px-4 pt-4">
        {tayyor ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-6 text-center"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-7 w-7 text-emerald-600" strokeWidth={3} />
            </span>
            <p className="mt-3 text-[17px] font-black text-emerald-900">{t.tayyor}</p>
            <p className="mt-1 text-[13px] font-semibold text-emerald-800/90">{t.tayyorIzoh}</p>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="mt-5 h-12 w-full rounded-2xl bg-emerald-600 text-[15px] font-black text-white transition active:scale-[0.99]"
            >
              {t.orqaga}
            </button>
          </motion.div>
        ) : (
          <form onSubmit={yubor} className="rounded-[24px] border border-app-border bg-app-surface px-4 py-5 shadow-app-card">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-app-primary" />
              <p className="text-[13px] font-semibold text-app-text-muted">
                {parolBor ? t.izoh : t.parolsiz}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {parolBor ? (
                <ParolMaydoni
                  label={t.joriy}
                  value={joriy}
                  onChange={(v) => {
                    setJoriy(v);
                    setXato('');
                  }}
                  autoComplete="current-password"
                />
              ) : null}
              <ParolMaydoni
                label={t.yangi}
                value={yangi}
                onChange={(v) => {
                  setYangi(v);
                  setXato('');
                }}
                autoComplete="new-password"
              />
              <ParolMaydoni
                label={t.takror}
                value={takror}
                onChange={(v) => {
                  setTakror(v);
                  setXato('');
                }}
                autoComplete="new-password"
              />
            </div>

            {xato ? (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-[13px] font-bold text-red-600">{xato}</p>
            ) : null}

            <button
              type="submit"
              disabled={saqlanmoqda}
              className="mt-5 h-14 w-full rounded-2xl bg-app-primary text-[15px] font-black text-white shadow-[0_14px_30px_-14px_rgba(37,99,235,0.65)] transition active:scale-[0.99] disabled:opacity-60"
            >
              {saqlanmoqda ? t.saqlanmoqda : t.saqla}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
