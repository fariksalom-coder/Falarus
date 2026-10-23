/**
 * O'QITUVCHI ONBORDINGI (8 qadam) — server va klient uchun yagona qoidalar.
 *
 * Bu yerda: qadamlar ro'yxati va yo'llar (sertifikatli / tajribali),
 * har qadamning tekshiruvi (xato kodlari + uz/ru matn), jadval tekshiruvi,
 * komissiya shkalasi, «O'zim haqimda» shabloni va shartlar matni.
 *
 * Tekshiruv IKKI joyda bir xil ishlaydi: klient darhol xatoni ko'rsatadi,
 * server esa xuddi shu funksiya bilan qayta tekshiradi.
 */

export type Lang = 'uz' | 'ru';
export type OnboardingPath = 'certified' | 'experienced';

export const ONBOARDING_STEPS = [
  { step: 1, key: 'personal', uz: 'Shaxsiy maʼlumotlar', ru: 'Личные данные' },
  { step: 2, key: 'photo', uz: 'Surat', ru: 'Фотография' },
  { step: 3, key: 'certification', uz: 'Sertifikat', ru: 'Сертификация' },
  { step: 4, key: 'education', uz: 'Taʼlim', ru: 'Образование' },
  { step: 5, key: 'about', uz: 'Oʻzim haqimda', ru: 'О себе' },
  { step: 6, key: 'video', uz: 'Video-taqdimot', ru: 'Видеопрезентация' },
  { step: 7, key: 'schedule', uz: 'Jadval', ru: 'Расписание' },
  { step: 8, key: 'pricing', uz: 'Narx va shartlar', ru: 'Цена и условия' },
] as const;
export type StepKey = (typeof ONBOARDING_STEPS)[number]['key'];
export const TOTAL_STEPS = ONBOARDING_STEPS.length;

/** 3-qadam (sertifikat) faqat sertifikatli yo'lda; tajribali yo'lda avtomatik o'tkaziladi. */
export function stepsForPath(path: OnboardingPath | null | undefined): number[] {
  return ONBOARDING_STEPS.map((s) => s.step).filter((n) => n !== 3 || path !== 'experienced');
}

export function nextStep(current: number, path: OnboardingPath | null | undefined): number {
  return stepsForPath(path).find((n) => n > current) ?? current;
}
export function prevStep(current: number, path: OnboardingPath | null | undefined): number {
  return [...stepsForPath(path)].reverse().find((n) => n < current) ?? current;
}

/* ─────────────────────────── Ro'yxatlar ─────────────────────────── */

export const COUNTRIES: { code: string; uz: string; ru: string }[] = [
  { code: 'UZ', uz: 'Oʻzbekiston', ru: 'Узбекистан' },
  { code: 'RU', uz: 'Rossiya', ru: 'Россия' },
  { code: 'KZ', uz: 'Qozogʻiston', ru: 'Казахстан' },
  { code: 'KG', uz: 'Qirgʻiziston', ru: 'Кыргызстан' },
  { code: 'TJ', uz: 'Tojikiston', ru: 'Таджикистан' },
  { code: 'TM', uz: 'Turkmaniston', ru: 'Туркменистан' },
  { code: 'BY', uz: 'Belarus', ru: 'Беларусь' },
  { code: 'UA', uz: 'Ukraina', ru: 'Украина' },
  { code: 'AZ', uz: 'Ozarbayjon', ru: 'Азербайджан' },
  { code: 'AM', uz: 'Armaniston', ru: 'Армения' },
  { code: 'GE', uz: 'Gruziya', ru: 'Грузия' },
  { code: 'TR', uz: 'Turkiya', ru: 'Турция' },
  { code: 'OTHER', uz: 'Boshqa', ru: 'Другая' },
];

/** Hozircha bitta fan; ro'yxat kengaytiriladi. */
export const SUBJECTS: { code: string; uz: string; ru: string }[] = [
  { code: 'russian', uz: 'Rus tili', ru: 'Русский язык' },
];

export const PROFICIENCY: { code: string; uz: string; ru: string }[] = [
  { code: 'A2', uz: 'A2', ru: 'A2' },
  { code: 'B1', uz: 'B1', ru: 'B1' },
  { code: 'B2', uz: 'B2', ru: 'B2' },
  { code: 'C1', uz: 'C1', ru: 'C1' },
  { code: 'C2', uz: 'C2', ru: 'C2' },
  { code: 'native', uz: 'Ona tili', ru: 'Носитель языка' },
];

