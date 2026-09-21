/**
 * Google Sheets → Sales CRM integration.
 *
 * Paths:
 *  1) Apps Script webhook → POST /api/integrations/google-sheets/lead
 *  2) Service Account API sync → POST .../sync (admin)
 *
 * Sheet stays private. Credentials only on server.
 */
import bcrypt from 'bcryptjs';
import { GoogleAuth } from 'google-auth-library';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { pool } from '../lib/db.js';
import { digitsOnlyPhone } from '../../shared/salesCrm.js';
import { ingestUserAsSalesLead } from './salesCrm.service.js';

export type SheetLeadPayload = {
  externalId?: string | null;
  rowNumber?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  submittedAt?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  ad?: string | null;
  landingPage?: string | null;
  raw?: Record<string, unknown> | null;
};

export type SyncResult = {
  ok: boolean;
  rowsChecked: number;
  newLeads: number;
  duplicates: number;
  errors: number;
  errorMessage?: string | null;
  connected: boolean;
  lastSyncAt?: string | null;
};

function requirePool() {
  if (!pool) throw new Error('DATABASE_URL kerak');
  return pool;
}

function spreadsheetId(): string {
  return String(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '').trim();
}

function sheetRange(): string {
  return String(process.env.GOOGLE_SHEETS_RANGE || 'A:Z').trim() || 'A:Z';
}

function webhookSecret(): string {
  return String(process.env.GOOGLE_SHEETS_WEBHOOK_SECRET || '').trim();
}

function normalizePhoneE164(raw: string | null | undefined): string | null {
  // Meta lead forms often prefix: p:+998...
  let cleaned = String(raw || '').trim().replace(/^p:/i, '');
  let d = digitsOnlyPhone(cleaned);
  if (!d) return null;
  if (d.startsWith('8') && d.length === 11) d = `7${d.slice(1)}`;
  if (d.length === 9 && (d.startsWith('9') || d.startsWith('3'))) d = `998${d}`;
  if (d.length === 10 && d.startsWith('9')) d = `998${d}`;
  if (d.length < 10 || d.length > 15) return null;
  return `+${d}`;
}

function splitFullName(full: string): { firstName: string; lastName: string } {
  const parts = String(full || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: 'Lead', lastName: 'Sheet' };
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Sheet' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function randomLeadPassword(): string {
  return `Sheet${Math.random().toString(36).slice(2, 10)}A1!`;
}

export function buildExternalKey(params: {
  externalId?: string | null;
  rowNumber?: number | null;
  phone?: string | null;
  submittedAt?: string | null;
}): string {
  const sid = spreadsheetId() || 'sheet';
  if (params.externalId && String(params.externalId).trim()) {
    return `gsheet:${sid}:id:${String(params.externalId).trim()}`;
  }
  if (params.rowNumber != null && Number.isFinite(Number(params.rowNumber))) {
    return `gsheet:${sid}:row:${Number(params.rowNumber)}`;
  }
  const phone = normalizePhoneE164(params.phone) || 'nophone';
  const when = params.submittedAt ? String(params.submittedAt).slice(0, 19) : 'na';
  return `gsheet:${sid}:p:${phone}:t:${when}`;
}

async function setSetting(key: string, value: string): Promise<void> {
  const db = requirePool();
  await db.query(
    `INSERT INTO sales_crm_settings (key, value, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value],
  );
}

async function getSetting(key: string): Promise<string> {
  const db = requirePool();
  const { rows } = await db.query<{ value: string }>(
    `SELECT value FROM sales_crm_settings WHERE key = $1`,
    [key],
  );
  return rows[0]?.value ?? '';
}

async function writeSyncLog(params: {
  source: 'api_sync' | 'webhook' | 'manual' | 'connection_check';
  ok: boolean;
  rowsChecked: number;
  newLeads: number;
  duplicates: number;
  errors: number;
  errorMessage?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  const db = requirePool();
  await db.query(
    `INSERT INTO sales_crm_sheet_sync_logs (
       source, finished_at, ok, rows_checked, new_leads, duplicates, errors, error_message, details
     ) VALUES ($1, now(), $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      params.source,
      params.ok,
      params.rowsChecked,
      params.newLeads,
      params.duplicates,
      params.errors,
      params.errorMessage ?? null,
      JSON.stringify(params.details ?? {}),
    ],
  );
  await setSetting('sheets_last_sync_at', new Date().toISOString());
  await setSetting('sheets_last_error', params.ok ? '' : String(params.errorMessage || 'error'));
  await setSetting('sheets_connected', params.ok || params.source === 'webhook' ? '1' : '0');
}

