/**
 * teacherListingPrice.test.ts — o'qituvchi ro'yxati narxi qat'iy 300 000 so'm.
 *
 * Nega kerak: narx tarixan uch xil bo'lgan (299 000, 69 000 promo, 300 000) va
 * uchta to'lov yo'li (Rahmat onlayn, chek, /teacher/me/listing-payment) uni
 * bitta funksiyadan oladi. Shu funksiya bo'shashsa, o'qituvchidan noto'g'ri
 * summa olinadi — shuning uchun qiymat testda qulflangan.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEACHER_LISTING_PLAN_FIRST,
  TEACHER_LISTING_PLAN_MONTH,
  TEACHER_LISTING_PRICE_UZS,
  getTeacherListingPriceUzs,
  isTeacherListingPlanCode,
  resolveTeacherListingPlanCode,
} from '../shared/paymentProducts';

describe('o‘qituvchi ro‘yxati narxi', () => {
  it('qat’iy 300 000 so‘m', () => {
    assert.strictEqual(TEACHER_LISTING_PRICE_UZS, 300_000);
  });

  it('ikkala tarif kodi ham bir xil narx — birinchi oy chegirmasi yo‘q', () => {
    assert.strictEqual(getTeacherListingPriceUzs(TEACHER_LISTING_PLAN_FIRST), 300_000);
    assert.strictEqual(getTeacherListingPriceUzs(TEACHER_LISTING_PLAN_MONTH), 300_000);
  });

  it('eski 69 000 lik promo hech qaysi koddan qaytmaydi', () => {
    for (const code of [TEACHER_LISTING_PLAN_FIRST, TEACHER_LISTING_PLAN_MONTH]) {
      assert.notStrictEqual(getTeacherListingPriceUzs(code), 69_000);
      assert.ok(
        getTeacherListingPriceUzs(code) >= 300_000,
        `${code} uchun narx 300 000 dan past bo‘lmasin`
      );
    }
  });

  it('noma’lum kod kelsa ham arzon narx chiqmaydi', () => {
    const notmalum = 'teacher_listing_promo_uzs' as never;
    assert.strictEqual(getTeacherListingPriceUzs(notmalum), 300_000);
  });

  it('tarif tanlash chegirma tarixidan qat’i nazar oylik kodni beradi', () => {
    assert.strictEqual(resolveTeacherListingPlanCode(false), TEACHER_LISTING_PLAN_MONTH);
    assert.strictEqual(resolveTeacherListingPlanCode(true), TEACHER_LISTING_PLAN_MONTH);
  });

  it('faqat ikkita haqiqiy tarif kodi tan olinadi', () => {
    assert.ok(isTeacherListingPlanCode(TEACHER_LISTING_PLAN_FIRST));
    assert.ok(isTeacherListingPlanCode(TEACHER_LISTING_PLAN_MONTH));
    assert.strictEqual(isTeacherListingPlanCode('teacher_listing_promo_uzs'), false);
    assert.strictEqual(isTeacherListingPlanCode(null), false);
  });
});
