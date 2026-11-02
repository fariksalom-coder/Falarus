import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  Globe2,
  MessageCircle,
  Mic,
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Video,
} from 'lucide-react';

/**
 * O'QITUVCHI CHAQIRUV BANNERI.
 *
 * Ilgari bu joyda oddiy `teacher.png` rasm turardi. Endi bir xil kompozitsiya
 * jonli qilib — matn, jonli dars oynasi va suzuvchi harflar alohida DOM
 * elementlari sifatida — chizilgan. Rasm emas: har qanday ekranda tiniq,
 * tarjima qilinadi va qidiruv tizimiga ko'rinadi.
 *
 * Asosiy tugma — «Shartlar va daromad haqida». U ochilganda ichida qisqa
 * shartlar, «Ro'yxatdan o'tish» va «Kirish» chiqadi: sahifada bitta aniq
 * harakat qoladi, qolgani bir bosishdan keyin.
 */

/**
 * Shartlar sahifasi. Fayl `public/oqituvchilarga/index.html` da yotadi, lekin
 * `server.ts` uni shu qisqa manzildan ham beradi — eski `/oqituvchilarga/`
 * havolalari ham ishlab turaveradi.
 */
const TEACHER_INFO_URL = '/teacherinfo';

/**
 * Statik sahifa tilni shu kalitdan o'qiydi (`?lang=` dan keyingi navbatda).
 * Ikkalasi ham bitta manbada tursa, `localStorage` umumiy bo'ladi.
 */
const TERMS_LANG_KEY = 'falarus_lending_lang';

/**
 * Havola bosilganda saytning joriy tilini eslatib qo'yamiz.
 *
 * NIMA UCHUN MANZILGA YOZILMAYDI: ilgari `?lang=UZ` havolaning o'zida
 * turardi va brauzer qatorida ham ko'rinardi. Manzil toza `/teacherinfo`
 * bo'lishi kerak, shuning uchun til yon yo'ldan uzatiladi.
 *
 * Ishlamay qolsa ham sahifa buzilmaydi: statik sahifa ruschaga tushadi va
 * tepasida RU/UZ/EN almashtirgichi turadi.
 */
function eslatTil(language: string): void {
  try {
    window.localStorage.setItem(TERMS_LANG_KEY, TERMS_LANG[language] ?? 'RU');
  } catch {
    /* private rejim yoki kvota — sahifa baribir ochiladi */
  }
}

/** Statik sahifa faqat shu uch tilda mavjud; qolgani ruschaga tushadi. */
const TERMS_LANG: Record<string, 'RU' | 'UZ' | 'EN'> = {
  uz: 'UZ',
  en: 'EN',
  ru: 'RU',
  kk: 'RU',
  tg: 'RU',
  ky: 'RU',
};

export type TeacherBannerLanguage = 'en' | 'uz' | 'ru' | 'kk' | 'tg' | 'ky';

type Pair = readonly [string, string];

type BannerCopy = {
  title: string;
  headline: string;
  lead: string;
  /** Uch afzallik — har biri BITTA qator. Ilgari sarlavha+izoh juftligi edi. */
  chips: readonly [string, string, string];
  cards: readonly [Pair, Pair, Pair];
  trust: string;
  /** Jonli dars oynasi yozuvlari. */
  live: string;
  teacherTag: string;
  /** Jonli dars oynasidagi o'quvchi plitkasining yorlig'i. */
  studentTag: string;
};

