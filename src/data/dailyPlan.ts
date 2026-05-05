/**
 * Kunlik reja — har bir kun grammatika, lug'at va matn bo'yicha
 * tuzilgan o'quv rejasi. Mavjud darslar va lug'at mavzulariga havola qiladi.
 */

import { DAILY_COURSE_DAY_MAX } from '../../shared/dailyCourseDay';

export type DayBlockKind = 'grammar' | 'vocabulary' | 'text' | 'review';

export type DayBlock =
  | {
      kind: 'grammar';
      lessonPath: string; // e.g. '/lesson-1'
      label: string;
    }
  | {
      kind: 'vocabulary';
      topicId: string;
      subtopicId: string;
      label: string;
    }
  | {
      kind: 'text';
      textId: string;
      label: string;
    }
  | {
      kind: 'review';
      label: string;
    };

export type DayPlan = {
  day: number;
  week: number;
  title: string;
  subtitle: string; // qisqacha tasvif
  blocks: DayBlock[];
  /** Berilgan bo‘lsa — bloklar `/kunlik-reja/kun/:n/...` orqali DB dagi kunlik kursdan ochiladi */
  kunlikDay?: number;
  isReview?: boolean;
  isMilestone?: boolean; // hafta yakuni / imtihon
};

const g = (lessonPath: string, label: string): DayBlock => ({ kind: 'grammar', lessonPath, label });
const v = (topicId: string, subtopicId: string, label: string): DayBlock => ({ kind: 'vocabulary', topicId, subtopicId, label });
const t = (textId: string, label: string): DayBlock => ({ kind: 'text', textId, label });

