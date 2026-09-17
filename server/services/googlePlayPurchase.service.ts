/**
 * Google Play Developer API — purchaseToken tekshiruvi.
 * Key: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (fayl yo‘li)
 * Package: GOOGLE_PLAY_PACKAGE_NAME (masalan uz.falarus.app)
 */
import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'node:fs';

export type GooglePlayVerifyResult = {
  ok: boolean;
  status: number;
  error?: string;
  orderId?: string | null;
  purchaseState?: number | null;
  acknowledgementState?: number | null;
  expiryTimeMillis?: string | null;
  raw?: unknown;
};

function packageName(): string {
  return (process.env.GOOGLE_PLAY_PACKAGE_NAME ?? '').trim();
}

function serviceAccountPath(): string {
  return (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON ?? '').trim();
}

let cachedAuth: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (cachedAuth) return cachedAuth;
  const keyFile = serviceAccountPath();
  if (!keyFile) {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_MISSING');
  }
  // Fayl o‘qilishini erta tekshirish (xato aniqroq).
  readFileSync(keyFile, 'utf8');
  cachedAuth = new GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  return cachedAuth;
}

async function getAccessToken(): Promise<string> {
  const auth = getAuth();
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;
  if (!token) throw new Error('GOOGLE_PLAY_TOKEN_FAILED');
  return token;
}

export async function verifyGooglePlayPurchase(params: {
  purchaseToken: string;
  productId: string;
  isSubscription: boolean;
}): Promise<GooglePlayVerifyResult> {
  const pkg = packageName();
  const keyFile = serviceAccountPath();
  if (!pkg || !keyFile) {
    return {
      ok: false,
      status: 503,
      error: 'GOOGLE_PLAY_NOT_CONFIGURED',
    };
  }

  const token = params.purchaseToken.trim();
  const productId = params.productId.trim();
  if (!token || !productId) {
    return { ok: false, status: 400, error: 'GOOGLE_PLAY_TOKEN_REQUIRED' };
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch {
    return { ok: false, status: 503, error: 'GOOGLE_PLAY_AUTH_FAILED' };
  }

  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}`;
  const url = params.isSubscription
    ? `${base}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`
    : `${base}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const apiError =
      typeof (raw as { error?: { message?: string } }).error?.message === 'string'
        ? (raw as { error: { message: string } }).error.message
        : `GOOGLE_PLAY_HTTP_${res.status}`;
    return {
      ok: false,
      status: res.status === 404 ? 400 : res.status >= 500 ? 502 : 400,
      error: apiError,
      raw,
    };
  }

  if (params.isSubscription) {
    // purchases.subscriptions.get — paymentState: 1 = received
    const paymentState = Number(raw.paymentState);
    const cancelReason = raw.cancelReason;
    const expiryTimeMillis =
      typeof raw.expiryTimeMillis === 'string' ? raw.expiryTimeMillis : null;
    const expiryMs = expiryTimeMillis ? Number(expiryTimeMillis) : NaN;
    if (Number.isFinite(expiryMs) && expiryMs <= Date.now()) {
      return {
        ok: false,
        status: 400,
        error: 'GOOGLE_PLAY_SUBSCRIPTION_EXPIRED',
        orderId: typeof raw.orderId === 'string' ? raw.orderId : null,
        expiryTimeMillis,
        raw,
      };
    }
    // paymentState 1 = payment received; 2 = free trial; 3 = pending deferred
    if (Number.isFinite(paymentState) && paymentState !== 1 && paymentState !== 2) {
      return {
        ok: false,
        status: 400,
        error: 'GOOGLE_PLAY_PAYMENT_NOT_RECEIVED',
        orderId: typeof raw.orderId === 'string' ? raw.orderId : null,
        expiryTimeMillis,
        raw,
      };
    }
    if (cancelReason != null && Number(cancelReason) === 0 && Number.isFinite(expiryMs) && expiryMs <= Date.now()) {
      return {
        ok: false,
        status: 400,
        error: 'GOOGLE_PLAY_SUBSCRIPTION_CANCELED',
        orderId: typeof raw.orderId === 'string' ? raw.orderId : null,
        expiryTimeMillis,
        raw,
      };
    }
    return {
      ok: true,
      status: 200,
      orderId: typeof raw.orderId === 'string' ? raw.orderId : null,
      acknowledgementState:
        typeof raw.acknowledgementState === 'number' ? raw.acknowledgementState : null,
      expiryTimeMillis,
      raw,
    };
  }

  // One-time product — purchaseState: 0 = purchased
  const purchaseState = Number(raw.purchaseState);
  if (purchaseState !== 0) {
    return {
      ok: false,
      status: 400,
      error: 'GOOGLE_PLAY_NOT_PURCHASED',
      orderId: typeof raw.orderId === 'string' ? raw.orderId : null,
      purchaseState,
      raw,
    };
  }
  return {
    ok: true,
    status: 200,
    orderId: typeof raw.orderId === 'string' ? raw.orderId : null,
    purchaseState,
    acknowledgementState:
      typeof raw.acknowledgementState === 'number' ? raw.acknowledgementState : null,
    raw,
  };
}

export function isGooglePlaySource(source: string): boolean {
  return source === 'google_play' || source === 'android_google_play' || source === 'play_store';
}
