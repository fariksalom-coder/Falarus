import { App } from '@capacitor/app';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { FALARUS_GOOGLE_WEB_CLIENT_ID } from '../../shared/googleOAuth';
import { initializeNativeSocialLogin } from './socialLogin';

const TOKEN_KEY = 'falarus_google_id_token';
const ERROR_KEY = 'falarus_google_error';
const NONCE_KEY = 'falarus_google_nonce';

let initialized = false;
let urlOpenHooked = false;

export class GoogleOAuthRedirectError extends Error {
  constructor() {
    super('google-oauth-redirect');
    this.name = 'GoogleOAuthRedirectError';
  }
}

export async function initNativeGoogleAuth(): Promise<void> {
  if (initialized) return;
  await initializeNativeSocialLogin();
  initialized = true;
  hookGoogleOAuthUrlOpen();
}

function hookGoogleOAuthUrlOpen(): void {
  if (urlOpenHooked) return;
  urlOpenHooked = true;
  void App.addListener('appUrlOpen', ({ url }) => {
    const token = idTokenFromRedirectUrl(url);
    if (!token) return;
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
    if (!window.location.pathname.startsWith('/oauth/google-done')) {
      window.location.replace('/oauth/google-done');
    }
  });
}

function idTokenFromRedirectUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get('id_token');
    if (fromQuery) return fromQuery;
    const hash = new URLSearchParams((parsed.hash || '').replace(/^#/, ''));
    return hash.get('id_token');
  } catch {
    return null;
  }
}

export function takeGoogleOAuthRedirectToken(): { token: string | null; error: string | null } {
  let token: string | null = null;
  let error: string | null = null;
  try {
    token = sessionStorage.getItem(TOKEN_KEY);
    error = sessionStorage.getItem(ERROR_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ERROR_KEY);
    sessionStorage.removeItem(NONCE_KEY);
  } catch {
    /* ignore */
  }
  const fromUrl = idTokenFromRedirectUrl(window.location.href);
  return { token: token || fromUrl, error };
}

function googleLoginError(err: unknown): Error {
  if (err instanceof GoogleOAuthRedirectError) return err;
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (/cancel|canceled|cancelled|bekor/i.test(raw)) {
    return new Error('Google kirish bekor qilindi');
  }
  if (/NoCredential|no credentials|hisob topilmadi/i.test(raw)) {
    return new Error('Telefonda Google hisob topilmadi. Sozlamalarda Google hisob qo‘shing.');
  }
  if (/DEVELOPER_ERROR|: 10\b|ApiException:\s*10/i.test(raw)) {
    return new Error('Google ilova kaliti mos emas. SHA-1 ni Google Cloud Console ga qo‘shing.');
  }
  if (/reauth failed|: 16\b|ApiException:\s*16|ERR_NAME_NOT_RESOLVED|NAME_NOT_RESOLVED/i.test(raw)) {
    return new Error('Google hisobini ochib bo‘lmadi. Emulyator internetini tekshiring va qayta urinib ko‘ring.');
  }
  if (/scopes without modifying|MainActivity/i.test(raw)) {
    return new Error('Google kirish Androidda to‘liq sozlanmagan.');
  }
  return new Error(raw.trim() || 'Google orqali kirib bo‘lmadi. Qayta urinib ko‘ring.');
}

async function loginWithAccountPicker(): Promise<string> {
  await initNativeGoogleAuth();
  try {
    await SocialLogin.logout({ provider: 'google' });
  } catch {
    /* oldingi hisob bo‘lmasa ham davom */
  }
  const res = await SocialLogin.login({
    provider: 'google',
    options: {
      style: 'standard',
      filterByAuthorizedAccounts: false,
      autoSelectEnabled: false,
    },
  });
  if (res.provider !== 'google' || res.result.responseType === 'offline' || !res.result.idToken) {
    throw new Error('Google token olinmadi. Keyinroq qayta urinib ko‘ring.');
  }
  return res.result.idToken;
}

export async function nativeGoogleIdToken(): Promise<string> {
  try {
    return await loginWithAccountPicker();
  } catch (err) {
    throw googleLoginError(err);
  }
}
