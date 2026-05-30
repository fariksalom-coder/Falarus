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
import { useAuth } from '../context/AuthContext';

type LanguageCode = 'ru' | 'uz' | 'tg' | 'en' | 'hi';
type NavKey = 'home' | 'about' | 'certificates' | 'pricing' | 'join';
type FeatureKey = 'teachers' | 'exercises' | 'speaking' | 'progress' | 'certificates' | 'community';
type PlanKey = 'free' | 'pro' | 'elite';

const languages: { code: LanguageCode; short: string; label: string; flag: string }[] = [
  { code: 'ru', short: 'Rus', label: 'Русский', flag: '🇷🇺' },
  { code: 'uz', short: 'Uzb', label: 'O‘zbekcha', flag: '🇺🇿' },
  { code: 'tg', short: 'Tjk', label: 'Тоҷикӣ', flag: '🇹🇯' },
  { code: 'en', short: 'Eng', label: 'English', flag: '🇬🇧' },
  { code: 'hi', short: 'Hin', label: 'हिन्दी', flag: '🇮🇳' },
];

const navItems: { key: NavKey; href: string }[] = [
  { key: 'home', href: '#home' },
  { key: 'about', href: '#about' },
  { key: 'certificates', href: '#certificates' },
  { key: 'pricing', href: '#pricing' },
  { key: 'join', href: '#join' },
];

const featureCards = [
  { key: 'teachers', icon: UserRoundCheck, tone: 'bg-[#0F172A] text-white' },
  { key: 'exercises', icon: BookOpenCheck, tone: 'bg-[#CFE4FF] text-[#0F172A]' },
  { key: 'speaking', icon: Mic, tone: 'bg-[#233F9A] text-white' },
  { key: 'progress', icon: BarChart3, tone: 'bg-[#B4282E] text-white' },
  { key: 'certificates', icon: Award, tone: 'bg-[#EEF3F8] text-[#0F172A]' },
  { key: 'community', icon: MessageSquare, tone: 'bg-[#9483E8] text-[#0F172A]' },
] as const satisfies readonly { key: FeatureKey; icon: typeof UserRoundCheck; tone: string }[];

const planCards = [
  {
    key: 'free',
    price: '$0',
    recommended: false,
    className: 'bg-white text-[#121827]',
    buttonClass: 'border border-[#121827] text-[#121827]',
  },
  {
    key: 'pro',
    price: '$2.5',
    recommended: true,
    className: 'bg-[#0F172A] text-white shadow-[16px_18px_22px_rgba(15,23,42,0.12)]',
    buttonClass: 'bg-[#C9DDF4] text-[#121827]',
  },
  {
    key: 'elite',
    price: '$30',
    recommended: false,
    className: 'bg-gradient-to-br from-[#AE9AEF] to-[#F4D7C8] text-[#121827]',
    buttonClass: 'border border-[#121827] text-[#121827]',
  },
] as const satisfies readonly { key: PlanKey; price: string; recommended: boolean; className: string; buttonClass: string }[];

