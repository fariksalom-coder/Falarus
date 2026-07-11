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
import { fetchStreak, getCachedStreak } from '../api/activity';
import { fetchLeaderboard } from '../api/leaderboard';
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
  const [streakDays, setStreakDays] = useState(() => getCachedStreak()?.streak_days ?? 0);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
  }, [user?.firstName, user?.lastName]);

  useEffect(() => {
    if (!token) return;
    void fetchStreak(token).then((res) => {
      if (res) setStreakDays(res.streak_days);
    });
    void fetchLeaderboard(token, 'all').then((res) => {
      setPoints(res.myRank?.points ?? 0);
    });
  }, [token]);

  const level = Math.floor(points / 500) + 1;

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

  const memberSince = new Date().getFullYear();
  const memberInitials = (
    (user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')
  ).toUpperCase() || 'FR';
  const membershipCode = `${memberInitials.slice(0, 2)} · ${memberSince}`;
  const formattedPoints = points.toLocaleString('ru-RU').replace(/,/g, ' ');

  return (
    <div
      className="profile-premium min-h-full px-4 pt-2"
      style={{ paddingBottom: `calc(${appMainBottomOffsetCss()} + 24px)` }}
    >
      <main className="mx-auto w-full max-w-[820px]">
        <header className="mb-4 px-0.5">
          <h1 className="profile-heading text-[30px] leading-none text-pmn-text">
            {t('nav.profile')}
          </h1>
        </header>

        {banner ? (
          <div
            className={`mb-4 rounded-[16px] px-4 py-3 text-sm font-semibold ring-1 ${
              banner.kind === 'ok'
                ? 'bg-[#E8F5EC] text-[#1F6B3F] ring-[#BFDFC8]'
                : 'bg-[#FDECEC] text-[#8A1F1F] ring-[#F1BEBE]'
            }`}
          >
            {banner.text}
          </div>
        ) : null}

        {/* Passport-navy hero with gold guilloché */}
        <section className="profile-guilloche relative mb-4 overflow-hidden rounded-[24px] px-5 py-5 text-white shadow-[0_22px_44px_-18px_rgba(15,27,59,0.55)]">
          {/* Top row: OLTIN A'ZO pill + member code */}
          <div className="relative z-[2] flex items-center justify-between">
            <span className="profile-gold-pill inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]">
              <span aria-hidden>✦</span>
              <span>Oltin a'zo</span>
            </span>
            <span className="profile-heading text-[13px] tracking-[0.28em] text-[#D4AC5C]">
              {membershipCode}
            </span>
          </div>

          {/* Avatar + name + course line */}
          <div className="relative z-[2] mt-4 flex items-center gap-4">
            <label
              htmlFor={avatarInputId}
              className={`relative flex h-[76px] w-[76px] shrink-0 cursor-pointer items-center justify-center rounded-full ring-2 ring-[#D4AC5C] ring-offset-2 ring-offset-[#0F1B3B] ${
                uploadingAvatar ? 'pointer-events-none opacity-60' : ''
              }`}
              aria-label="Profil rasmini tanlash"
            >
              <UserAvatar
                avatarUrl={localPreviewUrl ?? avatarDisplayUrl(user?.avatarUrl)}
                gender={user?.gender ?? null}
                name={fullName}
                className="h-[72px] w-[72px]"
              />
              <span className="pointer-events-none absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0F1B3B] bg-[#D4AC5C] text-[#0F1B3B] shadow-md">
                {uploadingAvatar ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#0F1B3B] border-t-transparent" />
                ) : (
                  <Camera className="h-3 w-3" aria-hidden strokeWidth={2.4} />
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

            <div className="min-w-0 flex-1">
              {editingName ? (
                <div className="space-y-2">
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('profile.firstName')}
                    className="h-10 w-full rounded-[10px] border border-white/20 bg-white/10 px-3 text-[15px] font-bold text-white placeholder:text-white/50"
                    autoComplete="given-name"
                  />
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t('profile.lastName')}
                    className="h-10 w-full rounded-[10px] border border-white/20 bg-white/10 px-3 text-[15px] font-bold text-white placeholder:text-white/50"
                    autoComplete="family-name"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveName()}
                      disabled={savingName}
                      className="profile-gold-pill flex h-9 flex-1 items-center justify-center rounded-full text-xs font-black disabled:opacity-50"
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
                      className="flex h-9 items-center justify-center rounded-full border border-white/25 px-4 text-xs font-bold text-white"
                    >
                      {t('profile.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="flex items-center gap-2 text-left"
                  >
                    <h2 className="profile-heading text-[24px] leading-tight text-white sm:text-[26px]">
                      {fullName}
                    </h2>
                    <Pencil className="h-3.5 w-3.5 text-[#D4AC5C]/80" aria-hidden />
                  </button>
                  <p className="mt-1 text-[12.5px] font-bold text-[#D4AC5C]">
                    ВНЖ kursi · B1 daraja
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Gold divider */}
          <div className="relative z-[2] mt-5 h-px w-full bg-gradient-to-r from-transparent via-[#D4AC5C]/40 to-transparent" />

          {/* 3 stats row */}
          <div className="relative z-[2] mt-4 grid grid-cols-3 gap-3">
            <div>
              <p className="profile-heading text-[26px] leading-none text-white">{streakDays}</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#D4AC5C]">
                Seriya
              </p>
            </div>
            <div className="border-x border-[#D4AC5C]/25 px-3">
              <p className="profile-heading text-[26px] leading-none text-white">{level}</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#D4AC5C]">
                Daraja
              </p>
            </div>
            <div>
              <p className="profile-heading text-[26px] leading-none text-white">{formattedPoints}</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#D4AC5C]">
                Ball
              </p>
            </div>
          </div>
        </section>

        {/* Premium sotib olish / status tile */}
        {showActivePremium ? (
          <div className="mb-6 flex items-center gap-3 rounded-[20px] bg-pmn-card px-4 py-3.5 shadow-[0_12px_24px_-14px_rgba(184,135,58,0.35)] ring-1 ring-pmn-border">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-[20px]"
              style={{ background: 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)' }}
            >
              👑
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-black text-pmn-text">
                {t('profile.premiumDaysLeft', { days: premiumDays })}
              </p>
              <p className="mt-0.5 text-[12px] font-bold text-pmn-text-muted">
                Premium a'zolik faol
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/tariflar')}
            className="mb-6 flex w-full items-center gap-3 rounded-[20px] bg-pmn-card px-4 py-3.5 text-left shadow-[0_12px_24px_-14px_rgba(184,135,58,0.35)] ring-1 ring-pmn-border transition hover:-translate-y-0.5 active:scale-[0.995]"
          >
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-[20px]"
              style={{ background: 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)' }}
            >
              👑
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-black text-pmn-text">Premium sotib olish</p>
              <p className="mt-0.5 text-[12px] font-bold text-pmn-text-muted">
                Barcha kurslar va imtihonlar
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-pmn-gold-deep" strokeWidth={2.4} />
          </button>
        )}

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
    <section className="mt-5">
      <h3 className="mb-2.5 px-1 text-[10.5px] font-bold uppercase tracking-[0.24em] text-pmn-text-soft">
        {title}
      </h3>
      <div className="overflow-hidden rounded-[22px] bg-pmn-card shadow-[0_12px_28px_-16px_rgba(15,27,59,0.18)] ring-1 ring-pmn-border">
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
      className={`relative w-full text-left transition-colors hover:bg-app-row-hover active:bg-app-row-active after:absolute after:bottom-0 after:left-5 after:right-5 after:h-px after:bg-pmn-cream-border last:after:hidden ${
        danger ? 'text-[#B4282E]' : 'text-pmn-text'
      }`}
    >
      <span className="flex min-h-[62px] w-full items-center gap-3.5 px-4 py-2">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-pmn-pill ${
            danger
              ? 'bg-[#FDECEC] text-[#B4282E] ring-1 ring-[#F1BEBE]'
              : 'text-pmn-text ring-1 ring-pmn-border'
          } [&>svg]:h-[18px] [&>svg]:w-[18px]`}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold leading-tight">{label}</span>
        {trailing ?? <ChevronRight className="h-4 w-4 shrink-0 text-pmn-text-muted" strokeWidth={2.4} aria-hidden />}
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
