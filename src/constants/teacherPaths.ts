/**
 * O'QITUVCHI PLATFORMASI va O'QUVCHI UCHUN USTOZLAR RO'YXATI — alohida manzillar.
 *
 * Ilgari `/teachers` (o'quvchi ko'radigan ro'yxat) va `/teacher-login`, `/teacher-cabinet`
 * (o'qituvchining o'zi) bir-biriga juda o'xshardi. Endi:
 *   o'qituvchi — /ustoz (kirish), /ustoz/royxat, /ustoz/kabinet;
 *   o'quvchi   — /ustozlar, /ustozlar/:id.
 * Eski manzillar App.tsx da yangisiga yo'naltiriladi (o'rnatilgan ilova va xatcho'plar uchun).
 */
export const TEACHER_LOGIN_PATH = '/ustoz';
export const TEACHER_REGISTER_PATH = '/ustoz/royxat';
export const TEACHER_CABINET_PATH = '/ustoz/kabinet';
export const TEACHERS_LIST_PATH = '/ustozlar';
export const teacherProfilePath = (id: number | string) => `${TEACHERS_LIST_PATH}/${id}`;

/** O'qituvchi platformasining rangi — o'quvchi ilovasining ko'k rangidan ajralib tursin. */
export const TEACHER_BRAND_GRADIENT = 'linear-gradient(135deg, #0F766E 0%, #115E59 55%, #134E4A 100%)';
