import '../styles/blue-navigation.css';
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  BarChart3,
  Gamepad2,
  GraduationCap,
  Home,
  MessagesSquare,
  Radio,
  User,
  type LucideIcon,
} from "lucide-react";
import { prefetchRoutePath } from "../routeModules";
import { useAuth } from "../context/AuthContext";
import { useAccess } from "../context/AccessContext";
import { useLocale } from "../context/LocaleContext";
import { useSavolJavobMentions } from "../hooks/useSavolJavobMentions";

type NavItem = {
  to: string;
  paths: string[];
  /** i18n kaliti — ekran o'quvchisi (aria) uchun to'liq nom. */
  labelKey: string;
  /** Menyuda ko'rinadigan qisqa nom (tor joyga sig'ishi kerak). */
  short: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    paths: ["/", "/russian"],
    labelKey: "nav.home",
    short: "Asosiy",
    icon: Home,
  },
  {
    to: "/games",
    paths: ["/games"],
    labelKey: "nav.games",
    short: "O'yinlar",
    icon: Gamepad2,
  },
  {
    to: "/partner",
    paths: ["/partner"],
    labelKey: "nav.partner",
    short: "Suhbat",
    icon: MessagesSquare,
  },
  {
    to: "/teachers",
    paths: ["/teachers"],
    labelKey: "nav.teachers",
    short: "Ustozlar",
    icon: GraduationCap,
  },
  {
    to: "/statistika",
    paths: ["/statistika"],
    labelKey: "nav.stats",
    short: "Statistika",
    icon: BarChart3,
  },
  {
    to: "/profile",
    paths: ["/profile"],
    labelKey: "nav.profile",
    short: "Profil",
    icon: User,
  },
];

/**
 * Efir bandi — FAQAT oltin support hisobida ko'rinadi.
 *
 * Nima uchun hammaga emas: efir kunning ko'p qismida yo'q, ya'ni oddiy
 * o'quvchi uchun bu band deyarli doim bo'sh sahifaga olib borardi. Ular efir
 * boshlanganda bosh sahifadagi "JONLI" banner orqali kiradi. Support uchun
 * esa bu — kundalik ish tugmasi.
 *
 * Bandlar soni 6 dan 7 ga chiqadi: 375px ekranda har biriga ~52px qoladi,
 * shuning uchun nom ataylab qisqa ("Efir").
 */
const SUPPORT_NAV_ITEM: NavItem = {
  to: "/jonli-efir",
  paths: ["/jonli-efir"],
  labelKey: "liveStream.title",
  short: "Efir",
  icon: Radio,
};

export default function AppNavBar() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const location = useLocation();
  const { user } = useAuth();
  const { access } = useAccess();
  const { t } = useLocale();
  const path = location.pathname;
  // Support hisobida efir bandi qo'shiladi; qolganlarda menyu o'zgarmaydi.
  const items = access?.golden ? [...NAV_ITEMS, SUPPORT_NAV_ITEM] : NAV_ITEMS;
  const profilePath =
    user?.accountType === "teacher" ? "/teacher-cabinet" : "/profile";
  const { count: mentionCount, refresh: refreshMentions } =
    useSavolJavobMentions();

  // Suhbatdan chiqqanda xabarlar o'qilgan bo'ladi — nishonni yangilaymiz.
  useEffect(() => {
    refreshMentions();
  }, [path, refreshMentions]);

  const isActive = (paths: string[]) =>
    paths.some((p) =>
      p === "/" ? path === "/" : path === p || path.startsWith(p + "/"),
    );

  return (
    <header className="app-navigation blue-navigation">
      <a
        className="app-navigation-brand"
        href="/"
        onClick={(event) => {
          event.preventDefault();
          navigate("/");
        }}
      >
        <img src="/landing/falarus-mark.svg" alt="" />
        <span>
          FalaRus<small>Har kuni oldinga.</small>
        </span>
      </a>
      <nav className="app-navigation-items" aria-label="Asosiy menyu">
        {items.map((item) => {
          const itemTo = item.to === "/profile" ? profilePath : item.to;
          const itemPaths =
            item.to === "/profile"
              ? ["/profile", "/teacher-cabinet"]
              : item.paths;
          const active = isActive(itemPaths);
          const Icon = item.icon;
          // Guruhda kimdir sizni "@" bilan belgilagan bo'lsa — Suhbat ustida nishon.
          const badge =
            item.to === "/partner" && mentionCount > 0 ? mentionCount : 0;

          return (
            <button
              key={item.to}
              type="button"
              aria-label={t(item.labelKey)}
              aria-current={active ? "page" : undefined}
              onClick={() => navigate(itemTo)}
              onMouseEnter={() => prefetchRoutePath(itemTo)}
              onTouchStart={() => prefetchRoutePath(itemTo)}
              onFocus={() => prefetchRoutePath(itemTo)}
              className="app-navigation-link"
            >
              {/*
                Faol fon — `layoutId` tufayli banddan bandga SILJIYDI.
                Har bandda alohida fon bo'lsa, o'tish sakragandek ko'rinardi.
              */}
              {active ? (
                <motion.span
                  layoutId="nav-active-pill"
                  className="app-navigation-active"
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 34 }
                  }
                />
              ) : null}

              <motion.span
                className="relative flex items-center justify-center"
                animate={
                  active && !reducedMotion
                    ? { scale: 1.06, y: -1 }
                    : { scale: 1, y: 0 }
                }
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 500, damping: 24 }
                }
              >
                <Icon
                  className={`h-[22px] w-[22px] transition-colors ${
                    active ? "text-app-brand" : "text-app-text-muted"
                  }`}
                  strokeWidth={active ? 2.6 : 2}
                  aria-hidden
                />
                {badge > 0 ? (
                  <span
                    className="absolute -right-2 -top-1.5 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-black leading-none text-white ring-2 ring-[#123A8F]"
                    style={{ background: "#F59E0B" }}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </motion.span>

              <span
                className={`app-navigation-label relative max-w-full truncate px-0.5 text-[10.5px] leading-none transition-colors ${
                  active
                    ? "font-extrabold text-app-brand"
                    : "font-semibold text-app-text-muted"
                }`}
              >
                {item.short}
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
