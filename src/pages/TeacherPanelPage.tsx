import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  BadgeCheck,
  Bell,
  LogOut,
  BookOpen,
  CalendarDays,
  FileText,
  HelpCircle,
  Home,
  LayoutGrid,
  type LucideIcon,
  MessageSquare,
  Search,
  Settings as SettingsIcon,
  Star,
  User,
  Users,
  Video,
  Wallet,
  X,
  Zap,
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
import { PANEL_TEXTS, tpl, type PanelLang } from '../components/teacher/panel/lang';
import { PanelProvider, type SectionKey } from '../components/teacher/panel/panelContext';
import { Avatar, Fade, Toast, daysUntil } from '../components/teacher/panel/ui';
import Dashboard from '../components/teacher/panel/sections/Dashboard';
import Schedule from '../components/teacher/panel/sections/Schedule';
import Students, { StudentDetail } from '../components/teacher/panel/sections/Students';
import Lessons from '../components/teacher/panel/sections/Lessons';
import LessonReport from '../components/teacher/panel/sections/LessonReport';
import Anketa from '../components/teacher/panel/sections/Anketa';
import Profile, { Documents, PublicPreview } from '../components/teacher/panel/sections/Profile';
import Income, { Subscription } from '../components/teacher/panel/sections/Money';
import Messages, { NotificationsDrawer, Reviews } from '../components/teacher/panel/sections/Communication';
import Class from '../components/teacher/panel/sections/Class';
import Settings, { Help } from '../components/teacher/panel/sections/SettingsHelp';

/**
 * O'qituvchi paneli — prototip ("Кабинет преподавателя") asosida qayta yozilgan.
 *
 * Tuzilishi: chapda menyu (kompyuterda), tepada qidiruv/til/bildirishnoma,
 * telefonda esa pastki menyu + "Yana" ro'yxati. Barcha bo'lim haqiqiy
 * ma'lumot bilan ishlaydi; ma'lumot yo'q joyda bo'sh holat ko'rsatiladi.
 */

const LANG_KEY = 'falarus.teacherPanel.lang';

type NavItem = {
  key: SectionKey;
  label: keyof (typeof PANEL_TEXTS)['uz'];
  icon: LucideIcon;
  group: 'work' | 'cabinet' | 'profile';
};

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'navDashboard', icon: Home, group: 'work' },
  { key: 'schedule', label: 'navSchedule', icon: CalendarDays, group: 'work' },
  { key: 'students', label: 'navStudents', icon: Users, group: 'work' },
  { key: 'lessons', label: 'navLessons', icon: BookOpen, group: 'work' },
  { key: 'class', label: 'navClass', icon: Video, group: 'work' },
  { key: 'income', label: 'navIncome', icon: Wallet, group: 'cabinet' },
  { key: 'subscription', label: 'navSubscription', icon: Zap, group: 'cabinet' },
  { key: 'messages', label: 'navMessages', icon: MessageSquare, group: 'cabinet' },
  { key: 'reviews', label: 'navReviews', icon: Star, group: 'cabinet' },
  { key: 'profile', label: 'navProfile', icon: User, group: 'profile' },
  { key: 'anketa', label: 'navAnketa', icon: BadgeCheck, group: 'profile' },
  { key: 'documents', label: 'navDocuments', icon: FileText, group: 'profile' },
  { key: 'settings', label: 'navSettings', icon: SettingsIcon, group: 'profile' },
  { key: 'help', label: 'navHelp', icon: HelpCircle, group: 'profile' },
];

const MOBILE_KEYS: SectionKey[] = ['dashboard', 'schedule', 'students', 'lessons'];