export const DEGREES: { code: string; uz: string; ru: string }[] = [
  { code: 'college', uz: 'Kollej / texnikum', ru: 'Колледж / техникум' },
  { code: 'bachelor', uz: 'Bakalavr', ru: 'Бакалавр' },
  { code: 'specialist', uz: 'Mutaxassis', ru: 'Специалист' },
  { code: 'master', uz: 'Magistr', ru: 'Магистр' },
  { code: 'phd', uz: 'Fan nomzodi / PhD', ru: 'Кандидат наук / PhD' },
  { code: 'other', uz: 'Boshqa', ru: 'Другое' },
];

export const TIMEZONES = ['Asia/Tashkent', 'Europe/Moscow', 'Asia/Almaty', 'Asia/Bishkek', 'Asia/Dushanbe', 'Europe/Samara', 'Asia/Yekaterinburg', 'Asia/Novosibirsk'] as const;
export const DEFAULT_TIMEZONE = 'Asia/Tashkent';

/* ─────────────────────────── Xatolar ─────────────────────────── */

export const ERRORS = {
  required: { uz: 'Toʻldirilishi shart', ru: 'Обязательное поле' },
  name: { uz: 'Faqat harflar, 2–50 belgi', ru: 'Только буквы, 2–50 символов' },
  choose: { uz: 'Roʻyxatdan tanlang', ru: 'Выберите из списка' },
  path: { uz: 'Yoʻlni tanlang', ru: 'Выберите путь' },
  photo: { uz: 'Surat yuklang', ru: 'Загрузите фото' },
  certificates: { uz: 'Kamida bitta sertifikat va uning skanini qoʻshing', ru: 'Добавьте хотя бы один сертификат и его скан' },
  certDocument: { uz: 'Sertifikat skanini yuklang', ru: 'Загрузите скан документа' },
  years: { uz: 'Yillar notoʻgʻri', ru: 'Неверные годы' },
  text: { uz: 'Matn juda qisqa yoki juda uzun', ru: 'Текст слишком короткий или длинный' },
  aboutLength: { uz: 'Matn 300–1500 belgi boʻlishi kerak', ru: 'Текст должен быть 300–1500 символов' },
  video: { uz: 'Video yuklang (kamida 1 daqiqa)', ru: 'Загрузите видео (минимум 1 минута)' },
  videoShort: { uz: 'Video kamida 1 daqiqa boʻlishi kerak', ru: 'Видео должно быть не короче 1 минуты' },
  schedule: { uz: 'Kamida bitta vaqt oraligʻini belgilang', ru: 'Отметьте хотя бы один интервал' },
  interval: { uz: 'Boshlanish tugashdan oldin boʻlishi kerak', ru: 'Начало должно быть раньше конца' },
  overlap: { uz: 'Vaqt oraliqlari ustma-ust tushmasin', ru: 'Интервалы не должны пересекаться' },
  timezone: { uz: 'Vaqt zonasini tanlang', ru: 'Выберите часовой пояс' },
  price: { uz: 'Narx ruxsat etilgan oraliqda boʻlsin', ru: 'Цена вне допустимого диапазона' },
  terms: { uz: 'Shartlarga rozilik bering', ru: 'Подтвердите согласие с условиями' },
  phone: { uz: 'Raqamni mamlakat kodi bilan yozing: +998 90 123 45 67', ru: 'Номер с кодом страны: +998 90 123 45 67' },
  telegram: { uz: 'Telegram: @username yoki telefon raqam', ru: 'Telegram: @username или номер телефона' },
  messenger: { uz: 'Telegram yoki WhatsApp — kamida bittasini yozing', ru: 'Укажите Telegram или WhatsApp — хотя бы один' },
} as const;
export type ErrorCode = keyof typeof ERRORS;
export type FieldErrors = Record<string, ErrorCode>;

/* ─────────────────────────── Ma'lumot turlari ─────────────────────────── */

