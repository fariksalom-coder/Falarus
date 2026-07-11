import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  Apple,
  Award,
  BarChart3,
  BookOpenCheck,
  ChevronDown,
  Mail,
  Menu,
  MessageSquare,
  Mic,
  Phone,
  Send,
  Star,
  UserRoundCheck,
  X,
} from 'lucide-react';
import { SiteLegalFooter } from '../components/legal/SiteLegalFooter';
import PricingCard from '../components/pricing/PricingCard';
import { getLegalEntityMeta, LEGAL_PATHS } from '../config/legalPublic';
import { useAuth } from '../context/AuthContext';

type LanguageCode = 'en' | 'uz' | 'ru' | 'kk' | 'tg' | 'ky';
type NavKey = 'home' | 'about' | 'certificates' | 'pricing' | 'contact';
type FeatureKey = 'teachers' | 'exercises' | 'speaking' | 'progress' | 'certificates' | 'community';
type PlanKey = 'free' | 'pro' | 'elite';

const languages: { code: LanguageCode; short: string; label: string; badge: string }[] = [
  { code: 'en', short: 'Eng', label: 'English', badge: 'EN' },
  { code: 'uz', short: 'Uzb', label: 'O‘zbekcha', badge: 'UZ' },
  { code: 'ru', short: 'Rus', label: 'Русский', badge: 'RU' },
  { code: 'kk', short: 'Kaz', label: 'Қазақша', badge: 'KZ' },
  { code: 'tg', short: 'Tjk', label: 'Тоҷикӣ', badge: 'TJ' },
  { code: 'ky', short: 'Kyr', label: 'Кыргызча', badge: 'KG' },
];

/** Compact 2-letter language pill — reliable across platforms (emoji flags fail on Windows Chrome). */
function LangBadge({ code, dark = false }: { code: string; dark?: boolean }) {
  return (
    <span
      className={`inline-flex h-[22px] min-w-[30px] items-center justify-center rounded-[6px] px-1.5 text-[10px] font-black uppercase tracking-[0.06em] ${
        dark ? 'bg-white/20 text-white ring-1 ring-white/25' : 'bg-[#0B2A6B] text-white'
      }`}
    >
      {code}
    </span>
  );
}

const navItems: { key: NavKey; href: string }[] = [
  { key: 'home', href: '#home' },
  { key: 'about', href: '#about' },
  { key: 'certificates', href: '#certificates' },
  { key: 'pricing', href: '#pricing' },
  { key: 'contact', href: '#support' },
];

const LANDING_CONTACTS = {
  telegramUrl: 'https://t.me/falarus',
  instagramUrl: 'https://www.instagram.com/fala_rus',
} as const;

type FaqItem = { question: string; answer: string };

const FAQ_ITEMS_UZ: readonly FaqItem[] = [
  {
    question: 'Patent imtihoniga qanday tayyorlanish mumkin?',
    answer:
      'Patent imtihoni uchun bizda 16 ta tayyor variant mavjud. Har bir variantda 22 ta savol bor va hammasi haqiqiy imtihon formatiga mos tuzilgan. Odatda 1 hafta davomida tayyorlanib, imtihondan muvaffaqiyatli o‘tish mumkin.',
  },
  {
    question: 'Telefon orqali o‘qish mumkinmi?',
    answer:
      'Ha, albatta. Platformadan telefon, planshet yoki kompyuter orqali foydalanish mumkin. Yaqin orada mobil ilova ham chiqadi va undan foydalanish yanada qulay bo‘ladi.',
  },
  {
    question: 'Darslar faqat grammatika uchunmi?',
    answer:
      'Yo‘q. Darslar grammatika, suhbatlashish, o‘qish, lug‘at boyligi va tushunishni birgalikda rivojlantiradi. Har kuni barcha yo‘nalishlar oz-ozdan mashq qilinadi.',
  },
  {
    question: 'Rus tilini necha kunda o‘rganish mumkin?',
    answer:
      'Bizning dastur 182 kunlik reja asosida tuzilgan. Har bir kun uchun aniq vazifalar va darslar mavjud. Shu orqali rus tilini bosqichma-bosqich o‘rganishingiz mumkin.',
  },
  {
    question: 'Boshlang‘ich darajadagilar ham o‘qiy oladimi?',
    answer:
      'Ha. Kurs eng oddiy mavzulardan boshlanadi va asta-sekin murakkablashadi. Rus tilini umuman bilmaydiganlar ham bemalol boshlashi mumkin.',
  },
  {
    question: 'Patent va VNZh imtihonlariga tayyorlaydimi?',
    answer:
      'Ha. Platformada patent va VNZh uchun tayyor variantlar, savollar va javoblar mavjud. Imtihonga qulay va tez tayyorlanishingiz mumkin.',
  },
  {
    question: 'Har kuni qancha vaqt ajratish kerak?',
    answer: 'Kuniga o‘rtacha 20–40 daqiqa shug‘ullanish tavsiya etiladi.',
  },
  {
    question: 'Darslarni o‘tkazib yuborsam nima bo‘ladi?',
    answer: 'Hech narsa bo‘lmaydi. Siz istalgan vaqtda davom ettirishingiz mumkin. Darslar qolib ketmaydi.',
  },
  {
    question: 'Kurs oxirida sertifikat beriladimi?',
    answer: 'Ha. Kursni muvaffaqiyatli tugatgan foydalanuvchilarga sertifikat beriladi.',
  },
  {
    question: 'Platformada testlar va mashqlar bormi?',
    answer: 'Ha. Har bir mavzu uchun testlar, mashqlar va tayyor variantlar mavjud.',
  },
  {
    question: 'Onlayn o‘qish qiyin emasmi?',
    answer: 'Yo‘q. Platforma juda sodda va qulay qilingan. Hamma darslar tushunarli formatda beriladi.',
  },
  {
    question: 'Rus tilida gapirishni tez o‘rganish mumkinmi?',
    answer:
      'Ha. Darslar amaliyotga asoslangan bo‘lib, kundalik suhbat va eng kerakli iboralarga katta e’tibor qaratilgan.',
  },
  {
    question: 'Qo‘llab-quvvatlash bilan qanday bog‘lanish mumkin?',
    answer: 'Telegram yoki sayt orqali biz bilan bog‘lanishingiz mumkin. Savollaringizga yordam beramiz.',
  },
  {
    question: 'Bepul sinab ko‘rish mumkinmi?',
    answer: 'Ha. Platformani bepul sinab ko‘rish imkoniyati mavjud.',
  },
  {
    question: 'Darslar qanday formatda?',
    answer: 'Darslar qisqa va tushunarli videolar, testlar, mashqlar va interaktiv topshiriqlar shaklida tayyorlangan.',
  },
  {
    question: 'Natijani qancha vaqtda sezish mumkin?',
    answer:
      'Agar muntazam shug‘ullansangiz, bir necha haftada rus tilini tushunish va gapirish yaxshilanishini sezishni boshlaysiz.',
  },
] as const;

const FAQ_ITEMS_RU: readonly FaqItem[] = [
  {
    question: 'Как подготовиться к экзамену на патент?',
    answer:
      'Для экзамена на патент у нас есть 16 готовых вариантов. В каждом — 22 вопроса в формате реального экзамена. Обычно за неделю можно подготовиться и успешно сдать.',
  },
  {
    question: 'Можно ли учиться с телефона?',
    answer:
      'Да, конечно. Платформой можно пользоваться с телефона, планшета или компьютера. Скоро выйдет мобильное приложение — будет ещё удобнее.',
  },
  {
    question: 'Уроки только для грамматики?',
    answer:
      'Нет. Уроки развивают грамматику, разговорную речь, чтение, словарный запас и понимание. Каждый день все направления постепенно отрабатываются.',
  },
  {
    question: 'За сколько дней можно выучить русский?',
    answer:
      'Наша программа построена на плане из 182 дней. На каждый день есть конкретные задания и уроки — так вы учите язык поэтапно.',
  },
  {
    question: 'Смогут ли учиться с нулевого уровня?',
    answer:
      'Да. Курс начинается с самых простых тем и постепенно усложняется. Даже без знания русского можно спокойно начать.',
  },
  {
    question: 'Готовит ли к экзаменам на патент и ВНЖ?',
    answer:
      'Да. На платформе есть готовые варианты, вопросы и ответы для патента и ВНЖ. Можно быстро и удобно подготовиться к экзамену.',
  },
  {
    question: 'Сколько времени в день нужно уделять?',
    answer: 'Рекомендуем заниматься в среднем 20–40 минут в день.',
  },
  {
    question: 'Что будет, если пропущу уроки?',
    answer: 'Ничего страшного. Вы можете продолжить в любое время. Уроки никуда не денутся.',
  },
  {
    question: 'Выдаётся ли сертификат в конце курса?',
    answer: 'Да. Пользователям, успешно завершившим курс, выдаётся сертификат.',
  },
  {
    question: 'Есть ли на платформе тесты и упражнения?',
    answer: 'Да. По каждой теме есть тесты, упражнения и готовые варианты.',
  },
  {
    question: 'Сложно ли учиться онлайн?',
    answer: 'Нет. Платформа сделана простой и удобной. Все уроки поданы в понятном формате.',
  },
  {
    question: 'Можно ли быстро научиться говорить по-русски?',
    answer:
      'Да. Уроки ориентированы на практику: большое внимание уделяется ежедневному общению и самым нужным фразам.',
  },
  {
    question: 'Как связаться с поддержкой?',
    answer: 'Можно написать нам в Telegram или через сайт. Мы поможем с вашими вопросами.',
  },
  {
    question: 'Можно ли попробовать бесплатно?',
    answer: 'Да. Есть возможность бесплатно попробовать платформу.',
  },
  {
    question: 'В каком формате проходят уроки?',
    answer: 'Уроки представлены в виде коротких понятных видео, тестов, упражнений и интерактивных заданий.',
  },
  {
    question: 'Через сколько времени будет виден результат?',
    answer:
      'При регулярных занятиях уже через несколько недель вы начнёте замечать улучшение понимания и речи.',
  },
] as const;

