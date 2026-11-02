/**
 * To'lov kanali haqidagi SOF yordamchilar — brauzerda ham ishlaydi.
 *
 * Nega alohida fayl: `shared/clickPayments.ts` yuqorisida `node:crypto` bor
 * (imzo hisoblash uchun), shuning uchun uni frontend to'plamiga tortib
 * bo'lmaydi — `vite build` "createHash is not exported by
 * __vite-browser-external" deb sinadi. Kanal nomini tekshirish esa hech
 * qanday tugunga bog'liq emas, shuning uchun shu yerda turadi va ikkala
 * tomon ham bitta manbadan foydalanadi.
 */

/** Click shlyuzining checkout/token kanallari. */
export function isClickLikePendingChannel(channel?: string | null): boolean {
  return channel === 'click_button' || channel === 'click_auto_token' || channel === 'click_auto_cron';
}

/**
 * Shlyuz checkout kanali — Click yoki Rahmat.
 *
 * Bunday `pending` yozuv PUL EMAS, shunchaki boshlangan va tugatilmagan
 * checkout. Pul o'tganida shlyuz callback'i yozuvni `approved` qiladi;
 * `pending` bo'lib qolgani — foydalanuvchi oynani yopgani yoki to'lov
 * o'tmagani. Chek yuklash (`manual`) esa buning aksi: unda admin
 * ko'radigan haqiqiy hujjat bor.
 */
export function isGatewayCheckoutChannel(channel?: string | null): boolean {
  return channel === 'rahmat' || isClickLikePendingChannel(channel);
}
