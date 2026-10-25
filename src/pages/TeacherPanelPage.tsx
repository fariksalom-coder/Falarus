import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Bell,
  LogOut,
  BookOpen,
  CalendarDays,
  FolderOpen,
  Home,
  LayoutGrid,
  type LucideIcon,
  MessageSquare,
  Plus,
  Search,
  Star,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  getPanelNotifications,
  getPanelStudents,
  getPanelSummary,
  markNotificationsRead,
  type PanelNotification,
  type PanelStudent,
  type PanelSummary,
} from '../api/teacherPanel';
import { getTeacherCabinet, type TeacherCabinet } from '../api/teachers';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { PANEL_TEXTS, type PanelLang } from '../components/teacher/panel/lang';
import { PanelProvider, type SectionKey } from '../components/teacher/panel/panelContext';
import { Avatar, Fade, PageHead, SegmentTabs, Skeleton, Toast, toneFor } from '../components/teacher/panel/ui';
import { AddTimeModal } from '../components/teacher/panel/sections/scheduleModals';
import Dashboard from '../components/teacher/panel/sections/Dashboard';
import Schedule from '../components/teacher/panel/sections/Schedule';
import Students, { StudentDetail } from '../components/teacher/panel/sections/Students';
import Lessons from '../components/teacher/panel/sections/Lessons';
import Materials from '../components/teacher/panel/sections/Materials';
import LessonReport from '../components/teacher/panel/sections/LessonReport';
import Anketa from '../components/teacher/panel/sections/Anketa';
import OnboardingWizard from '../components/teacher/onboarding/OnboardingWizard';
import { ONBOARDING_TEXT } from '../components/teacher/onboarding/text';
import Profile, { Documents, PublicPreview } from '../components/teacher/panel/sections/Profile';
import Balance from '../components/teacher/panel/sections/Balance';
import Commission from '../components/teacher/onboarding/Commission';
import Messages, { NotificationsDrawer, Reviews } from '../components/teacher/panel/sections/Communication';
import Settings, { Help } from '../components/teacher/panel/sections/SettingsHelp';
import { TEACHER_LOGIN_PATH, TEACHER_REGISTER_PATH } from '../constants/teacherPaths';
import { FalaRusLogoMark } from '../components/FalaRusLogoMark';

/**
 * O'qituvchi paneli — prototip ("Кабинет преподавателя") asosida qayta yozilgan.
 *
 * Tuzilishi: chapda menyu (kompyuterda), tepada qidiruv/til/bildirishnoma,
 * telefonda esa pastki menyu + "Yana" ro'yxati. Barcha bo'lim haqiqiy
 * ma'lumot bilan ishlaydi; ma'lumot yo'q joyda bo'sh holat ko'rsatiladi.
 */

const LANG_KEY = 'falarus.teacherPanel.lang';

type PanelLabel = keyof (typeof PANEL_TEXTS)['uz'];

type NavItem = {
  key: SectionKey;
  label: PanelLabel;
  /** Menyuda nom yonidagi kichik izoh (masalan, «Balans · %»). */
  hint?: PanelLabel;
  icon: LucideIcon;
  group: 'work' | 'cabinet' | 'other';
};

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'navDashboard', icon: Home, group: 'work' },
  { key: 'schedule', label: 'navSchedule', icon: CalendarDays, group: 'work' },
  { key: 'students', label: 'navStudentsShort', icon: Users, group: 'work' },
  { key: 'lessons', label: 'navLessons', icon: BookOpen, group: 'work' },
  { key: 'materials', label: 'navMaterials', icon: FolderOpen, group: 'work' },
  { key: 'messages', label: 'navMessages', icon: MessageSquare, group: 'work' },
  { key: 'income', label: 'navMoney', hint: 'navMoneyHint', icon: Wallet, group: 'cabinet' },
  { key: 'reviews', label: 'navReviews', icon: Star, group: 'cabinet' },
  // Profil, anketa, hujjatlar, sozlamalar va yordam — bitta bandda (tablar bilan).
  { key: 'profile', label: 'navProfileShort', icon: User, group: 'cabinet' },
];