const BANNER_COPY: Record<TeacherBannerLanguage, BannerCopy> = {
  uz: {
    title: 'O‘qituvchilar uchun',
    headline: 'Rus tilini onlayn o‘rgating',
    lead: 'Tajribangizni daromadga aylantiring.',
    chips: [
      'Istalgan joydan ishlang',
      'Talabalarni biz topamiz',
      'Moslashuvchan jadval',
    ],
    cards: [
      ['Interaktiv darslar', 'jonli formatda'],
      ['Zamonaviy materiallar', 'va qulay vositalar'],
      ['Qo‘llab-quvvatlash', 'har qadamda'],
    ],
    trust: 'Ishonchli platforma',
    live: 'Jonli dars',
    teacherTag: 'Ustoz',
    studentTag: 'O‘quvchi',
  },
  ru: {
    title: 'Для преподавателей',
    headline: 'Преподавайте русский онлайн',
    lead: 'Превратите свой опыт в стабильный доход.',
    chips: [
      'Из любой точки',
      'Учеников находим мы',
      'Гибкий график',
    ],
    cards: [
      ['Интерактивные уроки', 'в живом формате'],
      ['Современные материалы', 'и инструменты'],
      ['Поддержка и развитие', 'на каждом шагу'],
    ],
    trust: 'Надёжная платформа',
    live: 'Прямой эфир',
    teacherTag: 'Преподаватель',
    studentTag: 'Ученик',
  },
  en: {
    title: 'For teachers',
    headline: 'Teach Russian online',
    lead: 'Turn your experience into steady income.',
    chips: [
      'From anywhere',
      'We bring the students',
      'Flexible schedule',
    ],
    cards: [
      ['Interactive lessons', 'in a live format'],
      ['Modern materials', 'and tools'],
      ['Support and growth', 'at every step'],
    ],
    trust: 'Trusted platform',
    live: 'Live lesson',
    teacherTag: 'Teacher',
    studentTag: 'Student',
  },
  kk: {
    title: 'Оқытушылар үшін',
    headline: 'Орыс тілін онлайн үйретіңіз',
    lead: 'Тәжірибеңізді тұрақты табысқа айналдырыңыз.',
    chips: [
      'Кез келген жерден',
      'Оқушыларды біз табамыз',
      'Икемді кесте',
    ],
    cards: [
      ['Интерактивті сабақтар', 'тікелей форматта'],
      ['Заманауи материалдар', 'және құралдар'],
      ['Қолдау және даму', 'әр қадамда'],
    ],
    trust: 'Сенімді платформа',
    live: 'Тікелей сабақ',
    teacherTag: 'Оқытушы',
    studentTag: 'Оқушы',
  },
  tg: {
    title: 'Барои омӯзгорон',
    headline: 'Забони русиро онлайн омӯзонед',
    lead: 'Таҷрибаи худро ба даромади доимӣ табдил диҳед.',
    chips: [
      'Аз ҳар ҷо',
      'Донишомӯзонро мо меёбем',
      'Ҷадвали мутобиқ',
    ],
    cards: [
      ['Дарсҳои интерактивӣ', 'дар формати зинда'],
      ['Маводи муосир', 'ва абзорҳо'],
      ['Дастгирӣ ва рушд', 'дар ҳар қадам'],
    ],
    trust: 'Платформаи боэътимод',
    live: 'Дарси зинда',
    teacherTag: 'Омӯзгор',
    studentTag: 'Шогирд',
  },
  ky: {
    title: 'Мугалимдер үчүн',
    headline: 'Орус тилин онлайн үйрөтүңүз',
    lead: 'Тажрыйбаңызды туруктуу кирешеге айландырыңыз.',
    chips: [
      'Каалаган жерден',
      'Окуучуларды биз табабыз',
      'Ийкемдүү график',
    ],
    cards: [
      ['Интерактивдүү сабактар', 'жандуу форматта'],
      ['Заманбап материалдар', 'жана куралдар'],
      ['Колдоо жана өнүгүү', 'ар бир кадамда'],
    ],
    trust: 'Ишенимдүү платформа',
    live: 'Түз сабак',
    teacherTag: 'Мугалим',
    studentTag: 'Окуучу',
  },
};

/** To'rtinchi katak — «Ishonchli platforma»: ilgari tugmalar ostida turardi. */
const CHIP_ICONS = [Globe2, UserPlus, TrendingUp, ShieldCheck] as const;
const CHIP_TONES = [
  'bg-[#E8F0FE] text-[#2563EB]',
  'bg-[#FFF1E3] text-[#F97316]',
  'bg-[#E8F0FE] text-[#2563EB]',
  'bg-[#E8F5EC] text-[#22A552]',
] as const;

