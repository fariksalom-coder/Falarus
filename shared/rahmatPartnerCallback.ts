import type { MulticardConfig } from './multicardConfig.js';
import { getMulticardBearerToken } from './multicardPayments.js';

function getEnvBool(key: string, defaultTrue: boolean): boolean {
  const v = String(process.env[key] ?? '').trim().toLowerCase();
  if (!v) return defaultTrue;
  if (v === 'false' || v === '0' || v === 'no') return false;
  if (v === 'true' || v === '1' || v === 'yes') return true;
  return defaultTrue;
}

/**
 * After Multicard success webhook, notify Rahmat / payment-app so the aggregator
 * marks the payment complete (certification / prod access).
 *
 * POST {baseUrl}/payment/callback/payment-app/{application_id}
 * @see Multicard partner onboarding (Rahmat test checklist)
 */
export function isRahmatPartnerCallbackEnabled(): boolean {
  return getEnvBool('MULTICARD_RAHMAT_PARTNER_CALLBACK', true);
}

function pickRrn(payload: Record<string, unknown>): string {
  const keys = ['rrn', 'ps_uniq_id', 'ref_num', 'reference', 'ref'];
  for (const k of keys) {
    const v = payload[k];
    if (v != null && String(v).trim() !== '') return String(v).trim().slice(0, 64);
  }
  const billing = String(payload.billing_id ?? '').trim();
  if (billing) return billing.slice(0, 64);
  return '0';
}

function pickPan(payload: Record<string, unknown>): string {
  const pan = String(payload.card_pan ?? payload.pan ?? '').trim();
  if (pan) return pan.slice(0, 32);
  return '8600********0000';
}

function pickPhone(payload: Record<string, unknown>): string {
  const p = String(payload.phone ?? '').replace(/\D/g, '');
  if (p.length >= 12 && p.startsWith('998')) return p.slice(0, 12);
  if (p.length === 9) return `998${p}`;
  return '998000000000';
}

function pickRahmatTransId(payload: Record<string, unknown>): string {
  const u = String(payload.uuid ?? payload.rahmat_trans_id ?? '').trim();
  return u;
}

function pickPaymentTime(payload: Record<string, unknown>): string {
  const t = String(payload.payment_time ?? '').trim();
  if (t) return t;
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export type RahmatPartnerCallbackResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; error: string; body?: unknown };

/**
 * application_id in URL is usually the same as invoice auth application_id;
 * override with MULTICARD_RAHMAT_CALLBACK_APP_ID if Multicard issued a different slug for this path.
 */
export async function postRahmatPaymentAppSuccessCallback(params: {
  cfg: MulticardConfig;
  multicardSuccessPayload: Record<string, unknown>;
  partnerTransId: string;
}): Promise<RahmatPartnerCallbackResult> {
  const { cfg, multicardSuccessPayload: p, partnerTransId } = params;
  const appIdForPath =
    String(process.env.MULTICARD_RAHMAT_CALLBACK_APP_ID ?? '').trim() || cfg.applicationId;
  const rahmatTransId = pickRahmatTransId(p);
  if (!rahmatTransId) {
    return { ok: false, status: 0, error: 'missing_uuid_for_rahmat_trans_id' };
  }

  const amount = Number(p.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, status: 0, error: 'invalid_amount' };
  }

  const body = {
    amount,
    rahmat_trans_id: rahmatTransId,
    partner_trans_id: String(partnerTransId),
    payment_time: pickPaymentTime(p),
    rrn: pickRrn(p),
    phone: pickPhone(p),
    pan: pickPan(p),
  };

  const url = `${cfg.baseUrl}/payment/callback/payment-app/${encodeURIComponent(appIdForPath)}`;
  let token: string;
  try {
    token = await getMulticardBearerToken(cfg);
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'auth_failed' };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Access-Token': token,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    const successObj = data as { success?: boolean };
    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}`, body: data };
    }
    if (successObj && typeof successObj === 'object' && successObj.success === false) {
      return { ok: false, status: res.status, error: 'success_false', body: data };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'fetch_failed' };
  }
}
