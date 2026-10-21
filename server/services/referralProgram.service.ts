/**
 * Referral program v2 — the only place that moves referral money.
 *
 * Every balance change is one ledger row plus one referral_balances update in
 * the same transaction; ledger.idempotency_key makes each operation apply once,
 * so repeated callbacks, parallel confirmations and reconciliation runs are safe.
 *
 * Amounts are always read from the database (payments, operator_receipts),
 * never taken from a request. Payment handlers call processReferralSource()
 * AFTER they committed the confirmation; a referral failure never changes the
 * payment — the event is left 'failed' and reconcileReferralRewards() retries it.
 */
import type { PoolClient } from 'pg';
import { pool } from '../lib/db.js';
import {
  COURSE_PRODUCT_META,
  isCurrencyCode,
  type CurrencyCode,
  type PaymentProductCode,
} from '../../shared/paymentProducts.js';
import { resolveApprovedCourseProduct, resolvePaymentProductFromRow } from '../../shared/paymentsProofUrl.js';
import { getRussianTariffPlanRub } from '../../shared/russianTariffs.js';
import { getFxSnapshot, withdrawalMinimums, type FxSnapshot } from './referralFx.service.js';

export const REFERRAL_PRODUCTS = ['russian', 'patent', 'vnzh'] as const;
export type ReferralProduct = (typeof REFERRAL_PRODUCTS)[number];
export type SourceType = 'payment' | 'operator_receipt';

/** Rewards from one referrer above this count per 24 hours go to manual review. */
const REWARD_BURST_LIMIT = 5;
/** Open withdrawal requests per user and requests per 24 hours. */
const OPEN_WITHDRAWALS_LIMIT = 1;
const DAILY_WITHDRAWALS_LIMIT = 3;

export class ReferralError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

type Settings = { enabled: boolean; launch_at: Date | null; reward_percent: number; min_withdrawal_rub: number };
type Balance = { available: number; held: number; reserved: number; debt: number };
type Delta = { available?: number; held?: number; reserved?: number; debt?: number };

const num = (v: unknown) => Number(v ?? 0);
const isReferralProduct = (v: unknown): v is ReferralProduct => (REFERRAL_PRODUCTS as readonly string[]).includes(String(v));

/** UZS has no fractional unit in practice; RUB and USD keep cents. */
export function roundMoney(value: number, currency: CurrencyCode): number {
  return currency === 'UZS' ? Math.round(value) : Math.round(value * 100) / 100;
}

export function rewardFor(amount: number, percent: number, currency: CurrencyCode): number {
  return roundMoney((amount * percent) / 100, currency);
}

async function inTransaction<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  if (!pool) throw new ReferralError(503, 'NO_DB', 'Baza mavjud emas');
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const result = await fn(c);
    await c.query('COMMIT');
    return result;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export async function getSettings(c?: PoolClient): Promise<Settings> {
  const q = c ?? pool;
  if (!q) throw new ReferralError(503, 'NO_DB', 'Baza mavjud emas');
  const row = (await q.query('SELECT enabled, launch_at, reward_percent, min_withdrawal_rub FROM referral_program_settings WHERE id')).rows[0];
  if (!row) return { enabled: false, launch_at: null, reward_percent: 10, min_withdrawal_rub: 2000 };
  return {
    enabled: Boolean(row.enabled) && row.launch_at != null,
    launch_at: row.launch_at ? new Date(row.launch_at) : null,
    reward_percent: num(row.reward_percent),
    min_withdrawal_rub: num(row.min_withdrawal_rub),
  };
}