export type PersonalData = {
  first_name: string; last_name: string; birth_country: string; subject: string; proficiency: string; path: OnboardingPath | '';
  /** Aloqa — faqat admin ko'radi (o'quvchiga ko'rsatilmaydi). Telefon shart, Telegram yoki WhatsApp — kamida bittasi. */
  contact_phone: string; contact_telegram: string; contact_whatsapp: string;
};
export type CertificateRow = { title: string; institution: string; year_from: number | null; year_to: number | null; document_ids: number[] };
export type EducationRow = { institution: string; specialty: string; degree: string; year_from: number | null; year_to: number | null };
export const ABOUT_QUESTIONS = [
  { key: 'who', uz: 'Kimsiz va qayerdansiz?', ru: 'Кто вы и откуда?' },
  { key: 'background', uz: 'Oʻqituvchilikdan oldin nima bilan shugʻullangansiz / hozir nima bilan bandsiz?', ru: 'Чем вы занимались до преподавания / чем занимаетесь сейчас?' },
  { key: 'years', uz: 'Bu fanni necha yildan beri oʻrgatasiz?', ru: 'Сколько лет вы преподаёте этот предмет?' },
  { key: 'students', uz: 'Qanday oʻquvchilar bilan ishlagansiz (daraja, yosh, maqsad)?', ru: 'С какими учениками вы работали (уровни, возраст, цели)?' },
  { key: 'method', uz: 'Darslaringiz qanday oʻtadi, metodingiz nimada?', ru: 'Как проходят ваши уроки, в чём ваш метод?' },
  { key: 'why', uz: 'Nega oʻquvchi aynan sizni tanlashi kerak?', ru: 'Почему ученику стоит выбрать вас?' },
] as const;
export type AboutAnswers = Partial<Record<(typeof ABOUT_QUESTIONS)[number]['key'], string>>;
export type ScheduleSlot = { weekday: number; start: string; end: string };
export type ScheduleData = { timezone: string; slots: ScheduleSlot[] };

export const ABOUT_MIN = 300;
export const ABOUT_MAX = 1500;
export const ANSWER_MAX = 600;
export const VIDEO_MIN_SECONDS = 60;
export const VIDEO_MAX_SECONDS = 600;
export const VIDEO_MAX_BYTES = 200 * 1024 * 1024;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

/* ─────────────────────────── Tekshiruvlar ─────────────────────────── */

