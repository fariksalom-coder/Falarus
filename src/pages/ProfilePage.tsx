import { Badge, Button, Card, Field, PageHeader } from '../components/ui/Foundation';
import { useEffect, useId, useState, type ChangeEvent, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Camera,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  GraduationCap,
  Globe2,
  History,
  KeyRound,
  Lock,
  LogOut,
  Moon,
  Pencil,
  Smartphone,
  Type,
  UserCircle,
  Users,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchStreak, getCachedStreak } from '../api/activity';
import { fetchMyRank, getCachedMyRank } from '../api/leaderboard';
import { useTheme } from '../context/ThemeContext';
import { useTextScale } from '../context/TextScaleContext';
import { useAccess } from '../context/AccessContext';
import { prefetchRoutePath } from '../routeModules';
import { useLocale } from '../context/LocaleContext';
import LanguagePickerModal from '../components/LanguagePickerModal';
import { InstallGuideModal } from '../components/InstallAppCard';
import { usePwaInstall } from '../hooks/usePwaInstall';
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
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const { isInstalled: appInstalled, promptInstall } = usePwaInstall();
  const [streakDays, setStreakDays] = useState(() => getCachedStreak()?.streak_days ?? 0);
  const [points, setPoints] = useState(() => getCachedMyRank()?.points ?? 0);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
  }, [user?.firstName, user?.lastName]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const run = () => {
      void fetchStreak(token).then((res) => {
        if (!cancelled && res) setStreakDays(res.streak_days);
      });
      void fetchMyRank(token).then((res) => {
        if (!cancelled && res) setPoints(res.points);
      });
    };
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(() => run(), { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(run, 0);
    }
    return () => {
      cancelled = true;
      if (idleId != null) window.cancelIdleCallback(idleId);
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [token]);

  const level = Math.floor(points / 500) + 1;
  // OLTIN A'ZO: daraja ham, ball ham chegarasiz — raqam o'rniga cheksizlik belgisi.
  const oltin = Boolean(access?.golden);
  const CHEKSIZ = '\u221E';

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

  const formattedPoints = points.toLocaleString('ru-RU').replace(/,/g, ' ');

  return (
    <div
      className="profile-premium min-h-full px-4 pt-2"
      style={{ paddingBottom: `calc(${appMainBottomOffsetCss()} + 24px)` }}
    >
      <main className="mx-auto w-full max-w-[820px]">
        <PageHeader title={t('nav.profile')} />

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

        <Card className="academic-profile-card mb-5">
          <div className="academic-profile-identity">
            <label htmlFor={avatarInputId} className="academic-avatar" aria-label="Profil rasmini tanlash">
              <UserAvatar avatarUrl={localPreviewUrl ?? avatarDisplayUrl(user?.avatarUrl)} gender={user?.gender ?? null} name={fullName} className="h-16 w-16" />
              <span className="academic-avatar-edit"><Camera size={13} aria-hidden /></span>
              <input id={avatarInputId} type="file" accept="image/*" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={handlePickAvatar} disabled={uploadingAvatar} />
            </label>
            <div className="min-w-0 flex-1"><h2 className="text-xl font-bold text-app-text">{fullName}</h2><p className="ui-description">{user?.email || user?.phone || "Shaxsiy o'quvchi hisobi"}</p>{uploadingAvatar && <p role="status" className="ui-description">Rasm yuklanmoqda…</p>}</div>
            <Button variant="secondary" onClick={() => setEditingName(!editingName)} aria-expanded={editingName}><Pencil size={15} /> Tahrirlash</Button>
          </div>
          {editingName && <form className="academic-profile-form" onSubmit={e => { e.preventDefault(); void handleSaveName(); }}>
            <Field label={t('profile.firstName')} value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" required />
            <Field label={t('profile.lastName')} value={lastName} onChange={e => setLastName(e.target.value)} autoComplete="family-name" required />
            <div className="flex gap-2"><Button type="submit" loading={savingName}>{t('profile.save')}</Button><Button variant="ghost" onClick={() => { setEditingName(false); setFirstName(user?.firstName ?? ''); setLastName(user?.lastName ?? ''); }}>{t('profile.cancel')}</Button></div>
          </form>}
          <div className="academic-profile-stats"><div><strong>{streakDays}</strong><span>Kunlik faollik</span></div><div><strong>{oltin ? CHEKSIZ : level}</strong><span>Faollik darajasi</span></div><div><strong>{oltin ? CHEKSIZ : formattedPoints}</strong><span>To'plangan ball</span></div></div>
          {oltin && <Badge>Oltin a'zo</Badge>}
        </Card>
        <button type="button" onClick={() => navigate('/kurslar')} onMouseEnter={() => prefetchRoutePath('/kurslar')} onFocus={() => prefetchRoutePath('/kurslar')} className="academic-profile-course">
          <GraduationCap size={22} aria-hidden /><span><strong>Kurslarim</strong><small>Patent va ВНЖ imtihoniga tayyorgarlik</small></span><ChevronRight size={18} aria-hidden />
        </button>

        {/* Premium sotib olish / status tile */}
        {showActivePremium ? (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-pmn-card px-4 py-3.5 shadow-none ring-1 ring-pmn-border">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-[20px]"
              style={{ background: 'var(--app-icon-bg)', color: 'var(--app-brand)' }}
            >
              <BookOpen size={21} />
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
            className="mb-6 flex w-full items-center gap-3 rounded-xl bg-pmn-card px-4 py-3.5 text-left shadow-none ring-1 ring-pmn-border transition hover:bg-app-bg-muted"
          >
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-[20px]"
              style={{ background: 'var(--app-icon-bg)', color: 'var(--app-brand)' }}
            >
              <BookOpen size={21} />
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
          {/* Parolni o'zgartirish — alohida ekran: ilgari u profil formasining
              eng pastida ko'rinmay yotardi. */}
          <ProfileRow icon={<Lock />} label="Parolni o'zgartirish" onClick={() => navigate('/profile/parol')} />
        </ProfileGroup>

        {/*
          * Support asboblari — faqat oltin hisobda. Ruxsat serverda ham
          * tekshiriladi, bu yerdagi shart shunchaki ko'rinishni yashiradi.
          */}
        {oltin ? (
          <ProfileGroup title="Support">
            <ProfileRow
              icon={<KeyRound />}
              label="Foydalanuvchi paroli"
              onClick={() => navigate('/support/parol')}
            />
          </ProfileGroup>
        ) : null}

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
          {/* Ilova o'rnatilgan bo'lsa bu qator keraksiz — yashiramiz. */}
          {!appInstalled ? (
            <ProfileRow
              icon={<Smartphone />}
              label={t('install.profileRow')}
              onClick={() => {
                // Avval tizim so'rovi; brauzer qo'llab-quvvatlamasa — ko'rsatma.
                void promptInstall().then((outcome) => {
                  if (outcome === 'unavailable') setInstallGuideOpen(true);
                });
              }}
            />
          ) : null}
        </ProfileGroup>

        <ProfileGroup title={t('profile.groups.help')}>
          <ProfileRow icon={<CircleHelp />} label={t('profile.rows.help')} onClick={() => navigate('/help')} />
          <ProfileRow icon={<CircleDollarSign />} label={t('profile.rows.pricing')} onClick={() => navigate('/tariflar')} />
          <ProfileRow icon={<History />} label={t('profile.rows.paymentHistory')} onClick={() => navigate('/payment-history')} />
          <ProfileRow icon={<LogOut />} label={t('profile.rows.logout')} danger onClick={handleLogout} />
        </ProfileGroup>
      </main>
      <LanguagePickerModal open={languagePickerOpen} onClose={() => setLanguagePickerOpen(false)} />
      <InstallGuideModal open={installGuideOpen} onClose={() => setInstallGuideOpen(false)} />
    </div>
  );
}

function ProfileGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2.5 px-1 text-xs font-semibold tracking-wide text-pmn-text-soft">
        {title}
      </h3>
      <div className="overflow-hidden rounded-xl bg-pmn-card shadow-none ring-1 ring-pmn-border">
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
