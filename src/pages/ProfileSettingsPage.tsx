import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';
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
  const [banner, setBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

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
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    setFullName(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim());
    setLevel(user?.level ?? '');
    setEmail(user?.email ?? '');
    setPhone(user?.phone ?? '');
    setGender(user?.gender ?? null);
    loadMe();
  }, [loadMe, user?.email, user?.firstName, user?.gender, user?.lastName, user?.level, user?.phone]);

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
    <div className="min-h-screen bg-[#EEF4FA] pb-[88px]">
      <main className="mx-auto w-full max-w-[440px]">
        <header className="flex h-[114px] items-center justify-between bg-white px-4 pt-5">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-[15px] border border-[#C8DCF3] bg-white text-[#0F172A]"
            aria-label="Ortga"
          >
            <ChevronLeft className="h-7 w-7" aria-hidden />
          </button>
          <h1 className="text-[25px] font-black leading-none text-[#0F172A]">Tahrirlash</h1>
          <button
            type="submit"
            form="profile-edit-form"
            disabled={saving}
            className="text-[15px] font-bold text-[#1D5BFF] disabled:opacity-50"
          >
            {saving ? '...' : 'Tayyor'}
          </button>
        </header>

        <form id="profile-edit-form" onSubmit={handleSubmit} className="px-4 pt-7">
          <div className="flex flex-col items-center pb-8">
            <UserAvatar
              avatarUrl={user?.avatarUrl}
              gender={gender}
              name={fullName}
              className="h-[97px] w-[97px]"
            />
            <p className="mt-4 text-[14px] font-medium text-[#64748B]">Rasm yuklash tez orada qo‘shiladi</p>
          </div>

          {banner ? (
            <div
              className={`mb-5 rounded-[8px] px-4 py-3 text-sm font-bold ${
                banner.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {banner.text}
            </div>
          ) : null}

          <section className="rounded-[14px] bg-white px-5 py-6 shadow-[4px_4px_10px_rgba(0,0,0,0.18)]">
            <h2 className="text-[24px] font-black leading-none text-[#0F172A]">Profil</h2>
            <div className="mt-8 space-y-7">
              <TextField label="To'liq ism" value={fullName} onChange={setFullName} readOnly />
              <TextField label="Rus tili darajasi" value={level} onChange={setLevel} readOnly />
              <div>
                <span className="mb-3 block text-[16px] font-bold text-[#4B4B4B]">Jins</span>
                <div className="grid grid-cols-2 gap-3">
                  <GenderOption
                    label="Erkak"
                    selected={gender === 'male'}
                    onSelect={() => setGender('male')}
                  />
                  <GenderOption
                    label="Ayol"
                    selected={gender === 'female'}
                    onSelect={() => setGender('female')}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-7 rounded-[14px] bg-white px-5 py-6 shadow-[4px_4px_10px_rgba(0,0,0,0.18)]">
            <h2 className="text-[24px] font-black leading-none text-[#0F172A]">Aloqa va xavfsizlik</h2>
            <div className="mt-8 space-y-7">
              <TextField label="Email" action="o'zgartirish" value={email} onChange={setEmail} type="email" />
              <TextField label="Telefon raqami" action="o'zgartirish" value={phone} onChange={setPhone} type="tel" />
              <PasswordField label="Joriy parol" value={currentPassword} onChange={setCurrentPassword} />
              <PasswordField label="Yangi parol" value={newPassword} onChange={setNewPassword} />
              <PasswordField label="Yangi parolni tasdiqlash" value={newPasswordConfirm} onChange={setNewPasswordConfirm} />
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
      className={`h-[43px] rounded-[8px] border text-[17px] font-bold transition-colors ${
        selected
          ? 'border-[#24459A] bg-[#EEF4FA] text-[#24459A]'
          : 'border-[#A0A0A0] bg-white text-[#4B4B4B]'
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
      <span className="mb-3 flex items-center justify-between">
        <span className="text-[16px] font-bold text-[#4B4B4B]">{label}</span>
        {action ? <span className="text-[16px] font-medium text-[#1D5BFF]">{action}</span> : null}
      </span>
      <span className="relative block">
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className="h-[43px] w-full rounded-[8px] border border-[#A0A0A0] bg-white px-3 pr-10 text-[17px] font-bold text-[#0F172A] outline-none placeholder:text-[#9D9D9D] read-only:text-[#9D9D9D]"
        />
        {value && !readOnly ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-[#9D9D9D] p-0.5 text-white"
            aria-label="Tozalash"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : readOnly ? (
          <Check className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9D9D9D]" aria-hidden />
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
      <span className="mb-3 block text-[16px] font-bold text-[#4B4B4B]">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[43px] w-full rounded-[8px] border border-[#A0A0A0] bg-white px-3 text-[17px] font-bold text-[#0F172A] outline-none"
      />
    </label>
  );
}