export function verifySheetsWebhookAuth(req: {
  headers: Record<string, unknown>;
  body?: unknown;
}): boolean {
  const secret = webhookSecret();
  if (!secret || secret.length < 16) return false;

  const headers = req.headers || {};
  const headerSecret = String(
    headers['x-falarus-sheets-secret'] || headers['X-Falarus-Sheets-Secret'] || '',
  ).trim();
  if (headerSecret && headerSecret.length === secret.length) {
    try {
      if (timingSafeEqual(Buffer.from(headerSecret), Buffer.from(secret))) return true;
    } catch {
      /* length mismatch already handled */
    }
  }

  const sig = String(headers['x-falarus-signature'] || headers['X-Falarus-Signature'] || '').trim();
  if (sig.startsWith('sha256=')) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const expected = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
    try {
      return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  return false;
}

async function ensureUserForLead(params: {
  firstName: string;
  lastName: string;
  phone: string;
  phoneRaw: string;
}): Promise<number> {
  const db = requirePool();
  const { rows } = await db.query<{ id: number }>(
    `SELECT id FROM users WHERE phone_normalized = $1 OR phone = $1 LIMIT 1`,
    [params.phone],
  );
  if (rows[0]) {
    await db.query(
      `UPDATE users
       SET first_name = CASE WHEN COALESCE(first_name,'') IN ('','Lead') THEN $2 ELSE first_name END,
           last_name  = CASE WHEN COALESCE(last_name,'') IN ('','Sheet') THEN $3 ELSE last_name END
       WHERE id = $1`,
      [rows[0].id, params.firstName.slice(0, 80), params.lastName.slice(0, 80)],
    );
    return rows[0].id;
  }
  const hash = await bcrypt.hash(randomLeadPassword(), 10);
  const ins = await db.query<{ id: number }>(
    `INSERT INTO users (
       first_name, last_name, email, phone, password, onboarded, account_type,
       phone_raw, phone_normalized, phone_verified, phone_invalid
     ) VALUES ($1,$2,null,$3,$4,1,'student',$5,$3,false,false)
     RETURNING id`,
    [
      params.firstName.slice(0, 80),
      params.lastName.slice(0, 80),
      params.phone,
      hash,
      params.phoneRaw.slice(0, 40),
    ],
  );
  return ins.rows[0].id;
}

/** Ingest one sheet row into CRM (webhook or sync). */
export async function ingestSheetLeadRow(
  payload: SheetLeadPayload,
): Promise<{ leadId: number; created: boolean; skipped?: boolean; reason?: string }> {
  const phoneRaw = String(payload.phone || '');
  if (/test lead|dummy data/i.test(phoneRaw) || /test lead|dummy data/i.test(String(payload.firstName || ''))) {
    return { leadId: 0, created: false, skipped: true, reason: 'test_dummy' };
  }
  const phone = normalizePhoneE164(payload.phone);
  if (!phone) {
    return { leadId: 0, created: false, skipped: true, reason: 'phone_invalid' };
  }
  const firstName = String(payload.firstName || '').trim() || 'Lead';
  const lastName = String(payload.lastName || '').trim() || 'Sheet';
  const externalKey = buildExternalKey({
    externalId: payload.externalId,
    rowNumber: payload.rowNumber,
    phone,
    submittedAt: payload.submittedAt,
  });

  const userId = await ensureUserForLead({
    firstName,
    lastName,
    phone,
    phoneRaw: String(payload.phone || phone),
  });

  const result = await ingestUserAsSalesLead({
    userId,
    phone,
    source: payload.source || 'google_sheets',
    medium: payload.medium || 'sheets',
    campaign: payload.campaign || null,
    ad: payload.ad || null,
    landingPage: payload.landingPage || null,
    externalKey,
    sheetRowNumber: payload.rowNumber ?? null,
    submittedAt: payload.submittedAt ?? null,
  });

  return result;
}

function parseServiceAccountJson(): Record<string, unknown> | null {
  const raw = String(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON || '').trim();
  if (raw) {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new Error('GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON yaroqsiz JSON');
    }
  }
  return null;
}

