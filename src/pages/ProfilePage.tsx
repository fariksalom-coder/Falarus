import { useEffect, useId, useState, type ChangeEvent, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Camera,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  Crown,
  Globe2,
  History,
  LogOut,
  Moon,
  Pencil,
  Type,
  UserCircle,
  Users,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import UserAvatar from '../components/UserAvatar';
import { resolveAssetUrl } from '../api';
import { bustAvatarUrl, patchUserAccount, uploadUserAvatar } from '../api/user';

function premiumDaysLeft(planExpiresAt: string | null | undefined): number | null {
  if (!planExpiresAt) return null;
  const ts = Date.parse(planExpiresAt);
  if (!Number.isFinite(ts)) return null;
  const diffMs = ts - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

export default function ProfilePage() {
  const { user, token, logout, updateUser } = useAuth();
  const { access } = useAccess();
  const navigate = useNavigate();
  const hasPremium = Boolean(access?.subscription_active);
  const premiumDays = premiumDaysLeft(user?.planExpiresAt);
  const showActivePremium = hasPremium && premiumDays != null && premiumDays > 0;
  const avatarInputId = useId();
  const [avatarRevision, setAvatarRevision] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [banner, setBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
  }, [user?.firstName, user?.lastName]);

  if (user?.accountType === 'teacher') {
    return <Navigate to="/teacher-cabinet" replace />;
  }

  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Foydalanuvchi';

  function avatarDisplayUrl(url: string | null | undefined): string | null {
    const resolved = resolveAssetUrl(url);
    if (!resolved) return null;
    return `${resolved.split('?')[0]}?v=${avatarRevision}`;
  }

  function applyMe(me: { firstName: string; lastName: string; avatarUrl?: string | null }) {
    updateUser({
      firstName: me.firstName,
      lastName: me.lastName,
      avatarUrl: me.avatarUrl ? bustAvatarUrl(me.avatarUrl) : null,
    });
    setFirstName(me.firstName);
    setLastName(me.lastName);
    if (me.avatarUrl) setAvatarRevision((v) => v + 1);
  }

  async function handlePickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !token) return;
    setBanner(null);
    const preview = URL.createObjectURL(file);
    setLocalPreviewUrl(preview);
    setUploadingAvatar(true);
    try {
      const me = await uploadUserAvatar(token, file);
      applyMe(me);
      setBanner({ kind: 'ok', text: 'Profil rasmi yangilandi' });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Rasm yuklanmadi' });
    } finally {
      URL.revokeObjectURL(preview);
      setLocalPreviewUrl(null);
      setUploadingAvatar(false);
    }
  }

  async function handleSaveName() {
    if (!token) return;
    const nextFirst = firstName.trim();
    const nextLast = lastName.trim();
    if (!nextFirst || !nextLast) {
      setBanner({ kind: 'error', text: "Ism va familiya to'ldirilishi kerak" });
      return;
    }
    setBanner(null);
    setSavingName(true);
    try {
      const me = await patchUserAccount(token, { firstName: nextFirst, lastName: nextLast });
      applyMe(me);
      setEditingName(false);
      setBanner({ kind: 'ok', text: 'Ism yangilandi' });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Xatolik' });
    } finally {
      setSavingName(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/auth');
  }

  return (
    <div className="min-h-full bg-[#EEF4FA] px-4 pb-6 pt-1">
      <main className="mx-auto w-full max-w-[820px]">
        {banner ? (
          <div
            className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${
              banner.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {banner.text}
          </div>
        ) : null}

        <section className="mb-5 flex flex-col items-center rounded-[24px] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
          <label
            htmlFor={avatarInputId}
            className={`relative flex h-20 w-20 cursor-pointer items-center justify-center rounded-full ${
              uploadingAvatar ? 'pointer-events-none opacity-60' : ''
            }`}
            aria-label="Profil rasmini tanlash"
          >
            <UserAvatar
              avatarUrl={localPreviewUrl ?? avatarDisplayUrl(user?.avatarUrl)}
              gender={user?.gender ?? null}
              name={fullName}
              className="h-20 w-20"
            />
            <span className="pointer-events-none absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#24459A] text-white shadow-md">
              {uploadingAvatar ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Camera className="h-3.5 w-3.5" aria-hidden />
              )}
            </span>
            <input
              id={avatarInputId}
              type="file"
              accept="image/*"
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              onChange={handlePickAvatar}
              disabled={uploadingAvatar}
            />
          </label>
          <p className="mt-2 text-xs font-medium text-slate-500">Rasm uchun bosing</p>

          {editingName ? (
            <div className="mt-4 w-full max-w-sm space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Ism</span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  autoComplete="given-name"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Familiya</span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  autoComplete="family-name"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSaveName()}
                  disabled={savingName}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl bg-[#24459A] text-sm font-bold text-white disabled:opacity-50"
                >
                  {savingName ? '...' : 'Saqlash'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingName(false);
                    setFirstName(user?.firstName ?? '');
                    setLastName(user?.lastName ?? '');
                  }}
                  className="flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
                >
                  Bekor
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="mt-3 flex items-center gap-2 text-center"
            >
              <h2 className="text-lg font-extrabold text-[#0F172A]">{fullName}</h2>
              <Pencil className="h-4 w-4 text-slate-400" aria-hidden />
            </button>
          )}

          <div className="mt-4 flex w-full justify-center">
            {showActivePremium ? (
              <div className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#FFC425] px-4 text-[#0F172A]">
                <Crown className="h-4 w-4 fill-[#0F172A]" aria-hidden />
                <span className="text-sm font-extrabold">
                  Premium · {premiumDays} kun qoldi
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/tariflar')}
                className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#24459A] px-5 text-white shadow-[0_8px_20px_rgba(36,69,154,0.28)] active:scale-[0.98]"
              >
                <Crown className="h-4 w-4" aria-hidden />
                <span className="text-sm font-extrabold">Premium sotib olish</span>
              </button>
            )}
          </div>
        </section>

        <ProfileGroup title="Shaxsiy">
          <ProfileRow icon={<UserCircle />} label="Profil" onClick={() => navigate('/profile/settings')} />
          <ProfileRow icon={<BookOpen />} label="Sertifikatlar" />
          <ProfileRow icon={<Users />} label="Do'stlarni taklif qilish" onClick={() => navigate('/invite')} />
        </ProfileGroup>

        <ProfileGroup title="Sozlamalar">
          <ProfileRow
            icon={<Type />}
            label="Matn hajmi"
            trailing={
              <div className="flex h-8 min-w-[96px] items-center justify-center gap-2 rounded-full bg-[#2563EB] px-2.5 text-white">
                <span className="text-xs font-bold">1.0 x</span>
              </div>
            }
          />
          <ProfileRow
            icon={<Bell />}
            label="Bildirishnomalar"
            trailing={<Switch checked={notificationsEnabled} onChange={() => setNotificationsEnabled((v) => !v)} />}
          />
          <ProfileRow
            icon={<Moon />}
            label="Tungi rejim"
            trailing={<Switch checked={darkModeEnabled} dark onChange={() => setDarkModeEnabled((v) => !v)} />}
          />
          <ProfileRow icon={<Globe2 />} label="Til" />
          <ProfileRow icon={<Volume2 />} label="Ovoz va tebranish" />
        </ProfileGroup>

        <ProfileGroup title="Yordam">
          <ProfileRow icon={<CircleHelp />} label="Yordam" onClick={() => navigate('/help')} />
          <ProfileRow icon={<CircleDollarSign />} label="Tariflar" onClick={() => navigate('/tariflar')} />
          <ProfileRow icon={<History />} label="To'lovlar tarixi" onClick={() => navigate('/payment-history')} />
          <ProfileRow icon={<LogOut />} label="Chiqish" danger onClick={handleLogout} />
        </ProfileGroup>
      </main>
    </div>
  );
}

function ProfileGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="mb-2 px-0.5 text-base font-extrabold text-slate-900">{title}</h3>
      <div className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
        {children}
      </div>
    </section>
  );
}

function ProfileRow({
  icon,
  label,
  trailing,
  danger = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-b border-slate-100 px-3.5 py-3.5 text-left transition-colors last:border-b-0 hover:bg-slate-50 active:bg-slate-100 ${
        danger ? 'text-red-600' : 'text-slate-900'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
          danger ? 'bg-red-50 text-red-600' : 'bg-[#EEF4FA] text-[#24459A]'
        } [&>svg]:h-5 [&>svg]:w-5`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-base font-semibold">{label}</span>
      {trailing ?? <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />}
    </button>
  );
}

function Switch({
  checked,
  dark = false,
  onChange,
}: {
  checked: boolean;
  dark?: boolean;
  onChange: () => void;
}) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative h-7 w-11 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-emerald-500' : dark ? 'bg-slate-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </span>
  );
}