const FAQ_ITEMS_EN: readonly FaqItem[] = [
  {
    question: 'How can I prepare for the patent exam?',
    answer:
      'We offer 16 ready-made patent exam variants. Each has 22 questions in the real exam format. Most learners prepare in about a week and pass successfully.',
  },
  {
    question: 'Can I study on my phone?',
    answer:
      'Yes. You can use the platform on your phone, tablet, or computer. A mobile app is coming soon for an even smoother experience.',
  },
  {
    question: 'Are lessons only for grammar?',
    answer:
      'No. Lessons cover grammar, speaking, reading, vocabulary, and comprehension together. Every day you practice all skills step by step.',
  },
  {
    question: 'How many days does the program take?',
    answer:
      'Our program follows a 182-day plan with clear daily tasks and lessons so you progress step by step.',
  },
  {
    question: 'Can complete beginners study too?',
    answer:
      'Yes. The course starts from the basics and gradually gets harder. Even with zero Russian you can start comfortably.',
  },
  {
    question: 'Does it prepare for patent and residence permit exams?',
    answer:
      'Yes. The platform includes ready variants, questions, and answers for patent and residence permit exams so you can prepare quickly.',
  },
  {
    question: 'How much time per day is recommended?',
    answer: 'We recommend about 20–40 minutes of study per day.',
  },
  {
    question: 'What if I skip lessons?',
    answer: 'Nothing is lost. You can continue anytime. Your lessons stay available.',
  },
  {
    question: 'Is there a certificate at the end?',
    answer: 'Yes. Users who successfully complete the course receive a certificate.',
  },
  {
    question: 'Are there tests and exercises?',
    answer: 'Yes. Each topic includes tests, exercises, and practice variants.',
  },
  {
    question: 'Is online learning difficult?',
    answer: 'No. The platform is simple and user-friendly. All lessons are presented clearly.',
  },
  {
    question: 'Can I learn to speak Russian quickly?',
    answer:
      'Yes. Lessons focus on practice, daily conversation, and the phrases you need most.',
  },
  {
    question: 'How do I contact support?',
    answer: 'Reach us via Telegram or the website. We are happy to help with your questions.',
  },
  {
    question: 'Can I try it for free?',
    answer: 'Yes. You can try the platform for free.',
  },
  {
    question: 'What format are the lessons?',
    answer: 'Short clear videos, tests, exercises, and interactive tasks.',
  },
  {
    question: 'When will I see results?',
    answer:
      'With regular practice, many learners notice better understanding and speaking within a few weeks.',
  },
] as const;

const faqItemsByLanguage: Record<LanguageCode, readonly FaqItem[]> = {
  uz: FAQ_ITEMS_UZ,
  ru: FAQ_ITEMS_RU,
  en: FAQ_ITEMS_EN,
  kk: FAQ_ITEMS_RU,
  tg: FAQ_ITEMS_RU,
  ky: FAQ_ITEMS_RU,
};

const featureCards = [
  { key: 'teachers', icon: UserRoundCheck, tone: 'bg-[#0F172A] text-white' },
  { key: 'exercises', icon: BookOpenCheck, tone: 'bg-[#CFE4FF] text-[#0F172A]' },
  { key: 'speaking', icon: Mic, tone: 'bg-[#1E3A8A] text-white' },
  { key: 'progress', icon: BarChart3, tone: 'bg-[#B4282E] text-white' },
  { key: 'certificates', icon: Award, tone: 'bg-[#F1F5F9] text-[#0F172A]' },
  { key: 'community', icon: MessageSquare, tone: 'bg-[#9483E8] text-[#0F172A]' },
] as const satisfies readonly { key: FeatureKey; icon: typeof UserRoundCheck; tone: string }[];