/** Ichki bo'limlar menyuda qaysi band yonib turishini belgilaydi. */
const NAV_PARENT: Partial<Record<SectionKey, SectionKey>> = {
  student: 'students',
  report: 'lessons',
  public: 'profile',
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
  const [notifications, setNotifications] = useState<PanelNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
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
    void getTeacherCabinet(token).then(setCabinet).catch(() => undefined);
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
        primary={{ label: t.gateLogin, onClick: () => navigate('/teacher-login') }}
        secondary={{ label: t.gateRegister, onClick: () => navigate('/teacher-register') }}
      />
    );
  }
  if (user && user.accountType !== 'teacher') {
    return (
      <Gate
        title={t.gateStudentTitle}
        text={t.gateStudentText}
        primary={{ label: t.gateHome, onClick: () => navigate('/') }}
        secondary={{ label: t.gateLogin, onClick: () => navigate('/teacher-login') }}
      />
    );
  }

  const name =
    cabinet?.profile?.display_name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    t.teacherRole;
  const status = String(cabinet?.profile?.profile_status ?? 'draft');
  const activeNav = NAV_PARENT[section] ?? section;

  const found = query.trim()
    ? students.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];

  return (
    <PanelProvider value={ctx}>
      <div className="min-h-screen bg-[#F5F5FB] lg:flex">
        {/* ── Chap menyu (kompyuter) ─────────────────────────────────────── */}
        <aside className="sticky top-0 hidden h-screen w-[262px] shrink-0 flex-col gap-6 overflow-y-auto bg-[#0E1F52] px-4 py-5 lg:flex">
          <div className="flex items-center gap-3 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#4B3BE4] text-[17px] font-bold text-white">
              F
            </span>
            <span>
              <span className="block text-[17px] font-bold leading-none text-white">FalaRus</span>
              <span className="mt-1 block text-[10.5px] uppercase tracking-[0.08em] text-white/45">
                {t.teacherRole}
              </span>
            </span>
          </div>

          <nav className="flex flex-1 flex-col gap-5">
            {(['work', 'cabinet', 'profile'] as const).map((group) => (
              <div key={group}>
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/32">
                  {group === 'work' ? t.groupWork : group === 'cabinet' ? t.groupCabinet : t.groupProfile}
                </p>
                {NAV.filter((n) => n.group === group).map((n) => {
                  const Icon = n.icon;
                  const on = n.key === activeNav;
                  return (
                    <button
                      key={n.key}
                      type="button"
                      onClick={() => go(n.key)}
                      className={`mb-0.5 flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13.5px] transition ${
                        on
                          ? 'bg-white font-semibold text-[#0E1F52]'
                          : 'font-medium text-white/72 hover:bg-white/8'
                      }`}
                    >
                      <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={1.7} />
                      <span className="min-w-0 flex-1 truncate">{t[n.label]}</span>
                      {n.key === 'messages' && unread > 0 ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E9474D] px-1.5 text-[11px] font-semibold text-white">
                          {unread}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <SubscriptionCard
            paidUntil={cabinet?.profile?.listing_paid_until ?? null}
            onClick={() => go('subscription')}
            t={t}
          />

          {/*
           * Chiqish menyuda turadi: ilgari u faqat "Sozlamalar" ichida edi va
           * boshqa hisobga o'tmoqchi bo'lgan odam uni topolmasdi.
           */}
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[12px] bg-white/8 text-[12.5px] font-semibold text-white/70 transition hover:bg-white/12 hover:text-white"
          >
            <LogOut className="h-[16px] w-[16px]" />
            {t.logout}
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col pb-[86px] lg:pb-0">
          {/* ── Tepa qator ──────────────────────────────────────────────── */}
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#EBEAF5] bg-white px-4 py-3 pt-[max(env(safe-area-inset-top,0px),12px)] lg:h-[70px] lg:gap-5 lg:px-7 lg:py-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#4B3BE4] text-[15px] font-bold text-white lg:hidden">
              F
            </span>

            <div className="relative hidden max-w-[330px] flex-1 lg:block">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                <Search className="h-[17px] w-[17px] text-[#8A8CAE]" />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.search}
                className="h-[42px] w-full rounded-full bg-[#F5F5FB] pl-11 pr-4 text-[13px] text-[#171A3D] outline-none"
              />
              {query.trim() ? (
                <div className="absolute left-0 right-0 top-[48px] overflow-hidden rounded-[16px] border border-[#EFEEF8] bg-white shadow-[0_14px_34px_rgba(148,163,184,0.18)]">
                  {found.length === 0 ? (
                    <p className="px-4 py-3 text-[12.5px] text-[#8A8CAE]">{t.nothingFound}</p>
                  ) : (
                    found.map((s) => (
                      <button
                        key={s.user_id}
                        type="button"
                        onClick={() => go('student', s.user_id)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#FAFAFE]"
                      >
                        <Avatar name={s.name} size={30} />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-[#171A3D]">
                          {s.name}
                        </span>
                        <span className="text-[11.5px] text-[#8A8CAE]">{s.level}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            <div className="ml-auto flex items-center gap-2 lg:gap-3.5">
              <div className="flex gap-0.5 rounded-full bg-[#F5F5FB] p-[3px]">
                {(['ru', 'uz'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`min-h-[32px] rounded-full px-3 text-[12px] font-semibold transition ${
                      lang === l ? 'bg-white text-[#171A3D] shadow-sm' : 'text-[#8A8CAE]'
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setNotifOpen(true)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5FB]"
                aria-label={t.notifications}
              >
                <Bell className="h-[19px] w-[19px] text-[#3E4166]" strokeWidth={1.7} />
                {unread > 0 ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#E9474D]" />
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => go('profile')}
                className="flex items-center gap-2.5 rounded-full p-1 pr-2 transition hover:bg-[#F5F5FB]"
              >
                <Avatar name={name} url={cabinet?.profile?.avatar_url ?? null} size={38} />
                <span className="hidden text-left lg:block">
                  <span className="block text-[13px] font-semibold text-[#171A3D]">{name}</span>
                  <span
                    className={`block text-[11px] font-medium ${
                      status === 'active' ? 'text-[#17A34A]' : 'text-[#8A8CAE]'
                    }`}
                  >
                    {status === 'active' ? t.stActiveTitle : status === 'pending_review' ? t.stReviewTitle : t.stDraftTitle}
                  </span>
                </span>
              </button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1180px] px-4 py-5 lg:px-7 lg:py-7">
            {error ? (
              <p className="mb-4 rounded-[14px] bg-[#FDECEC] px-4 py-3 text-[13px] font-medium text-[#C23A3F]">
                {error}
              </p>
            ) : null}

            <Fade k={`${section}-${param ?? ''}`}>
              {section === 'dashboard' ? <Dashboard /> : null}
              {section === 'schedule' ? <Schedule /> : null}
              {section === 'students' ? <Students /> : null}
              {section === 'student' && param ? <StudentDetail studentId={param} /> : null}
              {section === 'lessons' ? <Lessons /> : null}
              {section === 'report' && param ? <LessonReport trialId={param} /> : null}
              {section === 'class' ? <Class /> : null}
              {section === 'income' ? <Income /> : null}
              {section === 'subscription' ? <Subscription /> : null}
              {section === 'messages' ? <Messages /> : null}
              {section === 'reviews' ? <Reviews /> : null}
              {section === 'profile' ? <Profile /> : null}
              {section === 'public' ? <PublicPreview /> : null}
              {section === 'anketa' ? <Anketa /> : null}
              {section === 'documents' ? <Documents /> : null}
              {section === 'settings' ? <Settings /> : null}
              {section === 'help' ? <Help /> : null}
            </Fade>
          </main>
        </div>

        {/* ── Pastki menyu (telefon) ──────────────────────────────────────── */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/10 bg-[#0E1F52] pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
          aria-label={t.teacherRole}
        >
          {MOBILE_KEYS.map((key) => {
            const item = NAV.find((n) => n.key === key)!;
            const Icon = item.icon;
            const on = activeNav === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => go(key)}
                className="relative flex min-h-[62px] flex-1 flex-col items-center justify-center gap-1 outline-none active:scale-[0.96]"
              >
                {on ? (
                  <motion.span
                    layoutId="teacher-nav-pill"
                    className="pointer-events-none absolute inset-x-2 inset-y-1.5 rounded-2xl bg-white/12 ring-1 ring-white/15"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <Icon
                  className={`relative h-[20px] w-[20px] ${on ? 'text-white' : 'text-white/60'}`}
                  strokeWidth={1.8}
                />
                <span
                  className={`relative max-w-full truncate px-1 text-[10px] leading-none ${
                    on ? 'font-bold text-white' : 'font-medium text-white/60'
                  }`}
                >
                  {t[item.label]}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex min-h-[62px] flex-1 flex-col items-center justify-center gap-1 active:scale-[0.96]"
          >
            <LayoutGrid className="h-[20px] w-[20px] text-white/60" strokeWidth={1.8} />
            <span className="text-[10px] font-medium leading-none text-white/60">{t.navMore}</span>
          </button>
        </nav>

        {moreOpen ? (
          <div className="fixed inset-0 z-50 bg-[rgba(14,16,45,0.32)] lg:hidden" onClick={() => setMoreOpen(false)}>
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-[24px] bg-white p-5 pb-[max(env(safe-area-inset-bottom,0px),20px)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[17px] font-semibold text-[#171A3D]">{t.navMore}</p>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5FB]"
                  aria-label={t.close}
                >
                  <X className="h-[18px] w-[18px] text-[#3E4166]" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {NAV.filter((n) => !MOBILE_KEYS.includes(n.key)).map((n) => {
                  const Icon = n.icon;
                  return (
                    <button
                      key={n.key}
                      type="button"
                      onClick={() => go(n.key)}
                      className="flex min-h-[64px] items-center gap-3 rounded-[16px] bg-[#F5F5FB] px-4 text-left"
                    >
                      <Icon className="h-[20px] w-[20px] text-[#4B3BE4]" strokeWidth={1.7} />
                      <span className="text-[13px] font-semibold text-[#171A3D]">{t[n.label]}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#FFF6F6] text-[13px] font-semibold text-[#C23A3F]"
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

        {toastText ? <Toast text={toastText} /> : null}
      </div>
    </PanelProvider>
  );
}

function SubscriptionCard({
  paidUntil,
  onClick,
  t,
}: {
  paidUntil: string | null;
  onClick: () => void;
  t: (typeof PANEL_TEXTS)['uz'];
}) {
  const days = daysUntil(paidUntil) ?? 0;
  const active = days > 0;
  return (
    <div className="rounded-[16px] bg-white/7 p-3.5">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${active ? 'bg-[#6CE0A0]' : 'bg-[#E6B33E]'}`} />
        <p className="text-[12.5px] font-semibold text-white">{t.subscriptionTitle}</p>
      </div>
      <p className="mt-1.5 text-[11.5px] leading-[1.5] text-white/55">
        {active ? tpl(t.subEndsIn, { days }) : t.subInactive}
      </p>
      <button
        type="button"
        onClick={onClick}
        className="mt-2.5 w-full rounded-[10px] bg-[#E6B33E] py-2.5 text-[12px] font-semibold text-[#3A2A00]"
      >
        {t.subRenew}
      </button>
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
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5FB] px-5 py-10">
      <div className="w-full max-w-[360px] rounded-[22px] border border-[#EFEEF8] bg-white p-6 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#4B3BE4] text-[20px] font-bold text-white">
          F
        </span>
        <p className="text-[17px] font-semibold text-[#171A3D]">{title}</p>
        <p className="mt-1.5 text-[13.5px] text-[#8A8CAE]">{text}</p>
        <button
          type="button"
          onClick={primary.onClick}
          className="mt-4 min-h-[48px] w-full rounded-[14px] bg-[#4B3BE4] text-[15px] font-semibold text-white"
        >
          {primary.label}
        </button>
        <button
          type="button"
          onClick={secondary.onClick}
          className="mt-2 min-h-[44px] w-full rounded-[14px] bg-white text-[14px] font-semibold text-[#4B3BE4] ring-1 ring-[#E7E6F3]"
        >
          {secondary.label}
        </button>
      </div>
    </div>
  );
}
