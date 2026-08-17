import { useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import TeacherTermsModal from './TeacherTermsModal';
import {
  ArrowRight,
  BookOpen,
  Globe2,
  Hand,
  Headphones,
  MessageCircle,
  Mic,
  MicOff,
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

export type TeacherBannerLanguage = 'en' | 'uz' | 'ru' | 'kk' | 'tg' | 'ky';

type Pair = readonly [string, string];

type BannerCopy = {
  title: string;
  headline: string;
  headlineAlt: string;
  lead: string;
  chips: readonly [Pair, Pair, Pair];
  cards: readonly [Pair, Pair, Pair];
  trust: Pair;
  /** Asosiy tugma ostidagi kichik izoh. */
  ctaNote: string;
  panelFull: string;
  /** Jonli dars oynasi yozuvlari. */
  live: string;
  teacherTag: string;
  studentsTag: string;
  handTag: string;
};

const BANNER_COPY: Record<TeacherBannerLanguage, BannerCopy> = {
  uz: {
    title: 'O‘qituvchilar uchun',
    headline: 'Rus tilini onlayn o‘rgating',
    headlineAlt: 'Преподавайте русский язык онлайн',
    lead: 'Bilim ulashing, talabalar hayotini o‘zgartiring va istalgan joydan daromad toping.',
    chips: [
      ['Istalgan joydan', 'onlayn ishlang'],
      ['Talabalarni biz topamiz', 'siz izlamaysiz'],
      ['Moslashuvchan', 'jadval va o‘sish'],
    ],
    cards: [
      ['Interaktiv darslar', 'jonli formatda'],
      ['Zamonaviy materiallar', 'va qulay vositalar'],
      ['Qo‘llab-quvvatlash', 'har qadamda'],
    ],
    trust: ['Ishonchli platforma', 'Qulay sharoitlar'],
    ctaNote: 'Shartlarni ko‘ring va bugun boshlang',
    panelFull: 'To‘liq shartlar va daromad kalkulyatori',
    live: 'Jonli dars',
    teacherTag: 'Ustoz',
    studentsTag: '12 ta o‘quvchi onlayn',
    handTag: 'Savol bor',
  },
  ru: {
    title: 'Для преподавателей',
    headline: 'Преподавайте русский онлайн',
    headlineAlt: 'Работайте из любой точки мира',
    lead: 'Делитесь знаниями, меняйте жизнь студентов и зарабатывайте откуда угодно.',
    chips: [
      ['Из любой точки', 'работайте онлайн'],
      ['Учеников находим мы', 'вам не нужно искать'],
      ['Гибкий график', 'и рост дохода'],
    ],
    cards: [
      ['Интерактивные уроки', 'в живом формате'],
      ['Современные материалы', 'и инструменты'],
      ['Поддержка и развитие', 'на каждом шагу'],
    ],
    trust: ['Надёжная платформа', 'Удобные условия'],
    ctaNote: 'Посмотрите условия и начните сегодня',
    panelFull: 'Полные условия и калькулятор дохода',
    live: 'Прямой эфир',
    teacherTag: 'Преподаватель',
    studentsTag: '12 учеников онлайн',
    handTag: 'Вопрос',
  },
  en: {
    title: 'For teachers',
    headline: 'Teach Russian online',
    headlineAlt: 'Преподавайте русский язык онлайн',
    lead: 'Share your knowledge, change students’ lives and earn from anywhere.',
    chips: [
      ['From anywhere', 'work online'],
      ['We bring the students', 'no searching needed'],
      ['Flexible', 'schedule and growth'],
    ],
    cards: [
      ['Interactive lessons', 'in a live format'],
      ['Modern materials', 'and tools'],
      ['Support and growth', 'at every step'],
    ],
    trust: ['Trusted platform', 'Fair conditions'],
    ctaNote: 'See the terms and start today',
    panelFull: 'Full terms and income calculator',
    live: 'Live lesson',
    teacherTag: 'Teacher',
    studentsTag: '12 students online',
    handTag: 'Question',
  },
  kk: {
    title: 'Оқытушылар үшін',
    headline: 'Орыс тілін онлайн үйретіңіз',
    headlineAlt: 'Преподавайте русский язык онлайн',
    lead: 'Біліміңізбен бөлісіңіз, студенттердің өмірін өзгертіңіз және кез келген жерден табыс табыңыз.',
    chips: [
      ['Кез келген жерден', 'онлайн жұмыс'],
      ['Оқушыларды біз табамыз', 'сіз іздемейсіз'],
      ['Икемді', 'кесте және өсу'],
    ],
    cards: [
      ['Интерактивті сабақтар', 'тікелей форматта'],
      ['Заманауи материалдар', 'және құралдар'],
      ['Қолдау және даму', 'әр қадамда'],
    ],
    trust: ['Сенімді платформа', 'Қолайлы жағдайлар'],
    ctaNote: 'Шарттарды көріңіз және бүгін бастаңыз',
    panelFull: 'Толық шарттар және табыс калькуляторы',
    live: 'Тікелей сабақ',
    teacherTag: 'Оқытушы',
    studentsTag: '12 оқушы онлайн',
    handTag: 'Сұрақ бар',
  },
  tg: {
    title: 'Барои омӯзгорон',
    headline: 'Забони русиро онлайн омӯзонед',
    headlineAlt: 'Преподавайте русский язык онлайн',
    lead: 'Донишатонро мубодила кунед, ҳаёти донишомӯзонро тағйир диҳед ва аз ҳар ҷо даромад ба даст оред.',
    chips: [
      ['Аз ҳар ҷо', 'онлайн кор кунед'],
      ['Донишомӯзонро мо меёбем', 'шумо ҷустуҷӯ намекунед'],
      ['Ҷадвали мутобиқ', 'ва рушд'],
    ],
    cards: [
      ['Дарсҳои интерактивӣ', 'дар формати зинда'],
      ['Маводи муосир', 'ва абзорҳо'],
      ['Дастгирӣ ва рушд', 'дар ҳар қадам'],
    ],
    trust: ['Платформаи боэътимод', 'Шароити қулай'],
    ctaNote: 'Шартҳоро бинед ва имрӯз оғоз кунед',
    panelFull: 'Шартҳои пурра ва ҳисобкунаки даромад',
    live: 'Дарси зинда',
    teacherTag: 'Омӯзгор',
    studentsTag: '12 донишомӯз онлайн',
    handTag: 'Савол ҳаст',
  },
  ky: {
    title: 'Мугалимдер үчүн',
    headline: 'Орус тилин онлайн үйрөтүңүз',
    headlineAlt: 'Преподавайте русский язык онлайн',
    lead: 'Билимиңизди бөлүшүңүз, студенттердин жашоосун өзгөртүңүз жана каалаган жерден киреше табыңыз.',
    chips: [
      ['Каалаган жерден', 'онлайн иштеңиз'],
      ['Окуучуларды биз табабыз', 'сиз издебейсиз'],
      ['Ийкемдүү', 'график жана өсүү'],
    ],
    cards: [
      ['Интерактивдүү сабактар', 'жандуу форматта'],
      ['Заманбап материалдар', 'жана куралдар'],
      ['Колдоо жана өнүгүү', 'ар бир кадамда'],
    ],
    trust: ['Ишенимдүү платформа', 'Ыңгайлуу шарттар'],
    ctaNote: 'Шарттарды көрүп, бүгүн баштаңыз',
    panelFull: 'Толук шарттар жана киреше калькулятору',
    live: 'Түз сабак',
    teacherTag: 'Мугалим',
    studentsTag: '12 окуучу онлайн',
    handTag: 'Суроо бар',
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

/** Darsdagi o'quvchilar — ismi emas, bosh harfi (hech kimning ma'lumoti emas). */
const STUDENTS = [
  { initial: 'A', muted: false },
  { initial: 'M', muted: true },
  { initial: 'S', muted: false },
] as const;

/** Slaydda ko'rinadigan mavzu so'zlari — «Глаголы движения» darsidan. */
const LESSON_WORDS = ['идти', 'ехать', 'лететь'] as const;

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
  /** «Siz o'qituvchimisiz?» */
  ask: string;
  loginLabel: string;
  registerLabel: string;
  /** «Shartlar va daromad haqida» — asosiy tugma matni. */
  moreLabel: string;
};

export default function TeacherRecruitBanner({
  language,
  eyebrow,
  ask,
  loginLabel,
  registerLabel,
  moreLabel,
}: TeacherRecruitBannerProps) {
  const reduce = useReducedMotion() ?? false;
  const c = BANNER_COPY[language] ?? BANNER_COPY.uz;
  const [termsModalOpen, setTermsModalOpen] = useState(false);

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
          <motion.p variants={rise} className="mt-0.5 text-[16px] font-bold leading-snug text-[#F97316] sm:text-[18px]">
            {c.headlineAlt}
          </motion.p>

          <motion.p variants={rise} className="mt-3 max-w-[500px] text-[14px] leading-[1.6] text-[#475569] sm:text-[15px]">
            {c.lead}
          </motion.p>

          <motion.ul variants={rise} className="mt-5 grid max-w-[500px] gap-x-5 gap-y-3.5 sm:grid-cols-2">
            {[...c.chips, c.trust].map(([chipTitle, chipSub], index) => {
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
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold leading-tight text-[#0F172A]">{chipTitle}</span>
                    <span className="block text-[13px] leading-tight text-[#64748B]">{chipSub}</span>
                  </span>
                </motion.li>
              );
            })}
          </motion.ul>

          <motion.p variants={rise} className="mt-6 text-[13px] font-semibold text-[#0B2A6B]">
            {ask}
          </motion.p>

          {/*
            BITTA ASOSIY TUGMA.

            Bosilishi bilanoq to'liq shartlar va daromad kalkulyatori oynacha
            ichida ochiladi; ro'yxatdan o'tish bilan kirish esa o'sha oynaning
            pastida turadi. Ilgari oraliqda yana bir panel bor edi — ortiqcha
            qadam bo'lgani uchun olib tashlandi.
          */}
          <motion.div variants={rise} className="mt-2 max-w-[420px]">
            <motion.button
              type="button"
              onClick={() => setTermsModalOpen(true)}
              whileHover={reduce ? undefined : { scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="group flex w-full items-center gap-3 rounded-[20px] bg-[linear-gradient(120deg,#2563EB,#1E3A8A)] px-5 py-3.5 text-left shadow-[0_16px_34px_rgba(37,99,235,0.30)] transition hover:shadow-[0_20px_44px_rgba(37,99,235,0.38)]"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white/15">
                <Rocket className="h-5 w-5 text-white" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold leading-tight text-white">{moreLabel}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-white/80">{c.ctaNote}</span>
              </span>
              <span className="shrink-0 text-white/90 transition group-hover:translate-x-0.5">
                <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
              </span>
            </motion.button>
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
                {/* Ekranda ko'rsatilayotgan dars slaydi. */}
                <div className="min-w-0 flex-1 rounded-[16px] bg-[linear-gradient(135deg,#EAF1FE,#F7FAFF)] p-3">
                  <div className="flex items-center gap-2">
                    <RussianFlag />
                    <span className="text-[11px] font-medium text-[#64748B]">Сегодня:</span>
                  </div>
                  <p className="mt-1.5 text-[16px] font-extrabold leading-tight text-[#0B2A6B]">
                    Глаголы<br />движения
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {LESSON_WORDS.map((word, index) => (
                      <motion.span
                        key={word}
                        className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#2563EB] shadow-[0_2px_6px_rgba(37,99,235,0.12)]"
                        variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                        transition={{ delay: 0.5 + index * 0.12 }}
                      >
                        {word}
                      </motion.span>
                    ))}
                  </div>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white">
                    <motion.span
                      className="block h-full rounded-full bg-[#2563EB]"
                      variants={{ hidden: { width: '0%' }, show: { width: '72%' } }}
                      transition={{ duration: reduce ? 0 : 1.1, delay: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Ustoz oynasi — gapirayotgani halqa bilan ko'rsatiladi. */}
                <div className="relative flex w-[78px] shrink-0 flex-col justify-end rounded-[16px] bg-[linear-gradient(160deg,#1E3A8A,#2563EB)] p-2">
                  <span className="absolute left-1/2 top-3 -translate-x-1/2">
                    <motion.span
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white ring-2 ring-white/70"
                      animate={reduce ? undefined : { boxShadow: ['0 0 0 0 rgba(255,255,255,0.5)', '0 0 0 8px rgba(255,255,255,0)'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                    >
                      <Headphones className="h-4 w-4" strokeWidth={2.2} />
                    </motion.span>
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-black/25 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    <Mic className="h-2.5 w-2.5" strokeWidth={2.6} />
                    {c.teacherTag}
                  </span>
                </div>
              </div>

              {/* O'quvchilar oynachalari — biri qo'l ko'targan. */}
              <div className="mt-2.5 grid grid-cols-4 gap-2">
                {STUDENTS.map((student, index) => (
                  <motion.span
                    key={student.initial}
                    className="relative flex h-[46px] items-center justify-center rounded-[12px] bg-[#EEF3FD] text-[13px] font-black text-[#2563EB]"
                    variants={{ hidden: { opacity: 0, scale: 0.85 }, show: { opacity: 1, scale: 1 } }}
                    transition={{ delay: 0.55 + index * 0.1, type: 'spring', stiffness: 240, damping: 20 }}
                  >
                    {student.initial}
                    <span className="absolute bottom-1 right-1 text-[#94A3B8]">
                      {student.muted ? <MicOff className="h-3 w-3" strokeWidth={2.4} /> : <Mic className="h-3 w-3 text-[#22A552]" strokeWidth={2.4} />}
                    </span>
                    {index === 2 && (
                      <motion.span
                        className="absolute -top-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-[#F97316] text-white shadow-[0_4px_10px_rgba(249,115,22,0.4)]"
                        title={c.handTag}
                        animate={reduce ? undefined : { y: [0, -3, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Hand className="h-3 w-3" strokeWidth={2.6} />
                      </motion.span>
                    )}
                  </motion.span>
                ))}
                <span className="flex h-[46px] items-center justify-center rounded-[12px] border border-dashed border-[#C7D8F5] text-[12px] font-bold text-[#64748B]">
                  +9
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-[#64748B]">
                <Users className="h-3.5 w-3.5" strokeWidth={2.2} />
                {c.studentsTag}
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

      <TeacherTermsModal
        open={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        language={language}
        title={c.panelFull}
        registerLabel={registerLabel}
        loginLabel={loginLabel}
      />
    </motion.section>
  );
}