const copy = {
  ru: {
    nav: { home: 'Главная', about: 'О нас', certificates: 'Сертификаты', pricing: 'Тарифы', contact: 'Связаться' },
    auth: { signIn: 'Регистрация', login: 'Войти' },
    hero: {
      badge: 'Премиальное обучение',
      title: <>Изучайте русский на<br />самой увлекательной<br />платформе</>,
      description: 'Интерактивные уроки, живые преподаватели и активное сообщество учеников. Начните путь к свободному русскому уже сегодня в профессиональной среде без лишних отвлечений.',
      google: 'Google Play',
      appStore: 'App Store',
      soon: 'скоро',
      learners: '10 000+ серьезных учеников уже с нами',
    },
    featuresIntro: {
      title: 'Создано для серьезного обучения',
      description: 'Все, что нужно для освоения русского языка: сильная методика и удобный цифровой формат.',
    },
    features: {
      teachers: ['Живые преподаватели', 'Общайтесь с сертифицированными преподавателями и получайте персональную обратную связь в реальном времени.'],
      exercises: ['Интерактивные задания', 'Короткие и увлекательные уроки помогают легче разбирать сложную грамматику.'],
      speaking: ['Практика речи', 'Технологии распознавания речи помогают улучшать произношение и акцент.'],
      progress: ['Отслеживание прогресса', 'Видьте свой рост через аналитику и учебные маршруты под ваши цели.'],
      certificates: ['Сертификаты курса', 'Получайте подтвержденные сертификаты и показывайте свой уровень работодателям.'],
      community: ['Чат сообщества', 'Практикуйтесь с другими учениками, задавайте вопросы и учитесь в поддерживающей среде.'],
    },
    certificate: {
      title: 'Официальная сертификация',
      description: 'Ученики получают практические навыки общения на русском, подтвержденные достижения и больше карьерных возможностей благодаря международно ориентированной системе сертификатов.',
    },
    pricingIntro: {
      title: 'Выберите свой путь',
      description:
        'Гибкие тарифы для вашего пути обучения — от первых шагов до свободного владения языком.',
    },
    pricing: {
      recommended: 'РЕКОМЕНДУЕМ',
      currency: ' сум',
      free: {
        name: 'Freemium',
        price: '0',
        period: '/мес',
        items: ['Доступ к базовой программе', 'Введение в грамматику'],
        muted: ['Сертификация'],
        button: 'Выбрать базовый',
      },
      pro: {
        name: 'Pro',
        price: '299 000',
        period: '/год',
        items: ['Официальный сертификат', 'Продвинутая программа', 'Грамматика, аудирование, письмо', 'Ежедневные задания'],
        muted: [],
        button: 'Выбрать Pro',
      },
      elite: {
        name: 'Elite',
        price: '99 000',
        period: '/мес',
        items: ['Сертификация', 'Грамматика, аудирование, письмо', 'Онлайн-преподаватели', 'Групповые занятия каждую неделю'],
        muted: [],
        button: 'Выбрать Elite',
      },
    },
    faq: { title: 'Часто задаваемые вопросы' },
    about: {
      title: 'О нашем проекте',
      description:
        'FalaRus — современная платформа для изучения русского языка, созданная для людей из Центральной Азии. Мы объединяем интерактивные уроки, профессиональных преподавателей и реальную разговорную практику. Наша миссия — сделать обучение доступным, увлекательным и ориентированным на карьеру.',
    },
    founder: {
      name: 'Фармон Омонов',
      role: 'Основатель и CEO',
      bio: 'Я из Самарканда. Пять лет учился в России и хорошо понимаю, с какими трудностями сталкиваются узбекские мигранты и их дети при изучении русского языка. Я обучал русскому людей, которым язык нужен для работы, учебы и жизни в России, поэтому знаю, как объяснять простыми словами и что действительно нужно на практике. FalaRus создан, чтобы помочь подготовиться к русскому языку, экзамену на патент и ВНЖ без лишней путаницы.',
    },
    support: {
      title: 'Поддержка',
      name: 'Имя',
      surname: 'Фамилия',
      phone: 'Телефон',
      email: 'Email',
      description: 'Описание',
      placeholder: 'расскажите о себе',
      send: 'Отправить',
      termsAgree: 'Создавая аккаунт, я соглашаюсь с Условиями использования и Политикой конфиденциальности',
      haveAccount: 'Уже есть аккаунт?',
      loginLink: 'Войти',
      teacherTitle: 'Ищем преподавателя',
      teacherText:
        'FalaRus ищет увлеченных и опытных преподавателей русского языка, готовых вдохновлять, обучать и поддерживать студентов в современной онлайн-среде.',
    },
    footer: {
      address: <>Falarus, обучение русскому языку<br />2055 Something street at 23<br />Uzbekistan x72004</>,
      about: 'О нас',
      aboutLinks: ['Обзор', 'Исторические места', 'Партнеры', 'Контакты'],
      privacy: 'Политика',
      privacyLinks: ['Условия', 'Карта сайта', 'Данные компании', 'Правила и условия'],
      contacts: 'Связаться',
      copyright: '© 2026 Voyage Inc. Все права защищены.',
    },
    mobile: {
      badge: 'Учись через интересные игры',
      titleTop: 'Изучайте',
      titleMiddle: 'русский',
      titleAccent: 'легко',
      subtitle: '182-дневный план, живые преподаватели и официальный сертификат.',
      register: 'Регистрация',
      safePayment: '— безопасная оплата',
      tiles: {
        games: 'Учись через игры',
        speak: 'Говори с первого урока',
        lessons: 'Короткие, понятные уроки',
        daily: 'Новые задания каждый день',
      },
      certificateCaption: 'ОФИЦИАЛЬНЫЙ СЕРТИФИКАТ',
      certificateTitle: 'После курса — документ на ваше имя',
    },
  },
  uz: {
    nav: { home: 'Bosh sahifa', about: 'Biz haqimizda', certificates: 'Sertifikatlar', pricing: 'Tariflar', contact: 'Bog‘lanish' },
    auth: { signIn: 'Ro‘yxatdan o‘tish', login: 'Kirish' },
    hero: {
      badge: 'Premium ta’lim tajribasi',
      title: <>Rus tilini dunyodagi<br />eng qiziqarli platformada<br />o‘rganing</>,
      description: 'Interaktiv darslar, jonli o‘qituvchilar va faol o‘quvchilar hamjamiyati. Bugunoq professional va chalg‘itmaydigan muhitda ravon so‘zlash sari yo‘l boshlang.',
      google: 'Google Play',
      appStore: 'App Store',
      soon: 'tez kunda',
      learners: '10 000+ jiddiy o‘quvchi biz bilan',
    },
    featuresIntro: {
      title: 'Jiddiy o‘quvchilar uchun yaratilgan',
      description: 'Rus tilini o‘zlashtirish uchun kerakli hamma narsa: kuchli metodika va qulay raqamli dizayn.',
    },
    features: {
      teachers: ['Jonli o‘qituvchilar', 'Sertifikatlangan o‘qituvchilar bilan bog‘laning va real vaqtda shaxsiy fikr-mulohaza oling.'],
      exercises: ['Interaktiv mashqlar', 'Qisqa va qiziqarli darslar murakkab grammatikani osonroq o‘zlashtirishga yordam beradi.'],
      speaking: ['Gapirish amaliyoti', 'Nutqni aniqlash texnologiyasi talaffuz va aksentni yaxshilashga yordam beradi.'],
      progress: ['Progress nazorati', 'Tahlillar va maqsadingizga mos o‘quv yo‘li orqali o‘sishingizni kuzating.'],
      certificates: ['Kurs sertifikatlari', 'Tasdiqlangan sertifikatlarni oling va darajangizni ish beruvchilarga ko‘rsating.'],
      community: ['Hamjamiyat chati', 'Boshqa o‘quvchilar bilan mashq qiling, savol bering va qo‘llab-quvvatlovchi muhitda o‘rganing.'],
    },
    certificate: {
      title: 'Rasmiy sertifikatlash',
      description: 'O‘quvchilar rus tilida amaliy muloqot ko‘nikmalarini, tasdiqlangan yutuqlarni va xalqaro ruhdagi sertifikat tizimi orqali kuchliroq karera imkoniyatlarini qo‘lga kiritadi.',
    },
    pricingIntro: {
      title: 'O‘zingizga mos yo‘lni tanlang',
      description:
        'O‘qish safaringizni qo‘llab-quvvatlovchi moslashuvchan tariflar — boshlang‘ichdan erkin so‘zlashgacha.',
    },
    pricing: {
      recommended: 'TAVSIYA ETILADI',
      currency: ' so‘m',
      free: {
        name: 'Freemium',
        price: '0',
        period: '/oy',
        items: ['Asosiy dasturga kirish', 'Grammatika kirish qismi'],
        muted: ['Sertifikatlash'],
        button: 'Asosiy tarifni tanlash',
      },
      pro: {
        name: 'Pro',
        price: '299 000',
        period: '/yil',
        items: ['Rasmiy sertifikat', 'Kengaytirilgan dastur', 'Grammatika, tinglash, yozish', 'Kunlik mashqlar'],
        muted: [],
        button: 'Pro tarifini tanlash',
      },
      elite: {
        name: 'Elite',
        price: '99 000',
        period: '/oy',
        items: ['Sertifikatlash', 'Grammatika, tinglash, yozish', 'Onlayn o‘qituvchilar', 'Har hafta guruh darslari'],
        muted: [],
        button: 'Elite tarifini tanlash',
      },
    },
    faq: { title: 'Ko‘p beriladigan savollar' },
    about: {
      title: 'Loyiha haqida',
      description:
        'FalaRus — Markaziy Osiyodagi insonlarga rus tilini interaktiv darslar, professional o‘qituvchilar va real muloqot amaliyoti orqali o‘rgatishga bag‘ishlangan zamonaviy platforma. Bizning missiyamiz — ta’limni har bir o‘quvchi uchun qulay, qiziqarli va kasbiy yo‘nalishga bog‘lash.',
    },
    founder: {
      name: 'Omonov Farmon',
      role: 'Asoschi va CEO',
      bio: 'Men Samarqanddanman. 5 yil Rossiyada o‘qiganman va o‘zbek migrantlari hamda ularning farzandlari rus tilini o‘rganishda qanday qiyinchiliklarga duch kelishini yaxshi bilaman. Men rus tilini ish, o‘qish va Rossiyadagi hayot uchun kerak bo‘lgan odamlarga o‘rgatganman. Shuning uchun nimani qanday tushuntirish kerakligini, patent va VNZh imtihonlariga tayyorlanishda nimalar muhimligini amaliy tajribadan bilaman. FalaRus shu tajriba asosida yaratilgan.',
    },
    support: {
      title: 'Qo‘llab-quvvatlash',
      name: 'Ism',
      surname: 'Familiya',
      phone: 'Telefon',
      email: 'Email',
      description: 'Tavsif',
      placeholder: 'o‘zingiz haqingizda yozing',
      send: 'Yuborish',
      termsAgree: 'Hisob yaratish orqali Foydalanish shartlari va Maxfiylik siyosatiga roziman',
      haveAccount: 'Hisobingiz bormi?',
      loginLink: 'Kirish',
      teacherTitle: 'O‘qituvchi qidiryapmiz',
      teacherText:
        'FalaRus zamonaviy onlayn ta’limda talabalarni ilhomlantirish, o‘qitish va qo‘llab-quvvatlashga tayyor tajribali rus tili o‘qituvchilarini qidirmoqda.',
    },
    footer: {
      address: <>Falarus rus tili ta’limi<br />2055 Something street at 23<br />Uzbekistan x72004</>,
      about: 'Biz haqimizda',
      aboutLinks: ['Ko‘rish', 'Tarixiy joylar', 'Hamkorlar', 'Kontaktlar'],
      privacy: 'Maxfiylik siyosati',
      privacyLinks: ['Shartlar', 'Sayt xaritasi', 'Kompaniya ma’lumotlari', 'Qoidalar va shartlar'],
      contacts: 'Aloqa',
      copyright: '© 2026 Voyage Inc. Barcha huquqlar himoyalangan.',
    },
    mobile: {
      badge: 'Qiziqarli o‘yinlar bilan o‘rganing',
      titleTop: 'Rus tilini',
      titleMiddle: 'ishonch bilan',
      titleAccent: 'o‘rganing',
      subtitle: '182 kunlik aniq reja, jonli o‘qituvchilar va rasmiy sertifikat.',
      register: 'Ro‘yxatdan o‘tish',
      safePayment: 'bilan xavfsiz to‘lov',
      tiles: {
        games: 'O‘yinlar orqali o‘rganing',
        speak: 'Birinchi darsdan gapiring',
        lessons: 'Qisqa, tushunarli darslar',
        daily: 'Har kuni yangi mashqlar',
      },
      certificateCaption: 'RASMIY SERTIFIKAT',
      certificateTitle: 'Kursni tugatgach — nomingizga hujjat',
    },
  },
  tg: {
    nav: { home: 'Асосӣ', about: 'Дар бораи мо', certificates: 'Сертификатҳо', pricing: 'Нархҳо', contact: 'Тамос' },
    auth: { signIn: 'Сабти ном', login: 'Ворид шудан' },
    hero: {
      badge: 'Таҷрибаи омӯзиши премиум',
      title: <>Забони русиро дар<br />платформаи ҷолибтарин<br />омӯзед</>,
      description: 'Дарсҳои интерактивӣ, омӯзгорони зинда ва ҷомеаи фаъоли донишомӯзон. Имрӯз роҳи худро ба суханронии озод дар муҳити касбӣ оғоз кунед.',
      google: 'Google Play',
      appStore: 'App Store',
      soon: 'ба зудӣ',
      learners: '10 000+ донишомӯзи ҷиддӣ бо мо ҳастанд',
    },
    featuresIntro: {
      title: 'Барои омӯзандагони ҷиддӣ сохта шудааст',
      description: 'Ҳама чиз барои аз худ кардани русӣ: методикаи қавӣ ва тарҳи рақамии қулай.',
    },
    features: {
      teachers: ['Омӯзгорони зинда', 'Бо омӯзгорони сертификатдор пайваст шавед ва фикру маслиҳати шахсӣ гиред.'],
      exercises: ['Машқҳои интерактивӣ', 'Дарсҳои кӯтоҳ ва ҷолиб омӯзиши грамматикаи мураккабро осон мекунанд.'],
      speaking: ['Машқи гуфтор', 'Технологияи шинохти нутқ ба беҳтар кардани талаффуз ва аксент кӯмак мекунад.'],
      progress: ['Пайгирии пешрафт', 'Пешрафти худро тавассути таҳлил ва роҳҳои омӯзишии мувофиқ бинед.'],
      certificates: ['Сертификатҳои курс', 'Сертификатҳои тасдиқшуда гиред ва сатҳи худро ба корфармоён нишон диҳед.'],
      community: ['Чати ҷомеа', 'Бо дигар донишомӯзон машқ кунед, савол диҳед ва дар муҳити дастгиркунанда омӯзед.'],
    },
    certificate: {
      title: 'Сертификатсияи расмӣ',
      description: 'Донишомӯзон малакаҳои амалии муоширати русӣ, дастовардҳои тасдиқшуда ва имкониятҳои беҳтари касбиро тавассути системаи сертификатсияи байналмилалӣ ба даст меоранд.',
    },
    pricingIntro: {
      title: 'Роҳи худро интихоб кунед',
      description:
        'Нақшаҳои мосишуда барои сафари омӯзиши шумо — аз оғоз то равонии комил.',
    },
    pricing: {
      recommended: 'ТАВСИЯ МЕШАВАД',
      currency: ' сом',
      free: {
        name: 'Freemium',
        price: '0',
        period: '/моҳ',
        items: ['Дастрасӣ ба барномаи асосӣ', 'Муқаддимаи грамматика'],
        muted: ['Сертификатсия'],
        button: 'Интихоби асосӣ',
      },
      pro: {
        name: 'Pro',
        price: '299 000',
        period: '/сол',
        items: ['Сертификати расмӣ', 'Барномаи пешрафта', 'Грамматика, шунавоӣ, навиштан', 'Машқҳои ҳаррӯза'],
        muted: [],
        button: 'Интихоби Pro',
      },
      elite: {
        name: 'Elite',
        price: '99 000',
        period: '/моҳ',
        items: ['Сертификатсия', 'Грамматика, шунавоӣ, навиштан', 'Омӯзгорони онлайн', 'Дарсҳои гурӯҳӣ ҳар ҳафта'],
        muted: [],
        button: 'Интихоби Elite',
      },
    },
    faq: { title: 'Саволҳои зиёд такроршаванда' },
    about: {
      title: 'Дар бораи лоиҳа',
      description:
        'FalaRus платформаи муосири омӯзиши забони русӣ мебошад, ки ба одамони Осиёи Марказӣ тавассути дарсҳои интерактивӣ, омӯзгорони касбӣ ва машқи воқеии муошират кӯмак мекунад. Миссияи мо — таълимро барои ҳар омӯзанда дастрас, ҷолиб ва самаранок гардонидан аст.',
    },
    founder: {
      name: 'Фармон Омонов',
      role: 'Муассис ва CEO',
      bio: 'Ман аз Самарқанд ҳастам. 5 сол дар Русия таҳсил кардаам ва хуб медонам, ки муҳоҷирони узбек ва фарзандони онҳо ҳангоми омӯзиши забони русӣ бо чӣ душвориҳо рӯ ба рӯ мешаванд. Ман ба одамоне русиро омӯзондаам, ки ин забон барои кор, таҳсил ва зиндагӣ дар Русия лозим буд. Аз ҳамин таҷриба медонам, ки чӣ гуна содда фаҳмондан ва барои имтиҳони патенту РМА чӣ чизҳо муҳиманд. FalaRus бар асоси ҳамин таҷриба сохта шудааст.',
    },
    support: {
      title: 'Дастгирӣ',
      name: 'Ном',
      surname: 'Насаб',
      phone: 'Телефон',
      email: 'Email',
      description: 'Тавсиф',
      placeholder: 'дар бораи худ нависед',
      send: 'Фиристодан',
      termsAgree: 'Бо эҷоди ҳисоб ман ба Шартҳои истифода ва Сиёсати махфият розӣ ҳастам',
      haveAccount: 'Ҳисоб доред?',
      loginLink: 'Ворид шудан',
      teacherTitle: 'Омӯзгор меҷӯем',
      teacherText:
        'FalaRus омӯзгорони ботаҷриба ва дилгарми забони русиро меҷӯяд, ки омодаанд донишҷӯёнро дар муҳити муосири онлайн илҳом бахшанд ва дастгирӣ кунанд.',
    },
    footer: {
      address: <>Falarus омӯзиши забони русӣ<br />2055 Something street at 23<br />Uzbekistan x72004</>,
      about: 'Дар бораи мо',
      aboutLinks: ['Шарҳ', 'Ҷойҳои таърихӣ', 'Шарикон', 'Тамосҳо'],
      privacy: 'Сиёсати махфият',
      privacyLinks: ['Шартҳо', 'Харитаи сайт', 'Маълумоти ширкат', 'Қоидаҳо ва шартҳо'],
      contacts: 'Тамос',
      copyright: '© 2026 Voyage Inc. Ҳама ҳуқуқҳо ҳифз шудаанд.',
    },
    mobile: {
      badge: 'Бо бозиҳои шавқовар омӯзед',
      titleTop: 'Русиро',
      titleMiddle: 'бо боварӣ',
      titleAccent: 'омӯзед',
      subtitle: 'Барномаи 182-рӯза, омӯзгорони зинда ва сертификати расмӣ.',
      register: 'Сабти ном',
      safePayment: '— пардохти бехатар',
      tiles: {
        games: 'Тавассути бозиҳо омӯзед',
        speak: 'Аз дарси якум гап занед',
        lessons: 'Дарсҳои кӯтоҳ, равшан',
        daily: 'Ҳар рӯз машқи нав',
      },
      certificateCaption: 'СЕРТИФИКАТИ РАСМӢ',
      certificateTitle: 'Пас аз курс — ҳуҷҷат ба номи шумо',
    },
  },
  en: {
    nav: { home: 'Home', about: 'About us', certificates: 'Certificates', pricing: 'Pricing', contact: 'Contact us' },
    auth: { signIn: 'Sign in', login: 'Log in' },
    hero: {
      badge: 'Premium Learning Experience',
      title: <>Master Russian with<br />the World's Most<br />Engaging Platform</>,
      description: 'Interactive lessons, live teachers, and a vibrant community of learners. Start your fluency journey today in a distraction-free, professional environment.',
      google: 'Google Play',
      appStore: 'App Store',
      soon: 'soon',
      learners: 'Join 10,000+ serious learners',
    },
    featuresIntro: {
      title: 'Designed for Serious Learners',
      description: 'Everything you need to master Russian, combining rigorous academic methodology with engaging digital design.',
    },
    features: {
      teachers: ['Live Teachers', 'Connect with certified native speakers for real-time guidance and personalized feedback.'],
      exercises: ['Interactive Exercises', 'Engaging, bite-sized lessons that make mastering complex grammar rules feel effortless.'],
      speaking: ['Speaking Practice', 'Advanced speech recognition technology helps perfect your pronunciation and accent.'],
      progress: ['Progress Tracking', 'Visualize your journey with detailed analytics and customized learning paths based on your goals.'],
      certificates: ['Course Certificates', 'Earn verified certificates upon completion to showcase your proficiency to employers.'],
      community: ['Community Chat', 'Practice with peers, ask questions, and immerse yourself in a supportive learning community.'],
    },
    certificate: {
      title: 'Formal Certification',
      description: 'Students gain practical Russian communication skills, verified achievements, and stronger career opportunities through an internationally inspired certification system and structured learning experience.',
    },
    pricingIntro: {
      title: 'Choose Your Path',
      description:
        "Flexible plans designed to support your learning journey, whether you're just starting out or aiming for absolute fluency.",
    },
    pricing: {
      recommended: 'RECOMMENDED',
      currency: ' SUM',
      free: {
        name: 'Freemium',
        price: '0',
        period: '/mo',
        items: ['Core Curriculum Access', 'Grammar Introduction'],
        muted: ['Certification'],
        button: 'Select Basic',
      },
      pro: {
        name: 'Pro',
        price: '299.000',
        period: '/year',
        items: ['Official Certification', 'Advanced Curriculum', 'Grammar, listening, writing', 'Daily Exercises'],
        muted: [],
        button: 'Select pro',
      },
      elite: {
        name: 'Elite',
        price: '99.000',
        period: '/mo',
        items: ['Certification', 'Grammar, listening, writing', 'Online teachers', 'Group Sessions every week'],
        muted: [],
        button: 'Select Elite',
      },
    },
    faq: { title: 'Frequently asked questions' },
    about: {
      title: 'About Our Project',
      description:
        'FalaRus is a modern language learning platform dedicated to helping people across Central Asia learn Russian through interactive lessons, professional teachers, and real communication practice. Our mission is to make language education accessible, engaging, and career-oriented for every learner.',
    },
    founder: {
      name: 'Farmon Omonov',
      role: 'Founder and CEO',
      bio: 'I am from Samarkand. I studied in Russia for five years, so I understand the real challenges Uzbek migrants and their children face when learning Russian. I have taught Russian to people who needed it for work, study, and everyday life in Russia. That experience showed me what to explain first, how to make difficult topics simple, and what matters most when preparing for patent and residence permit exams. FalaRus was built from that practical experience.',
    },
    support: {
      title: 'Support',
      name: 'Name',
      surname: 'Surname',
      phone: 'Phone',
      email: 'Email',
      description: 'Description',
      placeholder: 'write about yourself',
      send: 'Send',
      termsAgree: 'By creating an account, I agree to our Terms of use and Privacy Policy',
      haveAccount: 'Have an account?',
      loginLink: 'Log in',
      teacherTitle: 'Looking for a teacher',
      teacherText:
        'FalaRus is currently looking for passionate and experienced Russian language teachers who are ready to inspire, educate, and support students through modern online learning experiences.',
    },
    footer: {
      address: <>Falarus Learning Russian language<br />2055 Something street at 23<br />Uzbekistan x72004</>,
      about: 'About us',
      aboutLinks: ['Explore', 'Historical Places', 'Partners', 'Contacts', 'YOLL Uzbekistan Travel'],
      privacy: 'Privacy policy',
      privacyLinks: ['Terms', 'Sitemap', 'Company Details', 'Terms and conditions'],
      contacts: 'Contact us',
      copyright: '© 2026 Voyage Inc. All rights reserved.',
    },
    mobile: {
      badge: 'Learn with fun games',
      titleTop: 'Master',
      titleMiddle: 'Russian',
      titleAccent: 'the fun way',
      subtitle: '182-day plan, live teachers and an official certificate.',
      register: 'Sign up',
      safePayment: '— secure payment',
      tiles: {
        games: 'Learn through games',
        speak: 'Speak from day one',
        lessons: 'Short, clear lessons',
        daily: 'New exercises every day',
      },
      certificateCaption: 'OFFICIAL CERTIFICATE',
      certificateTitle: 'Finish the course, get a signed certificate',
    },
  },
  kk: {
    nav: { home: 'Басты', about: 'Біз туралы', certificates: 'Сертификаттар', pricing: 'Тарифтер', contact: 'Байланыс' },
    auth: { signIn: 'Тіркелу', login: 'Кіру' },
    hero: {
      badge: 'Премиум оқу тәжірибесі',
      title: <>Орыс тілін әлемдегі<br />ең қызықты платформада<br />үйреніңіз</>,
      description:
        'Интерактивті сабақтар, тірі мұғалімдер және белсенді оқушылар қауымдастығы. Бүгін-ақ кәсіби ортада сөйлеу жолын бастаңыз.',
      google: 'Google Play',
      appStore: 'App Store',
      soon: 'жақында',
      learners: '10 000+ оқушы бізбен',
    },
    featuresIntro: {
      title: 'Маңызды оқу үшін жасалған',
      description: 'Орыс тілін меңгеруге қажеттінің бәрі: мықты әдістеме және ыңғайлы цифрлық дизайн.',
    },
    features: {
      teachers: ['Тірі мұғалімдер', 'Сертификатталған мұғалімдермен байланысып, нақты уақытта жеке кері байланыс алыңыз.'],
      exercises: ['Интерактивті тапсырмалар', 'Қысқа қызықты сабақтар күрделі грамматиканы жеңілдетеді.'],
      speaking: ['Сөйлеу практикасы', 'Сөйлеуді тану технологиясы дыбысты жақсартады.'],
      progress: ['Прогресс бақылауы', 'Талдау және жеке оқу жолы арқылы өсуіңізді көріңіз.'],
      certificates: ['Курс сертификаттары', 'Расталған сертификаттармен деңгейіңізді көрсетіңіз.'],
      community: ['Қауымдастық чаты', 'Құрдастарыңызбен тәжірибе жасап, сұрақ қойыңыз.'],
    },
    certificate: {
      title: 'Ресми сертификаттау',
      description:
        'Оқушылар практикалық орыс тілі дағдыларын, расталған жетістіктерін және халықаралық сертификаттау жүйесі арқылы мансап мүмкіндіктерін алады.',
    },
    pricingIntro: {
      title: 'Өз жолыңызды таңдаңыз',
      description: 'Оқу сапарыңызға арналған икемді тарифтер — бастапқыдан еркін сөйлеуге дейін.',
    },
    pricing: {
      recommended: 'ҰСЫНЫЛАДЫ',
      currency: ' сум',
      free: { name: 'Freemium', price: '0', period: '/ай', items: ['Негізгі бағдарлама', 'Грамматика кіріспесі'], muted: ['Сертификаттау'], button: 'Негізгіні таңдау' },
      pro: { name: 'Pro', price: '299 000', period: '/жыл', items: ['Ресми сертификат', 'Кеңейтілген бағдарлама', 'Грамматика, тыңдау, жазу', 'Күнделікті тапсырмалар'], muted: [], button: 'Pro таңдау' },
      elite: { name: 'Elite', price: '99 000', period: '/ай', items: ['Сертификаттау', 'Грамматика, тыңдау, жазу', 'Онлайн мұғалімдер', 'Апталық топ сабақтары'], muted: [], button: 'Elite таңдау' },
    },
    faq: { title: 'Жиі қойылатын сұрақтар' },
    about: {
      title: 'Жоба туралы',
      description:
        'FalaRus — Орталық Азиядағы адамдарға орыс тілін интерактивті сабақтар, кәсіби мұғалімдер және нақты сөйлесу арқылы үйрететін заманауи платформа. Біздің миссиямыз — білім беруді қолжетімді, қызықты және мансапқа бағытталған ету.',
    },
    founder: {
      name: 'Фармон Омонов',
      role: 'Негізін қалаушы және CEO',
      bio: 'Мен Самарқандтанмын. Ресейде 5 жыл оқыдым, сондықтан өзбек мигранттары мен олардың балалары орыс тілін үйренгенде қандай қиындықтарға кездесетінін жақсы түсінемін. Мен орыс тілін жұмыс, оқу және Ресейдегі күнделікті өмір үшін қажет адамдарға үйреттім. Осы тәжірибе арқылы күрделі тақырыпты қалай қарапайым түсіндіруді және патент пен тұруға рұқсат емтихандарына дайындықта ненің маңызды екенін білемін. FalaRus осы тәжірибе негізінде жасалды.',
    },
    support: {
      title: 'Қолдау',
      name: 'Аты',
      surname: 'Тегі',
      phone: 'Телефон',
      email: 'Email',
      description: 'Сипаттама',
      placeholder: 'өзіңіз туралы жазыңыз',
      send: 'Жіберу',
      termsAgree: 'Тіркелу арқылы Пайдалану шарттары мен Құпиялылық саясатына келісемін',
      haveAccount: 'Аккаунтыңыз бар ма?',
      loginLink: 'Кіру',
      teacherTitle: 'Мұғалім іздейміз',
      teacherText: 'FalaRus заманауи онлайн оқытуда студенттерді шабыттандыратын тәжірибелі орыс тілі мұғалімдерін іздейді.',
    },
    footer: {
      address: <>Falarus орыс тілі<br />2055 Something street at 23<br />Uzbekistan x72004</>,
      about: 'Біз туралы',
      aboutLinks: ['Шолу', 'Тарихи орындар', 'Серіктестер', 'Байланыс', 'YOLL Uzbekistan Travel'],
      privacy: 'Құпиялылық',
      privacyLinks: ['Шарттар', 'Сайт картасы', 'Компания', 'Ережелер'],
      contacts: 'Байланыс',
      copyright: '© 2026 Voyage Inc. Барлық құқықтар қорғалған.',
    },
    mobile: {
      badge: 'Қызықты ойындармен үйреніңіз',
      titleTop: 'Орыс тілін',
      titleMiddle: 'сеніммен',
      titleAccent: 'үйреніңіз',
      subtitle: '182 күндік жоспар, тірі мұғалімдер және ресми сертификат.',
      register: 'Тіркелу',
      safePayment: '— қауіпсіз төлем',
      tiles: {
        games: 'Ойын арқылы үйреніңіз',
        speak: 'Бірінші сабақтан сөйлеңіз',
        lessons: 'Қысқа, түсінікті сабақтар',
        daily: 'Күн сайын жаңа тапсырма',
      },
      certificateCaption: 'РЕСМИ СЕРТИФИКАТ',
      certificateTitle: 'Курс аяқталғанда — атыңызға құжат',
    },
  },
  ky: {
    nav: { home: 'Башкы', about: 'Биз жөнүндө', certificates: 'Сертификаттар', pricing: 'Тарифтер', contact: 'Байланыш' },
    auth: { signIn: 'Катталуу', login: 'Кирүү' },
    hero: {
      badge: 'Премиум окуу тажрыйбасы',
      title: <>Орус тилин дүйнөдөгү<br />эң кызыктуу платформада<br />үйрөнүңүз</>,
      description:
        'Интерактивдүү сабактар, түз эфирдеги мугалимдер жана активдүү окуучулар коому. Бүгүн эле кесипкөй чөйрөдө сүйлөө жолун баштаңыз.',
      google: 'Google Play',
      appStore: 'App Store',
      soon: 'жакында',
      learners: '10 000+ окуучу биз менен',
    },
    featuresIntro: {
      title: 'Олуттуу окуу үчүн түзүлгөн',
      description: 'Орус тилин өздөштүрүү үчүн керектүү нерселердин баары: мыкты методика жана ыңгайлуу дизайн.',
    },
    features: {
      teachers: ['Түз эфирдеги мугалимдер', 'Сертификатталган мугалимдер менен байланышып, жеке пикир алыңыз.'],
      exercises: ['Интерактивдүү тапшырмалар', 'Кыска кызыктуу сабактар татаал грамматиканы жеңилдетет.'],
      speaking: ['Сүйлөө практикасы', 'Сүйлөмдү таануу технологиясы айтылышты жакшыртат.'],
      progress: ['Прогресс көзөмөлү', 'Аналитика жана жеке окуу жолу аркылуу өсүңүздү көрүңүз.'],
      certificates: ['Курс сертификаттары', 'Ырасталган сертификаттар менен деңгээлиңизди көрсөтүңүз.'],
      community: ['Коомчулук чаты', 'Шериктериңиз менен практика кылып, суроо бериңиз.'],
    },
    certificate: {
      title: 'Расмий сертификация',
      description:
        'Окуучулар практикалык орус тили көндүмдөрүн, ырасталган жетишкендиктерин жана эл аралык сертификация системасы аркылуу мансап мүмкүнчүлүктөрүн алат.',
    },
    pricingIntro: {
      title: 'Өз жолуңузду тандаңыз',
      description: 'Окуу сапарыңызга ылайык ийремдуу тарифтер — башталыштан эркин сүйлөөгө чейин.',
    },
    pricing: {
      recommended: 'СУНУШТАЛАТ',
      currency: ' сум',
      free: { name: 'Freemium', price: '0', period: '/ай', items: ['Негизги программа', 'Грамматика киришүүсү'], muted: ['Сертификация'], button: 'Негизгисин тандоо' },
      pro: { name: 'Pro', price: '299 000', period: '/жыл', items: ['Расмий сертификат', 'Кеңейтилген программа', 'Грамматика, угуу, жазуу', 'Күнүмдүк тапшырмалар'], muted: [], button: 'Pro тандоо' },
      elite: { name: 'Elite', price: '99 000', period: '/ай', items: ['Сертификация', 'Грамматика, угуу, жазуу', 'Онлайн мугалимдер', 'Жумалык топтор'], muted: [], button: 'Elite тандоо' },
    },
    faq: { title: 'Көп берилген суроолор' },
    about: {
      title: 'Долбоор жөнүндө',
      description:
        'FalaRus — Борбордук Азиядагы адамдарга орус тилин интерактивдүү сабактар, адистер жана чыныгы сүйлөшүү аркылуу үйрөткөн заманбап платформа. Биздин миссиябыз — билим берүүнү жеткиликтүү, кызыктуу жана мансапка багытталган кылуу.',
    },
    founder: {
      name: 'Фармон Омонов',
      role: 'Негиздөөчү жана CEO',
      bio: 'Мен Самаркандданмын. Россияда 5 жыл окудум, ошондуктан өзбек мигранттары жана алардын балдары орус тилин үйрөнүүдө кандай кыйынчылыктарга туш болорун жакшы түшүнөм. Мен орус тилин жумуш, окуу жана Россиядагы күнүмдүк жашоо үчүн керек болгон адамдарга үйрөткөм. Ошол тажрыйба мага татаал темаларды жөнөкөй түшүндүрүүнү жана патент, жашоо уруксаты экзамендерине даярданууда эмнелер маанилүү экенин көрсөттү. FalaRus ушул практикалык тажрыйбанын негизинде түзүлгөн.',
    },
    support: {
      title: 'Колдоо',
      name: 'Аты',
      surname: 'Фамилиясы',
      phone: 'Телефон',
      email: 'Email',
      description: 'Сүрөттөмө',
      placeholder: 'өзүңүз жөнүндө жазыңыз',
      send: 'Жөнөтүү',
      termsAgree: 'Каттоо менен Колдонуу шарттары жана Купуялуулук саясатына макулмун',
      haveAccount: 'Аккаунтуңуз барбы?',
      loginLink: 'Кирүү',
      teacherTitle: 'Мугалим издейбиз',
      teacherText: 'FalaRus заманбап онлайн окутууда студенттерди шыктандырган тажрыйбалуу орус тили мугалимдерин издейт.',
    },
    footer: {
      address: <>Falarus орус тили<br />2055 Something street at 23<br />Uzbekistan x72004</>,
      about: 'Биз жөнүндө',
      aboutLinks: ['Обзор', 'Тарыхый жайлар', 'Өнөктөштер', 'Байланыш', 'YOLL Uzbekistan Travel'],
      privacy: 'Купуялуулук',
      privacyLinks: ['Шарттар', 'Сайт картасы', 'Компания', 'Эрежелер'],
      contacts: 'Байланыш',
      copyright: '© 2026 Voyage Inc. Бардык укуктар корголгон.',
    },
    mobile: {
      badge: 'Кызыктуу оюндар менен үйрөнүңүз',
      titleTop: 'Орус тилин',
      titleMiddle: 'ишенимдүү',
      titleAccent: 'үйрөнүңүз',
      subtitle: '182 күндүк план, түз эфирдеги мугалимдер жана расмий сертификат.',
      register: 'Катталуу',
      safePayment: '— коопсуз төлөм',
      tiles: {
        games: 'Оюндар аркылуу үйрөнүңүз',
        speak: 'Биринчи сабактан сүйлөңүз',
        lessons: 'Кыска, түшүнүктүү сабактар',
        daily: 'Күн сайын жаңы машыгуу',
      },
      certificateCaption: 'РАСМИЙ СЕРТИФИКАТ',
      certificateTitle: 'Курстан кийин — атыңызга документ',
    },
  },
} satisfies Record<LanguageCode, {
  nav: Record<NavKey, string>;
  auth: { signIn: string; login: string };
  hero: { badge: string; title: ReactNode; description: string; google: string; appStore: string; soon: string; learners: string };
  featuresIntro: { title: string; description: string };
  features: Record<FeatureKey, readonly [string, string]>;
  certificate: { title: string; description: string };
  pricingIntro: { title: string; description: string };
  pricing: Record<PlanKey, { name: string; price: string; period: string; items: string[]; muted: string[]; button: string }> & {
    recommended: string;
    currency: string;
  };
  faq: { title: string };
  about: { title: string; description: string };
  founder: { name: string; role: string; bio: string };
  support: {
    title: string;
    name: string;
    surname: string;
    phone: string;
    email: string;
    description: string;
    placeholder: string;
    send: string;
    termsAgree: string;
    haveAccount: string;
    loginLink: string;
    teacherTitle: string;
    teacherText: string;
  };
  footer: { address: ReactNode; about: string; aboutLinks: string[]; privacy: string; privacyLinks: string[]; contacts: string; copyright: string };
  mobile: {
    badge: string;
    titleTop: string;
    titleMiddle: string;
    titleAccent: string;
    subtitle: string;
    register: string;
    safePayment: string;
    tiles: { games: string; speak: string; lessons: string; daily: string };
    certificateCaption: string;
    certificateTitle: string;
  };
}>;

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-5">
      <img src="/landing/falarus-mark.svg" alt="" className="h-9 w-12 shrink-0" />
      <span className={`text-2xl font-medium leading-none ${light ? 'text-white' : 'text-[#0B2A6B]'}`}>Falarus</span>
    </Link>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState<NavKey>('home');
  const [languageCode, setLanguageCode] = useState<LanguageCode>('uz');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  if (user) return <Navigate to="/" replace />;

  const language = languages.find((item) => item.code === languageCode) ?? languages[0];
  const t = copy[languageCode];
  const faqItems = faqItemsByLanguage[languageCode];
  const legalMeta = getLegalEntityMeta();
  const telHref = legalMeta.phone.replace(/\s/g, '');
  const selectLanguage = (code: LanguageCode) => {
    setLanguageCode(code);
    setLanguageMenuOpen(false);
  };
  const selectNav = (key: NavKey) => {
    setActiveNav(key);
    setMobileMenuOpen(false);
    setLanguageMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-app-bg font-sans text-app-text lg:bg-[#FDF8F2] lg:text-[#121827]">
      <header className="sticky top-0 z-30 hidden h-[76px] bg-white lg:block">
        <div className="mx-auto flex h-full max-w-[1728px] items-center justify-between px-5 sm:px-10 lg:px-24">
          <Brand />
          <nav className="hidden items-center gap-10 text-base font-semibold text-[#4D4D4D] lg:flex">
            {navItems.map((item) => (
              <a
                key={item.key}
                className={`pb-3 transition ${activeNav === item.key ? 'border-b border-[#121827] text-[#121827]' : 'border-b border-transparent'}`}
                href={item.href}
                onClick={() => selectNav(item.key)}
              >
                {t.nav[item.key]}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-7 text-base font-semibold lg:flex">
            <div className="relative">
              <button
                className="inline-flex items-center gap-2 rounded-[10px] px-2 py-2 transition hover:bg-[#F2F4F8]"
                type="button"
                aria-expanded={languageMenuOpen}
                onClick={() => setLanguageMenuOpen((open) => !open)}
              >
                <LangBadge code={language.badge} />
                {language.short}
                <ChevronDown className={`h-5 w-5 transition ${languageMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {languageMenuOpen && (
                <div className="absolute right-0 top-12 z-40 w-44 rounded-[10px] border border-[#DDE1E6] bg-white p-2 shadow-[0_18px_34px_rgba(15,23,42,0.12)]">
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left text-sm transition hover:bg-[#F2F4F8] ${language.code === item.code ? 'bg-[#F1F5F9] text-[#0B2A6B]' : 'text-[#121827]'}`}
                      type="button"
                      onClick={() => selectLanguage(item.code)}
                    >
                      <LangBadge code={item.badge} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link to="/register">{t.auth.signIn}</Link>
            <Link className="rounded-[10px] bg-[#1E3A8A] px-4 py-3 text-white transition hover:bg-[#183462]" to="/login">
              {t.auth.login}
            </Link>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <div className="relative">
              <button
                className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-[#C8DCF3] bg-[#F1F5F9] px-3 py-2 text-sm font-semibold text-[#0B2A6B]"
                type="button"
                aria-expanded={languageMenuOpen}
                aria-label="Tilni tanlash"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLanguageMenuOpen((open) => !open);
                }}
              >
                <LangBadge code={language.badge} />
                {language.short}
                <ChevronDown className={`h-4 w-4 transition ${languageMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {languageMenuOpen && (
                <div className="absolute right-0 top-12 z-50 w-44 rounded-[10px] border border-[#DDE1E6] bg-white p-2 shadow-[0_18px_34px_rgba(15,23,42,0.12)]">
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left text-sm transition hover:bg-[#F2F4F8] ${language.code === item.code ? 'bg-[#F1F5F9] text-[#0B2A6B]' : 'text-[#121827]'}`}
                      type="button"
                      onClick={() => selectLanguage(item.code)}
                    >
                      <LangBadge code={item.badge} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#1E3A8A] text-white"
              type="button"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => {
                setLanguageMenuOpen(false);
                setMobileMenuOpen((open) => !open);
              }}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="absolute left-0 top-[76px] w-full border-t border-[#DDE1E6] bg-white px-5 py-5 shadow-[0_18px_34px_rgba(15,23,42,0.12)] lg:hidden">
            <nav className="grid gap-1 text-base font-semibold">
              {navItems.map((item) => (
                <a
                  key={item.key}
                  className={`rounded-[10px] px-3 py-3 ${activeNav === item.key ? 'bg-[#F1F5F9] text-[#0B2A6B]' : 'text-[#4D4D4D]'}`}
                  href={item.href}
                  onClick={() => selectNav(item.key)}
                >
                  {t.nav[item.key]}
                </a>
              ))}
            </nav>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-semibold">
              <Link className="rounded-[10px] border border-[#DDE1E6] px-3 py-3 text-center" to="/register">
                {t.auth.signIn}
              </Link>
              <Link className="rounded-[10px] bg-[#1E3A8A] px-3 py-3 text-center text-white" to="/login">
                {t.auth.login}
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Mobile hero (< lg) */}
        <section
          id="home-mobile"
          className="relative overflow-hidden pb-[130px] text-white lg:hidden"
          style={{ background: 'linear-gradient(160deg, #0B2A6B 0%, #123A8F 60%, #0B2A6B 100%)' }}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-[180px] w-[180px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(199,154,62,0.35), transparent 70%)' }}
          />
          {/* Mobile header on hero */}
          <div className="relative z-10 flex items-center justify-between px-5 pb-2 pt-5">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img
                src="/landing/falarus-mark.svg"
                alt=""
                className="h-8 w-9 shrink-0"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <span className="text-[19px] font-extrabold leading-none text-white">FalaRus</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[12px] font-bold text-white ring-1 ring-white/20 backdrop-blur"
                  type="button"
                  aria-expanded={languageMenuOpen}
                  aria-label="Tilni tanlash"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setLanguageMenuOpen((open) => !open);
                  }}
                >
                  {language.label}
                  <ChevronDown className={`h-3.5 w-3.5 transition ${languageMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {languageMenuOpen && (
                  <div className="absolute right-0 top-11 z-50 w-44 rounded-[10px] border border-[#DDE1E6] bg-white p-2 shadow-[0_18px_34px_rgba(15,23,42,0.12)]">
                    {languages.map((item) => (
                      <button
                        key={item.code}
                        className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left text-sm transition hover:bg-[#F2F4F8] ${language.code === item.code ? 'bg-[#F1F5F9] text-[#0B2A6B]' : 'text-[#121827]'}`}
                        type="button"
                        onClick={() => selectLanguage(item.code)}
                      >
                        <LangBadge code={item.badge} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/20 backdrop-blur"
                type="button"
                aria-label="Menu"
                aria-expanded={mobileMenuOpen}
                onClick={() => {
                  setLanguageMenuOpen(false);
                  setMobileMenuOpen((open) => !open);
                }}
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Copy */}
          <div className="relative z-[2] px-[22px] pt-[22px]">
            <div
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold text-[#E7C578]"
              style={{
                borderColor: 'rgba(199,154,62,0.4)',
                background: 'rgba(199,154,62,0.16)',
              }}
            >
              <Star className="h-3.5 w-3.5 fill-[#E7C578] text-[#E7C578]" />
              {t.mobile.badge}
            </div>
            <h1 className="mt-4 text-[30px] font-extrabold leading-[1.12] tracking-[-0.02em] text-white">
              {t.mobile.titleTop}<br />{t.mobile.titleMiddle}<br />
              <span className="text-[#E7C578]">{t.mobile.titleAccent}</span>
            </h1>
            <p className="mt-2.5 max-w-[250px] text-[13.5px] font-semibold leading-[1.5] text-[#C6D2EE]">
              {t.mobile.subtitle}
            </p>
          </div>

          {/* Students */}
          <img
            src="/landing/hero-students.png"
            alt=""
            aria-hidden
            className="pointer-events-none relative z-[2] mx-auto mt-1.5 w-full max-h-[40dvh] object-contain object-bottom"
            style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.35))' }}
            decoding="async"
          />
        </section>

        {/* Floating CTA card — overlaps hero (LIGHT 1A) */}
        <div className="relative z-[5] -mt-[170px] px-[22px] lg:hidden">
          <div className="rounded-[22px] bg-white p-[18px] shadow-[0_24px_50px_-20px_rgba(11,42,107,0.4)]">
            <Link
              to="/register"
              className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[15px] bg-[#0B2A6B] text-[16px] font-extrabold text-white shadow-[0_14px_28px_-10px_rgba(11,42,107,0.5)] active:translate-y-0.5"
            >
              {t.mobile.register}
              <span aria-hidden>→</span>
            </Link>
            <Link
              to="/login"
              className="mt-2.5 flex h-[50px] w-full items-center justify-center rounded-[15px] border-[1.4px] border-[#DCE3F0] bg-white text-[15px] font-extrabold text-[#0B2A6B] active:bg-[#F5F7FB]"
            >
              {t.auth.login}
            </Link>
            <div className="mt-3.5 flex items-center justify-center gap-2 text-[11px] font-semibold text-[#8794AC]">
              <img src="/payment-logos/click-logo-new.png" alt="Click" className="h-4 w-auto" />
              <span aria-hidden className="text-[#C6CEDD]">·</span>
              <img src="/payment-logos/rahmat-logo.png" alt="Rahmat" className="h-[15px] w-auto" />
              <span>{t.mobile.safePayment}</span>
            </div>
          </div>
        </div>

        {/* Mobile feature tiles + certificate (only < lg) */}
        <section className="bg-app-bg px-[22px] pb-8 pt-6 lg:hidden">
          <div className="grid grid-cols-2 gap-[10px]">
            {[
              { icon: '🎮', label: t.mobile.tiles.games, tone: 'blue' as const },
              { icon: '🗣️', label: t.mobile.tiles.speak, tone: 'gold' as const },
              { icon: '📘', label: t.mobile.tiles.lessons, tone: 'blue' as const },
              { icon: '🔥', label: t.mobile.tiles.daily, tone: 'gold' as const },
            ].map((tile) => (
              <div
                key={tile.label}
                className="rounded-[16px] border border-[#EAEFF7] bg-white p-[14px]"
              >
                <div
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-[17px]"
                  style={{
                    background: tile.tone === 'blue' ? '#EEF3FF' : '#FBF3E2',
                  }}
                >
                  {tile.icon}
                </div>
                <p className="mt-[10px] text-[13px] font-extrabold leading-[1.3] text-[#0C1A3A]">
                  {tile.label}
                </p>
              </div>
            ))}
          </div>

          {/* Certificate card (navy solid) */}
          <div className="mt-[14px] overflow-hidden rounded-[20px] bg-[#0B2A6B] p-[18px]">
            <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#E7C578]">
              {t.mobile.certificateCaption}
            </p>
            <p className="mt-1 text-[15px] font-extrabold leading-[1.35] text-white">
              {t.mobile.certificateTitle}
            </p>
            <img
              src="/landing/certificate-full.png"
              alt="Sertifikat"
              className="mt-3 w-full rounded-[10px] shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
              decoding="async"
            />
          </div>
        </section>

        {/* Desktop hero (>= lg) */}
        <section
          id="home"
          className="relative hidden min-h-[707px] overflow-hidden text-white lg:block"
          style={{ background: 'linear-gradient(150deg, #123A8F 0%, #0B2A6B 55%, #071B5E 100%)' }}
        >
          {/* Decorative glow */}
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/8 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 top-1/3 h-96 w-96 rounded-full bg-[#E7C578]/12 blur-3xl" />
          <div className="mx-auto grid min-h-[707px] max-w-[1728px] items-center px-5 py-16 sm:px-10 lg:grid-cols-[620px_1fr] lg:px-24 lg:py-0">
            <div className="relative z-10 max-w-[550px]">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/12 px-5 py-3 text-xs font-bold text-[#E7C578] ring-1 ring-white/15 backdrop-blur">
                <Award className="h-4 w-4" />
                {t.hero.badge}
              </div>
              <h1 className="text-[42px] font-extrabold leading-[1.16] text-white sm:text-[50px] sm:leading-[1.25]">
                {t.hero.title}
              </h1>
              <p className="mt-5 text-lg leading-[1.35] text-white/85 sm:text-xl">{t.hero.description}</p>
              <div className="mt-6 grid max-w-[490px] gap-3 sm:grid-cols-2">
                <Link to="/register" className="relative inline-flex h-11 items-center justify-center gap-3 rounded-[12px] bg-white px-5 text-sm font-extrabold text-[#0C1A3A] shadow-[0_14px_28px_-10px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5">
                  <span className="h-0 w-0 border-y-[8px] border-l-[13px] border-y-transparent border-l-[#12A150]" />
                  {t.hero.google}
                  <span className="absolute -right-2 -top-2 rounded-full bg-[#C08A2D] px-2 py-0.5 text-[10px] font-bold uppercase leading-none text-white shadow-sm">
                    {t.hero.soon}
                  </span>
                </Link>
                <Link to="/register" className="relative inline-flex h-11 items-center justify-center gap-3 rounded-[12px] bg-[#0C1A3A] px-5 text-sm font-extrabold text-white ring-1 ring-white/15 transition hover:-translate-y-0.5">
                  <Apple className="h-5 w-5 fill-white" />
                  {t.hero.appStore}
                  <span className="absolute -right-2 -top-2 rounded-full bg-[#C08A2D] px-2 py-0.5 text-[10px] font-bold uppercase leading-none text-white shadow-sm">
                    {t.hero.soon}
                  </span>
                </Link>
              </div>
              <Link
                to="/login"
                className="mt-4 inline-flex h-11 min-w-[150px] items-center justify-center rounded-[12px] bg-[#C08A2D] px-8 text-sm font-extrabold text-white shadow-[0_14px_28px_-10px_rgba(169,121,28,0.55)] transition hover:bg-[#A9791C] hover:-translate-y-0.5"
              >
                {t.auth.login}
              </Link>
              <div className="mt-5 flex items-center gap-3 text-xs font-semibold text-white/85">
                <div className="flex -space-x-2">
                  {['A', 'D', 'G'].map((item, index) => (
                    <span key={item} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0B2A6B] text-[10px] font-bold text-white ${index === 0 ? 'bg-[#E7C578] text-[#0C1A3A]' : index === 1 ? 'bg-white text-[#0C1A3A]' : 'bg-[#123A8F] text-white'}`}>
                      {item}
                    </span>
                  ))}
                </div>
                <span>{t.hero.learners}</span>
              </div>
            </div>
            <img
              src="/landing/hero-students.png"
              alt="FalaRus students"
              className="pointer-events-none mx-auto mt-10 w-[min(760px,100%)] object-contain lg:absolute lg:bottom-0 lg:right-[60px] lg:mt-0 lg:w-[610px] 2xl:right-[110px] 2xl:w-[734px]"
              decoding="async"
            />
          </div>
        </section>

        <section className="bg-[#FDF8F2] px-5 pb-14 pt-14 sm:px-10 lg:px-24 lg:pb-[84px] lg:pt-[84px]">
          <div className="mx-auto max-w-[1308px] text-center">
            <h2 className="text-[24px] font-semibold leading-tight sm:text-[32px]">{t.featuresIntro.title}</h2>
            <p className="mx-auto mt-3 max-w-[632px] text-[14px] font-semibold leading-snug text-[#4D4D4D] sm:text-base">{t.featuresIntro.description}</p>
            <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-x-[60px] xl:gap-y-6">
              {featureCards.map((feature) => {
                const Icon = feature.icon;
                const [title, description] = t.features[feature.key];
                return (
                  <article key={feature.key} className="rounded-[20px] bg-white p-6 text-left shadow-[0_18px_34px_rgba(15,23,42,0.04)] sm:p-8">
                    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-[10px] sm:mb-5 sm:h-12 sm:w-12 ${feature.tone}`}>
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <h3 className="text-lg font-semibold leading-[1.35] text-[#06254B] sm:text-2xl sm:leading-[1.4]">{title}</h3>
                    <p className="mt-3 max-w-[356px] text-sm leading-[1.55] text-[#4D5358] sm:mt-4 sm:text-base sm:leading-[1.6]">{description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="certificates" className="hidden overflow-hidden bg-[#0F172A] px-5 py-20 text-white sm:px-10 lg:block lg:px-24 lg:py-[126px]">
          <div className="mx-auto grid max-w-[1728px] items-center gap-16 lg:grid-cols-[1fr_560px]">
            <div>
              <div className="mb-10 flex h-[52px] w-[64px] items-center justify-center rounded-[10px] bg-[#EDF5FF] text-[#0F172A]">
                <Award className="h-7 w-7" />
              </div>
              <h2 className="text-[32px] font-semibold leading-tight">{t.certificate.title}</h2>
              <p className="mt-6 max-w-[1230px] text-lg leading-[1.6] text-white">{t.certificate.description}</p>
            </div>
            <img src="/landing/certificate-perspective.png" alt="FalaRus certificate" className="mx-auto w-full max-w-[430px] rotate-[5deg] object-contain lg:max-w-[394px]" decoding="async" />
          </div>
        </section>

        <section id="pricing" className="bg-[#FDF8F2] px-5 py-14 sm:px-10 lg:px-24 lg:py-[120px]">
          <div className="mx-auto max-w-[1000px] text-center">
            <h2 className="text-[24px] font-semibold leading-tight sm:text-[32px]">{t.pricingIntro.title}</h2>
            <p className="mx-auto mt-3 max-w-[632px] text-[14px] font-semibold leading-snug text-[#4D4D4D] sm:text-base">{t.pricingIntro.description}</p>
            <div className="mx-auto mt-10 grid max-w-[720px] items-stretch gap-6 pt-4 sm:mt-12 sm:grid-cols-2 sm:gap-8">
              <PricingCard
                duration={t.pricing.elite.name}
                price={`${t.pricing.elite.price}${t.pricing.currency}${t.pricing.elite.period}`}
                pricePerMonth={t.pricing.elite.price}
                pricePerMonthUnit={`${t.pricing.currency.trim()} ${t.pricing.elite.period}`}
                compareAtPrice={`250 000${t.pricing.currency}`}
                discountPercent={60}
                features={t.pricing.elite.items}
                buttonLabel={t.pricing.elite.button}
                onSelect={() => navigate('/register')}
              />
              <PricingCard
                duration={t.pricing.pro.name}
                price={`${t.pricing.pro.price}${t.pricing.currency}${t.pricing.pro.period}`}
                pricePerMonth={t.pricing.pro.price}
                pricePerMonthUnit={`${t.pricing.currency.trim()} ${t.pricing.pro.period}`}
                compareAtPrice={`3 000 000${t.pricing.currency}`}
                discountPercent={90}
                features={t.pricing.pro.items}
                buttonLabel={t.pricing.pro.button}
                highlighted
                badge={`${t.pricing.recommended} ⭐`}
              />
            </div>
          </div>
        </section>

        <section id="faq" className="bg-white px-5 py-14 sm:px-10 lg:px-24 lg:py-20">
          <div className="mx-auto max-w-[800px]">
            <h2 className="text-center text-[24px] font-semibold leading-tight sm:text-[32px]">{t.faq.title}</h2>
            <div className="mt-10 space-y-3">
              {faqItems.map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={item.question} className="overflow-hidden rounded-[10px] border border-[#C8DCF3] bg-[#FDF8F2]">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-[#121827]"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                    >
                      <span className="pr-2">
                        <span className="text-[#0B2A6B]">{index + 1}.</span> {item.question}
                      </span>
                      <ChevronDown className={`h-5 w-5 shrink-0 text-[#0B2A6B] transition ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <p className="border-t border-[#C8DCF3] px-5 py-4 text-sm leading-relaxed text-[#4D5358]">{item.answer}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="about" className="bg-[#FDF8F2] px-5 pb-14 pt-4 text-center sm:px-10 lg:px-24 lg:pb-[108px]">
          <h2 className="text-[24px] font-semibold leading-tight sm:text-[32px]">{t.about.title}</h2>
          <p className="mx-auto mt-4 max-w-[550px] text-base leading-snug text-[#4D4D4D] sm:mt-6 sm:text-xl sm:leading-tight">{t.about.description}</p>
        </section>

        <section className="bg-[#0F172A] px-5 py-20 text-white sm:px-10 lg:px-24 lg:py-[92px]">
          <div className="mx-auto grid max-w-[800px] items-center gap-8 md:grid-cols-[300px_1fr]">
            <img
              src="/landing/фоундер.png"
              alt={t.founder.name}
              className="mx-auto h-[300px] w-[300px] rounded-[10px] object-cover object-top shadow-[0_18px_34px_rgba(15,23,42,0.2)]"
              decoding="async"
            />
            <div className="text-left">
              <h2 className="text-[32px] font-semibold leading-tight">{t.founder.name}</h2>
              <p className="mt-3 text-base font-semibold text-[#93C5FD]">{t.founder.role}</p>
              <p className="mt-6 text-base leading-[1.65] text-white/90 sm:text-lg">{t.founder.bio}</p>
            </div>
          </div>
        </section>

        <section id="support" className="bg-gradient-to-b from-[#FAF7F2] to-[#FDF8F2] px-5 py-14 sm:px-10 lg:px-24 lg:py-[108px]">
          <div className="mx-auto grid max-w-[815px] items-center gap-10 lg:max-w-[815px] lg:grid-cols-[400px_314px] lg:gap-20">
            <form className="rounded-[10px] bg-white px-5 py-8 shadow-[0_1px_0_rgba(0,0,0,0.03)] sm:px-10 sm:py-12">
              <h2 className="text-center text-[22px] font-semibold leading-tight sm:text-[30px]">{t.support.title}</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  {t.support.name}
                  <input className="mt-3 h-[38px] w-full rounded-[10px] border border-[#C8DCF3] px-3 outline-none" />
                </label>
                <label className="text-sm font-medium">
                  {t.support.surname}
                  <input className="mt-3 h-[38px] w-full rounded-[10px] border border-[#C8DCF3] px-3 outline-none" />
                </label>
              </div>
              <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-[8px] bg-[#F1F5F9] p-1 text-base font-semibold text-[#0B2A6B]">
                <button type="button" className="rounded-[7px] bg-[#1E3A8A] py-2 text-white">{t.support.phone}</button>
                <button type="button" className="py-2">{t.support.email}</button>
              </div>
              <label className="mt-4 block text-sm font-medium">
                {t.support.phone}
                <div className="mt-3 flex h-10 items-center rounded-[10px] border border-[#C8DCF3] px-5 text-sm">
                  <span className="mr-2 inline-flex h-5 min-w-[26px] items-center justify-center rounded-[5px] bg-[#0B2A6B] px-1 text-[10px] font-black uppercase text-white">UZ</span>
                  <ChevronDown className="mr-3 h-4 w-4" />
                  <span className="font-medium">+998</span>
                  <span className="ml-3 text-[#A2A9B0]">XX XXX-XX-XX</span>
                </div>
              </label>
              <label className="mt-4 block text-sm font-medium">
                {t.support.description}
                <input className="mt-3 h-10 w-full rounded-[10px] border border-[#C8DCF3] px-5 outline-none placeholder:text-[#A2A9B0]" placeholder={t.support.placeholder} />
              </label>
              <label className="mt-4 flex items-start gap-3 text-xs leading-relaxed text-[#4D4D4D]">
                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-[#C8DCF3] text-[#0B2A6B]" />
                <span>{t.support.termsAgree}</span>
              </label>
              <button type="button" className="mt-4 h-10 w-full rounded-[20px] bg-[#1E3A8A] text-base font-semibold text-white">{t.support.send}</button>
              <p className="mt-4 text-center text-sm text-[#4D4D4D]">
                {t.support.haveAccount}{' '}
                <Link className="font-semibold text-[#0B2A6B] underline-offset-2 hover:underline" to="/login">
                  {t.support.loginLink}
                </Link>
              </p>
            </form>
            <div className="text-center">
              <img src="/landing/teacher.png" alt="Russian language teacher" className="mx-auto h-[220px] w-[140px] object-contain sm:h-[303px] sm:w-[193px]" decoding="async" />
              <h2 className="mt-4 text-[22px] font-semibold leading-tight text-black sm:text-[32px]">{t.support.teacherTitle}</h2>
              <p className="mt-4 text-sm leading-[1.55] text-black sm:mt-6 sm:text-base sm:leading-[1.6]">{t.support.teacherText}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white px-5 pt-12 sm:px-10 lg:px-24 lg:pt-20">
        <div className="mx-auto grid max-w-[1728px] gap-8 border-b border-[#121827] pb-8 sm:gap-10 md:grid-cols-2 xl:grid-cols-[360px_220px_260px_280px] xl:justify-between">
          <div>
            <Brand />
            <p className="mt-6 max-w-[190px] text-xs font-medium leading-tight">{t.footer.address}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#0B2A6B]">{t.footer.about}</h3>
            <ul className="mt-5 space-y-4 text-sm font-medium">
              {t.footer.aboutLinks.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#0B2A6B]">{t.footer.privacy}</h3>
            <ul className="mt-5 space-y-4 text-sm font-medium">
              <li>
                <Link className="transition hover:underline" to={LEGAL_PATHS.offer}>
                  Ommaviy oferta
                </Link>
              </li>
              <li>
                <Link className="transition hover:underline" to={LEGAL_PATHS.privacy}>
                  Maxfiylik siyosati
                </Link>
              </li>
              <li>
                <Link className="transition hover:underline" to={LEGAL_PATHS.refund}>
                  Qaytarish siyosati
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#0B2A6B]">{t.footer.contacts}</h3>
            <ul className="mt-5 space-y-4 text-sm font-medium">
              <li className="flex items-center gap-4">
                <Phone className="h-5 w-5 shrink-0 text-[#0B2A6B]" />
                {telHref ? (
                  <a className="transition hover:underline" href={`tel:${telHref}`}>
                    {legalMeta.phone}
                  </a>
                ) : (
                  legalMeta.phone
                )}
              </li>
              <li className="flex items-center gap-4">
                <Mail className="h-5 w-5 shrink-0 text-[#0B2A6B]" />
                <a className="transition hover:underline" href={`mailto:${legalMeta.email}`}>
                  {legalMeta.email}
                </a>
              </li>
              <li className="flex items-center gap-4">
                <Send className="h-5 w-5 shrink-0 text-[#0B2A6B]" />
                <a className="transition hover:underline" href={LANDING_CONTACTS.telegramUrl} target="_blank" rel="noreferrer">
                  Telegram
                </a>
              </li>
              <li className="flex items-center gap-4">
                <Star className="h-5 w-5 shrink-0 text-[#0B2A6B]" />
                <a className="transition hover:underline" href={LANDING_CONTACTS.instagramUrl} target="_blank" rel="noreferrer">
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>
        <SiteLegalFooter variant="compact" embedded />
        <p className="mx-auto max-w-[1728px] py-5 text-xs">{t.footer.copyright}</p>
      </footer>
    </div>
  );
}
