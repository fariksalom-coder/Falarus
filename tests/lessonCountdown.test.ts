/** lessonCountdown — darsgacha qolgan vaqtning raqamli sanog'i. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { lessonCountdown, needsCountdown, LESSON_WINDOW_MS } from '../src/utils/lessonCountdown';

const NOW = new Date('2026-08-01T10:00:00Z').getTime();
const at = (msFromNow: number) => new Date(NOW + msFromNow).toISOString();

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('lessonCountdown', () => {
  it('vaqt yo‘q yoki noto‘g‘ri bo‘lsa — sanoq yo‘q', () => {
    assert.strictEqual(lessonCountdown(null, NOW), null);
    assert.strictEqual(lessonCountdown('shunchaki matn', NOW), null);
  });

  it('soat:daqiqa:soniya ko‘rinishida sanaydi', () => {
    const r = lessonCountdown(at(4 * HOUR + 7 * MIN + 12 * SEC), NOW);
    assert.deepStrictEqual(r, { text: '04:07:12', urgent: false, started: false });
  });

  it('bir soatdan kam qolganda ham soat ustuni turadi va shoshilinch bo‘ladi', () => {
    const r = lessonCountdown(at(12 * MIN + 34 * SEC), NOW);
    assert.deepStrictEqual(r, { text: '00:12:34', urgent: true, started: false });
  });

  it('barcha ustunlar ikki xonali', () => {
    assert.strictEqual(lessonCountdown(at(5 * MIN + 7 * SEC), NOW)?.text, '00:05:07');
    assert.strictEqual(lessonCountdown(at(9 * SEC), NOW)?.text, '00:00:09');
  });

  it('bir kundan ko‘p qolsa — kun + soat:daqiqa:soniya', () => {
    const r = lessonCountdown(at(2 * DAY + 3 * HOUR + 12 * MIN + 45 * SEC), NOW);
    assert.deepStrictEqual(r, { text: '2 kun 03:12:45', urgent: false, started: false });
  });

  it('roppa-rosa bir soat — hali shoshilinch emas', () => {
    const r = lessonCountdown(at(HOUR), NOW);
    assert.strictEqual(r?.text, '01:00:00');
    assert.strictEqual(r?.urgent, false);
  });

  it('bir soniya kam qolganda — shoshilinchga o‘tadi', () => {
    const r = lessonCountdown(at(HOUR - SEC), NOW);
    assert.strictEqual(r?.text, '00:59:59');
    assert.strictEqual(r?.urgent, true);
  });

  it('har soniyada raqam o‘zgaradi', () => {
    const a = lessonCountdown(at(30 * MIN), NOW)?.text;
    const b = lessonCountdown(at(30 * MIN), NOW + SEC)?.text;
    assert.strictEqual(a, '00:30:00');
    assert.strictEqual(b, '00:29:59');
  });

  it('dars boshlanganda — «Hozir boshlandi»', () => {
    assert.deepStrictEqual(lessonCountdown(at(0), NOW), {
      text: 'Hozir boshlandi',
      urgent: true,
      started: true,
    });
    assert.strictEqual(lessonCountdown(at(-30 * MIN), NOW)?.started, true);
  });

  it('dars oynasi tugagach — sanoq yo‘qoladi', () => {
    assert.strictEqual(lessonCountdown(at(-LESSON_WINDOW_MS - SEC), NOW), null);
  });
});

describe('needsCountdown', () => {
  it('kelajakdagi dars uchun — ha', () => {
    assert.strictEqual(needsCountdown(at(2 * HOUR), NOW), true);
  });

  it('endigina boshlangan dars uchun — ha', () => {
    assert.strictEqual(needsCountdown(at(-5 * MIN), NOW), true);
  });

  it('eski dars yoki vaqtsiz dars uchun — yo‘q', () => {
    assert.strictEqual(needsCountdown(at(-LESSON_WINDOW_MS - SEC), NOW), false);
    assert.strictEqual(needsCountdown(null, NOW), false);
  });
});