const DAILY_PLAN_BASE: DayPlan[] = [
  // Hafta 1 — Asoslar
  {
    day: 1,
    week: 1,
    title: 'Tanishuv',
    subtitle: "Salomlashish va o'zini tanishtirish",
    blocks: [
      g('/lesson-1', 'Tanishuv'),
      v('kundalik-hayot', 'salomlashish-xayrlashish-odob', 'Salomlashish iboralari'),
    ],
  },
  { day: 2, week: 1, title: 'Oila a\'zolari', subtitle: 'Tanishuv mashqlari + oila so\'zlari',
    blocks: [g('/lesson-1', 'Tanishuv mashqi'), v('kundalik-hayot', 'oila', 'Oila so\'zlari')] },
  { day: 3, week: 1, title: 'Kishilik olmoshlari', subtitle: 'Я, ты, он, она...',
    blocks: [g('/lesson-2', 'Kishilik olmoshlari'), v('kundalik-hayot', 'uy-mebel-xonalar', 'Uy va mebel')] },
  { day: 4, week: 1, title: "Olmoshlar mashqi", subtitle: 'Mustahkamlash + oziq-ovqat',
    blocks: [g('/lesson-2', 'Olmoshlar mashqi'), v('kundalik-hayot', 'oziq-ovqat-ichimliklar', 'Oziq-ovqat')] },
  { day: 5, week: 1, title: "So'z turkumlari", subtitle: 'Ot, sifat, fe\'l',
    blocks: [g('/lesson-3', 'So\'z turkumlari'), v('odamlar-va-jamiyat', 'tashqi-korinish', 'Tashqi ko\'rinish')] },
  { day: 6, week: 1, title: 'Xarakter so\'zlari', subtitle: 'Mashq + xarakter',
    blocks: [g('/lesson-3', 'So\'z turkumlari mashqi'), v('odamlar-va-jamiyat', 'xarakter', 'Xarakter')] },
  { day: 7, week: 1, title: 'Grammatika va salomlashish', subtitle: 'Dars 1 — lug‘at bilan',
    blocks: [
      g('/lesson-1', 'Grammatika'),
      v('kundalik-hayot', 'salomlashish-xayrlashish-odob', "Lug'at"),
    ],
  },

  // Hafta 2 — Otlar va sifatlar
  { day: 8, week: 2, title: 'Otlarning jinsi', subtitle: 'Erkak, ayol, oraliq jins',
    blocks: [g('/lesson-4', 'Otlarning jinsi'), v('odamlar-va-jamiyat', 'kasblar', 'Kasblar')] },
  { day: 9, week: 2, title: 'Jins mashqi', subtitle: "Mustahkamlash + do'stlar",
    blocks: [g('/lesson-4', 'Jins mashqi'), v('odamlar-va-jamiyat', 'dostlar-tanishuv-muloqot', "Do'stlar va muloqot")] },
  { day: 10, week: 2, title: "Yumshoq belgili so'zlar", subtitle: '-ь bilan tugaydigan otlar',
    blocks: [g('/lesson-5', "Yumshoq belgili so'zlar"), v('shahar-va-transport', 'binolar-va-joylar', 'Binolar va joylar')] },
  { day: 11, week: 2, title: 'Transport', subtitle: 'Mashq + transport so\'zlari',
    blocks: [g('/lesson-5', "Yumshoq belgi mashqi"), v('shahar-va-transport', 'transport', 'Transport')] },
  { day: 12, week: 2, title: 'Kimniki?', subtitle: 'Чей? Чья? Чьё?',
    blocks: [g('/lesson-6', 'Kimniki?'), v('shahar-va-transport', 'yonalishlar', "Yo'nalishlar")] },
  { day: 13, week: 2, title: 'Maktab fanlari', subtitle: 'Mashq + maktab',
    blocks: [g('/lesson-6', 'Kimniki? mashqi'), v('oqish-va-ish', 'maktab-fanlari', 'Maktab fanlari')] },
  { day: 14, week: 2, title: 'Otlar va yil fasllari matni', subtitle: 'Grammatika, lug‘at va o‘qish',
    blocks: [
      g('/lesson-4', 'Grammatika'),
      v('odamlar-va-jamiyat', 'kasblar', "Lug'at"),
      t('vremena-goda', 'Matn: Yil fasllari'),
    ],
  },

  // Hafta 3 — Sifatlar va ko'plik
  { day: 15, week: 3, title: 'Sifat', subtitle: 'Имя прилагательное',
    blocks: [g('/lesson-7', 'Sifat'), v('oqish-va-ish', 'universitet-imtihon-oqish', "Universitet, o'qish")] },
  { day: 16, week: 3, title: 'Ish va ofis', subtitle: 'Sifat mashqi + ish',
    blocks: [g('/lesson-7', 'Sifat mashqi'), v('oqish-va-ish', 'ish-ofis', 'Ish va ofis'), t('moya-lyubimaya-professiya', 'Sevimli kasbim')] },
  { day: 17, week: 3, title: "Ko'plik", subtitle: 'Множественное число',
    blocks: [g('/lesson-8', "Ko'plik"), v('tabiat-va-atrof-muhit', 'yil-fasli-ob-havo-iqlim', 'Ob-havo va fasllar')] },
  { day: 18, week: 3, title: 'Hayvonlar', subtitle: "Ko'plik mashqi + hayvonlar",
    blocks: [g('/lesson-8', "Ko'plik mashqi"), v('tabiat-va-atrof-muhit', 'hayvonlar', 'Hayvonlar')] },
  { day: 19, week: 3, title: '9-dars: umumiy mashqlar', subtitle: 'Lesson 9',
    blocks: [g('/lesson-9', 'Dars 9'), v('tabiat-va-atrof-muhit', 'tabiat-hodisalari', 'Tabiat hodisalari')] },
  { day: 20, week: 3, title: 'Infinitiv', subtitle: "Fe'l bosh shakli",
    blocks: [g('/lesson-10', 'Infinitiv'), v('salomatlik-va-tana', 'tana-azolari', "Tana a'zolari")] },
  { day: 21, week: 3, title: 'Ko‘plik va suhbat matni', subtitle: 'Hayvonlar va o‘qish',
    blocks: [
      g('/lesson-8', 'Grammatika'),
      v('tabiat-va-atrof-muhit', 'hayvonlar', "Lug'at"),
      t('kto-kem-budet', 'Matn: Kim bo\'lasan?'),
    ],
  },

  // Hafta 4 — Zamonlar
  { day: 22, week: 4, title: 'Hozirgi zamon', subtitle: 'Настоящее время',
    blocks: [g('/lesson-11', 'Hozirgi zamon'), v('salomatlik-va-tana', 'kasalliklar-va-alomatlar', 'Kasalliklar')] },
  { day: 23, week: 4, title: 'Hozirgi zamon mashqi', subtitle: "Fe'l qoidalari",
    blocks: [g('/lesson-11', 'Mashq'), v('salomatlik-va-tana', 'shifokorlar-dorilar-davolanish', 'Shifokor va dori')] },
  { day: 24, week: 4, title: '-ova-/-eva- fe\'llari', subtitle: 'Maxsus fe\'l guruhi',
    blocks: [g('/lesson-12', "-ова-/-ева- fe'llari"), v('xaridlar-va-pul', 'pul-va-narxlar', 'Pul va narxlar')] },
  { day: 25, week: 4, title: '-ться fe\'llari', subtitle: 'Refleksiv fe\'llar',
    blocks: [g('/lesson-13', "-ться fe'llari"), v('xaridlar-va-pul', 'dokkonlar', "Do'konlar")] },
  { day: 26, week: 4, title: "Noto'g'ri fe'llar", subtitle: 'Неправильные глаголы',
    blocks: [g('/lesson-14', "Noto'g'ri fe'llar"), v('xaridlar-va-pul', 'kiyim-kechak-poyabzal', 'Kiyim-kechak')] },
  { day: 27, week: 4, title: "O'tgan zamon", subtitle: 'Прошедшее время',
    blocks: [g('/lesson-15', "O'tgan zamon"), v('vaqt-va-sonlar', 'sonlar', 'Sonlar')] },
  { day: 28, week: 4, title: 'Fe’llar va kasb haqida matn', subtitle: 'Sonlar va o‘qish',
    blocks: [
      g('/lesson-14', 'Grammatika'),
      v('vaqt-va-sonlar', 'sonlar', "Lug'at"),
      t('zhurnalist-interesnaya-professiya', "Matn: Qiziqarli kasb"),
    ],
  },

  // Hafta 5 — Kelasi va aspekt
  { day: 29, week: 5, title: 'Kelasi zamon', subtitle: 'Будущее время',
    blocks: [g('/lesson-16', 'Kelasi zamon'), v('vaqt-va-sonlar', 'hafta-kunlari', 'Hafta kunlari')] },
  { day: 30, week: 5, title: 'Mukammal/Nomukammal', subtitle: "Fe'l turi",
    blocks: [g('/lesson-17', "Fe'l turi"), v('vaqt-va-sonlar', 'oylar', 'Oylar')] },
  { day: 31, week: 5, title: "Fe'l turi mashqi", subtitle: 'Mustahkamlash',
    blocks: [g('/lesson-17', 'Mashq'), v('vaqt-va-sonlar', 'kun-vaqtlari', 'Kun vaqtlari')] },
  { day: 32, week: 5, title: 'Buyruq mayli', subtitle: 'Повелительное наклонение',
    blocks: [g('/lesson-18', 'Buyruq mayli'), v('vaqt-va-sonlar', 'soat-va-taqvim', 'Soat va taqvim')] },
  { day: 33, week: 5, title: "Harakat fe'llari", subtitle: 'Идти, ходить, ехать',
    blocks: [g('/lesson-19', "Harakat fe'llari"), v('hordiq-va-sayohatlar', 'xobbi', 'Xobbi')] },
  { day: 34, week: 5, title: 'Mashq', subtitle: "Harakat fe'llari + sayohat",
    blocks: [g('/lesson-19', 'Mashq'), v('hordiq-va-sayohatlar', 'turizm', 'Turizm')] },
  { day: 35, week: 5, title: 'Buyruq mayli va dialog', subtitle: 'Turizm va matn',
    blocks: [
      g('/lesson-18', 'Grammatika'),
      v('hordiq-va-sayohatlar', 'turizm', "Lug'at"),
      t('dialog-den-rozhdeniya', 'Dialog: Tug\'ilgan kun'),
    ],
  },

  // Hafta 6 — Kelishiklar va yakun
  { day: 36, week: 6, title: '20-dars: harakat fe’llari', subtitle: 'Lesson 20',
    blocks: [g('/lesson-20', 'Dars 20'), v('hordiq-va-sayohatlar', 'kongilochar-mashgulotlar', "Ko'ngilochar")] },
  { day: 37, week: 6, title: 'Kelishiklar', subtitle: 'Падежи — kirish',
    blocks: [g('/lesson-21', 'Kelishiklar'), v('mavhum-sozlar-va-iboralar', 'kop-qollanadigan-fellar', "Ko'p qo'llanadigan fe'llar")] },
  { day: 38, week: 6, title: 'Predlojniy', subtitle: 'Предложный падеж',
    blocks: [g('/lesson-22', 'Predlojniy'), v('mavhum-sozlar-va-iboralar', 'sifatlar', 'Sifatlar')] },
  { day: 39, week: 6, title: 'Predlojniy mashqi', subtitle: 'Mustahkamlash',
    blocks: [g('/lesson-22', 'Mashq'), v('mavhum-sozlar-va-iboralar', 'ravishlar', 'Ravishlar')] },
  { day: 40, week: 6, title: 'В va НА', subtitle: 'Predloglar bilan',
    blocks: [g('/lesson-23', 'В va НА predloglari'), v('mavhum-sozlar-va-iboralar', 'boglovchilar', "Bog'lovchilar")] },
  { day: 41, week: 6, title: 'Sifat va sonlar', subtitle: 'Predlojniy kelishigida',
    blocks: [g('/lesson-24', 'Sifat va sonlar'), t('den-rozhdeniya-v-obshchezhitii', "Matn: Tug'ilgan kun")] },
  { day: 42, week: 6, title: 'Predlojniy va yakuniy matn', subtitle: 'Kursni yakunlash 🎓',
    blocks: [
      g('/lesson-22', 'Grammatika'),
      v('mavhum-sozlar-va-iboralar', 'ravishlar', "Lug'at"),
      t('pritcha-obstoyatelstva', 'Matn: Hayot pritchasi'),
    ],
    isMilestone: true },
];