const CARD_ICONS = [MessageCircle, BookOpen, Trophy] as const;
const CARD_TONES = [
  'bg-[#F97316] text-white',
  'bg-[#2563EB] text-white',
  'bg-[#FFF1E3] text-[#F97316]',
] as const;

/**
 * Doskadagi juftliklar — «Глаголы движения» darsidan (rus → o'zbek).
 *
 * Harakat fe'llarida ma'no yurish USULIga bog'liq, shuning uchun tarjima
 * shunchaki «bormoq» emas: `идти` — piyoda, `ехать` — ulovda, `лететь` —
 * havoda. Darsning butun mazmuni shu farqda.
 */
const LESSON_PAIRS = [
  ['идти', 'yurmoq'],
  ['ехать', 'ketmoq'],
  ['лететь', 'uchmoq'],
] as const;

/**
 * Jonli dars oynasidagi ikkita video plitka.
 *
 * Suratlar `public/landing/` da — «Falarus Dars» maketidan chiqarilgan ASL
 * PNG fayllar, bayt-ma-bayt o'zgartirilmagan (542px, 318/276 KB). Ilgari ular
 * WebP'ga siqilgan edi; bu tarmoq uchun yengilroq, lekin surat asl nusxa
 * bo'lmay qolardi. Shuning uchun asli qoldirildi.
 *
 * `objectPosition` yuzni kadr markazida ushlab turadi — plitka kvadratga
 * yaqin bo'lgani uchun kesilganda peshona qirqilmasin.
 */
const LIVE_TILES = [
  { key: 'teacher', src: '/landing/live-teacher.png', objectPosition: '50% 18%' },
  { key: 'student', src: '/landing/live-student.png', objectPosition: '50% 20%' },
] as const;

/** Rus tili bayrog'i — rasm emas, uchta chiziq (retina ekranda ham tiniq). */
function RussianFlag() {
  return (
    <span className="flex h-4 w-6 shrink-0 flex-col overflow-hidden rounded-[3px] ring-1 ring-black/10">
      <span className="h-1/3 bg-white" />
      <span className="h-1/3 bg-[#2A5CE0]" />
      <span className="h-1/3 bg-[#D8232A]" />
    </span>
  );
}

type FloatingLetterProps = {
  letter: string;
  className: string;
  tone: string;
  delay: number;
  reduce: boolean;
};

function FloatingLetter({ letter, className, tone, delay, reduce }: FloatingLetterProps) {
  return (
    <motion.span
      aria-hidden
      className={`pointer-events-none absolute select-none items-center justify-center rounded-[14px] text-xl font-black shadow-[0_10px_24px_rgba(37,99,235,0.16)] ${tone} ${className}`}
      variants={{ hidden: { opacity: 0, scale: 0.6 }, show: { opacity: 1, scale: 1 } }}
      transition={{ delay: 0.35 + delay, type: 'spring', stiffness: 220, damping: 18 }}
    >
      <motion.span
        animate={reduce ? undefined : { y: [0, -7, 0] }}
        transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
      >
        {letter}
      </motion.span>
    </motion.span>
  );
}

export type TeacherRecruitBannerProps = {
  language: TeacherBannerLanguage;
  /** «O'qituvchi qidiryapmiz» — sarlavha ustidagi kichik yorliq. */
  eyebrow: string;
  /** «Shartlar va daromad haqida» — asosiy tugma matni. */
  moreLabel: string;
};