/** Locks (creating if needed) the balance row of one user and currency. */
async function lockBalance(c: PoolClient, userId: number, currency: CurrencyCode): Promise<Balance> {
  await c.query('INSERT INTO referral_balances (user_id, currency) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, currency]);
  const r = (await c.query(
    'SELECT available, held, reserved, debt FROM referral_balances WHERE user_id = $1 AND currency = $2 FOR UPDATE',
    [userId, currency],
  )).rows[0];
  return { available: num(r.available), held: num(r.held), reserved: num(r.reserved), debt: num(r.debt) };
}

type EntryInput = {
  userId: number;
  currency: CurrencyCode;
  type: string;
  amount: number;
  delta: Delta;
  key: string;
  totals?: { earned?: number; paidOut?: number; spent?: number };
  referralId?: number | null;
  sourceType?: string;
  sourceId?: number | null;
  baseAmount?: number | null;
  ratePercent?: number | null;
  relatedEntryId?: number | null;
  actorAdminId?: number | null;
  note?: string | null;
};

/**
 * Appends one ledger row and applies its deltas. Returns null when the
 * idempotency key was already used — the operation happened before.
 * The caller must hold the balance row lock.
 */
async function writeEntry(c: PoolClient, e: EntryInput): Promise<number | null> {
  const d = { available: 0, held: 0, reserved: 0, debt: 0, ...e.delta };
  const ins = await c.query(
    `INSERT INTO referral_ledger (user_id, currency, entry_type, amount, d_available, d_held, d_reserved, d_debt,
       idempotency_key, referral_id, source_type, source_id, base_amount, rate_percent, related_entry_id, actor_admin_id, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`,
    [e.userId, e.currency, e.type, e.amount, d.available, d.held, d.reserved, d.debt, e.key, e.referralId ?? null,
      e.sourceType ?? null, e.sourceId ?? null, e.baseAmount ?? null, e.ratePercent ?? null, e.relatedEntryId ?? null,
      e.actorAdminId ?? null, e.note ?? null],
  );
  if (!ins.rows[0]) return null;
  await c.query(
    `UPDATE referral_balances SET available = available + $3, held = held + $4, reserved = reserved + $5, debt = debt + $6,
       earned_total = earned_total + $7, paid_out_total = paid_out_total + $8, spent_total = spent_total + $9, updated_at = now()
     WHERE user_id = $1 AND currency = $2`,
    [e.userId, e.currency, d.available, d.held, d.reserved, d.debt, e.totals?.earned ?? 0, e.totals?.paidOut ?? 0, e.totals?.spent ?? 0],
  );
  return Number(ins.rows[0].id);
}

/** Money arriving on a balance pays the debt first. */
function creditSplit(amount: number, debt: number, currency: CurrencyCode) {
  const repay = roundMoney(Math.min(amount, debt), currency);
  return { repay, rest: roundMoney(amount - repay, currency) };
}

async function hasDebt(c: PoolClient, userId: number): Promise<boolean> {
  return Boolean((await c.query('SELECT 1 FROM referral_balances WHERE user_id = $1 AND debt > 0 LIMIT 1', [userId])).rowCount);
}

// ───────────────────────── Sources and first purchase ─────────────────────────

type Source = {
  type: SourceType;
  id: number;
  userId: number;
  amount: number;
  currency: CurrencyCode;
  product: PaymentProductCode;
  confirmedAt: Date;
  /** For receipts: the contract the receipt belongs to. */
  contractId: number | null;
  channel: string | null;
};

function paymentProduct(row: Record<string, unknown>): PaymentProductCode {
  return resolveApprovedCourseProduct(row as Parameters<typeof resolveApprovedCourseProduct>[0])
    ?? resolvePaymentProductFromRow(row as Parameters<typeof resolvePaymentProductFromRow>[0]);
}

async function loadSource(c: PoolClient, type: SourceType, id: number): Promise<Source | null> {
  if (type === 'payment') {
    const p = (await c.query(
      `SELECT id, user_id, status, amount, currency, product_code, payment_proof_url, payment_channel, approved_at
       FROM payments WHERE id = $1`, [id])).rows[0];
    if (!p || p.status !== 'approved' || !p.approved_at || !isCurrencyCode(p.currency)) return null;
    return { type, id, userId: Number(p.user_id), amount: num(p.amount), currency: p.currency, product: paymentProduct(p),
      confirmedAt: new Date(p.approved_at), contractId: null, channel: p.payment_channel ?? null };
  }
  const r = (await c.query(
    `SELECT r.id, r.status, r.amount, r.decided_at, c.id AS contract_id, c.user_id, c.currency, c.product_code
     FROM operator_receipts r JOIN operator_contracts c ON c.id = r.contract_id WHERE r.id = $1`, [id])).rows[0];
  if (!r || r.status !== 'approved' || !r.decided_at || !isCurrencyCode(r.currency)) return null;
  return { type, id, userId: Number(r.user_id), amount: num(r.amount), currency: r.currency,
    product: (r.product_code ?? 'russian') as PaymentProductCode, confirmedAt: new Date(r.decided_at),
    contractId: Number(r.contract_id), channel: 'operator' };
}

/** A real-money purchase of a program product. Bonus purchases and zero-amount store rows never count. */
function countsAsPurchase(s: { product: PaymentProductCode; amount: number; channel: string | null }): boolean {
  return isReferralProduct(s.product) && s.amount > 0 && s.channel !== 'referral_bonus';
}

/**
 * Earliest real-money program purchase of the user, including purchases made
 * before the launch. Ties are broken by source kind (payment first) and id.
 */
async function firstPurchase(c: PoolClient, userId: number):
  Promise<{ type: 'payment' | 'operator_contract'; id: number; at: Date } | null> {
  const candidates: { type: 'payment' | 'operator_contract'; id: number; at: Date; rank: number }[] = [];
  const pays = (await c.query(
    `SELECT id, amount, currency, product_code, payment_proof_url, payment_channel, approved_at
     FROM payments WHERE user_id = $1 AND status = 'approved' AND approved_at IS NOT NULL`, [userId])).rows;
  for (const p of pays) {
    if (countsAsPurchase({ product: paymentProduct(p), amount: num(p.amount), channel: p.payment_channel ?? null })) {
      candidates.push({ type: 'payment', id: Number(p.id), at: new Date(p.approved_at), rank: 0 });
    }
  }
  const contracts = (await c.query(
    `SELECT c.id, c.product_code, min(r.decided_at) AS first_at
     FROM operator_contracts c JOIN operator_receipts r ON r.contract_id = c.id AND r.status = 'approved' AND r.decided_at IS NOT NULL
     WHERE c.user_id = $1 GROUP BY c.id, c.product_code`, [userId])).rows;
  for (const k of contracts) {
    if (isReferralProduct(k.product_code ?? 'russian')) {
      candidates.push({ type: 'operator_contract', id: Number(k.id), at: new Date(k.first_at), rank: 1 });
    }
  }
  candidates.sort((a, b) => a.at.getTime() - b.at.getTime() || a.rank - b.rank || a.id - b.id);
  return candidates[0] ?? null;
}

async function markEvent(type: SourceType, id: number, status: string, reason: string | null, error?: string, ledgerId?: number | null) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO referral_source_events (source_type, source_id, status, reason, attempts, last_error, ledger_entry_id)
     VALUES ($1,$2,$3,$4,1,$5,$6)
     ON CONFLICT (source_type, source_id) DO UPDATE SET status = EXCLUDED.status, reason = EXCLUDED.reason,
       attempts = referral_source_events.attempts + 1, last_error = EXCLUDED.last_error,
       ledger_entry_id = COALESCE(EXCLUDED.ledger_entry_id, referral_source_events.ledger_entry_id), updated_at = now()
     WHERE referral_source_events.status NOT IN ('applied', 'skipped')`,
    [type, id, status, reason, error ?? null, ledgerId ?? null],
  );
}

export type ProcessResult = { status: 'disabled' | 'applied' | 'skipped' | 'already'; reason?: string; reward?: number; held?: boolean };

/**
 * Rewards the referrer for one confirmed payment or operator receipt.
 * Safe to call any number of times, concurrently, from any confirmation path.
 * While the program is off nothing is written, so the source is processed by
 * reconciliation after the launch.
 */
export async function processReferralSource(type: SourceType, id: number): Promise<ProcessResult> {
  const settings = await getSettings();
  if (!settings.enabled || !settings.launch_at) return { status: 'disabled' };
  const launchAt = settings.launch_at;
  try {
    const result = await inTransaction(async (c): Promise<ProcessResult & { ledgerId?: number | null }> => {
      await c.query(
        `INSERT INTO referral_source_events (source_type, source_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [type, id]);
      const ev = (await c.query(
        'SELECT status FROM referral_source_events WHERE source_type = $1 AND source_id = $2 FOR UPDATE', [type, id])).rows[0];
      if (ev.status === 'applied' || ev.status === 'skipped') return { status: 'already' };

      const skip = async (reason: string): Promise<ProcessResult> => {
        await c.query(
          `UPDATE referral_source_events SET status = 'skipped', reason = $3, attempts = attempts + 1, last_error = NULL, updated_at = now()
           WHERE source_type = $1 AND source_id = $2`, [type, id, reason]);
        return { status: 'skipped', reason };
      };

      const src = await loadSource(c, type, id);
      if (!src) return skip('not_confirmed');
      if (src.confirmedAt < launchAt) return skip('before_launch');
      if (!isReferralProduct(src.product)) return skip('product_not_in_program');
      if (src.channel === 'referral_bonus') return skip('paid_with_bonus');
      if (src.amount <= 0) return skip('no_money_amount');

      const ref = (await c.query(
        `SELECT id, referrer_id, referred_user_id, first_source_type, first_source_id, outcome, review_status
         FROM referrals WHERE referred_user_id = $1 FOR UPDATE`, [src.userId])).rows[0];
      if (!ref) return skip('no_referral');
      const referrerId = Number(ref.referrer_id);
      if (referrerId === src.userId) return skip('self_referral');
      if (ref.review_status === 'rejected') return skip('review_rejected');

      if (!ref.first_source_type) {
        const first = await firstPurchase(c, src.userId);
        if (!first) return skip('no_purchase');
        const eligible = first.at >= launchAt;
        await c.query(
          `UPDATE referrals SET first_source_type = $2, first_source_id = $3, first_confirmed_at = $4,
             outcome = $5, outcome_reason = $6 WHERE id = $1`,
          [ref.id, first.type, first.id, first.at, eligible ? 'eligible' : 'not_eligible', eligible ? null : 'purchase_before_launch']);
        Object.assign(ref, { first_source_type: first.type, first_source_id: first.id, outcome: eligible ? 'eligible' : 'not_eligible' });
      }
      if (ref.outcome !== 'eligible') return skip('purchase_before_launch');
      const isFirst = type === 'payment'
        ? ref.first_source_type === 'payment' && Number(ref.first_source_id) === src.id
        : ref.first_source_type === 'operator_contract' && Number(ref.first_source_id) === src.contractId;
      if (!isFirst) return skip('not_first_purchase');

      const reward = rewardFor(src.amount, settings.reward_percent, src.currency);
      if (reward <= 0) return skip('reward_rounds_to_zero');

      // Fraud signals send the reward to manual review instead of the balance.
      const signals: { kind: string; key: string; details: Record<string, unknown> }[] = [];
      const recent = num((await c.query(
        `SELECT count(*) AS n FROM referral_ledger WHERE user_id = $1 AND entry_type = 'reward' AND created_at > now() - interval '24 hours'`,
        [referrerId])).rows[0].n);
      if (recent >= REWARD_BURST_LIMIT) {
        signals.push({ kind: 'reward_burst', key: `burst:${referrerId}:${new Date().toISOString().slice(0, 10)}`, details: { rewards_24h: recent } });
      }
      const cycle = (await c.query('SELECT 1 FROM users WHERE id = $1 AND referred_by = $2', [referrerId, src.userId])).rowCount;
      if (cycle) signals.push({ kind: 'referral_cycle', key: `cycle:${ref.id}`, details: { referrer: referrerId, referred: src.userId } });
      for (const s of signals) {
        await c.query(
          `INSERT INTO referral_review_flags (kind, dedupe_key, user_id, referral_id, details) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [s.kind, s.key, referrerId, ref.id, JSON.stringify(s.details)]);
      }
      const hold = ref.review_status === 'pending' || signals.length > 0;
      if (hold && ref.review_status !== 'pending') {
        await c.query(`UPDATE referrals SET review_status = 'pending' WHERE id = $1 AND review_status IN ('none', 'cleared')`, [ref.id]);
      }

      const bal = await lockBalance(c, referrerId, src.currency);
      const split = hold ? { repay: 0, rest: reward } : creditSplit(reward, bal.debt, src.currency);
      const ledgerId = await writeEntry(c, {
        userId: referrerId, currency: src.currency, type: 'reward', amount: reward,
        delta: hold ? { held: reward } : { available: split.rest, debt: -split.repay },
        key: `reward:${type}:${id}`, totals: { earned: reward }, referralId: Number(ref.id),
        sourceType: type, sourceId: id, baseAmount: src.amount, ratePercent: settings.reward_percent,
        note: hold ? 'held_for_review' : split.repay > 0 ? `debt_repaid:${split.repay}` : null,
      });
      await c.query(
        `UPDATE referrals SET status = 'rewarded', rewarded_at = COALESCE(rewarded_at, now()),
           payment_id = COALESCE(payment_id, $2), reward_amount = COALESCE(reward_amount, 0) + $3 WHERE id = $1`,
        [ref.id, type === 'payment' ? id : null, ledgerId ? reward : 0]);
      await c.query(
        `UPDATE referral_source_events SET status = 'applied', reason = $3, attempts = attempts + 1, last_error = NULL,
           ledger_entry_id = $4, updated_at = now() WHERE source_type = $1 AND source_id = $2`,
        [type, id, hold ? 'held_for_review' : null, ledgerId]);
      return { status: 'applied', reward, held: hold, ledgerId };
    });
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 500) : String(e);
    console.error('[referral] process failed', type, id, message);
    await markEvent(type, id, 'failed', null, message).catch(() => {});
    throw e;
  }
}

/** Fire-and-forget wrapper for payment handlers: never throws, never blocks the payment. */
export function queueReferralSource(type: SourceType, id: number | null | undefined): void {
  if (!id || !Number.isFinite(Number(id))) return;
  void processReferralSource(type, Number(id)).catch(() => {});
}

// ───────────────────────────────── Refunds ─────────────────────────────────

export type RefundInput = {
  sourceType: SourceType;
  sourceId: number;
  refundAmount: number;
  reference: string;
  origin: 'click' | 'admin';
  adminId?: number | null;
  note?: string | null;
};

/**
 * Registers a confirmed money refund and reverses the proportional part of the
 * reward: from available, then held, and the rest becomes debt. The same
 * reference never applies twice and total reversals never exceed the reward.
 */
export async function registerRefund(input: RefundInput): Promise<{ refundId: number; reversed: number; debt: number; duplicate: boolean }> {
  const reference = input.reference.trim();
  if (reference.length < 3) throw new ReferralError(400, 'BAD_REFERENCE', "Qaytarish identifikatorini kiriting");
  return inTransaction(async (c) => {
    const src = input.sourceType === 'payment'
      ? (await c.query('SELECT id, amount, currency, status FROM payments WHERE id = $1 FOR UPDATE', [input.sourceId])).rows[0]
      : (await c.query(
          `SELECT r.id, r.amount, c.currency, r.status FROM operator_receipts r JOIN operator_contracts c ON c.id = r.contract_id
           WHERE r.id = $1 FOR UPDATE OF r`, [input.sourceId])).rows[0];
    if (!src) throw new ReferralError(404, 'SOURCE_NOT_FOUND', "To'lov topilmadi");
    const currency = src.currency as CurrencyCode;
    const gross = num(src.amount);
    const amount = roundMoney(Number(input.refundAmount), currency);
    if (!(amount > 0)) throw new ReferralError(400, 'BAD_AMOUNT', "Qaytarilgan summa noto'g'ri");

    const prior = num((await c.query(
      'SELECT COALESCE(sum(refund_amount), 0) AS s FROM referral_refunds WHERE source_type = $1 AND source_id = $2',
      [input.sourceType, input.sourceId])).rows[0].s);
    const ins = await c.query(
      `INSERT INTO referral_refunds (source_type, source_id, refund_amount, currency, reference, origin, actor_admin_id, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (source_type, source_id, reference) DO NOTHING RETURNING id`,
      [input.sourceType, input.sourceId, amount, currency, reference, input.origin, input.adminId ?? null, input.note ?? null]);
    if (!ins.rows[0]) {
      const existing = (await c.query(
        'SELECT id FROM referral_refunds WHERE source_type = $1 AND source_id = $2 AND reference = $3',
        [input.sourceType, input.sourceId, reference])).rows[0];
      return { refundId: Number(existing.id), reversed: 0, debt: 0, duplicate: true };
    }
    if (prior + amount > gross + 0.001) throw new ReferralError(400, 'REFUND_EXCEEDS_PAYMENT', "Qaytarishlar jami to'lov summasidan oshib ketadi");
    const refundId = Number(ins.rows[0].id);

    const reward = (await c.query(
      `SELECT id, user_id, amount, referral_id FROM referral_ledger WHERE idempotency_key = $1`,
      [`reward:${input.sourceType}:${input.sourceId}`])).rows[0];
    if (!reward) return { refundId, reversed: 0, debt: 0, duplicate: false };

    const userId = Number(reward.user_id);
    const rewardAmount = num(reward.amount);
    const alreadyReversed = num((await c.query(
      `SELECT COALESCE(sum(amount), 0) AS s FROM referral_ledger WHERE entry_type = 'reversal' AND related_entry_id = $1`,
      [reward.id])).rows[0].s);
    const target = Math.min(roundMoney(rewardAmount * Math.min(1, (prior + amount) / gross), currency), rewardAmount);
    const reversal = roundMoney(Math.max(0, target - alreadyReversed), currency);
    if (reversal <= 0) return { refundId, reversed: 0, debt: 0, duplicate: false };

    const bal = await lockBalance(c, userId, currency);
    const fromAvailable = Math.min(bal.available, reversal);
    const fromHeld = Math.min(bal.held, roundMoney(reversal - fromAvailable, currency));
    const toDebt = roundMoney(reversal - fromAvailable - fromHeld, currency);
    await writeEntry(c, {
      userId, currency, type: 'reversal', amount: reversal,
      delta: { available: -fromAvailable, held: -fromHeld, debt: toDebt },
      key: `reversal:refund:${refundId}`, referralId: reward.referral_id ? Number(reward.referral_id) : null,
      sourceType: 'refund', sourceId: refundId, baseAmount: amount, relatedEntryId: Number(reward.id),
      actorAdminId: input.adminId ?? null, note: input.note ?? null,
    });
    return { refundId, reversed: reversal, debt: toDebt, duplicate: false };
  });
}

// ───────────────────────────── Manual review ─────────────────────────────

/** Admin decision on a referral under review: release held rewards or cancel them. */
export async function decideReferralReview(referralId: number, decision: 'cleared' | 'rejected', adminId: number, note: string) {
  return inTransaction(async (c) => {
    const ref = (await c.query('SELECT id, referrer_id, review_status FROM referrals WHERE id = $1 FOR UPDATE', [referralId])).rows[0];
    if (!ref) throw new ReferralError(404, 'NOT_FOUND', 'Taklif topilmadi');
    if (ref.review_status !== 'pending') throw new ReferralError(409, 'NOT_PENDING', "Bu taklif tekshiruvda emas");
    const userId = Number(ref.referrer_id);
    const held = (await c.query(
      `SELECT l.id, l.currency, l.amount FROM referral_ledger l
       WHERE l.referral_id = $1 AND l.entry_type = 'reward' AND l.note = 'held_for_review'
         AND NOT EXISTS (SELECT 1 FROM referral_ledger x WHERE x.related_entry_id = l.id AND x.entry_type IN ('hold_release', 'hold_cancel'))
       ORDER BY l.id`, [referralId])).rows;
    for (const h of held) {
      const currency = h.currency as CurrencyCode;
      const bal = await lockBalance(c, userId, currency);
      // A refund may already have taken part of the held money.
      const amount = roundMoney(Math.min(num(h.amount), bal.held), currency);
      if (amount <= 0) continue;
      if (decision === 'cleared') {
        const split = creditSplit(amount, bal.debt, currency);
        await writeEntry(c, { userId, currency, type: 'hold_release', amount, delta: { held: -amount, available: split.rest, debt: -split.repay },
          key: `hold:release:${h.id}`, referralId, sourceType: 'review', sourceId: referralId, relatedEntryId: Number(h.id), actorAdminId: adminId, note });
      } else {
        await writeEntry(c, { userId, currency, type: 'hold_cancel', amount, delta: { held: -amount }, totals: { earned: -amount },
          key: `hold:cancel:${h.id}`, referralId, sourceType: 'review', sourceId: referralId, relatedEntryId: Number(h.id), actorAdminId: adminId, note });
      }
    }
    await c.query('UPDATE referrals SET review_status = $2, review_note = $3, reviewed_by = $4, reviewed_at = now() WHERE id = $1',
      [referralId, decision, note.slice(0, 500), adminId]);
    await c.query(
      `UPDATE referral_review_flags SET status = $2, decided_by = $3, decided_at = now(), decision_note = $4
       WHERE referral_id = $1 AND status = 'open'`, [referralId, decision === 'cleared' ? 'cleared' : 'confirmed', adminId, note.slice(0, 500)]);
    return { released: decision === 'cleared' ? held.length : 0 };
  });
}

// ─────────────────────────────── Withdrawals ───────────────────────────────

export type WithdrawalInput = {
  userId: number;
  currency: unknown;
  amount: unknown;
  cardNumber: unknown;
  fullName: unknown;
  phone: unknown;
  idempotencyKey: unknown;
};

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
export const maskCard = (card: string | null | undefined) => {
  const d = digits(card);
  return d.length >= 4 ? `•••• ${d.slice(-4)}` : '—';
};

export async function withdrawalMinimumsNow(): Promise<{ minimums: Record<CurrencyCode, number>; fx: FxSnapshot; baseRub: number }> {
  const s = await getSettings();
  const fx = await getFxSnapshot();
  return { minimums: withdrawalMinimums(s.min_withdrawal_rub, fx), fx, baseRub: s.min_withdrawal_rub };
}

export async function requestWithdrawal(input: WithdrawalInput) {
  const settings = await getSettings();
  if (!settings.enabled) throw new ReferralError(403, 'PROGRAM_OFF', 'Taklif dasturi hali ishga tushmagan');
  if (!isCurrencyCode(input.currency)) throw new ReferralError(400, 'BAD_CURRENCY', 'Valyutani tanlang');
  const currency = input.currency;
  const amount = roundMoney(Number(input.amount), currency);
  if (!(amount > 0)) throw new ReferralError(400, 'BAD_AMOUNT', "Summa noto'g'ri");
  const card = digits(input.cardNumber);
  if (card.length < 12 || card.length > 19) throw new ReferralError(400, 'BAD_CARD', "Karta raqami noto'g'ri");
  const fullName = String(input.fullName ?? '').trim().slice(0, 120);
  if (fullName.length < 3) throw new ReferralError(400, 'BAD_NAME', 'Karta egasining ism-familiyasini kiriting');
  const phone = String(input.phone ?? '').trim().slice(0, 30);
  const key = String(input.idempotencyKey ?? '').trim().slice(0, 80);
  if (key.length < 8) throw new ReferralError(400, 'BAD_KEY', "So'rov identifikatori yo'q");

  // Throws RATE_UNAVAILABLE: the request is refused, no stale or invented rate is used.
  const fx = await getFxSnapshot();
  const min = withdrawalMinimums(settings.min_withdrawal_rub, fx)[currency];
  if (amount < min) throw new ReferralError(400, 'BELOW_MINIMUM', `Minimal summa: ${min} ${currency}`);

  return inTransaction(async (c) => {
    const existing = (await c.query(
      'SELECT id, status, amount, currency FROM referral_withdrawals WHERE user_id = $1 AND idempotency_key = $2', [input.userId, key])).rows[0];
    if (existing) return { id: Number(existing.id), status: existing.status, amount: num(existing.amount), currency: existing.currency, duplicate: true };
    const bal = await lockBalance(c, input.userId, currency);
    if (await hasDebt(c, input.userId)) throw new ReferralError(409, 'HAS_DEBT', "Qarzdorlik to'liq yopilmaguncha pul yechib bo'lmaydi");
    const open = num((await c.query(
      `SELECT count(*) AS n FROM referral_withdrawals WHERE user_id = $1 AND status IN ('pending', 'approved')`, [input.userId])).rows[0].n);
    if (open >= OPEN_WITHDRAWALS_LIMIT) throw new ReferralError(409, 'OPEN_REQUEST', "Avvalgi so'rovingiz hali ko'rib chiqilmoqda");
    const today = num((await c.query(
      `SELECT count(*) AS n FROM referral_withdrawals WHERE user_id = $1 AND created_at > now() - interval '24 hours'`, [input.userId])).rows[0].n);
    if (today >= DAILY_WITHDRAWALS_LIMIT) throw new ReferralError(429, 'TOO_MANY', "Bugun juda ko'p so'rov yuborildi");
    if (bal.available < amount) throw new ReferralError(409, 'INSUFFICIENT', 'Balans yetarli emas');

    const w = (await c.query(
      `INSERT INTO referral_withdrawals (user_id, amount, currency, status, card_number, card_last4, full_name, phone, idempotency_key,
         min_amount, rate_rub_uzs, rate_usd_uzs, rate_as_of, rate_source)
       VALUES ($1,$2,$3,'pending',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [input.userId, amount, currency, card, card.slice(-4), fullName, phone, key, min, fx.rubUzs, fx.usdUzs, fx.asOf, fx.source])).rows[0];
    const id = Number(w.id);
    await writeEntry(c, { userId: input.userId, currency, type: 'withdrawal_reserve', amount, delta: { available: -amount, reserved: amount },
      key: `withdrawal:reserve:${id}`, sourceType: 'withdrawal', sourceId: id });
    const others = (await c.query(
      `SELECT DISTINCT user_id FROM referral_withdrawals WHERE card_number = $1 AND user_id <> $2`, [card, input.userId])).rows;
    if (others.length) {
      await c.query(
        `INSERT INTO referral_review_flags (kind, dedupe_key, user_id, withdrawal_id, details) VALUES ('shared_payout_card', $1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [`card:${id}`, input.userId, id, JSON.stringify({ card_last4: card.slice(-4), other_users: others.map((o) => Number(o.user_id)) })]);
    }
    return { id, status: 'pending', amount, currency, duplicate: false };
  });
}

export async function approveWithdrawal(id: number, adminId: number) {
  return inTransaction(async (c) => {
    const w = (await c.query('SELECT user_id, status FROM referral_withdrawals WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!w) throw new ReferralError(404, 'NOT_FOUND', "So'rov topilmadi");
    if (w.status !== 'pending') throw new ReferralError(409, 'BAD_STATE', "So'rov allaqachon ko'rib chiqilgan");
    if (await hasDebt(c, Number(w.user_id))) throw new ReferralError(409, 'HAS_DEBT', 'Foydalanuvchida qarzdorlik bor — so‘rovni rad eting');
    await c.query(`UPDATE referral_withdrawals SET status = 'approved', approved_at = now(), approved_by = $2 WHERE id = $1`, [id, adminId]);
    return { id, status: 'approved' };
  });
}

/** Records the actual transfer. Only an approved request can be paid, and only once. */
export async function markWithdrawalPaid(id: number, adminId: number, payoutReference: string) {
  const reference = payoutReference.trim();
  if (reference.length < 3) throw new ReferralError(400, 'BAD_REFERENCE', "To'lov identifikatorini kiriting");
  return inTransaction(async (c) => {
    const w = (await c.query('SELECT user_id, status, amount, currency FROM referral_withdrawals WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!w) throw new ReferralError(404, 'NOT_FOUND', "So'rov topilmadi");
    if (w.status !== 'approved') throw new ReferralError(409, 'BAD_STATE', "Faqat tasdiqlangan so'rov to'lanadi");
    if ((await c.query('SELECT 1 FROM referral_withdrawals WHERE payout_reference = $1 AND id <> $2', [reference, id])).rowCount) {
      throw new ReferralError(409, 'DUPLICATE_REFERENCE', "Bu to'lov identifikatori boshqa so'rovda ishlatilgan");
    }
    const userId = Number(w.user_id), currency = w.currency as CurrencyCode, amount = num(w.amount);
    await lockBalance(c, userId, currency);
    await c.query(`UPDATE referral_withdrawals SET status = 'paid', paid_at = now(), paid_by = $2, payout_reference = $3, processed_at = now() WHERE id = $1`,
      [id, adminId, reference]);
    await writeEntry(c, { userId, currency, type: 'withdrawal_payout', amount, delta: { reserved: -amount }, totals: { paidOut: amount },
      key: `withdrawal:payout:${id}`, sourceType: 'withdrawal', sourceId: id, actorAdminId: adminId, note: reference });
    return { id, status: 'paid' };
  });
}

/** Rejects a pending or approved request and returns the reserve exactly once. */
export async function rejectWithdrawal(id: number, adminId: number, reason: string) {
  const why = reason.trim();
  if (why.length < 3) throw new ReferralError(400, 'BAD_REASON', 'Rad etish sababini yozing');
  return inTransaction(async (c) => {
    const w = (await c.query(
      `UPDATE referral_withdrawals SET status = 'rejected', rejected_by = $2, reject_reason = $3, processed_at = now()
       WHERE id = $1 AND status IN ('pending', 'approved') RETURNING user_id, amount, currency`, [id, adminId, why.slice(0, 500)])).rows[0];
    if (!w) throw new ReferralError(409, 'BAD_STATE', "So'rov allaqachon yakunlangan");
    const userId = Number(w.user_id), currency = w.currency as CurrencyCode, amount = num(w.amount);
    const bal = await lockBalance(c, userId, currency);
    const split = creditSplit(amount, bal.debt, currency);
    await writeEntry(c, { userId, currency, type: 'withdrawal_release', amount, delta: { reserved: -amount, available: split.rest, debt: -split.repay },
      key: `withdrawal:release:${id}`, sourceType: 'withdrawal', sourceId: id, actorAdminId: adminId, note: why.slice(0, 500) });
    return { id, status: 'rejected' };
  });
}

// ───────────────────────────── Course for bonuses ─────────────────────────────

export type BonusPurchaseInput = { userId: number; product: unknown; tariff: unknown; currency: unknown; idempotencyKey: unknown };

export async function bonusPrice(c: PoolClient, product: ReferralProduct, tariff: string | null, currency: CurrencyCode): Promise<number> {
  if (product !== 'russian') return COURSE_PRODUCT_META[product].prices[currency];
  const plan = getRussianTariffPlanRub(tariff);
  if (!plan) return 0;
  if (currency === 'RUB') return plan.priceRub;
  if (currency === 'UZS') return plan.priceUzs;
  const row = (await c.query('SELECT price FROM tariff_prices WHERE currency = $1 AND tariff_type = $2', [currency, tariff])).rows[0];
  return row ? num(row.price) : 0;
}

/**
 * Buys a program product entirely with bonus balance of the same currency.
 * The payment row carries amount 0 (no money), so it is never rewarded and is
 * not counted as revenue. Returns the payment id for access activation.
 */
export async function purchaseWithBonus(input: BonusPurchaseInput) {
  const settings = await getSettings();
  if (!settings.enabled) throw new ReferralError(403, 'PROGRAM_OFF', 'Taklif dasturi hali ishga tushmagan');
  if (!isReferralProduct(input.product)) throw new ReferralError(400, 'BAD_PRODUCT', 'Kursni tanlang');
  if (!isCurrencyCode(input.currency)) throw new ReferralError(400, 'BAD_CURRENCY', 'Valyutani tanlang');
  const product = input.product, currency = input.currency;
  const tariff = product === 'russian' ? String(input.tariff ?? '') : null;
  const key = String(input.idempotencyKey ?? '').trim().slice(0, 80);
  if (key.length < 8) throw new ReferralError(400, 'BAD_KEY', "So'rov identifikatori yo'q");
  const ledgerKey = `spend:${input.userId}:${key}`;

  return inTransaction(async (c) => {
    const done = (await c.query('SELECT source_id FROM referral_ledger WHERE idempotency_key = $1', [ledgerKey])).rows[0];
    if (done) return { paymentId: Number(done.source_id), product, tariff, currency, duplicate: true };
    const price = await bonusPrice(c, product, tariff, currency);
    if (!(price > 0)) throw new ReferralError(400, 'NO_PRICE', 'Bu valyutada narx topilmadi');
    const bal = await lockBalance(c, input.userId, currency);
    if (await hasDebt(c, input.userId)) throw new ReferralError(409, 'HAS_DEBT', "Qarzdorlik yopilmaguncha bonus bilan to'lab bo'lmaydi");
    if (bal.available < price) throw new ReferralError(409, 'INSUFFICIENT', 'Bonus balans yetarli emas');
    const pay = (await c.query(
      `INSERT INTO payments (user_id, amount, base_amount, discount_amount, currency, status, product_code, tariff_type,
         payment_channel, payment_time, approved_at, discount_meta)
       VALUES ($1, 0, $2, $2, $3, 'approved', $4, $5, 'referral_bonus', now(), now(), $6) RETURNING id`,
      [input.userId, price, currency, product, tariff, JSON.stringify({ referral_bonus: { amount: price, currency } })])).rows[0];
    const paymentId = Number(pay.id);
    await writeEntry(c, { userId: input.userId, currency, type: 'spend', amount: price, delta: { available: -price }, totals: { spent: price },
      key: ledgerKey, sourceType: 'payment', sourceId: paymentId });
    return { paymentId, product, tariff, currency, price, duplicate: false };
  });
}

/** Admin cancellation of a bonus purchase: the payment is marked refunded and the bonus returns once. */
export async function cancelBonusPurchase(paymentId: number, adminId: number, reason: string) {
  return inTransaction(async (c) => {
    const p = (await c.query(
      `UPDATE payments SET status = 'refunded', refunded_at = now()
       WHERE id = $1 AND status = 'approved' AND payment_channel = 'referral_bonus' RETURNING user_id, currency`, [paymentId])).rows[0];
    if (!p) throw new ReferralError(409, 'BAD_STATE', "Bu bonus xaridi topilmadi yoki bekor qilingan");
    const spend = (await c.query(
      `SELECT id, amount FROM referral_ledger WHERE entry_type = 'spend' AND source_type = 'payment' AND source_id = $1`, [paymentId])).rows[0];
    const userId = Number(p.user_id), currency = p.currency as CurrencyCode, amount = num(spend?.amount);
    const bal = await lockBalance(c, userId, currency);
    const split = creditSplit(amount, bal.debt, currency);
    await writeEntry(c, { userId, currency, type: 'spend_release', amount, delta: { available: split.rest, debt: -split.repay }, totals: { spent: -amount },
      key: `spend:release:${paymentId}`, sourceType: 'payment', sourceId: paymentId, relatedEntryId: spend ? Number(spend.id) : null,
      actorAdminId: adminId, note: reason.slice(0, 500) });
    return { paymentId, userId, released: amount };
  });
}

// ───────────────────────────── Reconciliation ─────────────────────────────

/**
 * Processes confirmed sources of invited users that have no final event yet,
 * plus failed events. Idempotent; safe to run on a schedule.
 */
export async function reconcileReferralRewards(limit = 200) {
  const settings = await getSettings();
  if (!settings.enabled || !settings.launch_at || !pool) return { disabled: true, processed: 0, failed: 0 };
  const rows = (await pool.query(
    `SELECT 'payment' AS t, p.id FROM payments p JOIN referrals r ON r.referred_user_id = p.user_id
       WHERE p.status = 'approved' AND p.approved_at >= $1
         AND NOT EXISTS (SELECT 1 FROM referral_source_events e WHERE e.source_type = 'payment' AND e.source_id = p.id AND e.status IN ('applied', 'skipped'))
     UNION ALL
     SELECT 'operator_receipt', x.id FROM operator_receipts x JOIN operator_contracts k ON k.id = x.contract_id
       JOIN referrals r ON r.referred_user_id = k.user_id
       WHERE x.status = 'approved' AND x.decided_at >= $1
         AND NOT EXISTS (SELECT 1 FROM referral_source_events e WHERE e.source_type = 'operator_receipt' AND e.source_id = x.id AND e.status IN ('applied', 'skipped'))
     LIMIT $2`, [settings.launch_at, limit])).rows;
  let processed = 0, failed = 0;
  for (const r of rows) {
    try { await processReferralSource(r.t as SourceType, Number(r.id)); processed++; } catch { failed++; }
  }
  return { disabled: false, processed, failed };
}

/** Balances that disagree with the sum of their ledger deltas — must always be empty. */
export async function ledgerMismatches(c?: PoolClient) {
  const q = c ?? pool;
  if (!q) return [];
  return (await q.query(
    `SELECT b.user_id, b.currency, b.available, b.held, b.reserved, b.debt,
            COALESCE(l.a, 0) AS ledger_available, COALESCE(l.h, 0) AS ledger_held, COALESCE(l.r, 0) AS ledger_reserved, COALESCE(l.d, 0) AS ledger_debt
     FROM referral_balances b
     LEFT JOIN (SELECT user_id, currency, sum(d_available) a, sum(d_held) h, sum(d_reserved) r, sum(d_debt) d
                FROM referral_ledger GROUP BY user_id, currency) l USING (user_id, currency)
     WHERE b.available <> COALESCE(l.a, 0) OR b.held <> COALESCE(l.h, 0) OR b.reserved <> COALESCE(l.r, 0) OR b.debt <> COALESCE(l.d, 0)`,
  )).rows;
}