const NAME_RE = /^[\p{L}][\p{L}' ʼʻ‘’-]{0,48}[\p{L}]$/u;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const thisYear = () => new Date().getFullYear();
const yearOk = (y: unknown) => y == null || y === '' || (Number.isInteger(Number(y)) && Number(y) >= 1950 && Number(y) <= thisYear() + 6);
const yearsOk = (a: unknown, b: unknown) => yearOk(a) && yearOk(b) && !(a != null && b != null && a !== '' && b !== '' && Number(a) > Number(b));
const toYear = (y: unknown) => (y == null || y === '' ? null : Number(y));

export function validatePersonal(d: Partial<PersonalData>): FieldErrors {
  const e: FieldErrors = {};
  for (const f of ['first_name', 'last_name'] as const) {
    const v = str(d[f]);
    if (!v) e[f] = 'required';
    else if (!NAME_RE.test(v)) e[f] = 'name';
  }
  if (!COUNTRIES.some((c) => c.code === d.birth_country)) e.birth_country = 'choose';
  if (!SUBJECTS.some((c) => c.code === d.subject)) e.subject = 'choose';
  if (!PROFICIENCY.some((c) => c.code === d.proficiency)) e.proficiency = 'choose';
  if (d.path !== 'certified' && d.path !== 'experienced') e.path = 'path';
  if (!normalizePhone(d.contact_phone)) e.contact_phone = str(d.contact_phone) ? 'phone' : 'required';
  const tg = str(d.contact_telegram), wa = str(d.contact_whatsapp);
  if (tg && !normalizeTelegram(tg)) e.contact_telegram = 'telegram';
  if (wa && !normalizePhone(wa)) e.contact_whatsapp = 'phone';
  if (!tg && !wa) e.contact_telegram = 'messenger';
  return e;
}

/** «+998 90 123-45-67», «998901234567», «90 123 45 67» → «+998901234567». Noto'g'ri bo'lsa — null. */
export function normalizePhone(v: unknown): string | null {
  const raw = str(v);
  if (!raw || /[^\d\s()+-]/.test(raw)) return null;
  let d = raw.replace(/\D/g, '');
  if (d.length === 9 && !raw.trim().startsWith('+')) d = `998${d}`;
  return d.length >= 10 && d.length <= 15 ? `+${d}` : null;
}

/** Telegram: «@username», «t.me/username» → «@username»; telefon raqam ham bo'ladi. */
export function normalizeTelegram(v: unknown): string | null {
  const raw = str(v).replace(/^https?:\/\/(www\.)?/i, '').replace(/^t(elegram)?\.me\//i, '@');
  const user = raw.startsWith('@') ? raw.slice(1) : raw;
  if (/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(user)) return `@${user}`;
  return normalizePhone(raw);
}

export function normalizeCertificates(rows: unknown): CertificateRow[] {
  return (Array.isArray(rows) ? rows : []).slice(0, 10).map((r) => {
    const x = (r ?? {}) as Record<string, unknown>;
    return {
      title: str(x.title).slice(0, 160),
      institution: str(x.institution).slice(0, 160),
      year_from: toYear(x.year_from),
      year_to: toYear(x.year_to),
      document_ids: (Array.isArray(x.document_ids) ? x.document_ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 10),
    };
  });
}

export function validateCertificates(rows: CertificateRow[]): FieldErrors {
  const e: FieldErrors = {};
  if (!rows.length) e.certificates = 'certificates';
  rows.forEach((r, i) => {
    if (r.title.length < 2) e[`certificates.${i}.title`] = 'required';
    if (r.institution.length < 2) e[`certificates.${i}.institution`] = 'required';
    if (!yearsOk(r.year_from, r.year_to)) e[`certificates.${i}.years`] = 'years';
    if (!r.document_ids.length) e[`certificates.${i}.documents`] = 'certDocument';
  });
  return e;
}

export function normalizeEducation(rows: unknown): EducationRow[] {
  return (Array.isArray(rows) ? rows : []).slice(0, 10).map((r) => {
    const x = (r ?? {}) as Record<string, unknown>;
    return {
      institution: str(x.institution).slice(0, 160),
      specialty: str(x.specialty).slice(0, 160),
      degree: str(x.degree),
      year_from: toYear(x.year_from),
      year_to: toYear(x.year_to),
    };
  });
}

/** Ta'lim ixtiyoriy (oliy ma'lumotsiz tajribali ustoz ham bo'ladi), lekin qo'shilgan har qator to'liq bo'lsin. */
export function validateEducation(rows: EducationRow[]): FieldErrors {
  const e: FieldErrors = {};
  rows.forEach((r, i) => {
    if (r.institution.length < 2) e[`education.${i}.institution`] = 'required';
    if (r.specialty.length < 2) e[`education.${i}.specialty`] = 'required';
    if (!DEGREES.some((d) => d.code === r.degree)) e[`education.${i}.degree`] = 'choose';
    if (!yearsOk(r.year_from, r.year_to)) e[`education.${i}.years`] = 'years';
  });
  return e;
}

export function normalizeAnswers(a: unknown): AboutAnswers {
  const x = (a ?? {}) as Record<string, unknown>;
  const out: AboutAnswers = {};
  for (const q of ABOUT_QUESTIONS) {
    const v = str(x[q.key]).slice(0, ANSWER_MAX);
    if (v) out[q.key] = v;
  }
  return out;
}

export function validateAbout(answers: AboutAnswers, about: string): FieldErrors {
  const e: FieldErrors = {};
  for (const q of ABOUT_QUESTIONS) if ((answers[q.key] ?? '').length < 3) e[`answers.${q.key}`] = 'required';
  const n = about.trim().length;
  if (n < ABOUT_MIN || n > ABOUT_MAX) e.about = 'aboutLength';
  return e;
}

export function validateVideo(durationSec: number | null | undefined, url: string | null | undefined): FieldErrors {
  if (!url) return { video: 'video' };
  if (!durationSec || durationSec < VIDEO_MIN_SECONDS) return { video: 'videoShort' };
  return {};
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Standart shablon: Du–Ju 09:00–12:00 va 14:00–18:00. */
export const DEFAULT_SCHEDULE: ScheduleData = {
  timezone: DEFAULT_TIMEZONE,
  slots: [1, 2, 3, 4, 5].flatMap((weekday) => [
    { weekday, start: '09:00', end: '12:00' },
    { weekday, start: '14:00', end: '18:00' },
  ]),
};

export function normalizeSchedule(d: unknown): ScheduleData {
  const x = (d ?? {}) as Record<string, unknown>;
  const slots = (Array.isArray(x.slots) ? x.slots : []).slice(0, 70).map((s) => {
    const y = (s ?? {}) as Record<string, unknown>;
    return { weekday: Number(y.weekday), start: str(y.start), end: str(y.end) };
  });
  slots.sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));
  return { timezone: str(x.timezone) || DEFAULT_TIMEZONE, slots };
}

export function validateSchedule(d: ScheduleData): FieldErrors {
  const e: FieldErrors = {};
  if (!(TIMEZONES as readonly string[]).includes(d.timezone)) e.timezone = 'timezone';
  if (!d.slots.length) e.schedule = 'schedule';
  d.slots.forEach((s, i) => {
    if (!Number.isInteger(s.weekday) || s.weekday < 1 || s.weekday > 7 || !TIME_RE.test(s.start) || !TIME_RE.test(s.end)) e[`slots.${i}`] = 'required';
    else if (minutes(s.start) >= minutes(s.end)) e[`slots.${i}`] = 'interval';
  });
  for (let i = 0; i < d.slots.length; i++) {
    for (let j = i + 1; j < d.slots.length; j++) {
      const a = d.slots[i], b = d.slots[j];
      if (a.weekday === b.weekday && minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end)) e[`slots.${j}`] = 'overlap';
    }
  }
  return e;
}

