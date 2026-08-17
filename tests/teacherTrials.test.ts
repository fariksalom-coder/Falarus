/**
 * teacherTrials.test.ts — sinov darsi cheklovi.
 *
 * Talab: bitta o'quvchi 3 ta TURLI ustozdan bittadan sinov darsi oladi,
 * so'ng ulardan birini tanlab to'lov qiladi.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  activeTrialTeacherIds,
  checkTrialBooking,
  STUDENT_TRIAL_TEACHER_LIMIT,
} from '../shared/teacherTrials';

const row = (teacher: number, status = 'paid') => ({ teacher_user_id: teacher, status });

describe('activeTrialTeacherIds', () => {
  it('takrorlanuvchi ustozni bir marta sanaydi', () => {
    const ids = activeTrialTeacherIds([row(10), row(10), row(11)]);
    assert.deepStrictEqual(ids.sort(), [10, 11]);
  });

  it('bekor qilingan darslarni hisobga olmaydi', () => {
    const ids = activeTrialTeacherIds([row(10, 'cancelled_by_student'), row(11, 'paid')]);
    assert.deepStrictEqual(ids, [11]);
  });

  it('bo\'sh ro\'yxatda hech narsa qaytarmaydi', () => {
    assert.deepStrictEqual(activeTrialTeacherIds([]), []);
  });

  it('to\'lovi tugallanmagan yozuv slotni band qilmaydi', () => {
    const ids = activeTrialTeacherIds([row(10, 'pending_payment'), row(11, 'paid')]);
    assert.deepStrictEqual(ids, [11], 'pending_payment — hali dars emas');
  });
});

describe('checkTrialBooking — 3 ta ustoz cheklovi', () => {
  it('chegara 3 ta', () => {
    assert.strictEqual(STUDENT_TRIAL_TEACHER_LIMIT, 3);
  });

  it('birinchi ustoz — ruxsat, 2 ta qoladi', () => {
    const r = checkTrialBooking({ existingRows: [], teacherId: 10 });
    assert.strictEqual(r.allowed, true);
    assert.strictEqual((r as { remaining: number }).remaining, 2);
  });

  it('uchinchi ustoz — ruxsat, 0 qoladi', () => {
    const r = checkTrialBooking({ existingRows: [row(10), row(11)], teacherId: 12 });
    assert.strictEqual(r.allowed, true);
    assert.strictEqual((r as { remaining: number }).remaining, 0);
  });

  it('TO\'RTINCHI ustoz — rad etiladi', () => {
    const r = checkTrialBooking({ existingRows: [row(10), row(11), row(12)], teacherId: 13 });
    assert.strictEqual(r.allowed, false);
    assert.strictEqual((r as { reason: string }).reason, 'limit');
    assert.match((r as { message: string }).message, /3 ta ustozdan/);
  });

  it('allaqachon sinagan ustoziga QAYTA yozilish mumkin (limit to\'lgan bo\'lsa ham)', () => {
    const rows = [row(10), row(11), row(12)];
    const r = checkTrialBooking({ existingRows: rows, teacherId: 11 });
    assert.strictEqual(r.allowed, true);
    assert.strictEqual((r as { reason: string }).reason, 'existing');
  });

  it('bekor qilingan dars o\'rniga boshqa ustozni sinash mumkin', () => {
    const rows = [row(10, 'cancelled_by_teacher'), row(11), row(12)];
    const r = checkTrialBooking({ existingRows: rows, teacherId: 13 });
    assert.strictEqual(r.allowed, true, 'bekor qilingan dars slotni band qilmasligi kerak');
  });

  it('tashlab ketilgan to\'lovlar o\'quvchini bloklab qo\'ymaydi', () => {
    const rows = [
      row(10, 'pending_payment'),
      row(11, 'pending_payment'),
      row(12, 'pending_payment'),
    ];
    const r = checkTrialBooking({ existingRows: rows, teacherId: 13 });
    assert.strictEqual(r.allowed, true);
    assert.strictEqual(r.used, 0);
  });

  it('chegarani sozlash mumkin', () => {
    const r = checkTrialBooking({ existingRows: [row(10)], teacherId: 11, limit: 1 });
    assert.strictEqual(r.allowed, false);
  });
});
