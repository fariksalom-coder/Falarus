import { StrictMode, useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Gamepad2,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  Moon,
  Play,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Progress,
} from "../components/ui/Foundation";
import "../index.css";
import "./preview.css";

type Screen =
  | "today"
  | "courses"
  | "games"
  | "chat"
  | "teachers"
  | "stats"
  | "profile"
  | "pricing"
  | "lesson"
  | "login"
  | "system";
type Role = "student" | "teacher" | "admin";
const navigation: { id: Screen; label: string; icon: LucideIcon }[] = [
  { id: "today", label: "Bugungi reja", icon: LayoutDashboard },
  { id: "courses", label: "Kurslar", icon: BookOpen },
  { id: "games", label: "O'yinlar", icon: Gamepad2 },
  { id: "chat", label: "Suhbat", icon: MessageCircle },
  { id: "teachers", label: "Ustozlar", icon: GraduationCap },
  { id: "stats", label: "Natijalar", icon: TrendingUp },
  { id: "profile", label: "Profil", icon: UserRound },
];
const lessons = [
  {
    title: "So'z boyligi",
    sub: "Kundalik hayot · 12 ta yangi so‘z",
    icon: BookOpen,
    done: true,
    time: "5 daqiqa",
  },
  {
    title: "Grammatika",
    sub: "Hozirgi zamon fe’llari",
    icon: Sparkles,
    done: false,
    time: "8 daqiqa",
  },
  {
    title: "O'qish",
    sub: "Matnni o‘qing va tushuning",
    icon: GraduationCap,
    done: false,
    time: "6 daqiqa",
  },
  {
    title: "Gapirish",
    sub: "Bugungi kuningiz haqida ayting",
    icon: MessageCircle,
    done: false,
    time: "5 daqiqa",
  },
];

function IconTile({
  icon: Icon,
  gold = false,
}: {
  icon: LucideIcon;
  gold?: boolean;
}) {
  return (
    <span className={`ds-icon ${gold ? "ds-icon--gold" : ""}`}>
      <Icon size={22} strokeWidth={1.7} aria-hidden />
    </span>
  );
}
function SectionTitle({
  children,
  extra,
}: {
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="ds-section-title">
      <h2>{children}</h2>
      {extra}
    </div>
  );
}

