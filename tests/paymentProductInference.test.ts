import test from 'node:test';
import assert from 'node:assert/strict';
import { inferCourseProductFromPaymentAmount, resolveApprovedCourseProduct } from '../shared/paymentsProofUrl';

test('a 1 000 so\'m teacher lesson is not taken for the VNZh test price', () => {
  const lesson = { amount: 1000, currency: 'UZS', product_code: 'teacher_lesson', payment_proof_url: 'https://checkout.example/x?falarus_product=teacher_lesson' };
  assert.equal(inferCourseProductFromPaymentAmount(lesson), null);
  assert.equal(resolveApprovedCourseProduct(lesson), null, 'no VNZh access from a lesson payment');
  // Legacy course payments mis-tagged as russian are still recognised.
  assert.equal(inferCourseProductFromPaymentAmount({ amount: 1000, currency: 'UZS', product_code: 'russian' }), 'vnzh');
});