const MOBILE_KEYS: SectionKey[] = ['dashboard', 'schedule', 'students', 'messages'];
const MOBILE_LABEL: Partial<Record<SectionKey, PanelLabel>> = { dashboard: 'navHomeShort' };

/** «Yana» varag'i (telefon): pastki menyuga sig'magan bo'limlar. */
const MORE_ITEMS: Array<{ key: SectionKey; label: PanelLabel; sub: PanelLabel }> = [
  { key: 'lessons', label: 'navLessons', sub: 'moreLessons' },
  { key: 'materials', label: 'navMaterials', sub: 'moreMaterials' },
  { key: 'income', label: 'navMoney', sub: 'moreMoney' },
  { key: 'reviews', label: 'navReviews', sub: 'moreReviews' },
  { key: 'profile', label: 'navProfileShort', sub: 'moreProfile' },
];

const MONEY_KEYS: SectionKey[] = ['income', 'subscription'];
const PROFILE_KEYS: SectionKey[] = ['profile', 'anketa', 'documents', 'public', 'settings', 'help'];

/** Ichki bo'limlar menyuda qaysi band yonib turishini belgilaydi. */
const NAV_PARENT: Partial<Record<SectionKey, SectionKey>> = {
  class: 'lessons',
  student: 'students',
  report: 'lessons',
  public: 'profile',
  anketa: 'profile',
  documents: 'profile',
  settings: 'profile',
  help: 'profile',
  subscription: 'income',
};

function readLang(fallback: PanelLang): PanelLang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'ru' || saved === 'uz') return saved;
  } catch {
    /* localStorage yopiq bo'lishi mumkin */
  }
  return fallback;
}

