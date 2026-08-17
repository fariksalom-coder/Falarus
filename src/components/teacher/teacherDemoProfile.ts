import type { TeacherProfile, TeacherStudentReview } from '../../api/teachers';

/**
 * Namuna (demo) o'qituvchi profili — `/teachers/namuna` orqali dizaynni to'liq
 * ma'lumot bilan ko'rish uchun (production'da hali o'qituvchilar yo'q). Faqat UI preview.
 */
export const DEMO_TEACHER_PROFILE: TeacherProfile = {
  user_id: 0,
  first_name: 'Malika',
  last_name: 'Karimova',
  display_name: 'Malika Karimova',
  age: 31,
  avatar_url: null,
  region: 'Toshkent',
  city: 'Toshkent shahri',
  experience_years: 8,
  experience_months: 4,
  teaching_format: 'online',
  headline: "Rus tili bo'yicha sertifikatlangan repetitor · boshlang'ich va o'rta daraja",
  about:
    "Assalomu alaykum! Men Malika, 8 yildan ortiq rus tili o'qituvchisiman. O'quvchilarimni jonli suhbat, amaliy mashqlar va individual yondashuv orqali o'qitaman. Boshlang'ich darajadan boshlab, erkin so'zlashuvgacha olib chiqaman.",
  subjects: ['Rus tili'],
  teaching_levels: ["Boshlang'ich", "O'rta"],
  languages: ['uz', 'ru'],
  monthly_course_price_amount: 450000,
  monthly_course_price_currency: 'UZS',
  telegram_username: 'malika_teacher',
  public_phone_e164: '+998901234567',
  profile_status: 'active',
  rating_avg: 4.8,
  rating_count: 37,
  is_recommended: true,
  students_total: 120,
  students_success: 104,
  students_failed: 16,
  achievements:
    "· 100 dan ortiq o'quvchi erkin rus tilida so'zlasha oladi\n· 15 o'quvchi rus tili sertifikat imtihonidan a'lo baho bilan o'tdi\n· 2023-yil «Yilning eng yaxshi repetitori» tanlovi finalchisi",
  education: [
    {
      institution: "O'zbekiston Milliy universiteti",
      specialty: 'Rus tili va adabiyoti (bakalavr)',
      start_year: '2011',
      end_year: '2015',
    },
    {
      institution: 'Pushkin nomidagi Rus tili instituti (onlayn)',
      specialty: 'Chet tili sifatida rus tilini o\'qitish',
      start_year: '2016',
      end_year: '2017',
    },
  ],
  certificates: [
    { title: 'ТРКИ — B2 sertifikati', issuer: 'Pushkin instituti', year: '2017' },
    { title: 'Repetitorlik metodikasi', issuer: 'FalaRus akademiyasi', year: '2022' },
  ],
  weekly_availability: [
    { day: 1, from: '09:00', to: '12:00' },
    { day: 1, from: '18:00', to: '21:00' },
    { day: 2, from: '18:00', to: '21:00' },
    { day: 3, from: '09:00', to: '12:00' },
    { day: 4, from: '18:00', to: '21:00' },
    { day: 5, from: '15:00', to: '19:00' },
    { day: 6, from: '10:00', to: '14:00' },
  ],
};

export const DEMO_TEACHER_REVIEWS: TeacherStudentReview[] = [
  {
    id: 1,
    rating: 5,
    what_liked: 'Juda sabrli va tushunarli tushuntiradi',
    opinion: "Malika opa bilan 3 oy o'qidim va endi rus tilida erkin gaplasha olaman. Har bir darsi qiziqarli!",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    rating: 5,
    what_liked: 'Amaliy mashqlar ko\'p',
    opinion: "Grammatikani shunchalik sodda tushuntiradiki, hammasi esda qoladi. Tavsiya qilaman!",
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    rating: 4,
    what_liked: 'Individual yondashuv',
    opinion: 'Darslar vaqtida boshlanadi, uy vazifalarini doim tekshiradi.',
    created_at: new Date().toISOString(),
  },
];