/* ─────────────────────────── Narx va komissiya ─────────────────────────── */

export type CommissionTier = { up_to: number | null; percent: number };
export type OnboardingSettings = { price_min_uzs: number; price_max_uzs: number; commission_tiers: CommissionTier[]; terms_version: string };

/** TZ 9.2: 1–20 dars 33%, 21–50 — 28%, 51–200 — 25%, 201–400 — 22%, 400 dan keyin — 18%. */
export const DEFAULT_COMMISSION_TIERS: CommissionTier[] = [
  { up_to: 20, percent: 33 },
  { up_to: 50, percent: 28 },
  { up_to: 200, percent: 25 },
  { up_to: 400, percent: 22 },
  { up_to: null, percent: 18 },
];
export const TERMS_VERSION = '2026-10-23';
export const DEFAULT_SETTINGS: OnboardingSettings = {
  price_min_uzs: 30_000,
  price_max_uzs: 500_000,
  commission_tiers: DEFAULT_COMMISSION_TIERS,
  terms_version: TERMS_VERSION,
};

/** Admin kiritgan shkala: o'suvchi chegaralar, oxirgisi cheksiz, foizlar 0–100. */
export function validateTiers(tiers: unknown): CommissionTier[] | null {
  if (!Array.isArray(tiers) || tiers.length < 1 || tiers.length > 10) return null;
  const out: CommissionTier[] = [];
  let prev = 0;
  for (let i = 0; i < tiers.length; i++) {
    const t = (tiers[i] ?? {}) as Record<string, unknown>;
    const last = i === tiers.length - 1;
    const percent = Number(t.percent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null;
    if (last) {
      if (t.up_to != null && t.up_to !== '') return null;
      out.push({ up_to: null, percent });
    } else {
      const up = Number(t.up_to);
      if (!Number.isInteger(up) || up <= prev) return null;
      out.push({ up_to: up, percent });
      prev = up;
    }
  }
  return out;
}

/** N-chi dars (1 dan) qaysi stavkada: 21-dars allaqachon ikkinchi pog'onada. */
export function commissionForLesson(n: number, tiers: CommissionTier[] = DEFAULT_COMMISSION_TIERS): number {
  for (const t of tiers) if (t.up_to == null || n <= t.up_to) return t.percent;
  return tiers[tiers.length - 1].percent;
}

/** Kabinetdagi vidjet: hozirgi stavka (keyingi dars uchun) va keyingi pasayishgacha nechta dars qoldi. */
export function commissionStatus(completedLessons: number, tiers: CommissionTier[] = DEFAULT_COMMISSION_TIERS) {
  const next = completedLessons + 1;
  const current = commissionForLesson(next, tiers);
  const tier = tiers.find((t) => t.up_to == null || next <= t.up_to)!;
  const following = tier.up_to == null ? null : commissionForLesson(tier.up_to + 1, tiers);
  return {
    completed: completedLessons,
    percent: current,
    next_percent: following,
    lessons_until_next: tier.up_to == null ? null : tier.up_to - completedLessons,
  };
}

export const teacherNet = (priceUzs: number, percent: number) => Math.round(priceUzs * (100 - percent) / 100);

export function validatePricing(price: unknown, termsAccepted: unknown, s: OnboardingSettings = DEFAULT_SETTINGS): FieldErrors {
  const e: FieldErrors = {};
  const p = Number(price);
  if (!Number.isInteger(p) || p < s.price_min_uzs || p > s.price_max_uzs) e.lesson_price_uzs = 'price';
  if (termsAccepted !== true) e.terms = 'terms';
  return e;
}

/* ─────────────────────────── «O'zim haqimda» shabloni ─────────────────────────── */

/** AI ishlamasa ham qadam to'xtamasin: javoblardan oddiy matn yig'iladi (TZ 6). */
export function aboutFromTemplate(a: AboutAnswers, lang: Lang): string {
  const s = (k: keyof AboutAnswers) => (a[k] ?? '').trim().replace(/[.!?]*$/, '');
  const parts = lang === 'ru'
    ? [
        s('who') && `${s('who')}.`,
        s('background') && `${s('background')}.`,
        s('years') && `Преподаю русский язык: ${s('years')}.`,
        s('students') && `Работал(а) с учениками: ${s('students')}.`,
        s('method') && `Как проходят мои уроки: ${s('method')}.`,
        s('why') && `Почему стоит выбрать меня: ${s('why')}.`,
      ]
    : [
        s('who') && `${s('who')}.`,
        s('background') && `${s('background')}.`,
        s('years') && `Rus tilini oʻrgatish tajribam: ${s('years')}.`,
        s('students') && `Kimlar bilan ishlaganman: ${s('students')}.`,
        s('method') && `Darslarim qanday oʻtadi: ${s('method')}.`,
        s('why') && `Nega meni tanlash kerak: ${s('why')}.`,
      ];
  return parts.filter(Boolean).join(' ').slice(0, ABOUT_MAX);
}

/* ─────────────────────────── Shartlar ─────────────────────────── */

const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/ /g, ' ');

