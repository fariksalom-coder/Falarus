/**
 * Central SEO resolver for pathname + auth state.
 * Title ~50–65 chars with brand; description ~140–170 chars.
 */
import { SITE_ORIGIN, clipTitle, clipDescription } from './constants';

export type RouteSeoResult = {
  title: string;
  description: string;
  /** Path only (no origin); omit querystrings */
  canonicalPath?: string;
  noindex?: boolean;
  ogType?: 'website' | 'article';
  extraJsonLd?: Record<string, unknown>[];
};

function crumbLd(parts: Array<{ name: string; path: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: parts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.name,
      item: `${SITE_ORIGIN}${p.path}`,
    })),
  };
}

function courseLd(opts: {
  name: string;
  description: string;
  urlPath: string;
  keywordsFocus: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: opts.name,
    description: opts.description,
    url: `${SITE_ORIGIN}${opts.urlPath}`,
    isAccessibleForFree: false,
    availableLanguage: ['ru', 'uz'],
    inLanguage: 'ru',
    educationalLevel: 'Beginner',
    provider: {
      '@type': 'Organization',
      name: 'FalaRus',
      url: SITE_ORIGIN,
      logo: `${SITE_ORIGIN}/icons/icon-512.png`,
    },
    ...(opts.keywordsFocus ? { keywords: opts.keywordsFocus } : {}),
  };
}

function productLd(opts: { name: string; description: string; urlPath: string }): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: opts.name,
    description: opts.description,
    brand: { '@type': 'Brand', name: 'FalaRus' },
    url: `${SITE_ORIGIN}${opts.urlPath}`,
    category: 'EducationApplication',
  };
}

