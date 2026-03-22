import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';

type MeResponse = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  level: string;
  onboarded: number;
  progress: number;
  totalPoints?: number;
  planName?: string | null;
  planExpiresAt?: string | null;
};

export default function ProfileSettingsPage() {
  const { token, updateUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [passwordCurrentPassword, setPasswordCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const [banner, setBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const loadMe = useCallback(() => {
    if (!token) return;
    fetch(apiUrl('/api/user/me'), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MeResponse | null) => {
        if (!data) return;
        setEmail(data.email ?? '');
        setPhone(data.phone ?? '');
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const applyMeToContext = (me: MeResponse) => {
    updateUser({
      email: me.email ?? null,
      phone: me.phone ?? null,
      totalPoints: me.totalPoints,
      planName: me.planName,
      planExpiresAt: me.planExpiresAt,
    });
  };

  const patchAccount = async (body: Record<string, string>) => {
    const res = await fetch(apiUrl('/api/user/account'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token!}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : 'Xatolik yuz berdi');
    }
    return data as MeResponse;
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    if (!token) {
      setBanner({ kind: 'error', text: 'Sessiya topilmadi' });
      return;
    }
    setSavingEmail(true);
    try {
      const me = await patchAccount({
        email: email.trim(),
      });
      applyMeToContext(me);
      setEmail(me.email ?? '');
      setBanner({ kind: 'ok', text: 'Email yangilandi' });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Xatolik' });
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    if (!token) {
      setBanner({ kind: 'error', text: 'Sessiya topilmadi' });
      return;
    }
    setSavingPhone(true);
    try {
      const me = await patchAccount({
        phone: phone.trim(),
      });
      applyMeToContext(me);
      setPhone(me.phone ?? '');
      setBanner({ kind: 'ok', text: 'Telefon raqami yangilandi' });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Xatolik' });
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    if (!token) {
      setBanner({ kind: 'error', text: 'Sessiya topilmadi' });
      return;
    }
    if (!passwordCurrentPassword) {
      setBanner({ kind: 'error', text: "Parolni almashtirish uchun joriy parolni kiriting" });
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setBanner({ kind: 'error', text: 'Yangi parollar mos kelmadi' });
      return;
    }
    if (newPassword.length < 6) {
      setBanner({ kind: 'error', text: "Yangi parol kamida 6 belgi bo'lsin" });
      return;
    }
    setSavingPassword(true);
    try {
      const me = await patchAccount({
        currentPassword: passwordCurrentPassword,
        newPassword,
        newPasswordConfirm,
      });
      applyMeToContext(me);
      setPasswordCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setBanner({ kind: 'ok', text: 'Parol yangilandi' });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Xatolik' });
    } finally {
      setSavingPassword(false);
    }
  };

  const cardClass =
    'bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4';

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium"
        >
          <ChevronLeft className="w-5 h-5" />
          Profilga qaytish
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Sozlamalar</h1>
            <p className="text-slate-500 text-sm">
              Email va telefonni sessiya orqali yangilashingiz mumkin. Parolni almashtirish uchun joriy
              parol kerak.
            </p>
          </div>

          {banner && (
            <div
              className={
                banner.kind === 'ok'
                  ? 'bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm'
                  : 'bg-red-50 text-red-600 p-3 rounded-lg text-sm'
              }
            >
              {banner.text}
            </div>
          )}

          <form onSubmit={handleSaveEmail} className={cardClass}>
            <h2 className="text-base font-semibold text-slate-900">Email</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Yangi email</label>
              <input
                type="email"
                autoComplete="email"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pochta@misol.uz"
              />
            </div>
            <button
              type="submit"
              disabled={savingEmail}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {savingEmail ? 'Saqlanmoqda…' : 'Emailni saqlash'}
            </button>
          </form>

          <form onSubmit={handleSavePhone} className={cardClass}>
            <h2 className="text-base font-semibold text-slate-900">Telefon raqami</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Yangi telefon</label>
              <input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998901234567"
              />
            </div>
            <button
              type="submit"
              disabled={savingPhone}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {savingPhone ? 'Saqlanmoqda…' : 'Telefonni saqlash'}
            </button>
          </form>

          <form onSubmit={handleSavePassword} className={cardClass}>
            <h2 className="text-base font-semibold text-slate-900">Parol</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Joriy parol</label>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={passwordCurrentPassword}
                onChange={(e) => setPasswordCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Yangi parol</label>
              <input
                type="password"
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Yangi parolni tasdiqlash
              </label>
              <input
                type="password"
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="w-full bg-slate-800 text-white py-2.5 rounded-xl font-semibold hover:bg-slate-900 transition-colors disabled:opacity-60"
            >
              {savingPassword ? 'Saqlanmoqda…' : 'Parolni almashtirish'}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