const copy = {
  ru: {
    nav: { home: 'Главная', about: 'О нас', certificates: 'Сертификаты', pricing: 'Тарифы', join: 'Присоединиться' },
    auth: { signIn: 'Регистрация', login: 'Войти' },
    hero: {
      badge: 'Премиальное обучение',
      title: <>Изучайте русский на<br />самой увлекательной<br />платформе</>,
      description: 'Интерактивные уроки, живые преподаватели и активное сообщество учеников. Начните путь к свободному русскому уже сегодня в профессиональной среде без лишних отвлечений.',
      google: 'Google Play',
      appStore: 'App Store',
      soon: 'скоро',
      cta: 'Начать',
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
    pricing: {
      recommended: 'РЕКОМЕНДУЕМ',
      suffix: '/мес',
      free: { name: 'Бесплатный', items: ['Доступ к базовой программе', 'Введение в грамматику'], muted: ['Сертификация'], button: 'Выбрать базовый' },
      pro: { name: 'Pro', items: ['Грамматика, аудирование, письмо', 'Продвинутая программа', 'Ежедневные задания', 'Официальный сертификат'], muted: [], button: 'Выбрать Pro' },
      elite: { name: 'Elite', items: ['Грамматика, аудирование, письмо', 'Онлайн-преподаватели', 'Групповые занятия каждую неделю', 'Сертификация'], muted: [], button: 'Выбрать Elite' },
    },
    about: {
      title: 'О нашем проекте',
      description: 'FalaRus — современная платформа для изучения русского языка, созданная для людей из Центральной Азии. Мы объединяем интерактивные уроки, профессиональных преподавателей и реальную разговорную практику.',
    },
    founder: { role: 'Основатель и CEO' },
    join: {
      title: 'Присоединиться',
      name: 'Имя',
      surname: 'Фамилия',
      phone: 'Телефон',
      email: 'Email',
      description: 'Описание',
      placeholder: 'расскажите о себе',
      send: 'Отправить',
      teacherTitle: 'Ищем преподавателя',
      teacherText: 'FalaRus ищет увлеченных и опытных преподавателей русского языка, готовых вдохновлять, обучать и поддерживать студентов в современной онлайн-среде.',
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
    nav: { home: 'Bosh sahifa', about: 'Biz haqimizda', certificates: 'Sertifikatlar', pricing: 'Tariflar', join: 'Qo‘shilish' },
    auth: { signIn: 'Ro‘yxatdan o‘tish', login: 'Kirish' },
    hero: {
      badge: 'Premium ta’lim tajribasi',
      title: <>Rus tilini dunyodagi<br />eng qiziqarli platformada<br />o‘rganing</>,
      description: 'Interaktiv darslar, jonli o‘qituvchilar va faol o‘quvchilar hamjamiyati. Bugunoq professional va chalg‘itmaydigan muhitda ravon so‘zlash sari yo‘l boshlang.',
      google: 'Google Play',
      appStore: 'App Store',
      soon: 'tez kunda',
      cta: 'Boshlash',
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
    pricing: {
      recommended: 'TAVSIYA ETILADI',
      suffix: '/oy',
      free: { name: 'Bepul', items: ['Asosiy dasturga kirish', 'Grammatika kirish qismi'], muted: ['Sertifikatlash'], button: 'Asosiy tarifni tanlash' },
      pro: { name: 'Pro', items: ['Grammatika, tinglash, yozish', 'Kengaytirilgan dastur', 'Kunlik mashqlar', 'Rasmiy sertifikat'], muted: [], button: 'Pro tarifini tanlash' },
      elite: { name: 'Elite', items: ['Grammatika, tinglash, yozish', 'Onlayn o‘qituvchilar', 'Har hafta guruh darslari', 'Sertifikatlash'], muted: [], button: 'Elite tarifini tanlash' },
    },
    about: {
      title: 'Loyiha haqida',
      description: 'FalaRus — Markaziy Osiyodagi insonlarga rus tilini interaktiv darslar, professional o‘qituvchilar va real muloqot amaliyoti orqali o‘rgatishga bag‘ishlangan zamonaviy platforma.',
    },
    founder: { role: 'Asoschi va CEO' },
    join: {
      title: 'Qo‘shilish',
      name: 'Ism',
      surname: 'Familiya',
      phone: 'Telefon',
      email: 'Email',
      description: 'Tavsif',
      placeholder: 'o‘zingiz haqingizda yozing',
      send: 'Yuborish',
      teacherTitle: 'O‘qituvchi qidiryapmiz',
      teacherText: 'FalaRus zamonaviy onlayn ta’limda talabalarni ilhomlantirish, o‘qitish va qo‘llab-quvvatlashga tayyor tajribali rus tili o‘qituvchilarini qidirmoqda.',
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
    nav: { home: 'Асосӣ', about: 'Дар бораи мо', certificates: 'Сертификатҳо', pricing: 'Нархҳо', join: 'Ҳамроҳ шавед' },
    auth: { signIn: 'Сабти ном', login: 'Ворид шудан' },
    hero: {
      badge: 'Таҷрибаи омӯзиши премиум',
      title: <>Забони русиро дар<br />платформаи ҷолибтарин<br />омӯзед</>,
      description: 'Дарсҳои интерактивӣ, омӯзгорони зинда ва ҷомеаи фаъоли донишомӯзон. Имрӯз роҳи худро ба суханронии озод дар муҳити касбӣ оғоз кунед.',
      google: 'Google Play',
      appStore: 'App Store',
      soon: 'ба зудӣ',
      cta: 'Оғоз кардан',
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
    pricing: {
      recommended: 'ТАВСИЯ МЕШАВАД',
      suffix: '/моҳ',
      free: { name: 'Ройгон', items: ['Дастрасӣ ба барномаи асосӣ', 'Муқаддимаи грамматика'], muted: ['Сертификатсия'], button: 'Интихоби асосӣ' },
      pro: { name: 'Pro', items: ['Грамматика, шунавоӣ, навиштан', 'Барномаи пешрафта', 'Машқҳои ҳаррӯза', 'Сертификати расмӣ'], muted: [], button: 'Интихоби Pro' },
      elite: { name: 'Elite', items: ['Грамматика, шунавоӣ, навиштан', 'Омӯзгорони онлайн', 'Дарсҳои гурӯҳӣ ҳар ҳафта', 'Сертификатсия'], muted: [], button: 'Интихоби Elite' },
    },
    about: {
      title: 'Дар бораи лоиҳа',
      description: 'FalaRus платформаи муосири омӯзиши забони русӣ мебошад, ки ба одамони Осиёи Марказӣ тавассути дарсҳои интерактивӣ, омӯзгорони касбӣ ва машқи воқеии муошират кӯмак мекунад.',
    },
    founder: { role: 'Муассис ва CEO' },
    join: {
      title: 'Ҳамроҳ шавед',
      name: 'Ном',
      surname: 'Насаб',
      phone: 'Телефон',
      email: 'Email',
      description: 'Тавсиф',
      placeholder: 'дар бораи худ нависед',
      send: 'Фиристодан',
      teacherTitle: 'Омӯзгор меҷӯем',
      teacherText: 'FalaRus омӯзгорони ботаҷриба ва дилгарми забони русиро меҷӯяд, ки омодаанд донишҷӯёнро дар муҳити муосири онлайн илҳом бахшанд ва дастгирӣ кунанд.',
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
    nav: { home: 'Home', about: 'About us', certificates: 'Certificates', pricing: 'Pricing', join: 'Join Us' },
    auth: { signIn: 'Sign in', login: 'Log in' },
    hero: {
      badge: 'Premium Learning Experience',
      title: <>Master Russian with<br />the World's Most<br />Engaging Platform</>,
      description: 'Interactive lessons, live teachers, and a vibrant community of learners. Start your fluency journey today in a distraction-free, professional environment.',
      google: 'Google Play',
      appStore: 'App Store',
      soon: 'soon',
      cta: 'Get started',
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
    pricing: {
      recommended: 'RECOMMENDED',
      suffix: '/mo',
      free: { name: 'Freemium', items: ['Core Curriculum Access', 'Grammar Introduction'], muted: ['Certification'], button: 'Select Basic' },
      pro: { name: 'Pro', items: ['Grammar, listening, writing', 'Advanced Curriculum', 'Daily Exercises', 'Official Certification'], muted: [], button: 'Select pro' },
      elite: { name: 'Elite', items: ['Grammar, listening, writing', 'Online teachers', 'Group Sessions every week', 'Certification'], muted: [], button: 'Select Elite' },
    },
    about: {
      title: 'About Our Project',
      description: 'FalaRus is a modern language learning platform dedicated to helping people across Central Asia learn Russian through interactive lessons, professional teachers, and real communication practice.',
    },
    founder: { role: 'Founder and CEO' },
    join: {
      title: 'Join Us',
      name: 'Name',
      surname: 'Surname',
      phone: 'Phone',
      email: 'Email',
      description: 'Description',
      placeholder: 'write about yourself',
      send: 'Send',
      teacherTitle: 'Looking for a teacher',
      teacherText: 'FalaRus is currently looking for passionate and experienced Russian language teachers who are ready to inspire, educate, and support students through modern online learning experiences.',
    },
    footer: {
      address: <>Falarus Learning Russian language<br />2055 Something street at 23<br />Uzbekistan x72004</>,
      about: 'About us',
      aboutLinks: ['Explore', 'Historical Places', 'Partners', 'Contacts'],
      privacy: 'Privacy policy',
      privacyLinks: ['Terms', 'Sitemap', 'Company Details', 'Terms and conditions'],
      contacts: 'Contact us',
      copyright: '© 2026 Voyage Inc. All rights reserved.',
    },
  },
  hi: {
    nav: { home: 'होम', about: 'हमारे बारे में', certificates: 'प्रमाणपत्र', pricing: 'मूल्य', join: 'जुड़ें' },
    auth: { signIn: 'साइन इन', login: 'लॉग इन' },
    hero: {
      badge: 'प्रीमियम सीखने का अनुभव',
      title: <>दुनिया के सबसे<br />आकर्षक प्लेटफॉर्म पर<br />रूसी सीखें</>,
      description: 'इंटरैक्टिव पाठ, लाइव शिक्षक और सीखने वालों का सक्रिय समुदाय। आज ही एक पेशेवर और ध्यान-केंद्रित वातावरण में अपनी भाषा यात्रा शुरू करें।',
      google: 'Google Play',
      appStore: 'App Store',
      soon: 'जल्द',
      cta: 'शुरू करें',
      learners: '10,000+ गंभीर विद्यार्थी हमारे साथ हैं',
    },
    featuresIntro: {
      title: 'गंभीर विद्यार्थियों के लिए बनाया गया',
      description: 'रूसी सीखने के लिए सब कुछ: मजबूत शिक्षण पद्धति और आकर्षक डिजिटल अनुभव।',
    },
    features: {
      teachers: ['लाइव शिक्षक', 'प्रमाणित शिक्षकों से जुड़ें और रियल टाइम में व्यक्तिगत प्रतिक्रिया पाएं।'],
      exercises: ['इंटरैक्टिव अभ्यास', 'छोटे और रोचक पाठ कठिन व्याकरण को आसान बनाते हैं।'],
      speaking: ['बोलने का अभ्यास', 'स्पीच रिकग्निशन तकनीक उच्चारण और accent सुधारने में मदद करती है।'],
      progress: ['प्रगति ट्रैकिंग', 'विश्लेषण और अपने लक्ष्यों के अनुसार सीखने के रास्ते से अपनी प्रगति देखें।'],
      certificates: ['कोर्स प्रमाणपत्र', 'कोर्स पूरा करने पर प्रमाणित सर्टिफिकेट पाएं और अपनी दक्षता दिखाएं।'],
      community: ['कम्युनिटी चैट', 'साथियों के साथ अभ्यास करें, प्रश्न पूछें और सहयोगी समुदाय में सीखें।'],
    },
    certificate: {
      title: 'औपचारिक प्रमाणन',
      description: 'विद्यार्थी व्यावहारिक रूसी संचार कौशल, प्रमाणित उपलब्धियां और अंतरराष्ट्रीय शैली की प्रमाणन प्रणाली से बेहतर करियर अवसर प्राप्त करते हैं।',
    },
    pricing: {
      recommended: 'अनुशंसित',
      suffix: '/माह',
      free: { name: 'फ्री', items: ['मुख्य पाठ्यक्रम एक्सेस', 'व्याकरण परिचय'], muted: ['प्रमाणन'], button: 'बेसिक चुनें' },
      pro: { name: 'Pro', items: ['व्याकरण, सुनना, लिखना', 'उन्नत पाठ्यक्रम', 'दैनिक अभ्यास', 'आधिकारिक प्रमाणपत्र'], muted: [], button: 'Pro चुनें' },
      elite: { name: 'Elite', items: ['व्याकरण, सुनना, लिखना', 'ऑनलाइन शिक्षक', 'हर सप्ताह समूह सत्र', 'प्रमाणन'], muted: [], button: 'Elite चुनें' },
    },
    about: {
      title: 'हमारे प्रोजेक्ट के बारे में',
      description: 'FalaRus एक आधुनिक भाषा सीखने का प्लेटफॉर्म है, जो मध्य एशिया के लोगों को इंटरैक्टिव पाठों, पेशेवर शिक्षकों और वास्तविक बातचीत के अभ्यास से रूसी सीखने में मदद करता है।',
    },
    founder: { role: 'संस्थापक और CEO' },
    join: {
      title: 'जुड़ें',
      name: 'नाम',
      surname: 'उपनाम',
      phone: 'फोन',
      email: 'ईमेल',
      description: 'विवरण',
      placeholder: 'अपने बारे में लिखें',
      send: 'भेजें',
      teacherTitle: 'शिक्षक की तलाश है',
      teacherText: 'FalaRus अनुभवी और उत्साही रूसी भाषा शिक्षकों की तलाश कर रहा है, जो आधुनिक ऑनलाइन सीखने में विद्यार्थियों को प्रेरित, शिक्षित और सहयोग कर सकें।',
    },
    footer: {
      address: <>Falarus रूसी भाषा शिक्षा<br />2055 Something street at 23<br />Uzbekistan x72004</>,
      about: 'हमारे बारे में',
      aboutLinks: ['Explore', 'ऐतिहासिक स्थान', 'साझेदार', 'संपर्क'],
      privacy: 'गोपनीयता नीति',
      privacyLinks: ['शर्तें', 'साइटमैप', 'कंपनी विवरण', 'नियम और शर्तें'],
      contacts: 'संपर्क करें',
      copyright: '© 2026 Voyage Inc. सर्वाधिकार सुरक्षित.',
    },
  },
} satisfies Record<LanguageCode, {
  nav: Record<NavKey, string>;
  auth: { signIn: string; login: string };
  hero: { badge: string; title: ReactNode; description: string; google: string; appStore: string; soon: string; cta: string; learners: string };
  featuresIntro: { title: string; description: string };
  features: Record<FeatureKey, readonly [string, string]>;
  certificate: { title: string; description: string };
  pricing: Record<PlanKey, { name: string; items: string[]; muted: string[]; button: string }> & { recommended: string; suffix: string };
  about: { title: string; description: string };
  founder: { role: string };
  join: { title: string; name: string; surname: string; phone: string; email: string; description: string; placeholder: string; send: string; teacherTitle: string; teacherText: string };
  footer: { address: ReactNode; about: string; aboutLinks: string[]; privacy: string; privacyLinks: string[]; contacts: string; copyright: string };
}>;

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-5">
      <img src="/landing/falarus-mark.svg" alt="" className="h-9 w-12 shrink-0" />
      <span className={`text-2xl font-medium leading-none ${light ? 'text-white' : 'text-[#1D3E91]'}`}>Falarus</span>
    </Link>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState<NavKey>('home');
  const [languageCode, setLanguageCode] = useState<LanguageCode>('ru');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const language = languages.find((item) => item.code === languageCode) ?? languages[0];
  const t = copy[languageCode];
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
    <div className="min-h-screen bg-[#F2F4F8] font-sans text-[#121827]">
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
                      className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left text-sm transition hover:bg-[#F2F4F8] ${language.code === item.code ? 'bg-[#EEF3F8] text-[#1D3E91]' : 'text-[#121827]'}`}
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
            <Link className="rounded-[10px] bg-[#0F172A] px-4 py-3 text-white" to="/login">
              {t.auth.login}
            </Link>
          </div>
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#0F172A] text-white lg:hidden"
            type="button"
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="absolute left-0 top-[76px] w-full border-t border-[#DDE1E6] bg-white px-5 py-5 shadow-[0_18px_34px_rgba(15,23,42,0.12)] lg:hidden">
            <nav className="grid gap-1 text-base font-semibold">
              {navItems.map((item) => (
                <a
                  key={item.key}
                  className={`rounded-[10px] px-3 py-3 ${activeNav === item.key ? 'bg-[#EEF3F8] text-[#1D3E91]' : 'text-[#4D4D4D]'}`}
                  href={item.href}
                  onClick={() => selectNav(item.key)}
                >
                  {t.nav[item.key]}
                </a>
              ))}
            </nav>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm font-semibold">
              <button className="rounded-[10px] bg-[#EEF3F8] px-3 py-3 text-[#1D3E91]" type="button" onClick={() => setLanguageMenuOpen((open) => !open)}>
                {language.flag} {language.short}
              </button>
              <Link className="rounded-[10px] border border-[#DDE1E6] px-3 py-3 text-center" to="/register">{t.auth.signIn}</Link>
              <Link className="rounded-[10px] bg-[#0F172A] px-3 py-3 text-center text-white" to="/login">{t.auth.login}</Link>
            </div>
            {languageMenuOpen && (
              <div className="mt-3 grid gap-2 rounded-[10px] border border-[#DDE1E6] bg-white p-2 text-sm font-semibold">
                {languages.map((item) => (
                  <button
                    key={item.code}
                    className={`flex items-center gap-3 rounded-[8px] px-3 py-2 text-left ${language.code === item.code ? 'bg-[#EEF3F8] text-[#1D3E91]' : 'text-[#4D4D4D]'}`}
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
              <Link to="/register" className="mt-4 inline-flex h-[38px] min-w-[150px] items-center justify-center rounded-[10px] bg-gradient-to-b from-[#8848F4] to-[#18379C] px-8 text-sm font-medium text-white">
                {t.hero.cta}
              </Link>
              <div className="mt-4 flex items-center gap-3 text-xs font-medium">
                <div className="flex -space-x-2">
                  {['A', 'D', 'G'].map((item, index) => (
                    <span key={item} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white ${index === 0 ? 'bg-[#A6C8FF]' : index === 1 ? 'bg-[#233F9A]' : 'bg-[#9483E8]'}`}>
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

        <section className="bg-[#F2F4F8] px-5 py-[84px] sm:px-10 lg:px-24">
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

        <section id="pricing" className="bg-[#F2F4F8] px-5 py-20 sm:px-10 lg:px-24 lg:py-[120px]">
          <div className="mx-auto grid max-w-[1248px] items-center gap-8 lg:grid-cols-3">
            {planCards.map((plan) => {
              const planCopy = t.pricing[plan.key];
              return (
                <article key={plan.key} className={`min-h-[370px] p-8 ${plan.className}`}>
                  {plan.recommended && (
                    <span className="mb-6 inline-flex bg-[#0F62FE] px-3 py-1.5 text-xs font-medium text-white">{t.pricing.recommended}</span>
                  )}
                  <h3 className="text-2xl font-medium leading-tight">{planCopy.name}</h3>
                  <div className="mt-7 flex items-end">
                    <span className="text-[50px] font-extrabold leading-none">{plan.price}</span>
                    <span className="pb-1 pl-1 text-base font-semibold">{t.pricing.suffix}</span>
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
        </section>

        <section id="about" className="bg-[#F2F4F8] px-5 pb-[108px] text-center sm:px-10 lg:px-24">
          <h2 className="text-[32px] font-semibold leading-tight">{t.about.title}</h2>
          <p className="mx-auto mt-6 max-w-[550px] text-xl leading-tight text-[#4D4D4D]">{t.about.description}</p>
        </section>

        <section className="bg-[#0F172A] px-5 py-20 text-white sm:px-10 lg:px-24 lg:py-[92px]">
          <div className="mx-auto grid max-w-[800px] items-center gap-8 md:grid-cols-[300px_1fr]">
            <img src="/landing/founder.png" alt="Omonov Farmon" className="h-[300px] w-[300px] rounded-[10px] object-cover" decoding="async" />
            <div>
              <h2 className="text-[32px] font-semibold leading-tight">Omonov Farmon</h2>
              <p className="mt-8 text-xl leading-tight">
                FalaRus academy<br />
                Russian language platform<br />
                Online education project<br />
                Central Asia
              </p>
              <p className="mt-8 text-base font-semibold">{t.founder.role}</p>
            </div>
          </div>
        </section>

        <section id="join" className="bg-gradient-to-b from-[#FAF7F2] to-[#F2F4F8] px-5 py-20 sm:px-10 lg:px-24 lg:py-[108px]">
          <div className="mx-auto grid max-w-[815px] items-center gap-20 lg:max-w-[815px] lg:grid-cols-[400px_314px]">
            <form className="rounded-[10px] bg-white px-10 py-12 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
              <h2 className="text-center text-[30px] font-semibold leading-tight">{t.join.title}</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  {t.join.name}
                  <input className="mt-3 h-[38px] w-full rounded-[10px] border border-[#B8D6F8] px-3 outline-none" />
                </label>
                <label className="text-sm font-medium">
                  {t.join.surname}
                  <input className="mt-3 h-[38px] w-full rounded-[10px] border border-[#B8D6F8] px-3 outline-none" />
                </label>
              </div>
              <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-[8px] bg-[#EEF3F8] p-1 text-base font-semibold text-[#1D3E91]">
                <button type="button" className="rounded-[7px] bg-[#233F9A] py-2 text-white">{t.join.phone}</button>
                <button type="button" className="py-2">{t.join.email}</button>
              </div>
              <label className="mt-4 block text-sm font-medium">
                {t.join.phone}
                <div className="mt-3 flex h-10 items-center rounded-[10px] border border-[#B8D6F8] px-5 text-sm">
                  <span className="mr-2 text-base">🇺🇿</span>
                  <ChevronDown className="mr-3 h-4 w-4" />
                  <span className="font-medium">+998</span>
                  <span className="ml-3 text-[#A2A9B0]">XX XXX-XX-XX</span>
                </div>
              </label>
              <label className="mt-4 block text-sm font-medium">
                {t.join.description}
                <input className="mt-3 h-10 w-full rounded-[10px] border border-[#B8D6F8] px-5 outline-none placeholder:text-[#A2A9B0]" placeholder={t.join.placeholder} />
              </label>
              <button type="button" className="mt-4 h-10 w-full rounded-[20px] bg-[#233F9A] text-base font-semibold text-white">{t.join.send}</button>
            </form>
            <div className="text-center">
              <img src="/landing/teacher.png" alt="Russian language teacher" className="mx-auto h-[303px] w-[193px] object-contain" decoding="async" />
              <h2 className="mt-4 text-[32px] font-semibold leading-tight text-black">{t.join.teacherTitle}</h2>
              <p className="mt-6 text-base leading-[1.6] text-black">{t.join.teacherText}</p>
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
            <h3 className="text-lg font-semibold text-[#1D3E91]">{t.footer.about}</h3>
            <ul className="mt-5 space-y-4 text-sm font-medium">
              {t.footer.aboutLinks.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#1D3E91]">{t.footer.privacy}</h3>
            <ul className="mt-5 space-y-4 text-sm font-medium">
              {t.footer.privacyLinks.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#1D3E91]">{t.footer.contacts}</h3>
            <ul className="mt-5 space-y-4 text-sm font-medium">
              <li className="flex items-center gap-4"><Phone className="h-5 w-5 text-[#1D3E91]" /> +998(98) 123-45-67</li>
              <li className="flex items-center gap-4"><Mail className="h-5 w-5 text-[#1D3E91]" /> username@gmail.com</li>
              <li className="flex items-center gap-4"><Send className="h-5 w-5 text-[#1D3E91]" /> falarus.uz</li>
              <li className="flex items-center gap-4"><Star className="h-5 w-5 text-[#1D3E91]" /> falarus.uz</li>
            </ul>
          </div>
        </div>
        <p className="mx-auto max-w-[1728px] py-5 text-xs">{t.footer.copyright}</p>
      </footer>
    </div>
  );
}
