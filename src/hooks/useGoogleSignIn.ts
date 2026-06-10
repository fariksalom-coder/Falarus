import { useCallback, useEffect, useRef, useState, type RefCallback } from 'react';
import { apiUrl } from '../api';
import { resolveGoogleWebClientId } from '../../shared/googleOAuth';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdApi = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    cancel_on_tap_outside?: boolean;
    context?: string;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: string;
      theme?: string;
      size?: string;
      width?: number;
      text?: string;
      shape?: string;
    },
  ) => void;
  prompt: (momentListener?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
};

export class GoogleSignInSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleSignInSetupError';
  }
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdApi;
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-gsi]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google SDK yuklanmadi')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google SDK yuklanmadi'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

async function fetchClientIdFromServer(): Promise<string | null> {
  try {
    const res = await fetch(apiUrl('/api/auth/google/client-id'));
    if (!res.ok) return null;
    const data = (await res.json()) as { clientId?: string };
    return data.clientId?.trim() || null;
  } catch {
    return null;
  }
}

function ensureInitialized(clientId: string, onCredential: (token: string) => void): void {
  window.google!.accounts!.id!.initialize({
    client_id: clientId,
    context: 'signin',
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: false,
    callback: (response) => {
      if (response.credential) onCredential(response.credential);
    },
  });
}

function googleSetupMessage(clientId: string): string {
  return [
    'Google orqali kirish sozlanmagan.',
    `Google Cloud Console OAuth Web client (${clientId}) uchun Authorized JavaScript origins ro‘yxatiga ${window.location.origin} ni qo‘shing.`,
  ].join(' ');
}

/** Dev helper: log the exact origin to whitelist in Google Cloud Console. */
export function logGoogleOriginHint(): void {
  if (!import.meta.env.DEV) return;
  console.info(
    '[Google Sign-In] Authorized JavaScript origin for this page:',
    window.location.origin,
  );
}

export function useGoogleSignIn(onCredential: (idToken: string) => void) {
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  const [clientId, setClientId] = useState<string>(() =>
    resolveGoogleWebClientId({
      VITE_GOOGLE_OAUTH_WEB_CLIENT_ID: import.meta.env.VITE_GOOGLE_OAUTH_WEB_CLIENT_ID,
    }),
  );
  const [buttonHost, setButtonHost] = useState<HTMLDivElement | null>(null);
  const [buttonReady, setButtonReady] = useState(false);
  const pendingRef = useRef<{
    resolve: () => void;
    reject: (err: Error) => void;
  } | null>(null);

  const googleButtonRef: RefCallback<HTMLDivElement> = useCallback((node) => {
    setButtonHost(node);
    if (!node) setButtonReady(false);
  }, []);

  useEffect(() => {
    void fetchClientIdFromServer().then((fromServer) => {
      if (fromServer && fromServer !== clientId) setClientId(fromServer);
    });
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    void loadGoogleScript().then(() => {
      ensureInitialized(clientId, (token) => {
        pendingRef.current?.resolve();
        pendingRef.current = null;
        onCredentialRef.current(token);
      });
    });
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !buttonHost) return;
    let cancelled = false;

    setButtonReady(false);
    void loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;
        logGoogleOriginHint();
        ensureInitialized(clientId, (token) => {
          pendingRef.current?.resolve();
          pendingRef.current = null;
          onCredentialRef.current(token);
        });

        buttonHost.replaceChildren();
        window.google.accounts.id.renderButton(buttonHost, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: Math.max(240, Math.round(buttonHost.getBoundingClientRect().width || 320)),
        });
        setButtonReady(true);
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.warn('[Google Sign-In] Button render failed.', {
            origin: window.location.origin,
            clientId,
            error: err,
          });
        }
        if (!cancelled) setButtonReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [buttonHost, clientId]);

  const triggerSignIn = useCallback(async (): Promise<void> => {
    if (!clientId) throw new Error('Google OAuth sozlanmagan');

    await loadGoogleScript();
    if (!window.google?.accounts?.id) throw new Error('Google SDK yuklanmadi');
    if (import.meta.env.DEV && window.location.hostname === 'localhost' && !buttonReady) {
      throw new GoogleSignInSetupError(googleSetupMessage(clientId));
    }

    ensureInitialized(clientId, (token) => {
      pendingRef.current?.resolve();
      pendingRef.current = null;
      onCredentialRef.current(token);
    });

    return new Promise<void>((resolve, reject) => {
      pendingRef.current = { resolve, reject };
      window.google!.accounts!.id!.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          pendingRef.current = null;
          reject(new Error('Google tugmasi yuklanmadi'));
        }
      });
    });
  }, [clientId]);

  return { triggerSignIn, clientId, googleButtonRef, googleButtonReady: buttonReady };
}
