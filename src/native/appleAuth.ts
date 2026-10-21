import { SocialLogin } from '@capgo/capacitor-social-login';
import { apiUrl } from '../api';
import { initializeNativeSocialLogin } from './socialLogin';
import { isNativeIOS } from './platform';

export async function nativeAppleCredential() {
  if (!isNativeIOS()) throw new Error('Apple orqali kirish iPhone ilovasida mavjud.');
  const response = await fetch(apiUrl('/api/auth/apple/challenge'), { method: 'POST' });
  const challenge = await response.json();
  if (!response.ok || typeof challenge.nonce !== 'string') {
    throw new Error('Apple orqali kirishni boshlab bo‘lmadi. Qayta urinib ko‘ring.');
  }
  await initializeNativeSocialLogin();
  const login = await SocialLogin.login({ provider: 'apple', options: {
    scopes: ['email', 'name'], nonce: challenge.nonce,
  } });
  if (login.provider !== 'apple' || !login.result.idToken || !login.result.authorizationCode) {
    throw new Error('Apple kirish ma’lumotlarini qaytarmadi. Qayta urinib ko‘ring.');
  }
  return {
    identityToken: login.result.idToken,
    authorizationCode: login.result.authorizationCode,
    nonce: challenge.nonce,
    firstName: login.result.profile.givenName,
    lastName: login.result.profile.familyName,
  };
}