/** Shartlar matni sozlamalardan quriladi: admin shkalani o'zgartirsa matn ham o'zgaradi. */
export function termsText(s: OnboardingSettings, lang: Lang): string[] {
  const t = s.commission_tiers;
  const ranges = t.map((tier, i) => {
    const from = i === 0 ? 1 : (t[i - 1].up_to ?? 0) + 1;
    if (lang === 'ru') return tier.up_to == null ? `с ${from}-го урока и далее — ${tier.percent}% (постоянно)` : `${from}–${tier.up_to}-й урок — ${tier.percent}%`;
    return tier.up_to == null ? `${from}-darsdan boshlab — ${tier.percent}% (doimiy)` : `${from}–${tier.up_to}-darslar — ${tier.percent}%`;
  });
  return lang === 'ru'
    ? [
        `Цена одного урока указывается в узбекских сумах, от ${fmt(s.price_min_uzs)} до ${fmt(s.price_max_uzs)} сум.`,
        'Пробный урок для преподавателя бесплатный: оплата ученика за пробный урок полностью (100%) поступает компании FalaRus и не начисляется преподавателю.',
        `С каждого оплаченного урока FalaRus удерживает комиссию платформы. Ставка зависит от числа уроков, проведённых на платформе: ${ranges.join('; ')}.`,
        'Текущая ставка и число уроков до следующего снижения видны в кабинете преподавателя.',
        'Профиль появляется в каталоге только после проверки администрацией. Документы и сертификаты видны только администрации.',
        'FalaRus может изменить условия; новая версия вступает в силу после повторного согласия преподавателя.',
      ]
    : [
        `Bir dars narxi oʻzbek soʻmida koʻrsatiladi: ${fmt(s.price_min_uzs)} soʻmdan ${fmt(s.price_max_uzs)} soʻmgacha.`,
        'Sinov darsi oʻqituvchi uchun bepul: oʻquvchining sinov darsi uchun toʻlovi toʻliq (100%) FalaRus kompaniyasiga tushadi va oʻqituvchi hisobiga yozilmaydi.',
        `Har bir toʻlangan darsdan FalaRus platforma komissiyasini ushlab qoladi. Stavka platformada oʻtkazilgan darslar soniga bogʻliq: ${ranges.join('; ')}.`,
        'Joriy stavka va keyingi pasayishgacha qolgan darslar soni oʻqituvchi kabinetida koʻrinadi.',
        'Profil katalogda faqat maʼmuriyat tekshiruvidan keyin chiqadi. Hujjat va sertifikatlarni faqat maʼmuriyat koʻradi.',
        'FalaRus shartlarni oʻzgartirishi mumkin; yangi tahrir oʻqituvchi qayta rozilik bergandan keyin kuchga kiradi.',
      ];
}

