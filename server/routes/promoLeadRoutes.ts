import { Router, type Request } from 'express';
import { pool } from '../lib/db.js';
import { clientIpFromRequest, enforceRateLimit } from '../lib/rateLimit.js';
import { normalizePhoneInputToE164, sanitizePhoneRaw } from '../../shared/authIdentifiers.js';
import { ingestUserAsSalesLead } from '../services/salesCrm.service.js';
import {
  cleanPromoLandingPath,
  cleanPromoMetadata,
  cleanPromoSessionId,
  cleanPromoUtm,
  recordPromoLandingEvent,
} from '../services/promoLandingAnalytics.service.js';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
type UtmKey = (typeof UTM_KEYS)[number];

function requirePool() {
  if (!pool) throw new Error('DATABASE_URL kerak');
  return pool;
}

function cleanName(raw: unknown): string {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function cleanUtm(raw: unknown): string | null {
  const value = String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  if (!value || value.length > 120) return null;
  if (!/^[\p{L}\p{N}\s._:/+=@-]+$/u.test(value)) return null;
  return value;
}

function safeLandingPath(raw: unknown, utm: Partial<Record<UtmKey, string | null>>): string {
  const fallback = '/promo/russian';
  const value = String(raw ?? fallback).trim();
  let parsed: URL;
  try {
    parsed = new URL(value, 'https://falarus.uz');
  } catch {
    return fallback;
  }
  if (parsed.pathname !== '/promo/russian') return fallback;
  const qs = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const v = utm[key];
    if (v) qs.set(key, v);
  }
  const query = qs.toString();
  return query ? `${parsed.pathname}?${query}` : parsed.pathname;
}

async function ensureLandingUser(params: {
  name: string;
  phone: string;
  phoneRaw: string;
  countryCode: string | null;
}): Promise<number> {
  const db = requirePool();
  const existing = await db.query<{ id: number }>(
    `SELECT id FROM users WHERE phone_normalized = $1 OR phone = $1 LIMIT 1`,
    [params.phone],
  );
  if (existing.rows[0]) {
    await db.query(
      `UPDATE users
       SET first_name = CASE WHEN COALESCE(first_name, '') IN ('', 'Lead') THEN $2 ELSE first_name END,
           phone = COALESCE(phone, $5),
           phone_normalized = COALESCE(phone_normalized, $5),
           phone_raw = COALESCE(phone_raw, $3),
           country_code = COALESCE(country_code, $4),
           phone_invalid = false
       WHERE id = $1`,
      [existing.rows[0].id, params.name, params.phoneRaw.slice(0, 80), params.countryCode, params.phone],
    );
    return existing.rows[0].id;
  }

  const inserted = await db.query<{ id: number }>(
    `INSERT INTO users (
       first_name, last_name, email, phone, password, onboarded, account_type,
       phone_raw, phone_normalized, country_code, phone_verified, phone_invalid
     ) VALUES ($1, '', null, $2, null, 0, 'student', $3, $2, $4, false, false)
     RETURNING id`,
    [params.name, params.phone, params.phoneRaw.slice(0, 80), params.countryCode],
  );
  return inserted.rows[0].id;
}

export function createPromoLeadRoutes(): Router {
  const router = Router();

  router.post('/russian-event', async (req: Request, res) => {
    try {
      const ip = clientIpFromRequest(req);
      if (!(await enforceRateLimit(res, `promo:russian:event:${ip}`, 120, 60 * 60, 'Juda ko‘p so‘rov.'))) {
        return;
      }
      await recordPromoLandingEvent({
        sessionId: cleanPromoSessionId(req.body?.sessionId),
        eventType: String(req.body?.eventType ?? ''),
        landingPage: cleanPromoLandingPath(req.body?.landingPage),
        utm: cleanPromoUtm(req.body ?? {}),
        metadata: cleanPromoMetadata(req.body?.metadata),
      });
      res.status(202).json({ ok: true });
    } catch {
      res.status(202).json({ ok: true });
    }
  });

  router.post('/russian-lead', async (req: Request, res) => {
    try {
      const ip = clientIpFromRequest(req);
      if (!(await enforceRateLimit(res, `promo:russian:ip:${ip}`, 8, 60 * 60, 'Juda ko‘p so‘rov. Keyinroq urinib ko‘ring.'))) {
        return;
      }

      if (String(req.body?.website ?? '').trim()) {
        res.status(202).json({ ok: true });
        return;
      }

      const name = cleanName(req.body?.name);
      if (name.length < 2) {
        res.status(400).json({ error: 'Ismingizni kiriting.' });
        return;
      }

      const phoneRaw = String(req.body?.phone ?? '');
      const phone = normalizePhoneInputToE164(phoneRaw);
      if (phone.invalid || !phone.e164) {
        res.status(400).json({ error: 'Telefon raqamini to‘g‘ri kiriting.' });
        return;
      }
      if (!phone.e164.startsWith('+998')) {
        res.status(400).json({ error: 'Faqat O‘zbekiston telefon raqamini kiriting.' });
        return;
      }

      const phoneBucket = phone.e164.replace(/\D/g, '');
      if (!(await enforceRateLimit(res, `promo:russian:phone:${phoneBucket}`, 3, 24 * 60 * 60, 'Bu raqam bo‘yicha ariza qabul qilingan. Operator siz bilan bog‘lanadi.'))) {
        return;
      }

      const utm: Partial<Record<UtmKey, string | null>> = {};
      for (const key of UTM_KEYS) utm[key] = cleanUtm(req.body?.[key]);
      const landingPage = safeLandingPath(req.body?.landingPage, utm);
      const sessionId = (() => {
        try { return cleanPromoSessionId(req.body?.sessionId); } catch { return null; }
      })();
      const phoneSnapshot = sanitizePhoneRaw(phoneRaw) ?? phone.e164;
      const userId = await ensureLandingUser({
        name,
        phone: phone.e164,
        phoneRaw: phoneSnapshot,
        countryCode: phone.countryIso ?? null,
      });

      const lead = await ingestUserAsSalesLead({
        userId,
        phone: phone.e164,
        source: 'landing',
        utmSource: utm.utm_source ?? null,
        medium: utm.utm_medium ?? null,
        campaign: utm.utm_campaign ?? null,
        ad: utm.utm_content ?? null,
        utmContent: utm.utm_content ?? null,
        utmTerm: utm.utm_term ?? null,
        landingPage,
        externalKey: `landing:${phone.e164}`,
        submittedAt: new Date().toISOString(),
        assignment: 'promo',
        resurfaceOn: 'submit',
      });
      if (sessionId) {
        await recordPromoLandingEvent({
          sessionId,
          eventType: 'crm_lead_saved',
          landingPage,
          utm,
          leadId: lead.leadId,
          userId,
          metadata: { created: lead.created },
        }).catch(() => undefined);
      }

      res.status(lead.created ? 201 : 200).json({ ok: true, duplicate: !lead.created });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e ?? '');
      if (/duplicate key|users_phone|idx_users_phone/i.test(message)) {
        res.status(200).json({ ok: true, duplicate: true });
        return;
      }
      console.error('[promo/russian-lead]', e instanceof Error ? e.message : 'unknown_error');
      res.status(500).json({ error: 'Ariza yuborilmadi. Iltimos, keyinroq qayta urinib ko‘ring.' });
    }
  });

  return router;
}
