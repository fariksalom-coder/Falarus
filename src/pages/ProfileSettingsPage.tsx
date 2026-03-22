import { useState, useEffect } from 'react';
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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOk('');
    if (!token) {
      setError('Sessiya topilmadi');
      return;
    }
    if (!currentPassword) {
      setError("O'zgarishlar uchun joriy parolni kiriting");
      return;
    }
    if (newPassword || newPasswordConfirm) {
      if (newPassword !== newPasswordConfirm) {
        setError('Yangi parollar mos kelmadi');
        return;
      }
      if (newPassword.length < 6) {
        setError("Yangi parol kamida 6 belgi bo'lsin");
        return;
      }
    }
    setSaving(true);
    try {
      const body: Record<string, string> = {
        currentPassword,
        email: email.trim(),
        phone: phone.trim(),
      };
      if (newPassword) {
        body.newPassword = newPassword;
        body.newPasswordConfirm = newPasswordConfirm;
      }
      const res = await fetch(apiUrl('/api/user/account'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Xatolik yuz berdi');
        return;
      }
      const me = data as MeResponse;
      updateUser({
        email: me.email ?? null,
        phone: me.phone ?? null,
        totalPoints: me.totalPoints,
        planName: me.planName,
        planExpiresAt: me.planExpiresAt,
      });
      setOk("Sozlamalar saqlandi");
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } finally {
      setSaving(false);
    }
  };

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
          className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200"
        >
          <h1 className="text-xl font-bold text-slate-900 mb-1">Sozlamalar</h1>
          <p className="text-slate-500 text-sm mb-6">
            Email, telefon yoki parolni yangilash uchun joriy parolingiz kerak.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
          )}
          {ok && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg mb-4 text-sm">{ok}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                autoComplete="email"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pochta@misol.uz"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefon raqami</label>
              <input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7, +998, +992, +996…"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Parol
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Joriy parol</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Yangi parol (ixtiyoriy)
                  </label>
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
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saqlanmoqda…' : 'Saqlash'}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
