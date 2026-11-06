import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { patchAppleBridge, removeAppleDebugLogs, patchSocialLoginPrivacyResources } from '../scripts/patch-apple-sign-in.mjs';

test('native Apple bridge returns the authorization code needed for server exchange', () => {
  const omitted = '"idToken": appleResponse.idToken ?? ""';
  const fixed = patchAppleBridge(omitted);
  assert.ok(fixed.includes('"authorizationCode": appleResponse.authorizationCode ?? ""'));
  assert.equal(patchAppleBridge(fixed), fixed);
  assert.throws(() => patchAppleBridge('unrecognized bridge'));
  const installed = readFileSync('node_modules/@capgo/capacitor-social-login/ios/Sources/SocialLoginPlugin/SocialLoginPlugin.swift', 'utf8');
  assert.ok(installed.includes('"authorizationCode": appleResponse.authorizationCode ?? ""'));
});

 test('Apple native debug logs cannot expose tokens or identity payloads', () => {
  const source = 'func login() {\n    print("ID Token: \\(idToken)")\n    print("payload", payload)\n    let result = idToken\n}';
  const safe = removeAppleDebugLogs(source);
  assert.ok(!safe.includes('print('));
  assert.ok(safe.includes('let result = idToken'));
  assert.equal(removeAppleDebugLogs(safe), safe);
  const installed = readFileSync(new URL('../node_modules/@capgo/capacitor-social-login/ios/Sources/SocialLoginPlugin/AppleProvider.swift', import.meta.url), 'utf8');
  assert.ok(!installed.includes('print('));
 });

test('SocialLogin owns its UserDefaults reason manifest and bundles it after reinstall', () => {
 const source = "Pod::Spec.new do |s|\n  s.swift_version = '5.1'\nend";
 const patched = patchSocialLoginPrivacyResources(source);
 assert.ok(patched.includes("s.resource_bundles = { 'CapgoSocialLoginPrivacy'"));
 assert.equal(patchSocialLoginPrivacyResources(patched), patched);
 assert.throws(() => patchSocialLoginPrivacyResources('changed podspec'));
 const manifest = readFileSync('node_modules/@capgo/capacitor-social-login/ios/Sources/SocialLoginPlugin/PrivacyInfo.xcprivacy', 'utf8');
 assert.ok(manifest.includes('NSPrivacyAccessedAPICategoryUserDefaults') && manifest.includes('CA92.1'));
});
