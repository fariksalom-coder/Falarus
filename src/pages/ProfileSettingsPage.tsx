import { useCallback, useEffect, useId, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { apiUrl, resolveAssetUrl } from '../api';
import { bustAvatarUrl, patchUserAccount, removeUserAvatar, uploadUserAvatar } from '../api/user';
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
  const { t } = useLocale();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
  const avatarInputId = useId();

  const loadMe = useCallback(() => {
    if (!token) return;
    fetch(apiUrl('/api/user/me'), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MeResponse | null) => {
        if (!data) return;
        setFirstName(data.firstName ?? '');
        setLastName(data.lastName ?? '');
        setLevel(data.level ?? '');
        setEmail(data.email ?? '');
        setPhone(data.phone ?? '');
        setGender(data.gender ?? null);
        setAvatarUrl(data.avatarUrl ?? null);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
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
      firstName: me.firstName,
      lastName: me.lastName,
      avatarUrl: me.avatarUrl ? bustAvatarUrl(me.avatarUrl) : null,
      gender: me.gender ?? null,
    });
    setAvatarUrl(me.avatarUrl ?? null);
    setAvatarCacheKey((v) => v + 1);
  }

  function avatarPreviewUrl(url: string | null): string | null {
    const resolved = resolveAssetUrl(url);
    if (!resolved) return null;
    return `${resolved.split('?')[0]}?v=${avatarCacheKey}`;
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
      setBanner({ kind: 'ok', text: t('profile.avatarUpdated') });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : t('profile.avatarUploadFailed') });
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
      setBanner({ kind: 'ok', text: t('profile.avatarUpdated') });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : t('profile.avatarUploadFailed') });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    if (!token) {
      setBanner({ kind: 'error', text: t('common.loadError') });
      return;
    }
    if ((newPassword || newPasswordConfirm) && newPassword !== newPasswordConfirm) {
      setBanner({ kind: 'error', text: t('auth.passwordsMismatch') });
      return;
    }
    if ((newPassword || newPasswordConfirm) && newPassword.length < 6) {
      setBanner({ kind: 'error', text: t('auth.passwordMinLength') });
      return;
    }

    setSaving(true);
    try {
      const me = await patchUserAccount(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        gender,
        ...(newPassword || newPasswordConfirm
          ? {
              currentPassword,
              newPassword,
              newPasswordConfirm,
            }
          : {}),
      });
      applyMeToContext(me);
      setFirstName(me.firstName ?? '');
      setLastName(me.lastName ?? '');
      setEmail(me.email ?? '');
      setPhone(me.phone ?? '');
      setGender(me.gender ?? null);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setBanner({ kind: 'ok', text: t('profile.profileUpdated') });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : t('auth.genericError') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-app-bg-subtle pb-6">
      <main className="mx-auto w-full max-w-[820px]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-app-border bg-app-bg-subtle/95 px-4 py-3 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-app-border bg-app-surface text-app-text"
            aria-label={t('common.back')}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <h1 className="text-base font-extrabold text-app-text">{t('profile.edit')}</h1>
          <button
            type="submit"
            form="profile-edit-form"
            disabled={saving}
            className="text-sm font-bold text-[#0B2A6B] disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('profile.done')}
          </button>
        </header>

        <form id="profile-edit-form" onSubmit={handleSubmit} className="px-4 pt-5">
          <div className="flex flex-col items-center pb-5">
            <label
              htmlFor={avatarInputId}
              className={`relative flex h-20 w-20 cursor-pointer items-center justify-center rounded-full ${
                uploadingAvatar ? 'pointer-events-none opacity-60' : ''
              }`}
              aria-label={t('profile.tapPhoto')}
            >
              <UserAvatar
                avatarUrl={avatarPreviewUrl(avatarUrl)}
                gender={gender}
                name={`${firstName} ${lastName}`.trim()}
                className="h-20 w-20"
              />
              {uploadingAvatar ? (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/35">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </span>
              ) : null}
              <input
                id={avatarInputId}
                type="file"
                accept="image/*"
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                onChange={handlePickAvatar}
                disabled={uploadingAvatar}
              />
            </label>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
              <label
                htmlFor={avatarInputId}
                className={`text-sm font-bold text-[#0B2A6B] ${uploadingAvatar ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
              >
                {t('profile.tapPhoto')}
              </label>
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={() => void handleRemoveAvatar()}
                  disabled={uploadingAvatar}
                  className="text-sm font-semibold text-red-600 disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-center text-xs font-medium text-app-text-muted">JPG, PNG yoki WEBP · 4 MB gacha</p>
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

          <section className="rounded-[24px] border border-app-border bg-app-surface px-4 py-5 shadow-app-card">
            <h2 className="text-base font-extrabold text-app-text">{t('profile.rows.profile')}</h2>
            <div className="mt-5 space-y-5">
              <TextField label={t('profile.firstName')} value={firstName} onChange={setFirstName} clearLabel={t('kunlik.clear')} />
              <TextField label={t('profile.lastName')} value={lastName} onChange={setLastName} clearLabel={t('kunlik.clear')} />
              <TextField label={t('profile.russianLevel')} value={level} onChange={setLevel} readOnly clearLabel={t('kunlik.clear')} />
              <div>
                <span className="mb-2 block text-sm font-semibold text-app-text-muted">{t('profile.gender')}</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <GenderOption label={t('profile.genderMale')} selected={gender === 'male'} onSelect={() => setGender('male')} />
                  <GenderOption label={t('profile.genderFemale')} selected={gender === 'female'} onSelect={() => setGender('female')} />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-[24px] border border-app-border bg-app-surface px-4 py-5 shadow-app-card">
            <h2 className="text-base font-extrabold text-app-text">{t('profile.contactSecurity')}</h2>
            <div className="mt-5 space-y-5">
              <TextField label={t('auth.email')} action={t('profile.edit')} value={email} onChange={setEmail} type="email" clearLabel={t('kunlik.clear')} />
              <TextField label={t('auth.phone')} action={t('profile.edit')} value={phone} onChange={setPhone} type="tel" clearLabel={t('kunlik.clear')} />
              <PasswordField label={t('profile.currentPassword')} value={currentPassword} onChange={setCurrentPassword} />
              <PasswordField label={t('profile.newPassword')} value={newPassword} onChange={setNewPassword} />
              <PasswordField
                label={t('auth.rewritePassword')}
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
          ? 'border-app-primary-deep bg-app-icon-bg text-app-primary-deep'
          : 'border-app-border bg-app-surface text-app-text-muted'
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
  clearLabel,
}: {
  label: string;
  action?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  readOnly?: boolean;
  clearLabel: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-app-text-muted">{label}</span>
        {action ? <span className="text-xs font-semibold text-[#0B2A6B]">{action}</span> : null}
      </span>
      <span className="relative block">
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-app-border bg-app-surface px-3 pr-10 text-[15px] font-medium text-app-text outline-none placeholder:text-app-text-muted read-only:bg-app-bg-subtle read-only:text-app-text-muted"
        />
        {value && !readOnly ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-400 p-0.5 text-white"
            aria-label={clearLabel}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : readOnly ? (
          <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" aria-hidden />
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
      <span className="mb-2 block text-sm font-semibold text-app-text-muted">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-app-border bg-app-surface px-3 text-[15px] font-medium text-app-text outline-none"
      />
    </label>
  );
}