function faqLd(items: Array<{ question: string; answer: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function resolveRouteSeo(
  pathname: string,
  opts: { authenticated: boolean }
): RouteSeoResult {
  const raw = pathname.replace(/\/+$/, '') || '/';

  // --- "/" landing vs home app ---
  if (raw === '/') {
    if (!opts.authenticated) {
      return {
        title: clipTitle('Rus tili online — patent, ВНЖ, fuqarolik uchun tayyorgarlik'),
        description: clipDescription(
          'Patent va ВНЖ imtihonlari uchun rus tili, lug\'at va gapirish mashqlari. Rossiyada ishlovchi migrantlar uchun noldan boshlash. ФалаРус — o\'zbeklar uchun rus tili platformasi.'
        ),
        extraJsonLd: [
          faqLd([
            {
              question: 'Rus tili patent uchun qayerdan o\'rganaman?',
              answer:
                'FalaRus platformasida rus tili patent eksperti uchun mashqlar, audio va testlar mavjud — online tarzda tayyorlanishingiz mumkin.',
            },
            {
              question: 'ВНЖ uchun rus tili bo\'yicha yordam bormi?',
              answer:
                'Ha — ВНЖ imtihoni uchun mo\'ljallangan bo\'limlar va topshiriqlar mavjud.',
            },
            {
              question: 'Rus tili fuqarolik uchun tayyorgarlik qilinadimi?',
              answer:
                'Kurs asosida rus tilidan А1–В2 darajalariga qarab mashqlar beriladi; RF fuqaroligi uchun ekzamen mazmuniga mos tayyorgarlikni qo\'llab-quvvatlaydi.',
            },
          ]),
        ],
      };
    }
    return {
      title: clipTitle('Bosh sahifa — rus tili kursi va mashqlar'),
      description: clipDescription(
        'FalaRus ilovasida grammatika, lug\'at va statistikalar. Rus tilini bosqichma-bosqich o\'rganing — patent va ВНЖ uchun ham materiallar mavjud.'
      ),
      extraJsonLd: [crumbLd([{ name: 'Bosh sahifa', path: '/' }])],
    };
  }

  // --- Auth pages (public indexable) ---
  if (raw === '/login') {
    return {
      title: clipTitle('Kirish — rus tili platformasi'),
      description: clipDescription(
        'FalaRus akkauntiga kiring: rus tili darslari, lug\'at va partner bilan mashqlar.'
      ),
    };
  }
  if (raw === '/register') {
    return {
      title: clipTitle('Ro\'yxatdan o\'tish — rus tili kursi'),
      description: clipDescription(
        'FalaRus\'da ro\'yxatdan o\'ting va rus tilini texnik topshiriqlar bilan o\'rganing — migrantlar uchun moslashgan kontent.'
      ),
    };
  }

  // --- Fossils ---
  if (raw === '/fossils') {
    return {
      title: clipTitle('FalaRus Fossils'),
      description: clipDescription(
        'FalaRus Fossils — qisqa kirish sahifasi va mahsulot haqida ma\'lumot.'
      ),
      canonicalPath: '/fossils',
    };
  }
  if (raw === '/fossils/checkout') {
    return {
      title: clipTitle('Fossils checkout'),
      description: clipDescription(
        'FalaRus Fossils buyurtmasini yakunlash uchun checkout sahifasi.'
      ),
      noindex: true,
    };
  }

  // --- Priority keyword URLs ---
  if (raw === '/russian') {
    return {
      title: clipTitle('Rus tili kursi — grammatika va gapirish'),
      description: clipDescription(
        'Rus tilini A1–B2 bosqichida o\'rganing: grammatika va gapirish mashqlari. O\'zbekiston auditoriyasi uchun rus tili kursi — ФалаРус.'
      ),
      extraJsonLd: [
        crumbLd([
          { name: 'Bosh sahifa', path: '/' },
          { name: 'Rus tili kursi', path: '/russian' },
        ]),
      ],
    };
  }

  if (raw === '/russian/grammar') {
    return {
      title: clipTitle('Rus tili grammatikasi — mashqlar va darslar'),
      description: clipDescription(
        'Grammatika bo\'yicha strukturalangan mashqlar va bosqichlar. Fuqarolik va ish uchun rus tilida barqaror tayyorgarlik.'
      ),
      extraJsonLd: [
        crumbLd([
          { name: 'Rus tili', path: '/russian' },
          { name: 'Grammatika', path: '/russian/grammar' },
        ]),
      ],
    };
  }

  if (raw === '/russian/speaking') {
    return {
      title: clipTitle('Rus tilida gapirish — audio mashqlar'),
      description: clipDescription(
        'Real situatsiyalar bo\'yicha gapirish mashqlari va audio materiallar. Migratsiya va ish uchun rus tilida nutq.'
      ),
    };
  }

  if (raw === '/kurslar') {
    return {
      title: clipTitle('Kurslar — patent va ВНЖ uchun rus tili'),
      description: clipDescription(
        'Patent va ВНЖ imtihonlari uchun maxsus yo\'nalishlar. Tanlab o\'qing va онлайн tayyorlaning — rus tili savollariga mos struktura.'
      ),
      extraJsonLd: [
        crumbLd([
          { name: 'Kurslar', path: '/kurslar' },
        ]),
      ],
    };
  }

  if (raw === '/kurslar/patent') {
    return {
      title: clipTitle('Rus tili patent uchun — online tayyorgarlik'),
      description: clipDescription(
        'Patent rus tili eksperti uchun savollar va mashqlar: rus tilidan test formatiga tayyorlash. rus tili patent uchun va migrantlar uchun mos bir yo\'lak.'
      ),
      extraJsonLd: [
        crumbLd([
          { name: 'Kurslar', path: '/kurslar' },
          { name: 'Patent imtihoni', path: '/kurslar/patent' },
        ]),
        courseLd({
          name: 'Patent imtihoni — rus tili tayyorgarligi',
          description:
            'Patent uchun rus tili: savollar, tinglash va yozma mashqlar FalaRus platformasida.',
          urlPath: '/kurslar/patent',
          keywordsFocus:
            'rus tili patent uchun, русский язык для патента, patent uchun rus tili, патент учун рус тили',
        }),
      ],
    };
  }

  if (raw.startsWith('/kurslar/patent/')) {
    return {
      title: clipTitle('Patent imtihoni — variant mashqlari'),
      description: clipDescription(
        'Patent imtihoni variantlari bo\'yicha mashqlar va topshiriqlar. Rus tilidan patent savollariga tayyorgarlik.'
      ),
      canonicalPath: raw.split('?')[0],
      extraJsonLd: [
        crumbLd([
          { name: 'Kurslar', path: '/kurslar' },
          { name: 'Patent', path: '/kurslar/patent' },
          { name: 'Variant', path: raw.split('?')[0] },
        ]),
      ],
    };
  }

  if (raw === '/kurslar/vnzh') {
    return {
      title: clipTitle('Rus tili ВНЖ uchun — tayyorgarlik va testlar'),
      description: clipDescription(
        'ВНЖ uchun rus tili: tinglash, gapirish va savollar. RF yashash guvohnomasi uchun tayyorgarlik va migrantlar uchun struktura.'
      ),
      extraJsonLd: [
        crumbLd([
          { name: 'Kurslar', path: '/kurslar' },
          { name: 'ВНЖ imtihoni', path: '/kurslar/vnzh' },
        ]),
        courseLd({
          name: 'ВНЖ imtihoni — rus tili',
          description:
            'Rus tili для ВНЖ: topshiriqlar va materiallar FalaRus ilovasida — онлайн.',
          urlPath: '/kurslar/vnzh',
          keywordsFocus:
            'vnj uchun rus tili, русский язык для внж, внж учун рус тили, vnj test rus tili',
        }),
      ],
    };
  }

  if (raw.startsWith('/kurslar/vnzh/')) {
    return {
      title: clipTitle('ВНЖ kursi — bo\'lim topshirig\'i'),
      description: clipDescription(
        'ВНЖ uchun rus tili bo\'limi va topshiriqlar. Tinglash va yozma mashqlar bilan RF hukumat talablariga tayyorgarlik.'
      ),
      canonicalPath: raw.split('?')[0],
      extraJsonLd: [
        crumbLd([
          { name: 'Kurslar', path: '/kurslar' },
          { name: 'ВНЖ', path: '/kurslar/vnzh' },
          { name: 'Bo\'lim', path: raw.split('?')[0] },
        ]),
      ],
    };
  }

  // --- Pricing duplicate ---
  if (raw === '/tariflar' || raw === '/pricing') {
    const base = {
      title: clipTitle('Tariflar — rus tili obunasi va kurs narxlari'),
      description: clipDescription(
        'FalaRus tariflari: rus tili online obunasi va maxsus kurslar. Россияда ишлаш ва патент учун тайёрланиш учун mos rejalar.'
      ),
      canonicalPath: '/tariflar',
      extraJsonLd: [
        productLd({
          name: 'FalaRus rus tili — obuna va tariflar',
          description:
            'Rus tili kursiga obuna va qo\'shimcha mahsulotlar — ФалаРус platformasi.',
          urlPath: '/tariflar',
        }),
      ],
    };
    return base;
  }

  if (raw === '/payment' || raw === '/payment-history') {
    return {
      title: clipTitle('To\'lov — FalaRus'),
      description: clipDescription(
        'To\'lov sahifasi — obuna yangilanishi va tarix.'
      ),
      noindex: true,
    };
  }

  // --- Profile / invite ---
  if (raw.startsWith('/profile')) {
    return {
      title: clipTitle('Profil'),
      description: clipDescription(
        'Hisob va profil sozlamalari — FalaRus.'
      ),
      noindex: true,
    };
  }

  if (raw === '/invite') {
    return {
      title: clipTitle('Referal taklif'),
      description: clipDescription(
        'Do\'stlarni taklif qilish va bonuslar.'
      ),
      noindex: true,
    };
  }

  // --- Partner help ---
  if (raw === '/partner') {
    return {
      title: clipTitle('Sherik bilan rus tilida mashq'),
      description: clipDescription(
        'Sherik bilan sinxron mashqlar va yozishmalar — rus tilini birga mustahkamlash.'
      ),
    };
  }

  if (raw.startsWith('/help')) {
    return {
      title: clipTitle('Yordam va admin bilan yozishma'),
      description: clipDescription(
        'Qo\'llab-quvvatlash chatlari va savollar.'
      ),
      noindex: true,
    };
  }

  // --- Vocabulary ---
  if (raw === '/vocabulary') {
    return {
      title: clipTitle('Lug\'at — rus tilidan boshlash'),
      description: clipDescription(
        'Rus tili lug\'ati bo\'limlari va mavzular — migrantlar uchun lug\'at va tematik ro\'yxatlar.'
      ),
    };
  }
  if (raw === '/vocabulary/words') {
    return {
      title: clipTitle('Rus tili so\'zlari'),
      description: clipDescription(
        'Rus tilidagi so\'zlar va mashqlar — lug\'at boyitish.'
      ),
    };
  }
  if (raw.startsWith('/vocabulary/')) {
    return {
      title: clipTitle('Lug\'at mashqi'),
      description: clipDescription(
        'Rus tili lug\'ati va mashqlar bo\'yicha mavzu sahifasi — fonetika va kontekst.'
      ),
      canonicalPath: raw.split('?')[0],
    };
  }

  // --- Stat / leaderboard ---
  if (raw === '/statistika') {
    return {
      title: clipTitle('Statistika va reyting'),
      description: clipDescription(
        'Sizning progress va jamoat reytingi — rus tilidagi mashqlar statistikasi.'
      ),
    };
  }

  // --- Lesson hubs ---
  const lessonHub = raw.match(/^\/lesson-(\d+)$/);
  if (lessonHub) {
    const n = lessonHub[1];
    return {
      title: clipTitle(`Rus tili darsi ${n} — grammatika`),
      description: clipDescription(
        `Rus tilidagi ${n}-dars: grammatika va topshiriqlar. Patent va fuqarolik uchun mos rus tili tayyorgarligi bilan bir yo\'lakda o\'rganing.`
      ),
      canonicalPath: raw,
      extraJsonLd: [
        crumbLd([
          { name: `Dars ${n}`, path: `/lesson-${n}` },
        ]),
      ],
    };
  }

  const lessonSub = raw.match(/^\/lesson-\d+\//);
  if (lessonSub) {
    return {
      title: clipTitle('Grammatika mashqi'),
      description: clipDescription(
        'Rus tilidagi grammatika mashqi va topshiriq sahifasi — mustahkamlash va tekshiruv.'
      ),
      canonicalPath: raw.split('?')[0],
      noindex: false,
    };
  }

  if (raw.startsWith('/lesson/')) {
    return {
      title: clipTitle('Rus tili darsi'),
      description: clipDescription(
        'Rus tilidagi dars sahifasi — mazmun va mashqlar.'
      ),
      canonicalPath: raw.split('?')[0],
    };
  }

  if (raw.startsWith('/preview/')) {
    return {
      title: clipTitle('Ko\'rik rejimi'),
      description: clipDescription(
        'O\'qituvchi yoki ko\'rik uchun sinash rejimi.'
      ),
      noindex: true,
    };
  }

  // --- Admin ---
  if (raw.startsWith('/admin')) {
    return {
      title: clipTitle('Admin panel'),
      description: clipDescription(
        'FalaRus boshqaruv paneli.'
      ),
      noindex: true,
    };
  }

  // --- Fallback ---
  return {
    title: clipTitle('FalaRus — rus tili kursi'),
    description: clipDescription(
      'Rus tilini onlayn o\'rganing: grammatika, lug\'at, patent va ВНЖ uchun tayyorgarlik — ФалаРус.'
    ),
    canonicalPath: raw.split('?')[0],
  };
}
