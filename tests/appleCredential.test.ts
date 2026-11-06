import test from 'node:test';
import assert from 'node:assert/strict';
import { readAppleCredential } from '../src/native/appleCredential';
test('Apple credential accepts both native bridge formats and keeps the challenge nonce', () => {
 for (const code of [{authorizationCode:'code'}, {accessToken:{token:'code'}}]) {
  const result=readAppleCredential({provider:'apple',result:{idToken:'identity',...code}},'nonce');
  assert.equal(result.authorizationCode,'code'); assert.equal(result.identityToken,'identity'); assert.equal(result.nonce,'nonce');
 }
});
test('Apple credential rejects incomplete and wrong-provider responses', () => {
 assert.throws(()=>readAppleCredential({provider:'google'},'nonce'),/mos kelmadi/);
 assert.throws(()=>readAppleCredential({provider:'apple',result:{authorizationCode:'code'}},'nonce'),/identity token/);
 assert.throws(()=>readAppleCredential({provider:'apple',result:{idToken:'identity'}},'nonce'),/kirish kodini/);
});
