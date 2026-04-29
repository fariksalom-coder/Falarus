import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizePhoneForDb,
  parseContactIdentifier,
  PHONE_MAX_LENGTH,
} from '../shared/authIdentifiers.ts';

test('sanitizePhoneForDb: trim only, preserves user formatting', () => {
  assert.equal(sanitizePhoneForDb('  +998 90 123 45 67  '), '+998 90 123 45 67');
  assert.equal(sanitizePhoneForDb('my-id-123'), 'my-id-123');
  assert.equal(sanitizePhoneForDb('   '), null);
  assert.equal(sanitizePhoneForDb(''), null);
});

test('sanitizePhoneForDb: rejects over max length', () => {
  assert.equal(sanitizePhoneForDb('a'.repeat(PHONE_MAX_LENGTH + 1)), null);
  assert.ok(sanitizePhoneForDb('a'.repeat(PHONE_MAX_LENGTH)));
});

test('parseContactIdentifier: email vs E.164 phone', () => {
  const e = parseContactIdentifier('A@B.CO');
  assert.equal(e.ok, true);
  if (e.ok) assert.equal(e.email, 'a@b.co');

  const p = parseContactIdentifier('  +7 (916) 123-45-67  ');
  assert.equal(p.ok, true);
  if (p.ok) assert.equal(p.phone, '+79161234567');

  const uz = parseContactIdentifier('901234567');
  assert.equal(uz.ok, true);
  if (uz.ok) assert.equal(uz.phone, '+998901234567');
});
