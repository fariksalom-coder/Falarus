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
import { useTheme } from '../context/ThemeContext';
import { useTextScale } from '../context/TextScaleContext';
import { useAccess } from '../context/AccessContext';
import { useLocale } from '../context/LocaleContext';
import LanguagePickerModal from '../components/LanguagePickerModal';
import { languageMeta } from '../../shared/i18n/languages';
import UserAvatar from '../components/UserAvatar';
import { resolveAssetUrl } from '../api';
import { bustAvatarUrl, patchUserAccount, uploadUserAvatar } from '../api/user';
import { appMainBottomOffsetCss } from '../constants/appLayout';

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
  const { locale, t } = useLocale();
  const navigate = useNavigate();
  const hasPremium = Boolean(access?.subscription_active);
  const premiumDays = premiumDaysLeft(user?.planExpiresAt);
  const showActivePremium = hasPremium && premiumDays != null && premiumDays > 0;
  const avatarInputId = useId();
  const [avatarRevision, setAvatarRevision] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { isDark, toggleTheme } = useTheme();
  const { label: textScaleLabel, cycleTextScale } = useTextScale();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [banner, setBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
  }, [user?.firstName, user?.lastName]);

  if (user?.accountType === 'teacher') {
    return <Navigate to="/teacher-cabinet" replace />;
  }

  const fullName =
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || t('common.user');

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
      setBanner({ kind: 'ok', text: t('profile.avatarUpdated') });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : t('profile.avatarUploadFailed') });
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
      setBanner({ kind: 'error', text: t('profile.nameRequired') });
      return;
    }
    setBanner(null);
    setSavingName(true);
    try {
      const me = await patchUserAccount(token, { firstName: nextFirst, lastName: nextLast });
      applyMe(me);
      setEditingName(false);
      setBanner({ kind: 'ok', text: t('profile.nameUpdated') });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : t('common.loadError') });
    } finally {
      setSavingName(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/auth');
  }

  return (
    <div
      className="min-h-full bg-app-bg px-4 pt-2"
      style={{ paddingBottom: `calc(${appMainBottomOffsetCss()} + 24px)` }}
    >
      <main className="mx-auto w-full max-w-[820px]">
        <header className="mb-4 px-0.5">
          <h1 className="text-[28px] font-extrabold tracking-tight text-app-text">{t('nav.profile')}</h1>
        </header>

        {banner ? (
          <div
            className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${
              banner.kind === 'ok'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
            }`}
          >
            {banner.text}
          </div>
        ) : null}

        <section className="mb-6 flex flex-col items-center rounded-[24px] border border-app-border bg-app-surface px-5 py-6 shadow-app-card">
          <label
            htmlFor={avatarInputId}
            className={`relative flex h-[88px] w-[88px] cursor-pointer items-center justify-center rounded-full ring-2 ring-app-border ring-offset-2 ring-offset-app-surface ${
              uploadingAvatar ? 'pointer-events-none opacity-60' : ''
            }`}
            aria-label="Profil rasmini tanlash"
          >
            <UserAvatar
              avatarUrl={localPreviewUrl ?? avatarDisplayUrl(user?.avatarUrl)}
              gender={user?.gender ?? null}
              name={fullName}
              className="h-[88px] w-[88px]"
            />
            <span className="pointer-events-none absolute bottom-0.5 right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-app-surface bg-app-primary text-white shadow-md">
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
          <p className="mt-3 text-[13px] font-medium text-app-icon-fg">{t('profile.tapPhoto')}</p>

          {editingName ? (
            <div className="mt-4 w-full max-w-sm space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-app-text-muted">{t('profile.firstName')}</span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-app-border bg-app-surface px-3 text-[15px] font-medium text-app-text outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
                  autoComplete="given-name"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-app-text-muted">{t('profile.lastName')}</span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-app-border bg-app-surface px-3 text-[15px] font-medium text-app-text outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/20"
                  autoComplete="family-name"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSaveName()}
                  disabled={savingName}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl bg-app-primary text-sm font-bold text-white disabled:opacity-50"
                >
                  {savingName ? '...' : t('profile.save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingName(false);
                    setFirstName(user?.firstName ?? '');
                    setLastName(user?.lastName ?? '');
                  }}
                  className="flex h-10 items-center justify-center rounded-xl border border-app-border px-4 text-sm font-semibold text-app-text-muted"
                >
                  {t('profile.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="mt-3 flex items-center gap-2 text-center"
            >
              <h2 className="text-[20px] font-extrabold text-app-text">{fullName}</h2>
              <Pencil className="h-4 w-4 text-app-text-muted" aria-hidden />
            </button>
          )}

          <div className="mt-5 flex w-full justify-center">
            {showActivePremium ? (
              <div className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-[#FFC425] px-5 text-[#0F172A]">
                <Crown className="h-4 w-4 fill-[#0F172A]" aria-hidden />
                <span className="text-sm font-extrabold">
                  {t('profile.premiumDaysLeft', { days: premiumDays })}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/tariflar')}
                className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-app-primary px-6 text-white shadow-[0_8px_24px_rgba(37,99,235,0.28)] active:scale-[0.98]"
              >
                <Crown className="h-4 w-4" aria-hidden />
                <span className="text-sm font-extrabold">{t('profile.premiumBuy')}</span>
              </button>
            )}
          </div>
        </section>

        <ProfileGroup title={t('profile.groups.personal')}>
          <ProfileRow icon={<UserCircle />} label={t('profile.rows.profile')} onClick={() => navigate('/profile/settings')} />
          <ProfileRow icon={<BookOpen />} label={t('profile.rows.certificates')} />
          <ProfileRow icon={<Users />} label={t('profile.rows.invite')} onClick={() => navigate('/invite')} />
        </ProfileGroup>

        <ProfileGroup title={t('profile.groups.settings')}>
          <ProfileRow
            icon={<Type />}
            label={t('profile.rows.textSize')}
            ariaLabel={t('profile.textSizeAria', { size: textScaleLabel })}
            onClick={cycleTextScale}
            trailing={
              <div
                className="flex h-8 min-w-[52px] items-center justify-center rounded-full border border-app-primary/25 bg-app-primary/10 px-3"
                aria-hidden
              >
                <span className="text-xs font-bold text-app-primary">{textScaleLabel}</span>
              </div>
            }
          />
          <ProfileRow
            icon={<Bell />}
            label={t('profile.rows.notifications')}
            trailing={<Switch checked={notificationsEnabled} onChange={() => setNotificationsEnabled((v) => !v)} />}
          />
          <ProfileRow
            icon={<Moon />}
            label={t('profile.rows.darkMode')}
            trailing={<Switch checked={isDark} onChange={toggleTheme} />}
          />
          <ProfileRow
            icon={<Globe2 />}
            label={t('profile.rows.language')}
            trailing={
              <span className="text-sm font-semibold text-app-text-muted">
                {languageMeta(locale).label}
              </span>
            }
            onClick={() => setLanguagePickerOpen(true)}
          />
          <ProfileRow icon={<Volume2 />} label={t('profile.rows.sound')} />
        </ProfileGroup>

        <ProfileGroup title={t('profile.groups.help')}>
          <ProfileRow icon={<CircleHelp />} label={t('profile.rows.help')} onClick={() => navigate('/help')} />
          <ProfileRow icon={<CircleDollarSign />} label={t('profile.rows.pricing')} onClick={() => navigate('/tariflar')} />
          <ProfileRow icon={<History />} label={t('profile.rows.paymentHistory')} onClick={() => navigate('/payment-history')} />
          <ProfileRow icon={<LogOut />} label={t('profile.rows.logout')} danger onClick={handleLogout} />
        </ProfileGroup>
      </main>
      <LanguagePickerModal open={languagePickerOpen} onClose={() => setLanguagePickerOpen(false)} />
    </div>
  );
}

function ProfileGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-app-icon-fg">
        {title}
      </h3>
      <div className="overflow-hidden rounded-[24px] border border-app-border bg-app-surface shadow-app-card">
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
  ariaLabel,
}: {
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  danger?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`relative w-full text-left transition-colors hover:bg-[var(--app-row-hover)] active:bg-[var(--app-row-active)] after:absolute after:bottom-0 after:left-5 after:right-5 after:h-px after:bg-app-border-row last:after:hidden ${
        danger ? 'text-red-600 dark:text-red-400' : 'text-app-text'
      }`}
    >
      <span className="flex min-h-[64px] w-full items-center gap-3.5 px-5 py-2">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            danger ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' : 'bg-app-icon-bg text-app-icon-fg'
          } [&>svg]:h-5 [&>svg]:w-5`}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight">{label}</span>
        {trailing ?? <ChevronRight className="h-5 w-5 shrink-0 text-app-text-muted" aria-hidden />}
      </span>
    </button>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative h-7 w-[46px] shrink-0 rounded-full transition-colors ${
        checked ? 'bg-app-primary' : 'bg-[var(--app-switch-off)]'
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
