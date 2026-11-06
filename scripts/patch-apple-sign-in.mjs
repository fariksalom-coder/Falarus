import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Capgo 7.11's provider receives the code, but its Capacitor bridge omits it.
// Keep the correction after dependency installs and before native builds.
export function patchAppleBridge(source) {
  if (source.includes('"authorizationCode": appleResponse.authorizationCode')) return source;
  const before = '"idToken": appleResponse.idToken ?? ""';
  if (!source.includes(before)) throw new Error('Apple bridge changed; inspect before building.');
  return source.replace(before, `${before},\n                    "authorizationCode": appleResponse.authorizationCode ?? ""`);
}

// The upstream provider prints identity/access/refresh tokens and profile data.
// Remove its debug print statements from every installed native build.
export function removeAppleDebugLogs(source) {
  return source.replace(/^[ \t]*print\([^\n]*\)[ \t]*$/gm, '// Apple auth debug logging removed to protect credentials.');
}

export function patchSocialLoginPrivacyResources(source) {
  if (source.includes("'CapgoSocialLoginPrivacy'")) return source;
  const marker = "  s.swift_version = '5.1'";
  if (!source.includes(marker)) throw new Error('SocialLogin podspec changed; inspect its privacy resources.');
  return source.replace(marker, "  s.resource_bundles = { 'CapgoSocialLoginPrivacy' => ['ios/Sources/SocialLoginPlugin/PrivacyInfo.xcprivacy'] }\n" + marker);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const path = new URL('../node_modules/@capgo/capacitor-social-login/ios/Sources/SocialLoginPlugin/SocialLoginPlugin.swift', import.meta.url);
  const original = readFileSync(path, 'utf8');
  const patched = patchAppleBridge(original);
  if (patched !== original) writeFileSync(path, patched);
  const provider = new URL('../node_modules/@capgo/capacitor-social-login/ios/Sources/SocialLoginPlugin/AppleProvider.swift', import.meta.url);
  const providerSource = readFileSync(provider, 'utf8');
  const safeProvider = removeAppleDebugLogs(providerSource);
  if (safeProvider !== providerSource) writeFileSync(provider, safeProvider);
  copyFileSync(new URL('./native/SocialLoginPrivacyInfo.xcprivacy', import.meta.url), new URL('../node_modules/@capgo/capacitor-social-login/ios/Sources/SocialLoginPlugin/PrivacyInfo.xcprivacy', import.meta.url));
  const podspec = new URL('../node_modules/@capgo/capacitor-social-login/CapgoCapacitorSocialLogin.podspec', import.meta.url);
  const podSource = readFileSync(podspec, 'utf8');
  const privacyPod = patchSocialLoginPrivacyResources(podSource);
  if (privacyPod !== podSource) writeFileSync(podspec, privacyPod);
  console.log('Apple Sign-In bridge, credential logging and SDK privacy resources checked.');
}
