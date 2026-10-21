import type { Request, Response } from 'express';
import type { DatabaseClient } from '../types/referral';
import { pool } from '../lib/db.js';
import * as referralService from '../services/referral.service';
import {
  REFERRAL_PRODUCTS,
  ReferralError,
  bonusPrice,
  getSettings,
  maskCard,
  purchaseWithBonus,
  requestWithdrawal,
  withdrawalMinimumsNow,
} from '../services/referralProgram.service.js';
import { RateUnavailableError } from '../services/referralFx.service.js';
import { activateApprovedPayment } from '../../shared/paymentActivation.js';
import { invalidateAccessCache } from '../services/subscription.service.js';
import { RUSSIAN_TARIFF_PLANS_RUB } from '../../shared/russianTariffs.js';
import { COURSE_PRODUCT_META, type CurrencyCode } from '../../shared/paymentProducts.js';

const CURRENCIES: CurrencyCode[] = ['UZS', 'RUB', 'USD'];
const num = (v: unknown) => Number(v ?? 0);
const userIdOf = (req: Request) => Number((req as Request & { userId?: number }).userId);

function fail(res: Response, e: unknown, where: string) {
  if (e instanceof ReferralError) return res.status(e.status).json({ error: e.message, code: e.code });
  if (e instanceof RateUnavailableError) return res.status(503).json({ error: e.message, code: e.code });
  console.error(`[referral] ${where}`, e instanceof Error ? e.message : e);
  return res.status(500).json({ error: 'Xatolik yuz berdi' });
}

/** Invited friends, shown by first name and initial only. */
async function invitedList(userId: number) {
  const rows = (await pool!.query(
    `SELECT r.id, r.status, r.outcome, r.review_status, r.created_at, u.first_name, u.last_name,
            COALESCE((SELECT sum(l.amount) FROM referral_ledger l WHERE l.referral_id = r.id AND l.entry_type = 'reward'), 0) AS rewarded
     FROM referrals r JOIN users u ON u.id = r.referred_user_id
     WHERE r.referrer_id = $1 ORDER BY r.created_at DESC LIMIT 200`, [userId])).rows;
  return rows.map((r) => {
    const name = [String(r.first_name ?? '').trim(), r.last_name ? `${String(r.last_name).trim().charAt(0)}.` : ''].filter(Boolean).join(' ') || 'Foydalanuvchi';
    const state = r.review_status === 'pending' ? 'review'
      : r.outcome === 'not_eligible' ? 'not_eligible'
        : num(r.rewarded) > 0 || r.status === 'rewarded' ? 'purchased' : 'registered';
    return { name, status: state, legacy_status: r.status, joined_at: r.created_at };
  });
}

async function balances(userId: number) {
  const rows = (await pool!.query(
    `SELECT currency, available, held, reserved, debt, earned_total, paid_out_total, spent_total FROM referral_balances WHERE user_id = $1`,
    [userId])).rows;
  return CURRENCIES.map((currency) => {
    const r = rows.find((x) => x.currency === currency);
    return {
      currency,
      available: num(r?.available), pending: num(r?.held), reserved: num(r?.reserved), debt: num(r?.debt),
      earned: num(r?.earned_total), paid_out: num(r?.paid_out_total), spent: num(r?.spent_total),
    };
  });
}

async function history(userId: number, beforeId?: number) {
  return (await pool!.query(
    `SELECT id, currency, entry_type, amount, d_available, d_held, d_reserved, d_debt, source_type, base_amount, rate_percent, created_at
     FROM referral_ledger WHERE user_id = $1 AND ($2::bigint IS NULL OR id < $2) ORDER BY id DESC LIMIT 50`,
    [userId, beforeId ?? null])).rows.map((r) => ({
    id: Number(r.id), currency: r.currency, type: r.entry_type, amount: num(r.amount),
    available_change: num(r.d_available), pending_change: num(r.d_held), reserved_change: num(r.d_reserved), debt_change: num(r.d_debt),
    source: r.source_type, base_amount: r.base_amount == null ? null : num(r.base_amount), rate_percent: r.rate_percent == null ? null : num(r.rate_percent),
    created_at: r.created_at,
  }));
}

async function withdrawals(userId: number) {
  return (await pool!.query(
    `SELECT id, amount, currency, status, card_number, created_at, approved_at, paid_at, reject_reason
     FROM referral_withdrawals WHERE user_id = $1 ORDER BY id DESC LIMIT 20`, [userId])).rows.map((w) => ({
    id: Number(w.id), amount: num(w.amount), currency: w.currency ?? 'UZS', status: w.status, card: maskCard(w.card_number),
    created_at: w.created_at, approved_at: w.approved_at, paid_at: w.paid_at, reject_reason: w.reject_reason ?? null,
  }));
}

export function getLink(supabase: DatabaseClient) {
  return async (req: Request, res: Response) => {
    try {
      res.json(await referralService.getReferralLink(supabase, userIdOf(req)));
    } catch (e) {
      fail(res, e, 'link');
    }
  };
}

