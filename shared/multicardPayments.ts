import { createHash } from 'node:crypto';
import type { MulticardConfig } from './multicardConfig.js';

/** Multicard success callback source IP per docs */
export const MULTICARD_CALLBACK_IP = '195.158.26.90';

export type MulticardOfdLine = {
  qty: number;
  price: number;
  mxik: string;
  total: number;
  package_code: string;
  name: string;
  vat?: number;
};

/** Docs: store_id may be int or UUID string; numeric IDs must be JSON numbers for some Multicard backends. */
export function normalizeMulticardStoreId(storeId: string): string | number {
  const s = String(storeId ?? '').trim();
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return Number.isSafeInteger(n) ? n : s;
  }
  return s;
}

export function normalizeMulticardOfdLines(lines: MulticardOfdLine[]): MulticardOfdLine[] {
  return lines.map((line) => {
    const qty = Math.max(1, Math.round(Number(line.qty)) || 1);
    const price = Math.round(Number(line.price)) || 0;
    const total = Math.round(Number(line.total)) || 0;
    const vat = line.vat == null ? 0 : Math.round(Number(line.vat)) || 0;
    return {
      qty,
      price,
      total,
      vat,
      mxik: String(line.mxik ?? '').replace(/\s+/g, ''),
      package_code: String(line.package_code ?? '').replace(/\s+/g, ''),
      name: String(line.name ?? '').trim().slice(0, 255),
    };
  });
}

export function soumToTiyin(amountSoum: number): number {
  if (!Number.isFinite(amountSoum) || amountSoum <= 0) return 0;
  return Math.round(amountSoum * 100);
}

export function buildMulticardCallbackSign(params: {
  storeId: string | number;
  invoiceId: string;
  amount: string | number;
  secret: string;
}): string {
  const raw = `${params.storeId}${params.invoiceId}${params.amount}${params.secret}`;
  return createHash('md5').update(raw).digest('hex');
}

export function verifyMulticardCallbackSign(payload: {
  store_id?: unknown;
  invoice_id?: unknown;
  amount?: unknown;
  sign?: unknown;
}, secret: string): boolean {
  const storeId: string | number = payload.store_id == null ? '' : (payload.store_id as string | number);
  const invoiceId = String(payload.invoice_id ?? '');
  const amount: string | number = payload.amount == null ? '' : (payload.amount as string | number);
  const sign = String(payload.sign ?? '').trim();
  if (!sign || !secret) return false;
  const expected = buildMulticardCallbackSign({
    storeId,
    invoiceId,
    amount,
    secret,
  });
  return expected.toLowerCase() === sign.toLowerCase();
}

export function shouldSkipMulticardSignatureVerify(): boolean {
  if (String(process.env.NODE_ENV).toLowerCase() === 'production') return false;
  const v = String(process.env.MULTICARD_SKIP_SIGNATURE_VERIFY ?? '').trim().toLowerCase();
  return v === 'true' || v === '1';
}

type AuthJson = {
  token?: string;
  role?: string;
  expiry?: string;
  success?: boolean;
  data?: { token?: string; role?: string; expiry?: string };
  errors?: unknown;
};

let tokenCache: { token: string; expiresAtMs: number } | null = null;
const TOKEN_SAFETY_MS = 120_000;
const TOKEN_FALLBACK_TTL_MS = 23 * 60 * 60 * 1000;
const BODY_PREVIEW_MAX = 800;

async function readMulticardResponse(res: Response): Promise<{ text: string; json: unknown }> {
  const text = await res.text();
  if (!text.trim()) {
    return { text: '', json: null };
  }
  try {
    return { text, json: JSON.parse(text) as unknown };
  } catch {
    return { text, json: null };
  }
}

function summarizeMulticardBody(json: unknown, fallbackText: string, httpStatus: number): string {
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    if ('errors' in o) return JSON.stringify(o.errors);
    if ('error' in o && o.error != null) {
      const e = o.error;
      if (typeof e === 'object' && e && 'details' in e) return String((e as { details?: unknown }).details ?? e);
      return typeof e === 'string' ? e : JSON.stringify(e);
    }
    if ('message' in o && typeof o.message === 'string') return o.message;
    if ('success' in o && o.success === false) return JSON.stringify(json);
  }
  const snippet = fallbackText.replace(/\s+/g, ' ').trim().slice(0, BODY_PREVIEW_MAX);
  return snippet || `HTTP ${httpStatus}`;
}

