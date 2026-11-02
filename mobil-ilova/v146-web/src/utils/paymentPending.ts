import type { MyPaymentRow } from '../api/payment';
import { isGatewayCheckoutChannel } from '../../shared/paymentChannel';

/**
 * «To'lov tekshirilmoqda» deb sotib olishni TO'SIB QO'YISH faqat haqiqiy chek
 * uchun to'g'ri: foydalanuvchi hujjat yuklagan, admin uni ko'rishi kerak.
 *
 * Shlyuz (Rahmat/Click) `pending` yozuvi esa — tugatilmagan checkout. Pul
 * o'tganida callback uni `approved` qiladi; `pending` bo'lib qolgani odam
 * oynani yopgani yoki to'lamaganini bildiradi. Bunday yozuv ortida pul yo'q,
 * shuning uchun u qayta to'lashga TO'SQINLIK QILMASLIGI kerak — aks holda
 * foydalanuvchi Rahmat oynasini bir marta ochib yopgani uchun 24 soatgacha
 * «tekshirilmoqda» ekranida qamalib qoladi.
 *
 * Server ham xuddi shu qoidaga amal qiladi: yangi checkout so'ralganda eski
 * shlyuz `pending` yozuvi `rejected` qilinib, yangi invoice ochiladi.
 */
export function isAdminReviewPending(row: MyPaymentRow): boolean {
  // Kanali noma'lum eski yozuv — ehtiyot yuzasidan to'siq deb qaraymiz
  // (bazada kanalsiz `pending` yozuv yo'q, bu faqat himoya).
  return !isGatewayCheckoutChannel(row.payment_channel ?? null);
}
