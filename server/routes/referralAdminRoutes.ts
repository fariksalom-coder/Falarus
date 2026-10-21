/**
 * Admin panel API of the referral program. Mounted under the admin router, so
 * every route already passed the admin token check; req.adminId is the actor
 * recorded on each decision.
 */
import { Router, type Request, type Response } from 'express';
import { pool } from '../lib/db.js';
import {
  ReferralError,
  approveWithdrawal,
  cancelBonusPurchase,
  decideReferralReview,
  getSettings,
  ledgerMismatches,
  markWithdrawalPaid,
  maskCard,
  reconcileReferralRewards,
  registerRefund,
  rejectWithdrawal,
} from '../services/referralProgram.service.js';

type AdminRequest = Request & { adminId?: number };
const num = (v: unknown) => Number(v ?? 0);
const adminOf = (req: AdminRequest) => Number(req.adminId);
const text = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max);

const wrap = (fn: (req: AdminRequest, res: Response) => Promise<unknown>) => (req: Request, res: Response) => {
  fn(req as AdminRequest, res).catch((e) => {
    if (e instanceof ReferralError) return res.status(e.status).json({ error: e.message, code: e.code });
    console.error('[referral-admin]', e instanceof Error ? e.message : e);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  });
};

export function createReferralAdminRoutes(): Router {
  const router = Router();
  const db = () => {
    if (!pool) throw new ReferralError(503, 'NO_DB', 'Baza mavjud emas');
    return pool;
  };

  router.get('/overview', wrap(async (_req, res) => {
    const q = db();
    const [settings, totals, events, flags, wds, mismatches] = await Promise.all([
      getSettings(),
      q.query(`SELECT currency, sum(available) available, sum(held) held, sum(reserved) reserved, sum(debt) debt,
                      sum(earned_total) earned, sum(paid_out_total) paid_out, sum(spent_total) spent
               FROM referral_balances GROUP BY currency ORDER BY currency`),
      q.query(`SELECT status, count(*)::int n FROM referral_source_events GROUP BY status`),
      q.query(`SELECT count(*)::int n FROM referral_review_flags WHERE status = 'open'`),
      q.query(`SELECT status, currency, count(*)::int n, sum(amount) amount FROM referral_withdrawals GROUP BY status, currency`),
      ledgerMismatches(),
    ]);
    const stuck = await q.query(
      `SELECT count(*)::int n FROM referral_source_events WHERE status IN ('pending', 'failed') AND updated_at < now() - interval '5 minutes'`);
    res.json({
      settings: { ...settings, launch_at: settings.launch_at?.toISOString() ?? null },
      totals: totals.rows.map((r) => ({ currency: r.currency, available: num(r.available), pending: num(r.held), reserved: num(r.reserved),
        debt: num(r.debt), earned: num(r.earned), paid_out: num(r.paid_out), spent: num(r.spent) })),
      events: events.rows,
      stuck_events: stuck.rows[0].n,
      open_flags: flags.rows[0].n,
      withdrawals: wds.rows.map((r) => ({ status: r.status, currency: r.currency, count: r.n, amount: num(r.amount) })),
      ledger_mismatches: mismatches.length,
    });
  }));

  /**
   * Turning the program on is an explicit owner action: the request must carry
   * confirm = "ENABLE". The launch date is set once and never moved afterwards.
   */
  router.put('/settings', wrap(async (req, res) => {
    const enabled = req.body?.enabled === true;
    const current = (await db().query('SELECT enabled, launch_at FROM referral_program_settings WHERE id')).rows[0];
    if (enabled && req.body?.confirm !== 'ENABLE') throw new ReferralError(400, 'CONFIRM', 'Tasdiqlash uchun ENABLE deb yozing');
    let launchAt: Date | null = current?.launch_at ? new Date(current.launch_at) : null;
    if (enabled && !launchAt) {
      const requested = req.body?.launch_at ? new Date(String(req.body.launch_at)) : new Date();
      if (Number.isNaN(requested.getTime())) throw new ReferralError(400, 'BAD_DATE', "Sana noto'g'ri");
      launchAt = requested;
    }
    await db().query(
      'UPDATE referral_program_settings SET enabled = $1, launch_at = $2, updated_at = now(), updated_by = $3 WHERE id',
      [enabled, launchAt, adminOf(req)]);
    console.log('[referral-admin] settings', { enabled, launch_at: launchAt?.toISOString() ?? null, admin: adminOf(req) });
    res.json({ enabled, launch_at: launchAt?.toISOString() ?? null });
  }));

  router.get('/links', wrap(async (req, res) => {
    const review = ['pending', 'cleared', 'rejected'].includes(String(req.query.review)) ? String(req.query.review) : null;
    const search = text(req.query.q, 60);
    const rows = (await db().query(
      `SELECT r.id, r.created_at, r.status, r.outcome, r.outcome_reason, r.review_status, r.review_note, r.first_source_type, r.first_source_id,
              r.first_confirmed_at, r.referrer_id, r.referred_user_id,
              concat_ws(' ', a.first_name, a.last_name) referrer_name, a.phone referrer_phone,
              concat_ws(' ', b.first_name, b.last_name) referred_name, b.phone referred_phone,
              (SELECT json_agg(json_build_object('currency', l.currency, 'amount', l.amount)) FROM referral_ledger l
                 WHERE l.referral_id = r.id AND l.entry_type = 'reward') rewards
       FROM referrals r JOIN users a ON a.id = r.referrer_id JOIN users b ON b.id = r.referred_user_id
       WHERE ($1::text IS NULL OR r.review_status = $1)
         AND ($2 = '' OR a.phone ILIKE '%' || $2 || '%' OR b.phone ILIKE '%' || $2 || '%' OR r.referrer_id::text = $2 OR r.referred_user_id::text = $2)
       ORDER BY r.id DESC LIMIT 200`, [review, search])).rows;
    res.json(rows);
  }));

  router.post('/links/:id/review', wrap(async (req, res) => {
    const decision = req.body?.decision === 'cleared' ? 'cleared' : req.body?.decision === 'rejected' ? 'rejected' : null;
    if (!decision) throw new ReferralError(400, 'BAD_DECISION', "Qaror noto'g'ri");
    const note = text(req.body?.note);
    if (note.length < 3) throw new ReferralError(400, 'BAD_NOTE', 'Izoh yozing');
    res.json(await decideReferralReview(Number(req.params.id), decision, adminOf(req), note));
  }));

  /** Sends a link to manual review: its next rewards are held until a decision. */
  router.post('/links/:id/flag', wrap(async (req, res) => {
    const note = text(req.body?.note);
    if (note.length < 3) throw new ReferralError(400, 'BAD_NOTE', 'Izoh yozing');
    const id = Number(req.params.id);
    const r = (await db().query(
      `UPDATE referrals SET review_status = 'pending', review_note = $2 WHERE id = $1 AND review_status <> 'rejected' RETURNING referrer_id`,
      [id, note])).rows[0];
    if (!r) throw new ReferralError(404, 'NOT_FOUND', 'Taklif topilmadi');
    await db().query(
      `INSERT INTO referral_review_flags (kind, dedupe_key, user_id, referral_id, details) VALUES ('manual', $1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [`manual:${id}:${Date.now()}`, r.referrer_id, id, JSON.stringify({ note, admin: adminOf(req) })]);
    res.json({ ok: true });
  }));

  router.get('/flags', wrap(async (req, res) => {
    const status = ['open', 'cleared', 'confirmed'].includes(String(req.query.status)) ? String(req.query.status) : 'open';
    res.json((await db().query(
      `SELECT id, kind, user_id, referral_id, withdrawal_id, details, status, decided_by, decided_at, decision_note, created_at
       FROM referral_review_flags WHERE status = $1 ORDER BY id DESC LIMIT 200`, [status])).rows);
  }));

  router.post('/flags/:id/close', wrap(async (req, res) => {
    const status = req.body?.status === 'confirmed' ? 'confirmed' : 'cleared';
    const note = text(req.body?.note);
    const r = await db().query(
      `UPDATE referral_review_flags SET status = $2, decided_by = $3, decided_at = now(), decision_note = $4 WHERE id = $1 AND status = 'open'`,
      [Number(req.params.id), status, adminOf(req), note]);
    if (!r.rowCount) throw new ReferralError(409, 'BAD_STATE', 'Signal allaqachon yopilgan');
    res.json({ ok: true });
  }));

  router.get('/ledger', wrap(async (req, res) => {
    const userId = Number(req.query.user_id);
    const rows = (await db().query(
      `SELECT l.*, concat_ws(' ', u.first_name, u.last_name) user_name FROM referral_ledger l LEFT JOIN users u ON u.id = l.user_id
       WHERE ($1::bigint IS NULL OR l.user_id = $1) ORDER BY l.id DESC LIMIT 300`,
      [Number.isFinite(userId) && userId > 0 ? userId : null])).rows;
    res.json(rows);
  }));

  router.get('/withdrawals', wrap(async (req, res) => {
    const status = ['pending', 'approved', 'paid', 'rejected'].includes(String(req.query.status)) ? String(req.query.status) : null;
    const rows = (await db().query(
      `SELECT w.id, w.user_id, w.amount, w.currency, w.status, w.card_number, w.full_name, w.created_at, w.approved_at, w.paid_at,
              w.payout_reference, w.reject_reason, w.min_amount, w.rate_as_of,
              concat_ws(' ', u.first_name, u.last_name) user_name,
              COALESCE((SELECT sum(debt) FROM referral_balances b WHERE b.user_id = w.user_id), 0) debt,
              EXISTS (SELECT 1 FROM referral_review_flags f WHERE f.withdrawal_id = w.id AND f.status = 'open') flagged
       FROM referral_withdrawals w LEFT JOIN users u ON u.id = w.user_id
       WHERE ($1::text IS NULL OR w.status = $1) ORDER BY w.id DESC LIMIT 200`, [status])).rows;
    // Card numbers are masked in lists; the full number is a separate, logged request.
    res.json(rows.map(({ card_number, ...w }) => ({ ...w, card: maskCard(card_number), debt: num(w.debt) })));
  }));

  router.get('/withdrawals/:id/details', wrap(async (req, res) => {
    const id = Number(req.params.id);
    const w = (await db().query('SELECT id, card_number, full_name, phone, status FROM referral_withdrawals WHERE id = $1', [id])).rows[0];
    if (!w) throw new ReferralError(404, 'NOT_FOUND', "So'rov topilmadi");
    console.log('[referral-admin] payout details viewed', { withdrawal: id, admin: adminOf(req) });
    res.json(w);
  }));

  router.post('/withdrawals/:id/approve', wrap(async (req, res) => {
    res.json(await approveWithdrawal(Number(req.params.id), adminOf(req)));
  }));
  router.post('/withdrawals/:id/paid', wrap(async (req, res) => {
    res.json(await markWithdrawalPaid(Number(req.params.id), adminOf(req), text(req.body?.payout_reference, 200)));
  }));
  router.post('/withdrawals/:id/reject', wrap(async (req, res) => {
    res.json(await rejectWithdrawal(Number(req.params.id), adminOf(req), text(req.body?.reason)));
  }));

  /** A confirmed money refund done outside Click (Multicard/Rahmat, operator, manual). */
  router.post('/refunds', wrap(async (req, res) => {
    const sourceType = req.body?.source_type === 'operator_receipt' ? 'operator_receipt' : req.body?.source_type === 'payment' ? 'payment' : null;
    if (!sourceType) throw new ReferralError(400, 'BAD_SOURCE', "Manba turini tanlang");
    res.json(await registerRefund({
      sourceType, sourceId: Number(req.body?.source_id), refundAmount: Number(req.body?.amount),
      reference: text(req.body?.reference, 200), origin: 'admin', adminId: adminOf(req), note: text(req.body?.note) || null,
    }));
  }));

  router.post('/bonus-purchases/:paymentId/cancel', wrap(async (req, res) => {
    const reason = text(req.body?.reason);
    if (reason.length < 3) throw new ReferralError(400, 'BAD_REASON', 'Sababini yozing');
    res.json(await cancelBonusPurchase(Number(req.params.paymentId), adminOf(req), reason));
  }));

  router.post('/reconcile', wrap(async (_req, res) => {
    res.json(await reconcileReferralRewards());
  }));

  return router;
}
