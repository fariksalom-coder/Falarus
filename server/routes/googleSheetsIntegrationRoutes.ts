import { Router, type Request, type Response } from 'express';
import type { DbClient } from '../types/dbClient';
import {
  createSalesCrmAuthMiddleware,
  requireSalesCrmAdmin,
} from '../middleware/salesCrmAuth';
import {
  checkSheetsConnection,
  getSheetsIntegrationStatus,
  ingestSheetLeadRow,
  ingestSheetLeadRows,
  recordWebhookIngest,
  syncGoogleSheetsLeads,
  verifySheetsWebhookAuth,
  type SheetLeadPayload,
} from '../services/googleSheetsCrm.service';

function pickPayload(body: Record<string, unknown>): SheetLeadPayload {
  return {
    externalId: (body.externalId ?? body.id ?? body.leadId ?? null) as string | null,
    rowNumber: body.rowNumber != null ? Number(body.rowNumber) : body.row != null ? Number(body.row) : null,
    firstName: (body.firstName ?? body.first_name ?? body.ism ?? body.name ?? null) as string | null,
    lastName: (body.lastName ?? body.last_name ?? body.familiya ?? body.surname ?? null) as string | null,
    phone: (body.phone ?? body.telefon ?? body.tel ?? null) as string | null,
    submittedAt: (body.submittedAt ?? body.submitted_at ?? body.date ?? body.createdAt ?? null) as
      | string
      | null,
    source: (body.source ?? body.manba ?? 'google_sheets') as string | null,
    medium: (body.medium ?? 'webhook') as string | null,
    campaign: (body.campaign ?? null) as string | null,
    ad: (body.ad ?? null) as string | null,
    landingPage: (body.landingPage ?? body.landing_page ?? null) as string | null,
    raw: body,
  };
}

/** Public webhook + admin sync — mounted at /api/integrations/google-sheets */
export function createGoogleSheetsIntegrationRoutes(supabase: DbClient): Router {
  const router = Router();

  /** Apps Script → CRM (secret header required). Never breaks main app on failure. */
  router.post('/lead', async (req: Request, res: Response) => {
    try {
      if (!verifySheetsWebhookAuth(req)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      const result = await ingestSheetLeadRow(pickPayload(body));
      await recordWebhookIngest(result).catch(() => {});
      if (result.skipped) {
        res.status(400).json({ ok: false, reason: result.reason || 'skipped' });
        return;
      }
      res.json({
        ok: true,
        leadId: result.leadId,
        created: result.created,
        duplicate: !result.created,
      });
    } catch (e) {
      console.error('[google-sheets/lead]', e);
      res.status(500).json({ error: 'CRM temporarily unavailable' });
    }
  });

  /** Bulk backfill from Apps Script (all existing sheet rows). */
  router.post('/leads', async (req: Request, res: Response) => {
    try {
      if (!verifySheetsWebhookAuth(req)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      const list = Array.isArray(body.leads)
        ? body.leads
        : Array.isArray(body.rows)
          ? body.rows
          : Array.isArray(req.body)
            ? (req.body as unknown[])
            : [];
      if (!list.length) {
        res.status(400).json({ ok: false, error: 'leads[] required' });
        return;
      }
      const payloads = list
        .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
        .map((item) => pickPayload(item));
      const result = await ingestSheetLeadRows(payloads);
      res.json({ ok: true, ...result });
    } catch (e) {
      console.error('[google-sheets/leads]', e);
      res.status(500).json({ error: 'CRM temporarily unavailable' });
    }
  });

  const auth = createSalesCrmAuthMiddleware(supabase);

  router.get('/status', auth, requireSalesCrmAdmin, async (_req, res) => {
    try {
      res.json(await getSheetsIntegrationStatus());
    } catch (e) {
      console.error('[google-sheets/status]', e);
      res.status(500).json({
        configured: false,
        connected: false,
        lastError: 'Google Sheets temporarily unavailable.',
        logs: [],
      });
    }
  });

  router.post('/sync', auth, requireSalesCrmAdmin, async (_req, res) => {
    try {
      const result = await syncGoogleSheetsLeads('manual');
      res.status(result.ok ? 200 : 503).json(result);
    } catch (e) {
      console.error('[google-sheets/sync]', e);
      res.status(503).json({
        ok: false,
        connected: false,
        rowsChecked: 0,
        newLeads: 0,
        duplicates: 0,
        errors: 1,
        errorMessage: 'Google Sheets temporarily unavailable.',
      });
    }
  });

  router.post('/check', auth, requireSalesCrmAdmin, async (_req, res) => {
    try {
      const result = await checkSheetsConnection();
      res.status(result.ok ? 200 : 503).json(result);
    } catch (e) {
      console.error('[google-sheets/check]', e);
      res.status(503).json({
        ok: false,
        connected: false,
        errorMessage: 'Google Sheets temporarily unavailable.',
      });
    }
  });

  return router;
}
