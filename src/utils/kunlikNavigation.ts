import { isValidDailyCourseDay } from '../../shared/dailyCourseDay';

/**
 * Kunning BLOKLARI sahifasi (Grammatika, Lug'at, O'qish, Gapirish, Suhbat).
 *
 * Ilgari bu bosh sahifa edi va yo'l `/?kun=N` ko'rinishida bo'lardi. Endi
 * ilovaning birinchi ekrani — xarita, kun bloklari esa o'z manzilida:
 * `/kunlik-reja/kun/N`. Shu funksiya orqali yuriladigan hamma joy (35 dan
 * ortiq chaqiruv) bir joydan boshqariladi.
 *
 * Kun berilmasa — xarita (`/`), chunki qaysi kunga qaytishni bilmaymiz.
 */
export function kunlikRejaPath(dayNum?: number): string {
  if (dayNum != null && isValidDailyCourseDay(dayNum)) {
    return `/kunlik-reja/kun/${dayNum}`;
  }
  return '/';
}

/**
 * XARITA — ilovaning bosh ekrani va kunlik ishning MARKAZI.
 *
 * Blokdan chiqqanda yoki uni tugatganda o'quvchi shu yerga qaytadi: xaritada
 * bugungi beshta qadam turadi, tugagani ✓ bilan, keyingisi strelka bilan
 * belgilanadi. Ya'ni odam har blokdan keyin o'z o'rnini ko'radi.
 *
 * `kunlikRejaPath()` dan farqi: u KUNNING SAHIFASIga (beshta karta) olib
 * boradi va endi faqat takrorlash uchun kerak — asosiy oqimda emas.
 */
export function xaritaYoli(): string {
  return '/';
}