/** Kun 43–182: mavjud lug‘at mavzulari bo‘ylab spiral takrorlash + takrorlangan grammatik kirish. */
const SPIRAL_VOCAB_ROTATION = [
  ['kundalik-hayot', 'salomlashish-xayrlashish-odob', 'Salomlashish iboralari'],
  ['odamlar-va-jamiyat', 'kasblar', 'Kasblar'],
  ['shahar-va-transport', 'transport', 'Transport'],
  ['vaqt-va-sonlar', 'sonlar', 'Sonlar'],
  ['xaridlar-va-pul', 'pul-va-narxlar', 'Pul va narxlar'],
  ['salomatlik-va-tana', 'kasalliklar-va-alomatlar', 'Kasalliklar'],
  ['tabiat-va-atrof-muhit', 'hayvonlar', 'Hayvonlar'],
  ['hordiq-va-sayohatlar', 'turizm', 'Turizm'],
  ['mavhum-sozlar-va-iboralar', 'kop-qollanadigan-fellar', "Ko'p qo'llanadigan fe'llar"],
  ['oqish-va-ish', 'universitet-imtihon-oqish', 'Universitet va o‘qish'],
  ['kundalik-hayot', 'oziq-ovqat-ichimliklar', 'Oziq-ovqat'],
  ['odamlar-va-jamiyat', 'xarakter', 'Xarakter'],
  ['vaqt-va-sonlar', 'hafta-kunlari', 'Hafta kunlari'],
  ['mavhum-sozlar-va-iboralar', 'boglovchilar', "Bog'lovchilar"],
] as const;

