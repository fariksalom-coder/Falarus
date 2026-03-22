import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, parseContactIdentifier } from '../shared/authIdentifiers.ts';

test('normalizePhone: Uzbekistan local and +998', () => {
  assert.equal(normalizePhone('901234567'), '+998901234567');
  assert.equal(normalizePhone('+998 90 123 45 67'), '+998901234567');
  assert.equal(normalizePhone('998901234567'), '+998901234567');
});

test('normalizePhone: Russia / Kazakhstan +7', () => {
  assert.equal(normalizePhone('89161234567'), '+79161234567');
  assert.equal(normalizePhone('79161234567'), '+79161234567');
  assert.equal(normalizePhone('+7 916 123-45-67'), '+79161234567');
  assert.equal(normalizePhone('9161234567'), '+79161234567');
  assert.equal(normalizePhone('77011234567'), '+77011234567');
  assert.equal(normalizePhone('7011234567'), '+77011234567');
});

test('normalizePhone: Tajikistan +992', () => {
  assert.equal(normalizePhone('+992 90 123 45 67'), '+992901234567');
  assert.equal(normalizePhone('992901234567'), '+992901234567');
});

test('normalizePhone: Kyrgyzstan +996', () => {
  assert.equal(normalizePhone('+996 555 123 456'), '+996555123456');
  assert.equal(normalizePhone('996555123456'), '+996555123456');
});

test('parseContactIdentifier: email vs phone', () => {
  const e = parseContactIdentifier('A@B.CO');
  assert.equal(e.ok, true);
  if (e.ok) assert.equal(e.email, 'a@b.co');
  const p = parseContactIdentifier('9161234567');
  assert.equal(p.ok, true);
  if (p.ok) assert.equal(p.phone, '+79161234567');
});
