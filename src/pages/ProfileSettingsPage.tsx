import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';
import { removeUserAvatar, uploadUserAvatar } from '../api/user';
import UserAvatar, { type UserGender } from '../components/UserAvatar';

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
  avatarUrl?: string | null;
  gender?: UserGender;
};

export default function ProfileSettingsPage() {
  const { token, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [level, setLevel] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<UserGender>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarCacheKey, setAvatarCacheKey] = useState(0);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const loadMe = useCallback(() => {
    if (!token) return;
    fetch(apiUrl('/api/user/me'), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MeResponse | null) => {
        if (!data) return;
        setFullName(`${data.firstName ?? ''} ${data.lastName ?? ''}`.trim());
        setLevel(data.level ?? '');
        setEmail(data.email ?? '');
        setPhone(data.phone ?? '');
        setGender(data.gender ?? null);
        setAvatarUrl(data.avatarUrl ?? null);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    setFullName(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim());
    setLevel(user?.level ?? '');
    setEmail(user?.email ?? '');
    setPhone(user?.phone ?? '');
    setGender(user?.gender ?? null);
    setAvatarUrl(user?.avatarUrl ?? null);
    loadMe();
  }, [loadMe, user?.avatarUrl, user?.email, user?.firstName, user?.gender, user?.lastName, user?.level, user?.phone]);

  function applyMeToContext(me: MeResponse) {
    updateUser({
      email: me.email ?? null,
      phone: me.phone ?? null,
      totalPoints: me.totalPoints,
      planName: me.planName,
      planExpiresAt: me.planExpiresAt,
      avatarUrl: me.avatarUrl ?? null,
      gender: me.gender ?? null,
    });
    setAvatarUrl(me.avatarUrl ?? null);
    setAvatarCacheKey((v) => v + 1);
  }

  function avatarPreviewUrl(url: string | null): string | null {
    if (!url) return null;
    const base = url.split('?')[0];
    return `${base}?v=${avatarCacheKey}`;
  }

  async function handlePickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !token) return;
    setBanner(null);
    setUploadingAvatar(true);
    try {
      const me = await uploadUserAvatar(token, file);
      applyMeToContext(me);
      updateUser({
        avatarUrl: me.avatarUrl ? `${me.avatarUrl.split('?')[0]}?v=${Date.now()}` : null,
      });
      setBanner({ kind: 'ok', text: 'Profil rasmi yangilandi' });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Rasm yuklanmadi' });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!token || !avatarUrl) return;
    setBanner(null);
    setUploadingAvatar(true);
    try {
      const me = await removeUserAvatar(token);
      applyMeToContext(me);
      updateUser({ avatarUrl: null });
      setBanner({ kind: 'ok', text: 'Profil rasmi o‘chirildi' });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Rasm o‘chirilmadi' });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function patchAccount(body: Record<string, string | null>) {
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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    if (!token) {
      setBanner({ kind: 'error', text: 'Sessiya topilmadi' });
      return;
    }
    if ((newPassword || newPasswordConfirm) && newPassword !== newPasswordConfirm) {
      setBanner({ kind: 'error', text: 'Yangi parollar mos kelmadi' });
      return;
    }
    if ((newPassword || newPasswordConfirm) && newPassword.length < 6) {
      setBanner({ kind: 'error', text: "Yangi parol kamida 6 belgi bo'lsin" });
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, string | null> = {
        email: email.trim(),
        phone: phone.trim(),
        gender,
      };
      if (newPassword || newPasswordConfirm) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
        body.newPasswordConfirm = newPasswordConfirm;
      }
      const me = await patchAccount(body);
      applyMeToContext(me);
      setEmail(me.email ?? '');
      setPhone(me.phone ?? '');
      setGender(me.gender ?? null);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setBanner({ kind: 'ok', text: 'Profil yangilandi' });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Xatolik' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-[#EEF4FA] pb-6">
      <main className="mx-auto w-full max-w-[820px]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-[#EEF4FA]/95 px-4 py-3 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900"
            aria-label="Ortga"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <h1 className="text-base font-extrabold text-slate-900">Tahrirlash</h1>
          <button
            type="submit"
            form="profile-edit-form"
            disabled={saving}
            className="text-sm font-bold text-blue-600 disabled:opacity-50"
          >
            {saving ? '...' : 'Tayyor'}
          </button>
        </header>

        <form id="profile-edit-form" onSubmit={handleSubmit} className="px-4 pt-5">
          <div className="flex flex-col items-center pb-5">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative rounded-full disabled:opacity-60"
              aria-label="Profil rasmini almashtirish"
            >
              <UserAvatar
                avatarUrl={avatarPreviewUrl(avatarUrl)}
                gender={gender}
                name={fullName}
                className="h-20 w-20"
              />
              {uploadingAvatar ? (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </span>
              ) : null}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePickAvatar}
              disabled={uploadingAvatar}
            />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="text-sm font-bold text-blue-600 disabled:opacity-50"
              >
                Rasmni almashtirish
              </button>
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={() => void handleRemoveAvatar()}
                  disabled={uploadingAvatar}
                  className="text-sm font-semibold text-red-600 disabled:opacity-50"
                >
                  O‘chirish
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-center text-xs font-medium text-slate-500">JPG, PNG yoki WEBP · 4 MB gacha</p>
          </div>

          {banner ? (
            <div
              className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${
                banner.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {banner.text}
            </div>
          ) : null}

          <section className="rounded-[24px] border border-slate-200/90 bg-white px-4 py-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
            <h2 className="text-base font-extrabold text-slate-900">Profil</h2>
            <div className="mt-5 space-y-5">
              <TextField label="To'liq ism" value={fullName} onChange={setFullName} readOnly />
              <TextField label="Rus tili darajasi" value={level} onChange={setLevel} readOnly />
              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-600">Jins</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <GenderOption label="Erkak" selected={gender === 'male'} onSelect={() => setGender('male')} />
                  <GenderOption label="Ayol" selected={gender === 'female'} onSelect={() => setGender('female')} />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-[24px] border border-slate-200/90 bg-white px-4 py-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
            <h2 className="text-base font-extrabold text-slate-900">Aloqa va xavfsizlik</h2>
            <div className="mt-5 space-y-5">
              <TextField label="Email" action="o'zgartirish" value={email} onChange={setEmail} type="email" />
              <TextField label="Telefon raqami" action="o'zgartirish" value={phone} onChange={setPhone} type="tel" />
              <PasswordField label="Joriy parol" value={currentPassword} onChange={setCurrentPassword} />
              <PasswordField label="Yangi parol" value={newPassword} onChange={setNewPassword} />
              <PasswordField
                label="Yangi parolni tasdiqlash"
                value={newPasswordConfirm}
                onChange={setNewPasswordConfirm}
              />
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}

function GenderOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`h-11 rounded-xl border text-sm font-bold transition-colors ${
        selected
          ? 'border-[#24459A] bg-[#EEF4FA] text-[#24459A]'
          : 'border-slate-200 bg-white text-slate-600'
      }`}
    >
      {label}
    </button>
  );
}

function TextField({
  label,
  action,
  value,
  onChange,
  type = 'text',
  readOnly = false,
}: {
  label: string;
  action?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600">{label}</span>
        {action ? <span className="text-xs font-semibold text-blue-600">{action}</span> : null}
      </span>
      <span className="relative block">
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-[15px] font-medium text-slate-900 outline-none placeholder:text-slate-400 read-only:bg-slate-50 read-only:text-slate-500"
        />
        {value && !readOnly ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-400 p-0.5 text-white"
            aria-label="Tozalash"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : readOnly ? (
          <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        ) : null}
      </span>
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none"
      />
    </label>
  );
}