async function multicardFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(`Tarmoq xatosi (${url}): ${cause}`);
  }
}

async function fetchMulticardAuth(cfg: MulticardConfig): Promise<string> {
  const url = `${cfg.baseUrl}/auth`;
  const res = await multicardFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      application_id: cfg.applicationId,
      secret: cfg.secret,
    }),
  });
  const { text, json } = await readMulticardResponse(res);
  const payload = json as (AuthJson & { success?: boolean; data?: { token?: string } }) | null;
  if (!res.ok) {
    const msg = summarizeMulticardBody(json, text, res.status);
    throw new Error(`Multicard auth: ${msg}`);
  }
  if (payload && payload.success === false) {
    throw new Error(`Multicard auth: ${summarizeMulticardBody(json, text, res.status)}`);
  }
  const token = payload?.token ?? payload?.data?.token;
  if (!token || typeof token !== 'string') {
    throw new Error(`Multicard auth: token yo‘q — ${summarizeMulticardBody(json, text, res.status)}`);
  }
  const expiresAtMs = Date.now() + TOKEN_FALLBACK_TTL_MS;
  tokenCache = { token, expiresAtMs };
  return token;
}

export async function getMulticardBearerToken(cfg: MulticardConfig): Promise<string> {
  if (tokenCache && tokenCache.expiresAtMs > Date.now() + TOKEN_SAFETY_MS) {
    return tokenCache.token;
  }
  return fetchMulticardAuth(cfg);
}

export type CreateInvoiceParams = {
  cfg: MulticardConfig;
  amountTiyin: number;
  invoiceId: string;
  lang: 'ru' | 'uz' | 'en';
  ofd: MulticardOfdLine[];
};

export type CreateInvoiceResult = {
  checkout_url: string;
  uuid: string;
};

export async function multicardCreateInvoice(params: CreateInvoiceParams): Promise<CreateInvoiceResult> {
  const { cfg, amountTiyin, invoiceId, lang, ofd } = params;
  const token = await getMulticardBearerToken(cfg);
  const callbackUrl = `${cfg.publicApiBaseUrl}/api/payments/rahmat/callback`;
  const ofdNormalized = normalizeMulticardOfdLines(ofd);
  const body = {
    store_id: normalizeMulticardStoreId(cfg.storeId),
    amount: Math.round(amountTiyin),
    invoice_id: String(invoiceId).trim(),
    lang,
    return_url: cfg.returnUrl,
    return_error_url: cfg.returnErrorUrl ?? undefined,
    callback_url: callbackUrl,
    ofd: ofdNormalized,
  };

  const url = `${cfg.baseUrl}/payment/invoice`;
  const res = await multicardFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Access-Token': token,
    },
    body: JSON.stringify(body),
  });
  const { text, json } = await readMulticardResponse(res);
  const parsed = json as {
    success?: boolean;
    data?: { checkout_url?: string; uuid?: string };
    error?: { code?: string; details?: string };
  } | null;
  if (!res.ok || !parsed?.success || !parsed.data?.checkout_url || !parsed.data?.uuid) {
    const detail = summarizeMulticardBody(json, text, res.status);
    let base = `Multicard invoice (${res.status}): ${detail}`;
    if (/toArray\(\)\s+on\s+null/i.test(detail)) {
      base +=
        " Bu odatda noto‘g‘ri MULTICARD_STORE_ID (kassa) yoki ИКПУ/package_code juftligi (tasnif.soliq.uz) bilan bog‘liq — Rahmat/Multicard qo‘llab-quvvatlashiga yozing yoki kabinetdagi kassa bilan mosligini tekshiring.";
    }
    const pub = cfg.publicApiBaseUrl.toLowerCase();
    if (pub.includes('localhost') || pub.includes('127.0.0.1')) {
      throw new Error(
        `${base} — callback_url uchun localhost Multicard tomonda rad etilishi mumkin; MULTICARD_PUBLIC_API_BASE_URL ga HTTPS tunnel (masalan, ngrok) qo‘ying.`
      );
    }
    throw new Error(base);
  }
  return {
    checkout_url: String(parsed.data.checkout_url),
    uuid: String(parsed.data.uuid),
  };
}
