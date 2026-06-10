import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Apple,
  Award,
  BadgeCheck,
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
import { getLegalEntityMeta, LEGAL_PATHS } from '../config/legalPublic';
import { useAuth } from '../context/AuthContext';

type LanguageCode = 'en' | 'uz' | 'ru' | 'kk' | 'tg' | 'ky';
type NavKey = 'home' | 'about' | 'certificates' | 'pricing' | 'contact';
type FeatureKey = 'teachers' | 'exercises' | 'speaking' | 'progress' | 'certificates' | 'community';
type PlanKey = 'free' | 'pro' | 'elite';

const languages: { code: LanguageCode; short: string; label: string; flag: string }[] = [
  { code: 'en', short: 'Eng', label: 'English', flag: '🇬🇧' },
  { code: 'uz', short: 'Uzb', label: 'O‘zbekcha', flag: '🇺🇿' },
  { code: 'ru', short: 'Rus', label: 'Русский', flag: '🇷🇺' },
  { code: 'kk', short: 'Kaz', label: 'Қазақша', flag: '🇰🇿' },
  { code: 'tg', short: 'Tjk', label: 'Тоҷикӣ', flag: '🇹🇯' },
  { code: 'ky', short: 'Kyr', label: 'Кыргызча', flag: '🇰🇬' },
];

const navItems: { key: NavKey; href: string }[] = [
  { key: 'home', href: '#home' },
  { key: 'about', href: '#about' },
  { key: 'certificates', href: '#certificates' },
  { key: 'pricing', href: '#pricing' },
  { key: 'contact', href: '#support' },
];