function spiralContinuationPlans(): DayPlan[] {
  const out: DayPlan[] = [];
  for (let day = 43; day <= DAILY_COURSE_DAY_MAX; day++) {
    const week = Math.ceil(day / 7);
    const rot = SPIRAL_VOCAB_ROTATION[(day - 43) % SPIRAL_VOCAB_ROTATION.length];
    const row: DayPlan = {
      day,
      week,
      title: `Spiral takrorlash — kun ${day}`,
      subtitle: `${week}-hafta: lug‘at va kunlik blok`,
      blocks: [
        g('/lesson-24', 'Grammatika (takrorlash)'),
        v(rot[0], rot[1], rot[2]),
      ],
    };
    if (day === DAILY_COURSE_DAY_MAX) row.isMilestone = true;
    out.push(row);
  }
  return out;
}

/** Har bir kun — faqat `/kunlik-reja/kun/:n/...` (DB); asosiy kurs `/lesson-*` ga qaytmasin */
export const DAILY_PLAN: DayPlan[] = [...DAILY_PLAN_BASE, ...spiralContinuationPlans()].map((d) => ({
  ...d,
  kunlikDay: d.day,
}));

export const TOTAL_DAYS = DAILY_PLAN.length;
export const TOTAL_WEEKS = Math.max(...DAILY_PLAN.map((d) => d.week));

/** Bosqichlar (oy/level) — har biri 4-5 hafta. 180-kunlik plan uchun ham scale qiladi. */
export type Stage = {
  id: number;
  title: string;
  level: string; // CEFR
  weekFrom: number;
  weekTo: number;
};

export const STAGES: Stage[] = [
  { id: 1, title: 'Boshlash', level: 'A0', weekFrom: 1, weekTo: 2 },
  { id: 2, title: 'Asoslarni mustahkamlash', level: 'A0+', weekFrom: 3, weekTo: 4 },
  { id: 3, title: "Fe'llar va zamonlar", level: 'A1', weekFrom: 5, weekTo: 5 },
  { id: 4, title: 'Kelishiklar va yakun', level: 'A1+', weekFrom: 6, weekTo: 6 },
  { id: 5, title: 'Spiral takrorlash va rivojlanish', level: 'A1–A2', weekFrom: 7, weekTo: 26 },
];

export function getStageOfWeek(week: number): Stage {
  return STAGES.find((s) => week >= s.weekFrom && week <= s.weekTo) ?? STAGES[0];
}

export function getDayByNumber(day: number): DayPlan | undefined {
  return DAILY_PLAN.find((d) => d.day === day);
}

export function getDaysByWeek(week: number): DayPlan[] {
  return DAILY_PLAN.filter((d) => d.week === week);
}
