import { SocialLogin } from '@capgo/capacitor-social-login';
import { FALARUS_GOOGLE_WEB_CLIENT_ID } from '../../shared/googleOAuth';
import { isNativeIOS } from './platform';

let initialization: Promise<void> | null = null;
export function initializeNativeSocialLogin(): Promise<void> {
  if (!initialization) {
    initialization = SocialLogin.initialize({
      google: {
        webClientId: FALARUS_GOOGLE_WEB_CLIENT_ID,
        iOSClientId: import.meta.env.VITE_GOOGLE_OAUTH_IOS_CLIENT_ID,
        iOSServerClientId: FALARUS_GOOGLE_WEB_CLIENT_ID,
        mode: 'online',
      },
      ...(isNativeIOS() ? { apple: { redirectUrl: '', useProperTokenExchange: true } } : {}),
    }).catch(error => { initialization = null; throw error; });
  }
  return initialization;
}