async function getSheetsAccessToken(): Promise<string> {
  const credentials = parseServiceAccountJson();
  const auth = new GoogleAuth({
    credentials: credentials ?? undefined,
    keyFile: credentials ? undefined : process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error('Google access token olinmadi');
  return token.token;
}

async function fetchSheetValues(): Promise<string[][]> {
  const id = spreadsheetId();
  if (!id) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID sozlanmagan');
  const range = encodeURIComponent(sheetRange());
  const token = await getSheetsAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google Sheets API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}

function normHeader(h: string): string {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[ё]/g, 'е');
}

function mapHeaderIndexes(headers: string[]): {
  first?: number;
  last?: number;
  full?: number;
  phone?: number;
  source?: number;
  date?: number;
  id?: number;
  campaign?: number;
  ad?: number;
  platform?: number;
} {
  const out: {
    first?: number;
    last?: number;
    full?: number;
    phone?: number;
    source?: number;
    date?: number;
    id?: number;
    campaign?: number;
    ad?: number;
    platform?: number;
  } = {};
  headers.forEach((h, i) => {
    const n = normHeader(h);
    if (
      out.full == null &&
      (n === 'full_name' || n.includes('fio') || n.includes('фио') || n.includes('полное_имя') || n === 'name')
    ) {
      out.full = i;
    }
    if (
      out.first == null &&
      (n.includes('ism') || n.includes('имя') || n.includes('first_name') || n === 'first')
    ) {
      out.first = i;
    }
    if (
      out.last == null &&
      (n.includes('famili') || n.includes('фамилия') || n.includes('last_name') || n.includes('surname'))
    ) {
      out.last = i;
    }
    if (
      out.phone == null &&
      (n.includes('phone') || n.includes('telefon') || n.includes('телефон') || n.includes('номер') || n === 'tel')
    ) {
      out.phone = i;
    }
    if (out.source == null && (n.includes('source') || n.includes('manba') || n.includes('источник'))) {
      out.source = i;
    }
    if (
      out.date == null &&
      (n.includes('created_time') ||
        n.includes('date') ||
        n.includes('time') ||
        n.includes('sana') ||
        n.includes('дата') ||
        n.includes('время'))
    ) {
      out.date = i;
    }
    if (out.id == null && (n === 'id' || n.includes('lead_id') || n.includes('заявк'))) {
      out.id = i;
    }
    if (out.campaign == null && n.includes('campaign')) {
      out.campaign = i;
    }
    if (out.ad == null && (n === 'ad_name' || n === 'ad' || n.includes('ad_name'))) {
      out.ad = i;
    }
    if (out.platform == null && (n === 'platform' || n.includes('платформ'))) {
      out.platform = i;
    }
  });
  return out;
}

function rowToPayload(row: string[], cols: ReturnType<typeof mapHeaderIndexes>, rowNumber: number): SheetLeadPayload {
  let firstName = cols.first != null ? String(row[cols.first] || '').trim() : '';
  let lastName = cols.last != null ? String(row[cols.last] || '').trim() : '';
  if ((!firstName || !lastName) && cols.full != null) {
    const split = splitFullName(String(row[cols.full] || ''));
    if (!firstName) firstName = split.firstName;
    if (!lastName) lastName = split.lastName;
  }
  const platform = cols.platform != null ? String(row[cols.platform] || '').trim() : '';
  const sourceRaw = cols.source != null ? String(row[cols.source] || '').trim() : '';
  const source =
    sourceRaw ||
    (platform === 'ig' ? 'Instagram' : platform === 'fb' ? 'Facebook' : platform) ||
    'google_sheets';
  return {
    externalId: cols.id != null ? String(row[cols.id] || '').trim() || null : null,
    rowNumber,
    firstName: firstName || null,
    lastName: lastName || null,
    phone: cols.phone != null ? row[cols.phone] : null,
    submittedAt: cols.date != null ? String(row[cols.date] || '').trim() || null : null,
    source,
    medium: 'sheets_api',
    campaign: cols.campaign != null ? String(row[cols.campaign] || '').trim() || null : null,
    ad: cols.ad != null ? String(row[cols.ad] || '').trim() || null : null,
  };
}

export async function checkSheetsConnection(): Promise<SyncResult> {
  try {
    const values = await fetchSheetValues();
    await writeSyncLog({
      source: 'connection_check',
      ok: true,
      rowsChecked: Math.max(0, values.length - 1),
      newLeads: 0,
      duplicates: 0,
      errors: 0,
      details: { headers: values[0] ?? [] },
    });
    await setSetting('sheets_connected', '1');
    return {
      ok: true,
      connected: true,
      rowsChecked: Math.max(0, values.length - 1),
      newLeads: 0,
      duplicates: 0,
      errors: 0,
      lastSyncAt: new Date().toISOString(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await writeSyncLog({
      source: 'connection_check',
      ok: false,
      rowsChecked: 0,
      newLeads: 0,
      duplicates: 0,
      errors: 1,
      errorMessage: msg,
    });
    await setSetting('sheets_connected', '0');
    return {
      ok: false,
      connected: false,
      rowsChecked: 0,
      newLeads: 0,
      duplicates: 0,
      errors: 1,
      errorMessage: 'Google Sheets temporarily unavailable.',
    };
  }
}

export async function syncGoogleSheetsLeads(source: 'api_sync' | 'manual' = 'manual'): Promise<SyncResult> {
  let rowsChecked = 0;
  let newLeads = 0;
  let duplicates = 0;
  let errors = 0;
  try {
    const values = await fetchSheetValues();
    if (values.length < 2) {
      const empty: SyncResult = {
        ok: true,
        connected: true,
        rowsChecked: 0,
        newLeads: 0,
        duplicates: 0,
        errors: 0,
        lastSyncAt: new Date().toISOString(),
      };
      await writeSyncLog({ source, ok: true, ...empty, details: { note: 'empty_or_header_only' } });
      return empty;
    }
    const cols = mapHeaderIndexes(values[0]);
    if (cols.phone == null) {
      throw new Error(`Telefon ustuni topilmadi. Headers: ${values[0].join(' | ')}`);
    }

    for (let i = 1; i < values.length; i += 1) {
      const row = values[i];
      if (!row || !row.some((c) => String(c || '').trim())) continue;
      rowsChecked += 1;
      try {
        const payload = rowToPayload(row, cols, i + 1);
        const result = await ingestSheetLeadRow(payload);
        if (result.skipped) {
          errors += 1;
          continue;
        }
        if (result.created) newLeads += 1;
        else duplicates += 1;
      } catch (rowErr) {
        errors += 1;
        console.warn('[sheets-sync] row', i + 1, rowErr);
      }
    }

    const result: SyncResult = {
      ok: true,
      connected: true,
      rowsChecked,
      newLeads,
      duplicates,
      errors,
      lastSyncAt: new Date().toISOString(),
    };
    await writeSyncLog({ source, ok: true, ...result });
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[sheets-sync]', msg);
    await writeSyncLog({
      source,
      ok: false,
      rowsChecked,
      newLeads,
      duplicates,
      errors: errors + 1,
      errorMessage: msg,
    });
    return {
      ok: false,
      connected: false,
      rowsChecked,
      newLeads,
      duplicates,
      errors: errors + 1,
      errorMessage: 'Google Sheets temporarily unavailable.',
      lastSyncAt: new Date().toISOString(),
    };
  }
}

export async function getSheetsIntegrationStatus() {
  const lastSyncAt = (await getSetting('sheets_last_sync_at')) || null;
  const lastError = (await getSetting('sheets_last_error')) || null;
  const connected = (await getSetting('sheets_connected')) === '1';
  const apiSyncConfigured = Boolean(
    spreadsheetId() && (parseServiceAccountJson() || process.env.GOOGLE_APPLICATION_CREDENTIALS),
  );
  const webhookConfigured = webhookSecret().length >= 16;
  const configured = Boolean(spreadsheetId() && (apiSyncConfigured || webhookConfigured));
  const db = requirePool();
  const { rows: logs } = await db.query(
    `SELECT id, source, started_at, finished_at, ok, rows_checked, new_leads, duplicates, errors, error_message
     FROM sales_crm_sheet_sync_logs
     ORDER BY started_at DESC
     LIMIT 20`,
  );
  const { rows: leadCount } = await db.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM sales_crm_leads`,
  );
  return {
    configured,
    connected: connected || webhookConfigured,
    spreadsheetId: spreadsheetId() || null,
    range: sheetRange(),
    webhookConfigured,
    apiSyncConfigured,
    crmLeadCount: leadCount[0]?.n ?? 0,
    lastSyncAt,
    lastError: lastError || null,
    hint: apiSyncConfigured
      ? null
      : 'Admin sync uchun Service Account kerak. Mavjud 40+ qatorlar: Apps Script → backfillAllRows().',
    logs,
  };
}

/** Bulk ingest (Apps Script backfill). Max 200 rows per request. */
export async function ingestSheetLeadRows(
  payloads: SheetLeadPayload[],
): Promise<{
  rowsChecked: number;
  newLeads: number;
  duplicates: number;
  errors: number;
}> {
  let newLeads = 0;
  let duplicates = 0;
  let errors = 0;
  const slice = payloads.slice(0, 200);
  for (const payload of slice) {
    try {
      const result = await ingestSheetLeadRow(payload);
      if (result.skipped) {
        errors += 1;
        continue;
      }
      if (result.created) newLeads += 1;
      else duplicates += 1;
    } catch {
      errors += 1;
    }
  }
  await writeSyncLog({
    source: 'webhook',
    ok: errors === 0 || newLeads + duplicates > 0,
    rowsChecked: slice.length,
    newLeads,
    duplicates,
    errors,
    details: { bulk: true },
  });
  return { rowsChecked: slice.length, newLeads, duplicates, errors };
}

export async function recordWebhookIngest(result: {
  created: boolean;
  skipped?: boolean;
}): Promise<void> {
  await writeSyncLog({
    source: 'webhook',
    ok: !result.skipped,
    rowsChecked: 1,
    newLeads: result.created ? 1 : 0,
    duplicates: !result.created && !result.skipped ? 1 : 0,
    errors: result.skipped ? 1 : 0,
    errorMessage: result.skipped ? 'invalid_or_skipped' : null,
  });
}