export default function TeacherRecruitBanner({
  language,
  eyebrow,
  moreLabel,
}: TeacherRecruitBannerProps) {
  const reduce = useReducedMotion() ?? false;
  const c = BANNER_COPY[language] ?? BANNER_COPY.uz;

  /*
    Bitta kuzatuvchi — butun banner uchun. `whileInView` har bir bolaga
    alohida qo'yilsa, ichma-ich joylashgan elementlarga variant tarqalmaydi
    (ba'zilari ko'rinmay qoladi). Shuning uchun bo'lim ko'ringanda `animate`
    orqali hammasi birdan yoqiladi.
  */
  const rootRef = useRef<HTMLElement>(null);
  const inView = useInView(rootRef, { once: true, amount: 0.15 });

  const rise = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.section
      ref={rootRef}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      transition={{ staggerChildren: reduce ? 0 : 0.08 }}
      className="relative overflow-hidden rounded-[24px] border border-[#DCE7FA] bg-[linear-gradient(135deg,#F4F8FF_0%,#FFFFFF_45%,#EDF3FF_100%)] px-5 py-6 shadow-[0_18px_48px_rgba(37,99,235,0.10)] sm:rounded-[30px] sm:px-7 sm:py-8 lg:px-10 lg:py-10"
    >
      {/* Yumshoq fon dog'lari — chuqurlik beradi, o'qishga xalaqit qilmaydi. */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#2563EB]/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#F97316]/10 blur-3xl" />

      {/*
        Ikki ustun 768px dan boshlanadi: 1024px kutilsa, planshet va kichik
        noutbukda o'ng tomon bo'm-bo'sh qolib ketardi.
      */}
      <div className="relative grid gap-7 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:items-center md:gap-8 lg:gap-10">
        <div className="text-left">
          <motion.span
            variants={rise}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#2563EB] ring-1 ring-[#DCE7FA]"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
            {eyebrow}
          </motion.span>

          <motion.h2
            variants={rise}
            className="mt-3 text-[28px] font-extrabold leading-[1.06] tracking-[-0.02em] text-[#0B2A6B] sm:text-[34px] lg:text-[40px]"
          >
            {c.title}
          </motion.h2>

          <motion.div variants={rise} className="mt-3 flex items-center gap-2">
            <motion.span
              className="block h-[5px] rounded-full bg-[#2563EB]"
              variants={{ hidden: { width: 0 }, show: { width: 96 } }}
              transition={{ duration: reduce ? 0 : 0.6, ease: 'easeOut' }}
            />
            <motion.span
              className="block h-[5px] rounded-full bg-[#F97316]"
              variants={{ hidden: { width: 0 }, show: { width: 40 } }}
              transition={{ duration: reduce ? 0 : 0.6, delay: 0.15, ease: 'easeOut' }}
            />
          </motion.div>

          <motion.p variants={rise} className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[18px] font-bold leading-snug sm:text-[21px]">
            <span className="text-[#2563EB]">{c.headline}</span>
            <span aria-hidden className="hidden h-2 w-2 rounded-full bg-[#F97316] sm:inline-block" />
          </motion.p>
          <motion.p variants={rise} className="mt-3 max-w-[500px] text-[14px] leading-[1.6] text-[#475569] sm:text-[15px]">
            {c.lead}
          </motion.p>

          <motion.ul variants={rise} className="mt-4 grid max-w-[500px] gap-x-5 gap-y-3 sm:grid-cols-2">
            {[...c.chips, c.trust].map((chipTitle, index) => {
              const Icon = CHIP_ICONS[index];
              return (
                <motion.li
                  key={chipTitle}
                  whileHover={reduce ? undefined : { y: -4 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                  className="flex items-center gap-2.5"
                >
                  <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${CHIP_TONES[index]}`}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 text-[13px] font-bold leading-tight text-[#0F172A]">{chipTitle}</span>
                </motion.li>
              );
            })}
          </motion.ul>

          {/*
            BITTA ASOSIY HAVOLA.

            Ilgari bu tugma bosilganda shartlar bosh sahifa ustidagi oynacha
            ichida, iframe bilan ochilardi. Endi u haqiqiy havola: `/teacherinfo`
            SHU OYNADA ochiladi va brauzer manzili o'zgaradi.

            NIMA UCHUN `target="_blank"` EMAS: sayt PWA sifatida o'rnatiladi
            (`manifest.json` → `display: standalone`, `scope: "/"`). Ilova
            ichida yangi oyna ochilsa, u ham manzil qatorisiz standalone oyna
            bo'lib chiqadi — foydalanuvchi qayerda ekanini ko'rmaydi. Shu
            oynada o'tilsa esa manzil ko'rinadi va «orqaga» tugmasi qaytaradi.
          */}
          <motion.div variants={rise} className="mt-2 max-w-[420px]">
            <motion.a
              href={TEACHER_INFO_URL}
              onClick={() => eslatTil(language)}
              whileHover={reduce ? undefined : { scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="group flex w-full items-center gap-3 rounded-[20px] bg-[linear-gradient(120deg,#2563EB,#1E3A8A)] px-5 py-3.5 text-left shadow-[0_16px_34px_rgba(37,99,235,0.30)] transition hover:shadow-[0_20px_44px_rgba(37,99,235,0.38)]"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white/15">
                <Rocket className="h-5 w-5 text-white" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-bold leading-tight text-white">{moreLabel}</span>
              <span className="shrink-0 text-white/90 transition group-hover:translate-x-0.5">
                <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
              </span>
            </motion.a>
          </motion.div>

        </div>

        {/* O'ng tomon — ayni damda ketayotgan onlayn dars. */}
        <motion.div variants={rise} className="relative">
          <FloatingLetter letter="Я" tone="bg-white text-[#2563EB]" className="left-1 -top-9 hidden h-12 w-12 sm:flex" delay={0} reduce={reduce} />
          <FloatingLetter letter="Б" tone="bg-white text-[#F97316]" className="-top-6 right-6 hidden h-11 w-11 sm:flex" delay={0.4} reduce={reduce} />
          <FloatingLetter letter="Д" tone="bg-[#2563EB] text-white" className="-left-3 bottom-10 hidden h-11 w-11 lg:flex" delay={0.8} reduce={reduce} />
          <FloatingLetter letter="Ж" tone="bg-white text-[#2563EB]" className="bottom-0 left-10 hidden h-10 w-10 lg:flex" delay={1.2} reduce={reduce} />

          <motion.span
            aria-hidden
            className="pointer-events-none absolute right-2 top-2 text-[#2563EB]"
            animate={reduce ? undefined : { opacity: [0.35, 1, 0.35], scale: [0.9, 1.05, 0.9] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="h-5 w-5" />
          </motion.span>

          {/* `relative` — suzuvchi harflar kartochka ORQASIDA qolishi uchun. */}
          <div className="relative flex flex-col gap-3">
            <div className="min-w-0 rounded-[24px] border border-[#DCE7FA] bg-white p-3.5 shadow-[0_14px_34px_rgba(148,163,184,0.16)] sm:p-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEE2E2] px-2 py-1 text-[10px] font-black uppercase tracking-[0.06em] text-[#DC2626]">
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-[#DC2626]"
                    animate={reduce ? undefined : { opacity: [1, 0.25, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {c.live}
                </span>
                <span className="truncate text-[12px] font-semibold text-[#0F172A]">Виртуальный класс</span>
                <span className="ml-auto shrink-0 text-[11px] font-medium text-[#64748B]">24:15</span>
              </div>

              <div className="mt-3 flex gap-2.5">
                {/* Doska — ayni damda ochiq slayd. */}
                <div className="min-w-0 flex-1 rounded-[16px] bg-[linear-gradient(135deg,#EAF1FE,#F7FAFF)] p-3">
                  <div className="flex items-center gap-2">
                    <RussianFlag />
                    <span className="text-[11px] font-medium text-[#64748B]">Сегодня:</span>
                  </div>
                  <p className="mt-1.5 text-[15px] font-extrabold leading-tight tracking-[-0.015em] text-[#0B2A6B]">
                    Глаголы движения
                  </p>

                  {/*
                    Juftliklar ustun-ustun: chapda ruscha, o'ngda o'zbekcha,
                    orada qisqa chiziq. Ruscha o'ngga tekislangani bejiz emas —
                    ikkala ustun ham chiziqqa qarab yaqinlashadi va ko'z juftni
                    bir qarashda bog'laydi.
                  */}
                  <ul className="mt-2 space-y-1">
                    {LESSON_PAIRS.map(([ru, uz], index) => (
                      <motion.li
                        key={ru}
                        className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-2 border-b border-[#DCE7FA] pb-1 last:border-b-0 last:pb-0"
                        variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                        transition={{ delay: 0.5 + index * 0.12 }}
                      >
                        <span className="truncate text-right text-[12px] font-medium tracking-[-0.015em] text-[#1B2140]">
                          {ru}
                        </span>
                        <span aria-hidden className="h-px w-3.5 shrink-0 bg-[#B9CDF2]" />
                        <span className="truncate text-[12px] font-bold tracking-[-0.015em] text-[#2563EB]">
                          {uz}
                        </span>
                      </motion.li>
                    ))}
                  </ul>

                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white">
                    <motion.span
                      className="block h-full rounded-full bg-[#2563EB]"
                      variants={{ hidden: { width: '0%' }, show: { width: '72%' } }}
                      transition={{ duration: reduce ? 0 : 1.1, delay: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Ustoz va o'quvchi oynalari — haqiqiy suratlar. */}
                <div className="flex w-[82px] shrink-0 flex-col gap-2">
                  {LIVE_TILES.map((tile, index) => (
                    <motion.div
                      key={tile.key}
                      className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] bg-[#12183A]"
                      variants={{ hidden: { opacity: 0, scale: 0.94 }, show: { opacity: 1, scale: 1 } }}
                      transition={{ delay: 0.45 + index * 0.12, type: 'spring', stiffness: 220, damping: 22 }}
                    >
                      <img
                        src={tile.src}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        decoding="async"
                        className="h-full min-h-[62px] w-full object-cover"
                        style={{ objectPosition: tile.objectPosition }}
                      />
                      <span className="absolute inset-x-1 bottom-1 truncate rounded-full bg-white/92 px-1.5 py-0.5 text-center text-[9px] font-bold text-[#101528] backdrop-blur-sm">
                        {index === 0 ? c.teacherTag : c.studentTag}
                      </span>
                      {index === 0 && (
                        <motion.span
                          aria-hidden
                          className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#22A552] ring-2 ring-white/80"
                          animate={reduce ? undefined : { opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-center gap-2.5">
                {[Mic, Video, MessageCircle, Users].map((Icon, index) => (
                  <motion.span
                    key={index}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)]"
                    animate={reduce || index !== 0 ? undefined : { scale: [1, 1.08, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Uchta ustunlik qator — dars oynasi ostida, o'ng ustunni to'ldiradi. */}
            <ul className="grid gap-2.5 sm:grid-cols-3">
              {c.cards.map(([cardTitle, cardSub], index) => {
                const Icon = CARD_ICONS[index];
                return (
                  <motion.li
                    key={cardTitle}
                    variants={{ hidden: { opacity: 0, y: reduce ? 0 : 14 }, show: { opacity: 1, y: 0 } }}
                    transition={{ delay: 0.25 + index * 0.1, type: 'spring', stiffness: 210, damping: 22 }}
                    whileHover={reduce ? undefined : { y: -3 }}
                    className="flex items-center gap-2.5 rounded-[16px] border border-[#E6EDF9] bg-white px-3 py-2.5 shadow-[0_10px_24px_rgba(148,163,184,0.14)] sm:flex-col sm:items-start sm:gap-2 lg:flex-row lg:items-center lg:gap-2.5"
                  >
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${CARD_TONES[index]}`}>
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12px] font-bold leading-tight text-[#0F172A]">{cardTitle}</span>
                      <span className="block text-[11px] leading-tight text-[#64748B]">{cardSub}</span>
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
