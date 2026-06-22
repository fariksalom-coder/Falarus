import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateSecurePassword } from '../shared/generateSecurePassword.ts';

describe('generateSecurePassword', () => {
  it('returns password with requested length', () => {
    const password = generateSecurePassword(12);
    assert.equal(password.length, 12);
  });

  it('enforces minimum length of 8', () => {
    const password = generateSecurePassword(4);
    assert.equal(password.length, 8);
  });

  it('avoids ambiguous characters', () => {
    for (let i = 0; i < 20; i += 1) {
      const password = generateSecurePassword(16);
      assert.match(password, /^[A-HJ-NP-Za-km-z2-9]+$/);
    }
  });
});
