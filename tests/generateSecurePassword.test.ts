import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateSecurePassword, generateNumericPassword } from '../shared/generateSecurePassword.ts';
import bcrypt from 'bcryptjs';
import { qolParolTiklashById } from '../server/services/qolParolTiklash.service';

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

describe('manual reset numeric passwords', () => {
  it('the shared admin/support reset stores a bcrypt hash matching the numeric password', async () => {
    let stored = '';
    const database = { from: () => ({
      select() { return this; }, eq() { return this; },
      maybeSingle: async () => ({ data: { id: 1, first_name: 'Test', phone: null, email: null }, error: null }),
      update: (value: {password: string}) => ({ eq: async () => { stored = value.password; return {error: null}; } }),
    }) };
    const result = await qolParolTiklashById(database as any, 1, 'test');
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error('Reset failed');
    assert.match(result.parol, /^[0-9]{10}$/);
    assert.notEqual(stored, result.parol);
    assert.equal(await bcrypt.compare(result.parol, stored), true);
  });
  it('uses exactly ten digits by default and preserves leading zeros as text', () => {
    const passwords = Array.from({ length: 1000 }, () => generateNumericPassword());
    passwords.forEach(password => assert.match(password, /^[0-9]{10}$/));
    assert.ok(passwords.some(password => password.startsWith('0')));
    assert.ok(passwords.some(password => password.includes('9')));
  });
  it('bounds requested lengths and handles invalid numeric input', () => {
    for (const [requested, expected] of [[4, 8], [10, 10], [100, 32], [NaN, 10], [Infinity, 10], [10.9, 10]]) {
      assert.equal(generateNumericPassword(requested).length, expected);
    }
  });
});