function Preview() {
  const [screen, setScreen] = useState<Screen>("today");
  const [role, setRole] = useState<Role>("student");
  const [dark, setDark] = useState(false);
  const [notice, setNotice] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [finished, setFinished] = useState(false);
  const [search, setSearch] = useState("");
  const [billing, setBilling] = useState<"month" | "year">("month");
  const [name, setName] = useState("Azizbek");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const contentRef = useRef<HTMLElement>(null);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  function go(next: Screen) {
    setScreen(next);
    setNotice("");
    requestAnimationFrame(() => {
      contentRef.current?.focus();
      window.scrollTo({ top: 0 });
    });
  }
  const notify = (text: string) => setNotice(text);
  const screenTitle =
    navigation.find((n) => n.id === screen)?.label ?? "FalaRus";

  function today() {
    return (
      <>
        <PageHeader
          eyebrow="Kichik qadamlar. Katta natijalar."
          title={`Salom, ${name}!`}
          description="Bugun rus tilingizni yana bir pog'ona oshiramiz."
          action={
            <Badge tone="warning">
              <Flame size={15} /> 7 kun ketma-ket
            </Badge>
          }
        />
        <div className="ds-dashboard-grid">
          <div className="ds-stack">
            <section className="ds-hero">
              <div className="ds-hero-copy">
                <span className="ds-overline">SIZNING O'QUV YO'LINGIZ</span>
                <h2>
                  Har kuni biroz.
                  <br />
                  Har kuni oldinga.
                </h2>
                <p>12-kun · Kundalik hayot va odatlar</p>
                <Button className="ds-hero-cta" onClick={() => go("lesson")}>
                  Darsni davom ettirish <ArrowRight size={18} />
                </Button>
                <div className="ds-hero-foot">
                  <Clock3 size={14} /> Bugun uchun 24 daqiqa
                </div>
              </div>
              <div className="ds-orbit" aria-hidden>
                <div className="ds-orbit-inner">
                  <span>Аа</span>
                  <small>O'RGAN · QO'LLA · O'S</small>
                </div>
                <span className="ds-orbit-badge">
                  <Check size={22} />
                </span>
              </div>
            </section>
            <Card>
              <SectionTitle
                extra={
                  <Badge tone="success">{finished ? 2 : 1} / 4 bajarildi</Badge>
                }
              >
                Bugungi darslar
              </SectionTitle>
              <div className="ds-lesson-list">
                {lessons.map((l, i) => {
                  const done = l.done || (i === 1 && finished);
                  return (
                    <button
                      className="ds-lesson-row"
                      key={l.title}
                      onClick={() => {
                        setAnswer(null);
                        setChecked(false);
                        go("lesson");
                      }}
                    >
                      <IconTile icon={l.icon} gold={i === 1} />
                      <span className="ds-grow">
                        <strong>{l.title}</strong>
                        <small>{l.sub}</small>
                      </span>
                      <span className="ds-row-meta">
                        {done ? (
                          <Badge tone="success">
                            <Check size={13} /> Tugatildi
                          </Badge>
                        ) : (
                          <span>{l.time}</span>
                        )}
                      </span>
                      <ChevronRight size={17} aria-hidden />
                    </button>
                  );
                })}
              </div>
            </Card>
            <Card className="ds-review">
              <IconTile icon={Sparkles} gold />
              <div className="ds-grow">
                <h3>Bilimingizni mustahkamlang</h3>
                <p className="ui-description">
                  Avval o'rgangan 18 ta so'zni takrorlash vaqti.
                </p>
              </div>
              <Button variant="secondary" onClick={() => go("lesson")}>
                Takrorlash <ArrowRight size={16} />
              </Button>
            </Card>
          </div>
          <aside className="ds-stack">
            <Card>
              <SectionTitle>O'sish sur'atingiz</SectionTitle>
              <div className="ds-big-stat">
                12 <span>/ 182 kun</span>
              </div>
              <Progress
                value={12}
                max={182}
                label="182 kundan 12 kuni yakunlandi"
              />
              <p className="ui-description">A1 daraja · Ishonchli boshlanish</p>
              <div className="ds-divider" />
              <div className="ds-stat-pair">
                <div>
                  <strong>148</strong>
                  <small>o'rganilgan so'z</small>
                </div>
                <div>
                  <strong>92%</strong>
                  <small>aniqlik</small>
                </div>
              </div>
              <Button
                variant="ghost"
                className="ds-full"
                onClick={() => go("stats")}
              >
                Natijalarim <ArrowRight size={16} />
              </Button>
            </Card>
            <Card>
              <SectionTitle>Bu hafta</SectionTitle>
              <div className="ds-week">
                {["D", "S", "C", "P", "J", "S", "Y"].map((d, i) => (
                  <div key={i}>
                    <span
                      className={
                        i < 4
                          ? "ds-day ds-day--done"
                          : i === 4
                            ? "ds-day ds-day--today"
                            : "ds-day"
                      }
                    >
                      {i < 4 ? <Check size={15} /> : d}
                    </span>
                    <small>{i + 3}</small>
                  </div>
                ))}
              </div>
              <p className="ui-description">
                Ajoyib marom! Bugungi dars bilan odatingizni davom ettiring.
              </p>
            </Card>
            <div className="ds-mentor">
              <span className="ds-eyebrow">JONLI AMALIYOT</span>
              <h3>Birga gapirish osonroq.</h3>
              <p>
                Ustoz bilan rus tilida erkin suhbatga bir qadam yaqinlashing.
              </p>
              <Button variant="secondary" onClick={() => go("teachers")}>
                Ustoz topish <ArrowRight size={16} />
              </Button>
            </div>
          </aside>
        </div>
      </>
    );
  }

  function courses() {
    const courses = [
      {
        title: "Rus tili: kundalik reja",
        level: "A1 → B2",
        description: "182 kunlik izchil o‘quv yo‘li",
        progress: 12,
        max: 182,
      },
      {
        title: "Patent imtihoni",
        level: "Imtihon",
        description: "Rus tili, tarix va qonunchilik",
        progress: 0,
        max: 20,
      },
      {
        title: "ВНЖ va fuqarolik",
        level: "Imtihon",
        description: "Mavzular va sinov variantlari",
        progress: 0,
        max: 15,
      },
    ].filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));
    return (
      <>
        <PageHeader
          title="Kurslar"
          description="Maqsadingizga mos yo'nalish. O'z sur'atingizda o'rganing."
        />
        <Field
          label="Kursni qidirish"
          type="search"
          placeholder="Masalan, patent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="ds-card-grid ds-mt">
          {courses.map((c, i) => (
            <Card key={c.title}>
              <div className="ds-between">
                <IconTile icon={BookOpen} gold={i > 0} />
                <Badge>{c.level}</Badge>
              </div>
              <h2 className="ds-card-title">{c.title}</h2>
              <p className="ui-description">{c.description}</p>
              <div className="ds-mt">
                <Progress value={c.progress} max={c.max} label={c.title} />
                <p className="ui-description">
                  {c.progress} / {c.max} dars
                </p>
              </div>
              <Button
                className="ds-full ds-mt"
                variant={i === 0 ? "primary" : "secondary"}
                onClick={() => go("lesson")}
              >
                {c.progress ? "Davom ettirish" : "Boshlash"}
                <ArrowRight size={16} />
              </Button>
            </Card>
          ))}
        </div>
        {courses.length === 0 && (
          <EmptyState
            title="Kurs topilmadi"
            description="Boshqa nom bilan qidiring."
            action={
              <Button variant="secondary" onClick={() => setSearch("")}>
                Qidiruvni tozalash
              </Button>
            }
          />
        )}
      </>
    );
  }

  function lesson() {
    return (
      <div className="ds-focus">
        <Button variant="ghost" onClick={() => go("today")}>
          <ArrowLeft size={17} /> Bugungi rejaga qaytish
        </Button>
        <div className="ds-between ds-mt">
          <span className="ui-eyebrow">12-KUN · GRAMMATIKA</span>
          <Badge>1 / 1 namuna savoli</Badge>
        </div>
        <Progress value={finished ? 1 : 0} max={1} label="Mashq jarayoni" />
        <Card className="ds-question ds-mt">
          {finished ? (
            <>
              <span className="ds-success-icon">
                <Check size={32} />
              </span>
              <h1>Yana bir qadam oldinga!</h1>
              <p className="ui-description">
                Namuna mashqi yakunlandi. Bugungi rejangiz yangilandi.
              </p>
              <Button onClick={() => go("today")}>
                Rejaga qaytish <ArrowRight size={17} />
              </Button>
            </>
          ) : (
            <>
              <Badge>To'g'ri javobni tanlang</Badge>
              <h1>Я каждый день … книгу.</h1>
              <p className="ui-description">Men har kuni kitob o'qiyman.</p>
              <div
                role="group"
                aria-label="Javob variantlari"
                className="ds-options"
              >
                {["читаю", "читаешь", "читает"].map((a) => (
                  <button
                    key={a}
                    disabled={checked}
                    aria-pressed={answer === a}
                    className={`ds-option ${answer === a ? "ds-option--selected" : ""}`}
                    onClick={() => setAnswer(a)}
                  >
                    <span>{a}</span>
                    {answer === a && <Check size={18} />}
                  </button>
                ))}
              </div>
              {checked && (
                <div role="status" className="ds-feedback">
                  <Badge tone={answer === "читаю" ? "success" : "danger"}>
                    {answer === "читаю"
                      ? "To'g'ri!"
                      : "Yana bir bor o'rganamiz"}
                  </Badge>
                  <p>«Я» bilan «читаю» ishlatiladi: Я читаю книгу.</p>
                </div>
              )}
              <Button
                className="ds-full"
                disabled={!answer}
                onClick={() => (checked ? setFinished(true) : setChecked(true))}
              >
                {checked ? "Mashqni yakunlash" : "Javobni tekshirish"}
                <ArrowRight size={17} />
              </Button>
            </>
          )}
        </Card>
      </div>
    );
  }

  function games() {
    return (
      <>
        <PageHeader
          title="O'ynab o'rganing"
          description="Qisqa mashqlar bilan so'z boyligingizni oshiring."
        />
        <div className="ds-card-grid">
          {[
            {
              title: "So'zni yig'ing",
              text: "Harflardan ruscha so'z tuzing",
              icon: BookOpen,
              meta: "30 bosqich",
            },
            {
              title: "So'z savati",
              text: "Он, она, оно — rodni tanlang",
              icon: Gamepad2,
              meta: "3 062 ot",
            },
            {
              title: "So'z zanjiri",
              text: "Oxirgi harfdan yangi so'z toping",
              icon: MessageCircle,
              meta: "4 daraja",
            },
            {
              title: "Fe'l ustasi",
              text: "Olmoshga mos fe'lni tanlang",
              icon: Sparkles,
              meta: "3 zamon",
            },
          ].map((g) => (
            <Card key={g.title}>
              <div className="ds-between">
                <IconTile icon={g.icon} gold />
                <Badge>{g.meta}</Badge>
              </div>
              <h2 className="ds-card-title">{g.title}</h2>
              <p className="ui-description">{g.text}</p>
              <Button
                variant="secondary"
                className="ds-full ds-mt"
                onClick={() =>
                  notify(
                    `${g.title}: bu dizayn namunasida o'yin mexanikasi ulanmagan.`,
                  )
                }
              >
                <Play size={16} /> O'ynash
              </Button>
            </Card>
          ))}
        </div>
      </>
    );
  }

  function teachers() {
    return (
      <>
        <PageHeader
          title="Sizga mos ustoz"
          description="Tajribali ustoz bilan gapirishga ishonch hosil qiling."
        />
        <Badge>Namuna profillar</Badge>
        <div className="ds-card-grid ds-mt">
          {["Madina Karimova", "Jasur Aliyev", "Dilnoza Ahmedova"].map(
            (n, i) => (
              <Card key={n}>
                <div className="ds-between">
                  <span className={`ds-avatar ds-avatar--${i}`}>
                    {n
                      .split(" ")
                      .map((w) => w[0])
                      .join("")}
                  </span>
                  <Badge tone="success">
                    <ShieldCheck size={14} /> Tasdiqlangan
                  </Badge>
                </div>
                <h2 className="ds-card-title">{n}</h2>
                <p className="ui-description">
                  Rus tili · A1–B2
                  <br />
                  {i + 3} yil tajriba · O'zbekcha, ruscha
                </p>
                <div className="ds-divider" />
                <div className="ds-between">
                  <span>
                    ★ 4.9 <small>(24 fikr)</small>
                  </span>
                  <Badge>30 daqiqa</Badge>
                </div>
                <Button
                  className="ds-full ds-mt"
                  variant="secondary"
                  onClick={() =>
                    notify(
                      `${n} bilan sinov darsi tanlandi. Bu namuna; band qilish yuborilmadi.`,
                    )
                  }
                >
                  Sinov darsini tanlash
                </Button>
              </Card>
            ),
          )}
        </div>
      </>
    );
  }

  function stats() {
    return (
      <>
        <PageHeader
          title="Harakatingiz natijasi"
          description="Boshqalar bilan emas, kechagi o'zingiz bilan solishtiring."
        />
        <div className="ds-metrics">
          {[
            ["148", "O'rganilgan so'z"],
            ["7 kun", "Eng yaxshi marom"],
            ["92%", "To'g'ri javoblar"],
            ["4 s 20 d", "O'qishga ajratilgan vaqt"],
          ].map(([v, l]) => (
            <Card key={l}>
              <p className="ui-eyebrow">{l}</p>
              <div className="ds-big-stat">{v}</div>
            </Card>
          ))}
        </div>
        <div className="ds-dashboard-grid ds-mt">
          <Card>
            <SectionTitle extra={<Badge>So'nggi 7 kun</Badge>}>
              Haftalik faollik
            </SectionTitle>
            <div
              className="ds-chart"
              role="img"
              aria-label="Dushanba 15, seshanba 24, chorshanba 18, payshanba 32, juma 24, shanba 0, yakshanba 0 daqiqa"
            >
              {[15, 24, 18, 32, 24, 0, 0].map((v, i) => (
                <div key={i}>
                  <small>{v} d</small>
                  <span style={{ height: `${Math.max(v * 4, 4)}px` }} />
                  <small>{["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"][i]}</small>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle>Ko'nikmalar</SectionTitle>
            {[
              ["Lug‘at", 72],
              ["Grammatika", 58],
              ["O‘qish", 64],
              ["Gapirish", 38],
            ].map(([l, v]) => (
              <div className="ds-mt" key={l}>
                <div className="ds-between">
                  <strong>{l}</strong>
                  <small>{v}%</small>
                </div>
                <Progress value={Number(v)} label={String(l)} />
              </div>
            ))}
          </Card>
        </div>
      </>
    );
  }

  function profile() {
    return (
      <>
        <PageHeader
          title="Profil va sozlamalar"
          description="Hisobingiz va o'qish odatlaringiz bir joyda."
        />
        <div className="ds-dashboard-grid">
          <Card>
            <div className="ds-profile-line">
              <span className="ds-avatar">{name.slice(0, 1)}</span>
              <div>
                <h2>{name}</h2>
                <Badge>A1 · Boshlang'ich</Badge>
              </div>
            </div>
            <form
              className="ds-stack ds-mt"
              onSubmit={(e) => {
                e.preventDefault();
                notify("Ism namuna ichida saqlandi.");
              }}
            >
              <Field
                label="Ismingiz"
                value={name}
                required
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
              />
              <Field
                label="Interfeys tili"
                value="O'zbekcha"
                readOnly
                hint="Namuna o'zbek tilida tayyorlangan."
              />
              <Button type="submit">O'zgarishlarni saqlash</Button>
            </form>
          </Card>
          <div className="ds-stack">
            <Card>
              <h2>Ko'rinish</h2>
              <p className="ui-description">
                O'zingiz uchun qulay mavzuni tanlang.
              </p>
              <Button
                className="ds-full ds-mt"
                variant="secondary"
                onClick={() => setDark(!dark)}
              >
                {dark ? <Sun size={17} /> : <Moon size={17} />}
                {dark ? "Yorug' rejimga o'tish" : "Tungi rejimga o'tish"}
              </Button>
            </Card>
            <Card>
              <h2>FalaRus Premium</h2>
              <p className="ui-description">
                Barcha dars va mashqlar, bitta obuna.
              </p>
              <Button className="ds-full ds-mt" onClick={() => go("pricing")}>
                Tariflarni ko'rish
              </Button>
            </Card>
            <Button variant="ghost" onClick={() => go("login")}>
              Kirish sahifasini ko'rish <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </>
    );
  }

  function pricing() {
    return (
      <>
        <PageHeader
          title="Maqsadingiz uchun bir qadam"
          description="Tarif kartalari uchun dizayn namunasi. Narxlar amaldagi taklif emas."
        />
        <div className="ds-segments" role="group" aria-label="To'lov davri">
          {(["month", "year"] as const).map((v) => (
            <button
              key={v}
              aria-pressed={billing === v}
              onClick={() => setBilling(v)}
            >
              {v === "month" ? "Oylik" : "Yillik"}
            </button>
          ))}
        </div>
        <div className="ds-card-grid ds-mt">
          {["Bepul", "Premium"].map((n, i) => (
            <Card key={n} className={i ? "ds-featured" : ""}>
              <Badge tone={i ? "warning" : "neutral"}>
                {i ? "To‘liq imkoniyatlar" : "Sinab ko‘rish uchun"}
              </Badge>
              <h2 className="ds-card-title">{n}</h2>
              <div className="ds-big-stat">{i ? "Namuna tarif" : "0 so‘m"}</div>
              <p className="ui-description">
                {billing === "month" ? "Har oy uchun" : "Bir yil uchun"}
              </p>
              <ul className="ds-benefits">
                {(i
                  ? [
                      "Barcha kunlik darslar",
                      "Cheksiz o‘yinlar",
                      "Natijalar tahlili",
                    ]
                  : [
                      "Boshlang‘ich darslar",
                      "3 ta sinov o‘yini",
                      "Asosiy natijalar",
                    ]
                ).map((b) => (
                  <li key={b}>
                    <Check size={16} />
                    {b}
                  </li>
                ))}
              </ul>
              <Button
                variant={i ? "primary" : "secondary"}
                className="ds-full"
                onClick={() =>
                  notify("Tarif tanlandi. Namuna to‘lov yaratmaydi.")
                }
              >
                {i ? "Premiumni tanlash" : "Bepul boshlash"}
              </Button>
            </Card>
          ))}
        </div>
      </>
    );
  }

  function chat() {
    return (
      <>
        <PageHeader
          title="Suhbat — til amaliyoti"
          description="O'rganganlaringizni suhbatda qo'llang."
        />
        <Card className="ds-chat">
          <div className="ds-profile-line">
            <IconTile icon={MessageCircle} />
            <div>
              <h2>Ruscha gaplashamiz</h2>
              <p className="ui-description">Namuna guruh · 12 ishtirokchi</p>
            </div>
          </div>
          <div className="ds-divider" />
          <div className="ds-messages" role="log" aria-label="Suhbat xabarlari">
            <div className="ds-bubble">
              <strong>Madina · ustoz</strong>
              <p>Всем привет! Как прошёл ваш день?</p>
              <small>Bugungi kuningiz qanday o'tdi?</small>
            </div>
            {messages.map((m, i) => (
              <div key={i} className="ds-bubble ds-bubble--own">
                <p>{m}</p>
                <small>Hozirgina · faqat namuna ichida</small>
              </div>
            ))}
          </div>
          <form
            className="ds-chat-compose"
            onSubmit={(e) => {
              e.preventDefault();
              if (message.trim()) {
                setMessages([...messages, message.trim()]);
                setMessage("");
              }
            }}
          >
            <Field
              label="Xabaringiz"
              placeholder="Ruscha yozib ko'ring…"
              value={message}
              maxLength={1000}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button
              type="submit"
              disabled={!message.trim()}
              aria-label="Xabarni namuna suhbatiga qo'shish"
            >
              <ArrowRight size={20} />
            </Button>
          </form>
        </Card>
      </>
    );
  }

  function login() {
    return (
      <div className="ds-auth">
        <div>
          <span className="ui-eyebrow">FALARUS BILAN</span>
          <h1>
            Ruscha gapiring.
            <br />
            Ishonch bilan.
          </h1>
          <p className="ui-description">
            Har kuni amaliyot, aniq reja va sizga mos ustoz.
          </p>
        </div>
        <Card>
          <PageHeader
            title="Xush kelibsiz"
            description="O'qishni qolgan joyingizdan davom ettiring."
          />
          <form
            className="ds-stack"
            onSubmit={(e) => {
              e.preventDefault();
              go("today");
              notify(
                "Namuna hisobiga kirdingiz. Haqiqiy autentifikatsiya bajarilmadi.",
              );
            }}
          >
            <Field
              label="Telefon raqami"
              type="tel"
              autoComplete="off"
              placeholder="+998 90 123 45 67"
              required
              hint="Haqiqiy hisob ma'lumotlarini kiritish shart emas."
            />
            <Field
              label="Parol"
              type="password"
              autoComplete="off"
              placeholder="Namuna parol"
              required
            />
            <Button type="submit">
              Kirish <ArrowRight size={17} />
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                notify(
                  "Tiklash havolasi uchun muvaffaqiyat xabari shu yerda ko‘rinadi. Xabar yuborilmadi.",
                )
              }
            >
              Parolni unutdingizmi?
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  function workspace() {
    const teacher = role === "teacher";
    return (
      <>
        <PageHeader
          eyebrow={teacher ? "USTOZ KABINETI" : "BOSHQARUV PANELI"}
          title={teacher ? "Bugungi ishlaringiz" : "Platforma holati"}
          description={
            teacher
              ? "Darslar, o'quvchilar va yozishmalar bir joyda."
              : "E'tibor talab qiladigan ishlarni birinchi ko'ring."
          }
        />
        <div className="ds-metrics">
          {(teacher
            ? [
                ["3", "Bugungi darslar"],
                ["24", "O‘quvchilar"],
                ["2", "Yangi xabar"],
                ["4.9", "Baho"],
              ]
            : [
                ["5 440", "Foydalanuvchilar"],
                ["8", "Tekshiruv kutmoqda"],
                ["3", "Yangi murojaat"],
                ["99%", "Namuna ko‘rsatkich"],
              ]
          ).map(([v, l]) => (
            <Card key={l}>
              <p className="ui-eyebrow">{l}</p>
              <div className="ds-big-stat">{v}</div>
            </Card>
          ))}
        </div>
        <Card className="ds-mt">
          <SectionTitle>
            {teacher ? "Dars jadvali" : "Tekshiruv navbati"}
          </SectionTitle>
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>{teacher ? "O‘quvchi" : "So‘rov"}</th>
                  <th>{teacher ? "Vaqt" : "Turi"}</th>
                  <th>Holati</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {["Azizbek", "Malika", "Sardor"].map((n, i) => (
                  <tr key={n}>
                    <td>
                      <strong>{n}</strong>
                      <small>
                        {teacher ? "A1 · Yakka dars" : "Namuna yozuv"}
                      </small>
                    </td>
                    <td>
                      {teacher
                        ? `${14 + i}:00 · 30 daqiqa`
                        : ["Hujjat", "To‘lov", "Murojaat"][i]}
                    </td>
                    <td>
                      <Badge tone={i === 0 ? "success" : "warning"}>
                        {i === 0 ? "Tayyor" : "Kutilmoqda"}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          notify(
                            `${n}: tafsilotlar tanlandi. Bu ish panelining dizayn namunasi.`,
                          )
                        }
                      >
                        {teacher ? "Darsni ochish" : "Ko‘rib chiqish"}
                        <ChevronRight size={15} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="ds-mt">
          <EmptyState
            title={
              teacher
                ? "Yangi sinov darsi hali yo‘q"
                : "Boshqa shoshilinch vazifa yo‘q"
            }
            description={
              teacher
                ? "So‘rov kelganda o‘quvchi va qulay vaqt shu yerda ko‘rinadi."
                : "Yangi murojaatlar holati shu yerda aks etadi."
            }
          />
        </div>
      </>
    );
  }

  function system() {
    return (
      <>
        <PageHeader
          eyebrow="FALARUS · UI KIT 01"
          title="Bitta brend. Bitta tizim."
          description="O'quvchi, ustoz va boshqaruv uchun umumiy vizual til."
        />
        <Card>
          <SectionTitle>Semantik ranglar</SectionTitle>
          <div className="ds-swatches">
            {[
              ["Asosiy amal", "var(--ui-action)"],
              ["Oltin urg‘u", "var(--app-accent)"],
              ["Muvaffaqiyat", "var(--app-success)"],
              ["Xato", "var(--app-danger)"],
              ["Sirt", "var(--app-surface)"],
            ].map(([n, c]) => (
              <div key={n}>
                <span style={{ background: c }} />
                <small>{n}</small>
              </div>
            ))}
          </div>
        </Card>
        <div className="ds-dashboard-grid ds-mt">
          <Card>
            <SectionTitle>Tugmalar va holatlar</SectionTitle>
            <div className="ds-wrap">
              {(["primary", "secondary", "ghost", "danger"] as const).map(
                (v) => (
                  <Button
                    key={v}
                    variant={v}
                    onClick={() => notify(`${v}: tugma bosildi`)}
                  >
                    {
                      {
                        primary: "Davom etish",
                        secondary: "Keyinroq",
                        ghost: "Batafsil",
                        danger: "O‘chirish",
                      }[v]
                    }
                  </Button>
                ),
              )}
              <Button loading>Saqlanmoqda</Button>
              <Button disabled>Hozircha yopiq</Button>
            </div>
            <div className="ds-wrap ds-mt">
              <Badge>Yangi</Badge>
              <Badge tone="success">Tugatildi</Badge>
              <Badge tone="warning">Kutilmoqda</Badge>
              <Badge tone="danger">Xato</Badge>
            </div>
          </Card>
          <Card>
            <SectionTitle>Forma va xatolar</SectionTitle>
            <div className="ds-stack">
              <Field
                label="Ism"
                placeholder="Ismingiz"
                hint="Profilingizda ko'rinadigan ism."
              />
              <Field
                label="Telefon"
                defaultValue="998"
                error="Raqamni to'liq kiriting: +998 90 123 45 67."
              />
              <Progress value={65} label="Namuna jarayoni 65 foiz" />
            </div>
          </Card>
        </div>
        <div className="ds-mt">
          <EmptyState
            title="Hozircha natijalar yo'q"
            description="Birinchi darsdan keyin o'sishingiz shu yerda ko'rinadi."
            action={
              <Button onClick={() => go("lesson")}>
                Birinchi darsni boshlash
              </Button>
            }
          />
        </div>
      </>
    );
  }

  const views: Record<Screen, () => ReactNode> = {
    today,
    courses,
    games,
    chat,
    teachers,
    stats,
    profile,
    pricing,
    lesson,
    login,
    system,
  };
  return (
    <div className="ds-app">
      <a className="ds-skip" href="#design-content">
        Asosiy mazmunga o'tish
      </a>
      <div className="ds-preview-bar">
        <span>
          <span className="ds-live-dot" /> Interaktiv dizayn namunasi
        </span>
        <label>
          Ko'rinish
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as Role);
              go("today");
            }}
          >
            <option value="student">O'quvchi</option>
            <option value="teacher">Ustoz</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button
          onClick={() => {
            setRole("student");
            go("system");
          }}
        >
          UI kit <Settings size={14} />
        </button>
      </div>
      <aside className="ds-sidebar">
        <a
          className="ds-brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("today");
          }}
        >
          <img src="/landing/falarus-mark.svg" alt="" />
          <span>
            Fala<span>Rus</span>
            <small>RUS TILI. YANGI IMKONIYATLAR.</small>
          </span>
        </a>
        <p className="ds-nav-caption">
          {role === "student"
            ? "O'QUV MAYDONI"
            : role === "teacher"
              ? "USTOZ MAYDONI"
              : "BOSHQARUV"}
        </p>
        <nav aria-label="Bo'limlar">
          {(role === "student"
            ? navigation
            : [
                {
                  id: "today" as Screen,
                  label: role === "teacher" ? "Dars jadvali" : "Umumiy holat",
                  icon: role === "teacher" ? GraduationCap : LayoutDashboard,
                },
              ]
          ).map((n) => (
            <button
              key={n.id}
              className={`ds-nav-link ${screen === n.id ? "ds-nav-link--active" : ""}`}
              aria-current={screen === n.id ? "page" : undefined}
              onClick={() => go(n.id)}
            >
              <n.icon size={20} strokeWidth={1.8} />
              <span>{n.label}</span>
              {screen === n.id && <span className="ds-nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="ds-sidebar-bottom">
          <div className="ds-premium-note">
            <Sparkles size={21} />
            <strong>Imkoniyatingiz kengroq.</strong>
            <p>Barcha darslar — bitta obunada.</p>
            <Button
              variant="secondary"
              onClick={() => {
                setRole("student");
                go("pricing");
              }}
            >
              Premium bilan tanishish
            </Button>
          </div>
          <button
            className="ds-account"
            onClick={() => {
              setRole("student");
              go("profile");
            }}
          >
            <span className="ds-avatar ds-avatar--small">
              {name.slice(0, 1)}
            </span>
            <span>
              <strong>{name}</strong>
              <small>
                {role === "student"
                  ? "O‘quvchi · A1 daraja"
                  : role === "teacher"
                    ? "Ustoz"
                    : "Administrator"}
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <div className="ds-body">
        <header className="ds-topbar">
          <div>
            <span>O'quv maydoni</span>
            <ChevronRight size={14} />
            <strong>
              {role === "student"
                ? screenTitle
                : role === "teacher"
                  ? "Ustoz kabineti"
                  : "Boshqaruv"}
            </strong>
          </div>
          <button
            className="ds-theme"
            aria-label={dark ? "Yorug' rejim" : "Tungi rejim"}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>
        <main
          ref={contentRef}
          tabIndex={-1}
          id="design-content"
          className="ds-content"
        >
          {role === "student" && (
            <div className="ds-screen-select">
              <label>
                Bo'lim
                <select
                  value={screen}
                  onChange={(e) => go(e.target.value as Screen)}
                >
                  {navigation.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                  <option value="pricing">Tariflar</option>
                  <option value="lesson">Mashq</option>
                  <option value="login">Kirish</option>
                  <option value="system">UI kit</option>
                </select>
              </label>
            </div>
          )}
          {role === "student" ? views[screen]() : workspace()}
          <footer className="ds-footer">
            <span>FalaRus · Har kuni oldinga.</span>
            <span>Namuna ma'lumotlari · UI/UX v1</span>
          </footer>
        </main>
      </div>
      <nav className="ds-mobile-nav" aria-label="Mobil menyu">
        {(role === "student"
          ? [navigation[0], navigation[1], navigation[3], navigation[6]]
          : [{ id: "today" as Screen, label: "Ish maydoni", icon: Users }]
        ).map((n) => (
          <button
            key={n.id}
            aria-current={screen === n.id ? "page" : undefined}
            onClick={() => go(n.id)}
          >
            <n.icon size={20} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      {notice && (
        <div className="ds-toast" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button aria-label="Xabarni yopish" onClick={() => setNotice("")}>
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
