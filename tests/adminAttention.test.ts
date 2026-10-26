import test from 'node:test';
import assert from 'node:assert/strict';
import { readAdminAttention } from '../server/services/adminAttention.service';

test('admin badges: counts per section, a missing table counts as 0 and does not break the rest', async () => {
  const answers: [RegExp, number | 'missing'][] = [
    [/support_chat_messages/, 2],
    [/profile_status = 'pending_review'/, 1],
    [/teacher_profile_revisions/, 'missing'],
    [/teacher_withdrawals/, 3],
    [/teacher_lesson_reviews/, 4],
    [/teacher_lessons/, 1],
    [/operator_receipts/, 5],
    [/operator_rahmat_claims/, 0],
    [/operator_debt_deferrals/, 2],
  ];
  const db = {
    query: async (sql: string) => {
      const hit = answers.find(([re]) => re.test(sql));
      if (!hit || hit[1] === 'missing') throw new Error('relation does not exist');
      return { rows: [{ n: hit[1], count: hit[1] }] };
    },
  };
  const a = await readAdminAttention(db as never);
  assert.deepEqual(a.teachers, { total: 9, applications: 1, revisions: 0, withdrawals: 3, reviews: 4, lessons: 1 });
  assert.deepEqual(a.operators, { total: 7, receipts: 5, rahmat: 0, deferrals: 2 });
  assert.equal(a.support, 2);
  assert.equal(a.total, 18);
});
