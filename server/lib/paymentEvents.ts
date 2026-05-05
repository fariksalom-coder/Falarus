/**
 * Append-only audit log for payment provider webhooks (Click/Payme).
 * Failures here must NEVER break the webhook response — we want to
 * answer the provider even if our DB is degraded — so all writes are
 * fire-and-forget with caught errors.
 *
 * Migration: supabase/migrations/116_payment_events_audit.sql
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logError } from './logger.js';

export type PaymentEventOutcome =
  | 'applied' // We actually transitioned the payment row.
  | 'duplicate' // Webhook is a replay (status was already final).
  | 'rejected' // Provider told us the user cancelled / failed.
  | 'invalid_signature'
  | 'amount_mismatch'
  | 'not_found'
  | 'config_missing'
  | 'invalid_payload';

export type RecordPaymentEventInput = {
  paymentId: number | null;
  provider: 'click' | 'payme';
  eventType: 'prepare' | 'complete' | 'card_register' | 'auto_pay' | 'refund';
  outcome: PaymentEventOutcome;
  applied: boolean;
  statusBefore?: string | null;
  statusAfter?: string | null;
  providerTransId?: string | null;
  clickPaydocId?: string | null;
  signatureValid?: boolean | null;
  amountExpected?: number | null;
  amountReceived?: number | null;
  payload?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  note?: string | null;
};

export async function recordPaymentEvent(
  supabase: SupabaseClient,
  input: RecordPaymentEventInput
): Promise<void> {
  try {
    const row = {
      payment_id: input.paymentId,
      provider: input.provider,
      event_type: input.eventType,
      outcome: input.outcome,
      applied: input.applied,
      status_before: input.statusBefore ?? null,
      status_after: input.statusAfter ?? null,
      provider_trans_id: input.providerTransId ?? null,
      click_paydoc_id: input.clickPaydocId ?? null,
      signature_valid: input.signatureValid ?? null,
      amount_expected: input.amountExpected ?? null,
      amount_received: input.amountReceived ?? null,
      payload: input.payload ?? null,
      ip: input.ip ?? null,
      user_agent: input.userAgent ?? null,
      note: input.note ?? null,
    };
    const { error } = await supabase.from('payment_events').insert(row);
    if (error) {
      // Most likely cause: migration 116 not yet applied. Don't crash the
      // handler — audit log is best-effort. Surface it once via logger.
      logError('payment_events.insert_failed', error, {
        paymentId: input.paymentId,
        provider: input.provider,
        eventType: input.eventType,
        outcome: input.outcome,
      });
    }
  } catch (err) {
    logError('payment_events.unexpected', err as Error, {
      paymentId: input.paymentId,
      eventType: input.eventType,
    });
  }
}

export function extractRequestMeta(req: {
  ip?: string;
  headers?: Record<string, unknown>;
  socket?: { remoteAddress?: string };
}): { ip: string | null; userAgent: string | null } {
  const xff = req.headers?.['x-forwarded-for'];
  const xffStr = typeof xff === 'string' ? xff : Array.isArray(xff) ? xff[0] : '';
  const ip =
    (xffStr ? xffStr.split(',')[0].trim() : '') ||
    req.ip ||
    req.socket?.remoteAddress ||
    null;
  const ua = req.headers?.['user-agent'];
  const userAgent = typeof ua === 'string' ? ua : null;
  return { ip, userAgent };
}
