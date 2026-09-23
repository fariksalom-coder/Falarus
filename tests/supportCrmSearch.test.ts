import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSupportSearch } from '../server/services/supportCrm.service';

test('Support CRM search normalizes full names and phone formatting', () => {
  const name = buildSupportSearch('  Алишер   Каримов ', 4, 'u');
  assert.ok(name);
  assert.match(name.sql, /u\.first_name/);
  assert.match(name.sql, /u\.last_name/);
  assert.deepEqual(name.values, ['%Алишер%', '%Каримов%']);

  const phone = buildSupportSearch('+998 (90) 123-45-67', 4, 'u');
  assert.ok(phone);
  assert.match(phone.sql, /regexp_replace/);
  assert.deepEqual(phone.values, ['%998901234567%']);

  assert.equal(buildSupportSearch('   ', 4), null);
  const literal = buildSupportSearch('90%_', 2, 'c');
  assert.ok(literal);
  assert.deepEqual(literal.values, ['%90\\%\\_%']);
  assert.match(literal.sql, /c\.first_name/);
});