/** Legacy shape kept for older app builds: counts plus the UZS balance. */
async function legacyStats(userId: number) {
  const list = await invitedList(userId);
  const uzs = (await balances(userId)).find((b) => b.currency === 'UZS')!;
  return {
    invited_users: list.length,
    registered_users: list.length,
    paid_users: list.filter((x) => x.status === 'purchased').length,
    total_earned: uzs.earned,
    balance: uzs.available,
  };
}

export function getStats(_supabase: DatabaseClient) {
  return async (req: Request, res: Response) => {
    try { res.json(await legacyStats(userIdOf(req))); } catch (e) { fail(res, e, 'stats'); }
  };
}

export function getList(_supabase: DatabaseClient) {
  return async (req: Request, res: Response) => {
    try {
      res.json((await invitedList(userIdOf(req))).map((x) => ({ name: x.name, status: x.legacy_status })));
    } catch (e) {
      fail(res, e, 'list');
    }
  };
}

/** Everything the invite page needs in one request. */
export function getPage(supabase: DatabaseClient) {
  return async (req: Request, res: Response) => {
    try {
      const userId = userIdOf(req);
      const [link, settings, list, bal, hist, wds] = await Promise.all([
        referralService.getReferralLink(supabase, userId),
        getSettings(),
        invitedList(userId),
        balances(userId),
        history(userId),
        withdrawals(userId),
      ]);
      const uzs = bal.find((b) => b.currency === 'UZS')!;
      res.json({
        referral_link: link.referral_link,
        program: {
          enabled: settings.enabled,
          reward_percent: settings.reward_percent,
          min_withdrawal_rub: settings.min_withdrawal_rub,
          products: REFERRAL_PRODUCTS,
        },
        invited: list,
        balances: bal,
        history: hist,
        withdrawals: wds,
        // Legacy fields for older app builds.
        invited_users: list.length,
        registered_users: list.length,
        paid_users: list.filter((x) => x.status === 'purchased').length,
        total_earned: uzs.earned,
        balance: uzs.available,
        list: list.map((x) => ({ name: x.name, status: x.legacy_status })),
      });
    } catch (e) {
      fail(res, e, 'page');
    }
  };
}

export function getHistory() {
  return async (req: Request, res: Response) => {
    try {
      const before = Number(req.query.before);
      res.json(await history(userIdOf(req), Number.isFinite(before) && before > 0 ? before : undefined));
    } catch (e) {
      fail(res, e, 'history');
    }
  };
}

export function getMinimums() {
  return async (_req: Request, res: Response) => {
    try {
      const { minimums, fx, baseRub } = await withdrawalMinimumsNow();
      res.json({ minimums, base_rub: baseRub, rate_rub_uzs: fx.rubUzs, rate_usd_uzs: fx.usdUzs, rate_as_of: fx.asOf, rate_source: fx.source });
    } catch (e) {
      fail(res, e, 'minimums');
    }
  };
}

export function postWithdraw() {
  return async (req: Request, res: Response) => {
    try {
      const b = req.body ?? {};
      const out = await requestWithdrawal({
        userId: userIdOf(req), currency: b.currency, amount: b.amount, cardNumber: b.card_number,
        fullName: b.full_name, phone: b.phone, idempotencyKey: b.idempotency_key,
      });
      res.json({ success: true, ...out });
    } catch (e) {
      fail(res, e, 'withdraw');
    }
  };
}

/** Prices of program products in a currency, for buying with bonus balance. */
export function getBonusPrices() {
  return async (req: Request, res: Response) => {
    try {
      const currency = String(req.query.currency ?? '') as CurrencyCode;
      if (!CURRENCIES.includes(currency)) return res.status(400).json({ error: 'Valyutani tanlang' });
      const c = await pool!.connect();
      try {
        const items = [];
        for (const plan of RUSSIAN_TARIFF_PLANS_RUB) {
          const price = await bonusPrice(c, 'russian', plan.code, currency);
          if (price > 0) items.push({ product: 'russian', tariff: plan.code, label: `Rus tili · ${plan.labelUz}`, price });
        }
        for (const product of ['patent', 'vnzh'] as const) {
          items.push({ product, tariff: null, label: COURSE_PRODUCT_META[product].label, price: await bonusPrice(c, product, null, currency) });
        }
        res.json({ currency, items });
      } finally {
        c.release();
      }
    } catch (e) {
      fail(res, e, 'prices');
    }
  };
}

export function postBonusPurchase(supabase: DatabaseClient) {
  return async (req: Request, res: Response) => {
    try {
      const userId = userIdOf(req);
      const b = req.body ?? {};
      const out = await purchaseWithBonus({ userId, product: b.product, tariff: b.tariff, currency: b.currency, idempotencyKey: b.idempotency_key });
      if (!out.duplicate) {
        try {
          await activateApprovedPayment(supabase, { userId, productCode: out.product, tariffType: out.tariff });
        } catch (activationErr) {
          // The approved payment row still grants access through the access fallback.
          console.error('[referral] bonus purchase activation', out.paymentId, activationErr instanceof Error ? activationErr.message : activationErr);
        }
      }
      invalidateAccessCache(userId);
      res.json({ success: true, ...out });
    } catch (e) {
      fail(res, e, 'purchase');
    }
  };
}