export default function TeacherPanelPage() {
  const { token, user, logout } = useAuth();
  const { locale } = useLocale();
  const navigate = useNavigate();

  const [lang, setLangState] = useState<PanelLang>(() => readLang(locale === 'ru' ? 'ru' : 'uz'));
  const [section, setSection] = useState<SectionKey>('dashboard');
  const [param, setParam] = useState<number | null>(null);
  const [summary, setSummary] = useState<PanelSummary | null>(null);
  const [cabinet, setCabinet] = useState<TeacherCabinet | null>(null);
  const [cabinetState, setCabinetState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [notifications, setNotifications] = useState<PanelNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [toastText, setToastText] = useState('');
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<PanelStudent[]>([]);
  const [error, setError] = useState('');

  const t = PANEL_TEXTS[lang];

  const setLang = useCallback((next: PanelLang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* saqlanmasa ham panel ishlaydi */
    }
  }, []);

  const refresh = useCallback(() => {
    if (!token) return;
    void getPanelSummary(token)
      .then(setSummary)
      .catch((e: Error) => setError(e.message));
    void getTeacherCabinet(token)
      .then((c) => {
        setCabinet(c);
        setCabinetState('ok');
      })
      .catch(() => setCabinetState((prev) => (prev === 'ok' ? prev : 'error')));
    void getPanelNotifications(token)
      .then((r) => {
        setNotifications(r.notifications);
        setUnread(r.unread);
      })
      .catch(() => undefined);
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Qidiruv uchun o'quvchilar ro'yxati — bir marta yuklanadi.
  useEffect(() => {
    if (!token || students.length || !query) return;
    void getPanelStudents(token, 'all')
      .then((r) => setStudents(r.students))
      .catch(() => undefined);
  }, [token, query, students.length]);

  const go = useCallback((next: SectionKey, id?: number) => {
    setSection(next);
    setParam(id ?? null);
    setNotifOpen(false);
    setMoreOpen(false);
    setQuery('');
    window.scrollTo({ top: 0 });
  }, []);

  const toast = useCallback((text: string) => {
    setToastText(text);
    window.setTimeout(() => setToastText(''), 2600);
  }, []);

  const ctx = useMemo(
    () => ({
      token: token ?? '',
      lang,
      setLang,
      t,
      go,
      toast,
      summary,
      cabinet,
      notifications,
      unread,
      refresh,
    }),
    [token, lang, setLang, t, go, toast, summary, cabinet, notifications, unread, refresh]
  );

  /* Kirish yo'li bo'lmasa panel tuzoqqa aylanadi — aniq tugma ko'rsatiladi. */
  if (!token) {
    return (
      <Gate
        title={t.gateTitle}
        text={t.gateText}
        primary={{ label: t.gateLogin, onClick: () => navigate(TEACHER_LOGIN_PATH) }}
        secondary={{ label: t.gateRegister, onClick: () => navigate(TEACHER_REGISTER_PATH) }}
      />
    );
  }
  if (user && user.accountType !== 'teacher') {
    return (
      <Gate
        title={t.gateStudentTitle}
        text={t.gateStudentText}
        primary={{ label: t.gateHome, onClick: () => navigate('/') }}
        secondary={{ label: t.gateLogin, onClick: () => navigate(TEACHER_LOGIN_PATH) }}
      />
    );
  }

  /*
   * Anketa tasdiqlanmaguncha (yangi ro'yxatdan o'tgan o'qituvchi, tekshiruvda, tuzatishda)
   * kabinet bo'limlari ko'rinmaydi — faqat anketa yo'li. Holat noma'lum paytda panelni
   * ko'rsatmaymiz, aks holda yangi o'qituvchi bir lahza to'liq kabinetni ko'rib qolardi.
   */
  if (cabinetState === 'loading') {
    return (
      <div className="min-h-screen bg-app-bg-muted px-4 py-8">
        <div className="mx-auto max-w-3xl"><Skeleton rows={6} /></div>
      </div>
    );
  }
  if (cabinetState === 'error') {
    return (
      <Gate
        title={t.loadError}
        text={t.loadErrorText}
        primary={{ label: t.retry, onClick: refresh }}
        secondary={{ label: t.logout, onClick: () => { logout(); navigate('/'); } }}
      />
    );
  }
  const profileStatus = String(cabinet?.profile?.profile_status ?? 'draft');
  if (profileStatus !== 'active' && profileStatus !== 'paused') {
    return (
      <PanelProvider value={ctx}>
        <OnboardingOnly lang={lang} setLang={setLang} onLogout={() => { logout(); navigate('/'); }} logoutLabel={t.logout} />
        {toastText ? <Toast text={toastText} /> : null}
      </PanelProvider>
    );
  }

  const name =
    cabinet?.profile?.display_name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    t.teacherRole;
  const status = String(cabinet?.profile?.profile_status ?? 'draft');
  const activeNav = NAV_PARENT[section] ?? section;
  const inBar = MOBILE_KEYS.includes(activeNav);
  const logoutAndLeave = () => {
    logout();
    navigate('/');
  };
  const addTimeLabel = t.addFreeTime.replace(/^\+\s*/, '');

  const found = query.trim()
    ? students.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];

  return (
    <PanelProvider value={ctx}>
      <div className="teacher-workspace min-h-screen lg:flex">
        {/* ── Chap menyu (kompyuter) ─────────────────────────────────────── */}
        <aside className="tw-sidebar sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col gap-5 overflow-y-auto px-3 py-5 lg:flex">
          <div className="flex items-center gap-2.5 px-2">
            <FalaRusLogoMark size={36} className="rounded-[10px] ring-1 ring-app-border" />
            <span className="flex flex-col">
              <span className="text-[16px] font-extrabold leading-[1.1] text-app-text">FalaRus</span>
              <span className="text-[12px] font-bold text-app-primary">{t.cabinetBrand}</span>
            </span>
          </div>

          <nav aria-label={t.cabinetBrand} className="flex flex-col gap-0.5">
            {(['work', 'cabinet', 'other'] as const).filter((g) => NAV.some((n) => n.group === g)).map((group) => (
              <div key={group} className="flex flex-col gap-0.5">
                {group !== 'work' ? (
                  <p className="mt-4 mb-1.5 px-3 text-[12px] font-bold uppercase tracking-[0.06em] text-app-text-muted">
                    {group === 'cabinet' ? t.groupCabinet : t.groupOther}
                  </p>
                ) : null}
                {NAV.filter((n) => n.group === group).map((n) => {
                  const Icon = n.icon;
                  const on = n.key === activeNav;
                  return (
                    <button
                      key={n.key}
                      type="button"
                      onClick={() => go(n.key)}
                      aria-current={on ? 'page' : undefined}
                      className={`flex min-h-[44px] w-full items-center gap-3 rounded-[12px] px-3 text-left text-[14px] transition ${
                        on ? 'bg-app-icon-bg font-extrabold text-app-icon-fg' : 'font-semibold text-app-text-secondary hover:bg-[var(--app-row-hover)]'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
                      <span className="min-w-0 flex-1 truncate">{t[n.label]}</span>
                      {n.hint ? <span className="text-[12px] font-semibold text-app-text-muted">{t[n.hint]}</span> : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Kim kirgani va holati — pastda, chiqish tugmasi bilan birga. */}
          <div className="mt-auto flex items-center gap-2 rounded-[14px] border border-app-border p-2.5">
            <Avatar name={name} url={cabinet?.profile?.avatar_url ?? null} size={38} tone="teal" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] font-bold text-app-text">{name}</span>
              <StatusLine status={status} t={t} />
            </span>
            <button
              type="button"
              onClick={logoutAndLeave}
              aria-label={t.logout}
              title={t.logout}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-app-bg-muted text-app-text-muted transition hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          {/* ── Tepa qator: kompyuter ───────────────────────────────────── */}
          <header className="sticky top-0 z-30 hidden flex-wrap items-center gap-3 border-b border-app-border bg-app-surface px-8 py-3 lg:flex">
            <div className="relative max-w-[420px] flex-[1_1_260px]">
              <label className="flex h-11 items-center gap-2.5 rounded-[12px] border border-app-border bg-app-bg-muted px-3.5 text-app-text-muted">
                <Search className="h-[18px] w-[18px] shrink-0" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.search}
                  aria-label={t.search}
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-app-text outline-none"
                />
              </label>
              {query.trim() ? (
                <div className="absolute left-0 right-0 top-[50px] overflow-hidden rounded-[16px] border border-app-border bg-app-surface shadow-[0_14px_34px_rgba(148,163,184,0.18)]">
                  {found.length === 0 ? (
                    <p className="px-4 py-3 text-[13px] text-app-text-muted">{t.nothingFound}</p>
                  ) : (
                    found.map((s) => (
                      <button
                        key={s.user_id}
                        type="button"
                        onClick={() => go('student', s.user_id)}
                        className="flex min-h-[44px] w-full items-center gap-3 px-4 py-2 text-left hover:bg-[var(--app-row-hover)]"
                      >
                        <Avatar name={s.name} size={30} tone={toneFor(s.name)} />
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-app-text">{s.name}</span>
                        <span className="text-[12px] font-bold text-app-primary">{s.level}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              <LangSwitch lang={lang} setLang={setLang} />
              <BellButton unread={unread} label={t.notifications} onClick={() => setNotifOpen(true)} bordered />
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex min-h-[44px] items-center gap-2 rounded-[12px] bg-app-primary px-[18px] text-[14px] font-bold text-white transition hover:bg-app-primary-deep active:scale-[0.98]"
              >
                <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} />
                {addTimeLabel}
              </button>
            </div>
          </header>

          {/* ── Tepa qator: telefon ─────────────────────────────────────── */}
          <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-app-border bg-app-surface pl-4 pr-3 pt-[env(safe-area-inset-top,0px)] lg:hidden">
            <FalaRusLogoMark size={32} className="rounded-[9px] ring-1 ring-app-border" />
            <span className="min-w-0 flex-1 truncate py-[18px] text-[16px] font-extrabold text-app-text">
              {sectionTitle(section, t)}
            </span>
            <LangSwitch lang={lang} setLang={setLang} />
            <BellButton unread={unread} label={t.notifications} onClick={() => setNotifOpen(true)} />
          </header>

          <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[18px] lg:px-8 lg:pb-12 lg:pt-7">
            {error ? (
              <p role="alert" className="mb-4 rounded-[14px] bg-[#FEF2F2] px-4 py-3 text-[13.5px] font-semibold text-[#B91C1C]">
                {error}
              </p>
            ) : null}

            {/* Pul va Profil — bitta menyu bandi ostida bir nechta tab. */}
            {MONEY_KEYS.includes(section) ? (
              <>
                <PageHead title={t.moneyTitle} subtitle={t.moneySubtitle} />
                <SegmentTabs<SectionKey>
                  active={section}
                  onChange={(k) => go(k)}
                  items={[
                    { key: 'income', label: t.tabBalance },
                    { key: 'subscription', label: t.tabCommission },
                  ]}
                />
              </>
            ) : PROFILE_KEYS.includes(section) ? (
              <>
                <PageHead title={t.profileTitle} subtitle={t.profileSubtitle} />
                <SegmentTabs<SectionKey>
                  active={section}
                  onChange={(k) => go(k)}
                  items={[
                    { key: 'profile', label: t.tabProfile },
                    { key: 'anketa', label: t.tabEdit },
                    { key: 'documents', label: t.tabDocuments },
                    { key: 'public', label: t.tabPreview },
                    { key: 'settings', label: t.navSettings },
                    { key: 'help', label: t.navHelp },
                  ]}
                />
              </>
            ) : null}

            <Fade k={`${section}-${param ?? ''}`}>
              {section === 'dashboard' ? <Dashboard /> : null}
              {section === 'schedule' ? <Schedule /> : null}
              {section === 'students' ? <Students /> : null}
              {section === 'student' && param ? <StudentDetail studentId={param} /> : null}
              {/* «Video xona» bo'limi olib tashlandi (2026-10-24): «Darsni boshlash» darslar ro'yxatini ochadi. */}
              {section === 'lessons' || section === 'class' ? <Lessons /> : null}
              {section === 'report' && param ? <LessonReport trialId={param} /> : null}
              {section === 'materials' ? <Materials /> : null}
              {section === 'income' ? <Balance /> : null}
              {section === 'subscription' ? <Commission /> : null}
              {section === 'messages' ? <Messages /> : null}
              {section === 'reviews' ? <Reviews /> : null}
              {section === 'profile' ? <Profile /> : null}
              {section === 'public' ? <PublicPreview /> : null}
              {section === 'anketa' ? <Anketa step={param ?? undefined} /> : null}
              {section === 'documents' ? <Documents /> : null}
              {section === 'settings' ? <Settings /> : null}
              {section === 'help' ? <Help /> : null}
            </Fade>
          </main>

          {/* ── Pastki menyu (telefon) ──────────────────────────────────── */}
          <nav
            className="tw-bottom-nav fixed bottom-0 left-0 right-0 z-40 flex px-1 pb-[max(env(safe-area-inset-bottom,0px),10px)] pt-1.5 lg:hidden"
            aria-label={t.cabinetBrand}
          >
            {MOBILE_KEYS.map((key) => {
              const item = NAV.find((n) => n.key === key)!;
              const Icon = item.icon;
              const on = activeNav === key && !moreOpen;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => go(key)}
                  aria-current={on ? 'page' : undefined}
                  className={`relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-[12px] text-[11px] transition active:scale-[0.96] ${
                    on ? 'bg-app-icon-bg font-extrabold text-app-primary' : 'font-semibold text-app-text-muted'
                  }`}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={1.9} />
                  <span className="max-w-full truncate px-1">{t[MOBILE_LABEL[key] ?? item.label]}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={`flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-[12px] text-[11px] transition active:scale-[0.96] ${
                moreOpen || !inBar ? 'bg-app-icon-bg font-extrabold text-app-primary' : 'font-semibold text-app-text-muted'
              }`}
            >
              <LayoutGrid className="h-[22px] w-[22px]" strokeWidth={1.9} />
              {t.navMore}
            </button>
          </nav>
        </div>

        {moreOpen ? (
          <div className="fixed inset-0 z-50 flex items-end bg-[rgba(15,23,42,0.4)] lg:hidden" onClick={() => setMoreOpen(false)}>
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] w-full overflow-y-auto rounded-t-[24px] bg-app-surface px-4 pb-[max(env(safe-area-inset-bottom,0px),24px)] pt-[18px]"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[18px] font-extrabold text-app-text">{t.navMore}</p>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F1F4F7]"
                  aria-label={t.close}
                >
                  <X className="h-[18px] w-[18px] text-app-text" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MORE_ITEMS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => go(m.key)}
                    className={`flex min-h-[64px] flex-col items-start justify-center gap-0.5 rounded-[16px] border px-3.5 text-left transition active:scale-[0.98] ${
                      activeNav === m.key ? 'border-app-primary bg-app-icon-bg' : 'border-app-border bg-app-surface'
                    }`}
                  >
                    <span className="text-[14px] font-extrabold text-app-text">{t[m.label]}</span>
                    <span className="text-[12px] text-app-text-muted">{t[m.sub]}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={logoutAndLeave}
                className="mt-2.5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#FEF2F2] text-[14px] font-extrabold text-[#B91C1C]"
              >
                <LogOut className="h-[18px] w-[18px]" />
                {t.logout}
              </button>
            </motion.div>
          </div>
        ) : null}

        {notifOpen ? (
          <NotificationsDrawer
            notifications={notifications}
            onClose={() => setNotifOpen(false)}
            onRead={() => {
              setUnread(0);
              setNotifications((list) =>
                list.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
              );
              void markNotificationsRead(token).catch(() => undefined);
            }}
          />
        ) : null}

        {addOpen ? <AddTimeModal onClose={() => setAddOpen(false)} onSaved={refresh} /> : null}
        {toastText ? <Toast text={toastText} /> : null}
      </div>
    </PanelProvider>
  );
}

type PanelT = (typeof PANEL_TEXTS)['uz'];

function sectionTitle(section: SectionKey, t: PanelT): string {
  const key = NAV_PARENT[section] ?? section;
  if (section === 'student') return t.navStudentsShort;
  if (MONEY_KEYS.includes(key)) return t.navMoney;
  if (PROFILE_KEYS.includes(key)) return t.navProfileShort;
  const item = NAV.find((n) => n.key === key);
  return item ? t[item.label] : t.cabinetBrand;
}

function StatusLine({ status, t }: { status: string; t: PanelT }) {
  const view =
    status === 'active'
      ? { text: t.stActiveTitle, dot: 'bg-[#16A34A]', fg: 'text-[#166534]' }
      : status === 'paused'
        ? { text: t.stPausedTitle, dot: 'bg-[#64748B]', fg: 'text-app-text-muted' }
        : status === 'pending_review'
          ? { text: t.stReviewTitle, dot: 'bg-[#F59E0B]', fg: 'text-[#92400E]' }
          : { text: t.stDraftTitle, dot: 'bg-[#94A3B8]', fg: 'text-app-text-muted' };
  return (
    <span className={`flex items-center gap-1.5 text-[12px] font-bold ${view.fg}`}>
      <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${view.dot}`} />
      <span className="truncate">{view.text}</span>
    </span>
  );
}

function LangSwitch({ lang, setLang }: { lang: PanelLang; setLang: (l: PanelLang) => void }) {
  return (
    <div role="group" aria-label="RU / UZ" className="flex rounded-[12px] bg-app-bg-subtle p-[3px]">
      {(['ru', 'uz'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`min-h-[38px] rounded-[9px] px-3 text-[12px] font-extrabold transition ${
            lang === l ? 'bg-app-surface text-app-text shadow-[0_1px_2px_rgba(15,23,42,0.1)]' : 'text-app-text-muted'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function BellButton({ unread, label, onClick, bordered = false }: { unread: number; label: string; onClick: () => void; bordered?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-app-text transition hover:bg-[var(--app-row-hover)] ${
        bordered ? 'border border-app-border bg-app-surface' : 'bg-app-bg-muted'
      }`}
    >
      <Bell className="h-5 w-5" strokeWidth={1.8} />
      {unread > 0 ? (
        <span className="absolute right-2.5 top-[9px] h-2 w-2 rounded-full border-2 border-app-surface bg-[#DC2626]" />
      ) : null}
    </button>
  );
}

/** Anketa tasdiqlanguncha yagona ekran: logotip, til, chiqish va 8 qadamli yo'l. */
function OnboardingOnly({ lang, setLang, onLogout, logoutLabel }: {
  lang: PanelLang; setLang: (l: PanelLang) => void; onLogout: () => void; logoutLabel: string;
}) {
  return (
    <div className="teacher-workspace min-h-screen bg-app-bg-muted">
      <header className="sticky top-0 z-30 border-b border-app-border bg-app-surface/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
        <div className="mx-auto flex h-[60px] max-w-3xl items-center gap-3 px-4">
          <FalaRusLogoMark size={36} className="rounded-[11px] ring-1 ring-app-border" />
          <span className="min-w-0">
            <span className="block text-[15px] font-bold leading-none text-app-text">FalaRus Ustoz</span>
            <span className="mt-1 block truncate text-[11px] text-app-text-muted">{ONBOARDING_TEXT[lang].title}</span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex gap-0.5 rounded-full bg-app-bg-muted p-[3px]">
              {(['ru', 'uz'] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLang(l)}
                  className={`min-h-[36px] rounded-full px-3 text-[12px] font-semibold transition ${lang === l ? 'bg-app-surface text-app-text shadow-sm' : 'text-app-text-muted'}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button type="button" onClick={onLogout} aria-label={logoutLabel} title={logoutLabel}
              className="flex h-11 w-11 items-center justify-center rounded-full text-app-text-muted transition hover:bg-app-bg-muted hover:text-app-text active:scale-95">
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>
      <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="mx-auto w-full max-w-3xl px-4 py-5 pb-[max(env(safe-area-inset-bottom,0px),20px)] lg:py-8">
        <OnboardingWizard focus />
      </motion.main>
    </div>
  );
}

function Gate({
  title,
  text,
  primary,
  secondary,
}: {
  title: string;
  text: string;
  primary: { label: string; onClick: () => void };
  secondary: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg-muted px-5 py-10">
      <div className="w-full max-w-[360px] rounded-[22px] border border-app-border bg-app-surface p-6 text-center">
        <FalaRusLogoMark size={48} className="mx-auto mb-3 rounded-[14px] ring-1 ring-app-border" />
        <p className="text-[17px] font-semibold text-app-text">{title}</p>
        <p className="mt-1.5 text-[13.5px] text-app-text-muted">{text}</p>
        <button
          type="button"
          onClick={primary.onClick}
          className="mt-4 min-h-[48px] w-full rounded-[14px] bg-app-primary text-[15px] font-semibold text-white"
        >
          {primary.label}
        </button>
        <button
          type="button"
          onClick={secondary.onClick}
          className="mt-2 min-h-[44px] w-full rounded-[14px] bg-app-surface text-[14px] font-semibold text-app-brand ring-1 ring-[#E7E6F3]"
        >
          {secondary.label}
        </button>
      </div>
    </div>
  );
}
