/**
 * O'qish testining o'tish chegarasi: kamida 70%.
 *
 * Chegara hisobi serverda ham shu formula bilan bo'ladi
 * (`Math.round((correct / total) * 100) >= READING_QUESTIONS_PASS_PERCENT`),
 * shuning uchun chegara atrofidagi holatlar shu yerda qotiriladi.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { READING_QUESTIONS_PASS_PERCENT } from '../shared/dailyCourseDay';

const percent = (correct: number, total: number) => Math.round((correct / total) * 100);
const passed = (correct: number, total: number) =>
  percent(correct, total) >= READING_QUESTIONS_PASS_PERCENT;

describe('o‘qish testi — 70% chegarasi', () => {
  it('chegara 70%', () => {
    assert.strictEqual(READING_QUESTIONS_PASS_PERCENT, 70);
  });

  it('10 tadan 7 tasi — o‘tadi', () => {
    assert.strictEqual(percent(7, 10), 70);
    assert.strictEqual(passed(7, 10), true);
  });

  it('10 tadan 6 tasi — o‘tmaydi', () => {
    assert.strictEqual(percent(6, 10), 60);
    assert.strictEqual(passed(6, 10), false);
  });

  it('5 tadan 4 tasi — o‘tadi (80%)', () => {
    assert.strictEqual(passed(4, 5), true);
  });

  it('5 tadan 3 tasi — o‘tmaydi (60%)', () => {
    assert.strictEqual(passed(3, 5), false);
  });

  it('3 tadan 2 tasi — 67%, o‘tmaydi', () => {
    assert.strictEqual(percent(2, 3), 67);
    assert.strictEqual(passed(2, 3), false);
  });

  it('hech biri to‘g‘ri emas — o‘tmaydi', () => {
    assert.strictEqual(passed(0, 10), false);
  });

  it('hammasi to‘g‘ri — o‘tadi', () => {
    assert.strictEqual(passed(10, 10), true);
  });
});