const LANDING_CONTACTS = {
  telegramUrl: 'https://t.me/falarus',
  telegramLabel: '@falarus',
  instagramUrl: 'https://www.instagram.com/fala_rus',
  instagramLabel: '@fala_rus',
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

const planCards = [
  {
    key: 'free',
    recommended: false,
    className: 'bg-white text-[#121827]',
    buttonClass: 'border border-[#121827] text-[#121827]',
  },
  {
    key: 'pro',
    recommended: true,
    className: 'bg-[#0F172A] text-white shadow-[16px_18px_22px_rgba(15,23,42,0.12)]',
    buttonClass: 'bg-[#C9DDF4] text-[#121827]',
  },
  {
    key: 'elite',
    recommended: false,
    className: 'bg-gradient-to-br from-[#AE9AEF] to-[#F4D7C8] text-[#121827]',
    buttonClass: 'border border-[#121827] text-[#121827]',
  },
] as const satisfies readonly { key: PlanKey; recommended: boolean; className: string; buttonClass: string }[];

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
}>;

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-5">
      <img src="/landing/falarus-mark.svg" alt="" className="h-9 w-12 shrink-0" />
      <span className={`text-2xl font-medium leading-none ${light ? 'text-white' : 'text-[#1E3A8A]'}`}>Falarus</span>
    </Link>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState<NavKey>('home');
  const [languageCode, setLanguageCode] = useState<LanguageCode>('en');
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
    <div className="min-h-screen bg-[#FDF8F2] font-sans text-[#121827]">
      <header className="sticky top-0 z-30 h-[76px] bg-white">
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
                <span className="text-xl leading-none">{language.flag}</span>
                {language.short}
                <ChevronDown className={`h-5 w-5 transition ${languageMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {languageMenuOpen && (
                <div className="absolute right-0 top-12 z-40 w-44 rounded-[10px] border border-[#DDE1E6] bg-white p-2 shadow-[0_18px_34px_rgba(15,23,42,0.12)]">
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left text-sm transition hover:bg-[#F2F4F8] ${language.code === item.code ? 'bg-[#F1F5F9] text-[#1E3A8A]' : 'text-[#121827]'}`}
                      type="button"
                      onClick={() => selectLanguage(item.code)}
                    >
                      <span className="text-lg">{item.flag}</span>
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
                className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-[#C8DCF3] bg-[#F1F5F9] px-3 py-2 text-sm font-semibold text-[#1E3A8A]"
                type="button"
                aria-expanded={languageMenuOpen}
                aria-label="Tilni tanlash"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLanguageMenuOpen((open) => !open);
                }}
              >
                <span className="text-lg leading-none">{language.flag}</span>
                {language.short}
                <ChevronDown className={`h-4 w-4 transition ${languageMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {languageMenuOpen && (
                <div className="absolute right-0 top-12 z-50 w-44 rounded-[10px] border border-[#DDE1E6] bg-white p-2 shadow-[0_18px_34px_rgba(15,23,42,0.12)]">
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left text-sm transition hover:bg-[#F2F4F8] ${language.code === item.code ? 'bg-[#F1F5F9] text-[#1E3A8A]' : 'text-[#121827]'}`}
                      type="button"
                      onClick={() => selectLanguage(item.code)}
                    >
                      <span className="text-lg">{item.flag}</span>
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
                  className={`rounded-[10px] px-3 py-3 ${activeNav === item.key ? 'bg-[#F1F5F9] text-[#1E3A8A]' : 'text-[#4D4D4D]'}`}
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
        <section id="home" className="relative min-h-[707px] overflow-hidden bg-gradient-to-br from-[#A8D0FA] via-[#C8E0FA] to-[#EFF7FF]">
          <div className="mx-auto grid min-h-[707px] max-w-[1728px] items-center px-5 py-16 sm:px-10 lg:grid-cols-[620px_1fr] lg:px-24 lg:py-0">
            <div className="relative z-10 max-w-[550px]">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/35 px-5 py-3 text-xs font-medium text-[#121827]">
                <Award className="h-4 w-4" />
                {t.hero.badge}
              </div>
              <h1 className="text-[42px] font-extrabold leading-[1.16] text-[#183064] sm:text-[50px] sm:leading-[1.25]">
                {t.hero.title}
              </h1>
              <p className="mt-5 text-lg leading-[1.25] text-[#3F4850] sm:text-xl">{t.hero.description}</p>
              <div className="mt-5 grid max-w-[490px] gap-3 sm:grid-cols-2">
                <Link to="/register" className="relative inline-flex h-10 items-center justify-center gap-3 rounded-[10px] bg-white px-5 text-sm font-medium">
                  <span className="h-0 w-0 border-y-[8px] border-l-[13px] border-y-transparent border-l-[#27A844]" />
                  {t.hero.google}
                  <span className="absolute -right-2 -top-2 rounded-full bg-[#0F62FE] px-2 py-0.5 text-[10px] font-bold uppercase leading-none text-white shadow-sm">
                    {t.hero.soon}
                  </span>
                </Link>
                <Link to="/register" className="relative inline-flex h-10 items-center justify-center gap-3 rounded-[10px] bg-[#0F172A] px-5 text-sm font-medium text-white">
                  <Apple className="h-5 w-5 fill-white" />
                  {t.hero.appStore}
                  <span className="absolute -right-2 -top-2 rounded-full bg-[#0F62FE] px-2 py-0.5 text-[10px] font-bold uppercase leading-none text-white shadow-sm">
                    {t.hero.soon}
                  </span>
                </Link>
              </div>
              <Link
                to="/login"
                className="mt-4 inline-flex h-[44px] min-w-[150px] items-center justify-center rounded-[10px] bg-[#1E3A8A] px-8 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(30,58,138,0.28)] transition hover:bg-[#183462]"
              >
                {t.auth.login}
              </Link>
              <div className="mt-4 flex items-center gap-3 text-xs font-medium">
                <div className="flex -space-x-2">
                  {['A', 'D', 'G'].map((item, index) => (
                    <span key={item} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white ${index === 0 ? 'bg-[#A6C8FF]' : index === 1 ? 'bg-[#1E3A8A]' : 'bg-[#9483E8]'}`}>
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

        <section className="bg-[#FDF8F2] px-5 py-[84px] sm:px-10 lg:px-24">
          <div className="mx-auto max-w-[1308px] text-center">
            <h2 className="text-[32px] font-semibold leading-tight">{t.featuresIntro.title}</h2>
            <p className="mx-auto mt-3 max-w-[632px] text-base font-semibold leading-tight text-[#4D4D4D]">{t.featuresIntro.description}</p>
            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-x-[60px] xl:gap-y-6">
              {featureCards.map((feature) => {
                const Icon = feature.icon;
                const [title, description] = t.features[feature.key];
                return (
                  <article key={feature.key} className="rounded-[20px] bg-white p-8 text-left shadow-[0_18px_34px_rgba(15,23,42,0.04)] sm:p-8">
                    <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-[10px] ${feature.tone}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-semibold leading-[1.4] text-[#06254B]">{title}</h3>
                    <p className="mt-4 max-w-[356px] text-base leading-[1.6] text-[#4D5358]">{description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="certificates" className="overflow-hidden bg-[#0F172A] px-5 py-20 text-white sm:px-10 lg:px-24 lg:py-[126px]">
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

        <section id="pricing" className="bg-[#FDF8F2] px-5 py-20 sm:px-10 lg:px-24 lg:py-[120px]">
          <div className="mx-auto max-w-[1248px] text-center">
            <h2 className="text-[32px] font-semibold leading-tight">{t.pricingIntro.title}</h2>
            <p className="mx-auto mt-3 max-w-[632px] text-base font-semibold leading-tight text-[#4D4D4D]">{t.pricingIntro.description}</p>
            <div className="mt-12 grid items-center gap-8 lg:grid-cols-3">
            {planCards.map((plan) => {
              const planCopy = t.pricing[plan.key];
              return (
                <article key={plan.key} className={`min-h-[370px] p-8 text-left ${plan.className}`}>
                  {plan.recommended && (
                    <span className="mb-6 inline-flex bg-[#0F62FE] px-3 py-1.5 text-xs font-medium text-white">{t.pricing.recommended}</span>
                  )}
                  <h3 className="text-2xl font-medium leading-tight">{planCopy.name}</h3>
                  <div className="mt-7 flex items-end">
                    <span className="text-[50px] font-extrabold leading-none">{planCopy.price}</span>
                    <span className="pb-1 pl-1 text-base font-semibold">{t.pricing.currency}{planCopy.period}</span>
                  </div>
                  <ul className="mt-8 space-y-3 text-base leading-[1.6]">
                    {planCopy.items.map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <BadgeCheck className="h-4 w-4 shrink-0 text-[#5F49FF]" />
                        {item}
                      </li>
                    ))}
                    {planCopy.muted.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-[#A2A9B0]">
                        <X className="h-4 w-4 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register" className={`mt-8 flex h-10 items-center justify-center text-sm font-medium ${plan.buttonClass}`}>
                    {planCopy.button}
                  </Link>
                </article>
              );
            })}
            </div>
          </div>
        </section>

        <section id="faq" className="bg-white px-5 py-20 sm:px-10 lg:px-24">
          <div className="mx-auto max-w-[800px]">
            <h2 className="text-center text-[32px] font-semibold leading-tight">{t.faq.title}</h2>
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
                        <span className="text-[#1E3A8A]">{index + 1}.</span> {item.question}
                      </span>
                      <ChevronDown className={`h-5 w-5 shrink-0 text-[#1E3A8A] transition ${isOpen ? 'rotate-180' : ''}`} />
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

        <section id="about" className="bg-[#FDF8F2] px-5 pb-[108px] text-center sm:px-10 lg:px-24">
          <h2 className="text-[32px] font-semibold leading-tight">{t.about.title}</h2>
          <p className="mx-auto mt-6 max-w-[550px] text-xl leading-tight text-[#4D4D4D]">{t.about.description}</p>
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

        <section id="support" className="bg-gradient-to-b from-[#FAF7F2] to-[#FDF8F2] px-5 py-20 sm:px-10 lg:px-24 lg:py-[108px]">
          <div className="mx-auto grid max-w-[815px] items-center gap-20 lg:max-w-[815px] lg:grid-cols-[400px_314px]">
            <form className="rounded-[10px] bg-white px-10 py-12 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
              <h2 className="text-center text-[30px] font-semibold leading-tight">{t.support.title}</h2>
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
              <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-[8px] bg-[#F1F5F9] p-1 text-base font-semibold text-[#1E3A8A]">
                <button type="button" className="rounded-[7px] bg-[#1E3A8A] py-2 text-white">{t.support.phone}</button>
                <button type="button" className="py-2">{t.support.email}</button>
              </div>
              <label className="mt-4 block text-sm font-medium">
                {t.support.phone}
                <div className="mt-3 flex h-10 items-center rounded-[10px] border border-[#C8DCF3] px-5 text-sm">
                  <span className="mr-2 text-base">🇺🇿</span>
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
                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-[#C8DCF3] text-[#1E3A8A]" />
                <span>{t.support.termsAgree}</span>
              </label>
              <button type="button" className="mt-4 h-10 w-full rounded-[20px] bg-[#1E3A8A] text-base font-semibold text-white">{t.support.send}</button>
              <p className="mt-4 text-center text-sm text-[#4D4D4D]">
                {t.support.haveAccount}{' '}
                <Link className="font-semibold text-[#1E3A8A] underline-offset-2 hover:underline" to="/login">
                  {t.support.loginLink}
                </Link>
              </p>
            </form>
            <div className="text-center">
              <img src="/landing/teacher.png" alt="Russian language teacher" className="mx-auto h-[303px] w-[193px] object-contain" decoding="async" />
              <h2 className="mt-4 text-[32px] font-semibold leading-tight text-black">{t.support.teacherTitle}</h2>
              <p className="mt-6 text-base leading-[1.6] text-black">{t.support.teacherText}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white px-5 pt-20 sm:px-10 lg:px-24">
        <div className="mx-auto grid max-w-[1728px] gap-10 border-b border-[#121827] pb-8 md:grid-cols-2 xl:grid-cols-[360px_220px_260px_280px] xl:justify-between">
          <div>
            <Brand />
            <p className="mt-6 max-w-[190px] text-xs font-medium leading-tight">{t.footer.address}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#1E3A8A]">{t.footer.about}</h3>
            <ul className="mt-5 space-y-4 text-sm font-medium">
              {t.footer.aboutLinks.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#1E3A8A]">{t.footer.privacy}</h3>
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
            <h3 className="text-lg font-semibold text-[#1E3A8A]">{t.footer.contacts}</h3>
            <ul className="mt-5 space-y-4 text-sm font-medium">
              <li className="flex items-center gap-4">
                <Phone className="h-5 w-5 shrink-0 text-[#1E3A8A]" />
                {telHref ? (
                  <a className="transition hover:underline" href={`tel:${telHref}`}>
                    {legalMeta.phone}
                  </a>
                ) : (
                  legalMeta.phone
                )}
              </li>
              <li className="flex items-center gap-4">
                <Mail className="h-5 w-5 shrink-0 text-[#1E3A8A]" />
                <a className="transition hover:underline" href={`mailto:${legalMeta.email}`}>
                  {legalMeta.email}
                </a>
              </li>
              <li className="flex items-center gap-4">
                <Send className="h-5 w-5 shrink-0 text-[#1E3A8A]" />
                <a className="transition hover:underline" href={LANDING_CONTACTS.telegramUrl} target="_blank" rel="noreferrer">
                  Telegram {LANDING_CONTACTS.telegramLabel}
                </a>
              </li>
              <li className="flex items-center gap-4">
                <Star className="h-5 w-5 shrink-0 text-[#1E3A8A]" />
                <a className="transition hover:underline" href={LANDING_CONTACTS.instagramUrl} target="_blank" rel="noreferrer">
                  Instagram {LANDING_CONTACTS.instagramLabel}
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
