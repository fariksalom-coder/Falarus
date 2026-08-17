/**
 * `normalizeRuAnswer` — ruscha javobni solishtirish uchun me'yorlashtirish.
 *
 * Eslatma: ilgari bu yerda `tryExactTranslationMatch` ham sinalardi — u
 * o'quvchi javobini BAZADAGI etalon javob bilan solishtirardi. Gapirish
 * bo'limida etalon javob umuman ishlatilmaydigan bo'ldi (to'g'ri/xatoni AI
 * o'zi baholaydi), shuning uchun o'sha funksiya olib tashlandi.
 * `normalizeRuAnswer` esa «Ustozdan so'ra» bo'limida ishlashda davom etadi.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRuAnswer, parseCheckStatus, sameRuAnswer } from '../server/lib/openai';

describe('normalizeRuAnswer', () => {
  it('tinish belgilari va katta harfni tozalaydi', () => {
    assert.equal(normalizeRuAnswer('Откуда вы?'), 'откуда вы');
    assert.equal(normalizeRuAnswer('  Я из Узбекистана. '), 'я из узбекистана');
  });

  it('bir xil gaplar bir xil ko‘rinishga keladi', () => {
    assert.equal(normalizeRuAnswer('Откуда вы?'), normalizeRuAnswer('откуда вы'));
  });

  it('turli gaplarni tenglashtirmaydi', () => {
    assert.notEqual(normalizeRuAnswer('Откуда вы?'), normalizeRuAnswer('Где вы?'));
  });
});

/**
 * Modelning `status` maydoni qat'iy `=== 'correct'` bilan solishtirilganda
 * "Correct" yoki "correct " kabi javoblar xatoga chiqib ketardi — o'quvchi
 * to'g'ri javob bergani holda "Noto'g'ri" ko'rardi. Shu regressiya qaytmasin.
 */
describe('parseCheckStatus', () => {
  it('registr va bo‘shliqqa qaramaydi', () => {
    assert.equal(parseCheckStatus('correct', false), 'correct');
    assert.equal(parseCheckStatus('  Correct  ', false), 'correct');
    assert.equal(parseCheckStatus('CORRECT', false), 'correct');
  });

  it('sinonim javoblarni ham to‘g‘ri deb oladi', () => {
    assert.equal(parseCheckStatus('ok', false), 'correct');
    assert.equal(parseCheckStatus('верно', false), 'correct');
    assert.equal(parseCheckStatus('partial', false), 'correct');
  });

  it('status kelmasa: xato izohi bo‘lmasa — to‘g‘ri', () => {
    assert.equal(parseCheckStatus(undefined, false), 'correct');
    assert.equal(parseCheckStatus('', false), 'correct');
    assert.equal(parseCheckStatus(undefined, true), 'wrong');
  });

  it('haqiqiy xatoni xato deb qoldiradi', () => {
    assert.equal(parseCheckStatus('wrong', true), 'wrong');
    assert.equal(parseCheckStatus('incorrect', true), 'wrong');
  });
});

/**
 * O'quvchiga EKRANDA ko'rsatilgan to'g'ri javobni aynan qaytarganda ham AI
 * "xato" derdi va o'quvchi topshiriqdan chiqa olmasdi ("men to'layman" →
 * "Я плачу"). `sameRuAnswer` shu holatda AI hukmini bekor qiladi.
 */
describe('sameRuAnswer', () => {
  it('ko‘rsatilgan javobni aynan qaytarganini tanaydi', () => {
    assert.equal(sameRuAnswer('Я плачу', 'Я плачу'), true);
    assert.equal(sameRuAnswer('я плачу', 'Я плачу.'), true);
    assert.equal(sameRuAnswer('  Я  плачу!  ', 'Я плачу'), true);
  });

  it('«ё» va «е» ni tenglashtiradi', () => {
    assert.equal(sameRuAnswer('Я пойду ещё раз', 'Я пойду еще раз'), true);
  });

  it('boshqa javobni tenglashtirmaydi', () => {
    assert.equal(sameRuAnswer('Ты платишь', 'Я плачу'), false);
    assert.equal(sameRuAnswer('Я плачу', ''), false);
    assert.equal(sameRuAnswer('', ''), false);
  });
});