/* ─────────────────────────── Butun anketa ─────────────────────────── */

export type OnboardingData = {
  personal: Partial<PersonalData>;
  avatar_url: string | null;
  certificates: CertificateRow[];
  education: EducationRow[];
  about_answers: AboutAnswers;
  about: string;
  video_url: string | null;
  video_duration_sec: number | null;
  schedule: ScheduleData;
  lesson_price_uzs: number | null;
  terms_accepted: boolean;
};

/** Har qadam bo'yicha xatolar — yuborishdan oldin va admin ko'rinishida ishlatiladi. */
export function validateStep(step: number, d: OnboardingData, s: OnboardingSettings = DEFAULT_SETTINGS): FieldErrors {
  switch (step) {
    case 1: return validatePersonal(d.personal);
    case 2: return d.avatar_url ? {} : { avatar_url: 'photo' };
    case 3: return d.personal.path === 'experienced' ? {} : validateCertificates(d.certificates);
    case 4: return validateEducation(d.education);
    case 5: return validateAbout(d.about_answers, d.about);
    case 6: return validateVideo(d.video_duration_sec, d.video_url);
    case 7: return validateSchedule(d.schedule);
    case 8: return validatePricing(d.lesson_price_uzs, d.terms_accepted, s);
    default: return {};
  }
}

/** Yuborishga tayyormi: yo'l bo'yicha kerakli barcha qadamlar xatosiz. Birinchi xatoli qadamni qaytaradi. */
export function firstInvalidStep(d: OnboardingData, s: OnboardingSettings = DEFAULT_SETTINGS): number | null {
  for (const step of stepsForPath((d.personal.path || null) as OnboardingPath | null)) {
    if (Object.keys(validateStep(step, d, s)).length) return step;
  }
  return null;
}

export function errorText(code: ErrorCode, lang: Lang): string {
  return ERRORS[code][lang];
}

/* ─────────────────────────── Jadval → aniq vaqtlar ─────────────────────────── */

/** `tz` dagi devor soati (y-m-d h:m) qaysi UTC lahzaga to'g'ri keladi. */
export function zonedToUtc(y: number, m: number, d: number, h: number, min: number, tz: string): number {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const offset = (t: number) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(t)).filter((x) => x.type !== 'literal').map((x) => [x.type, Number(x.value)]));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - t;
  };
  const first = guess - offset(guess);
  return guess - offset(first);
}

/**
 * Kelgusi kunlardagi soatlik boshlanish vaqtlari (UTC ms). Jadval o'qituvchining vaqt
 * zonasida; o'quvchiga natija o'z vaqtida ko'rsatiladi (`new Date(ms)`).
 */
export function upcomingSlotStarts(schedule: ScheduleData, now: number, days = 14): number[] {
  const out: number[] = [];
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: schedule.timezone }).format(new Date(now)).split('-').map(Number);
  for (let i = 0; i < days; i++) {
    const base = new Date(Date.UTC(today[0], today[1] - 1, today[2] + i));
    const weekday = base.getUTCDay() === 0 ? 7 : base.getUTCDay();
    for (const s of schedule.slots) {
      if (s.weekday !== weekday) continue;
      const end = minutes(s.end);
      for (let m = minutes(s.start); m + 60 <= end; m += 60) {
        const t = zonedToUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), Math.floor(m / 60), m % 60, schedule.timezone);
        if (t > now) out.push(t);
      }
    }
  }
  return out.sort((a, b) => a - b);
}
