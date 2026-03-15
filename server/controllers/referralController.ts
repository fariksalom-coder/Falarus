import type { Request, Response } from 'express';
import type { Supabase } from '../types/referral';
import { MIN_WITHDRAWAL_AMOUNT } from '../types/referral';
import * as referralService from '../services/referral.service';
import * as referralStatsService from '../services/referralStats.service';
import * as referralDiscountService from '../services/referralDiscount.service';
import * as repo from '../repositories/referralRepository';

export function getLink(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as number;
      const result = await referralService.getReferralLink(supabase, userId);
      res.json(result);
    } catch (e: any) {
      console.error('[GET /referral/link]', e);
      const msg = e?.message || '';
      const isSchemaError =
        /referral_code|referrals|relation.*does not exist|column.*does not exist/i.test(msg) ||
        (e?.code && ['42P01', '42703'].includes(e.code));
      res.status(500).json({
        error: isSchemaError
          ? "Referral tizimi sozlanmagan. Ma'lumotlar bazasiga 009_referral_system.sql migratsiyasini qo'llang."
          : 'Xatolik yuz berdi',
      });
    }
  };
}

export function getStats(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as number;
      const stats = await referralStatsService.getReferralStats(supabase, userId);
      res.json(stats);
    } catch (e) {
      console.error('[GET /referral/stats]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}

export function getList(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as number;
      const list = await repo.getReferralsByReferrer(supabase, userId);
      res.json(
        list.map((r) => ({
          name: r.name,
          status: r.status,
        }))
      );
    } catch (e) {
      console.error('[GET /referral/list]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}

/** Single response: link + stats + list (for fast invite page load). */
export function getPage(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as number;
      const [linkRes, stats, listRows] = await Promise.all([
        referralService.getReferralLink(supabase, userId),
        referralStatsService.getReferralStats(supabase, userId),
        repo.getReferralsByReferrer(supabase, userId),
      ]);
      const list = listRows.map((r) => ({ name: r.name, status: r.status }));
      res.json({
        referral_link: linkRes.referral_link,
        ...stats,
        list,
      });
    } catch (e: any) {
      console.error('[GET /referral?action=page]', e);
      const msg = e?.message || '';
      const isSchemaError =
        /referral_code|referrals|relation.*does not exist|column.*does not exist/i.test(msg) ||
        (e?.code && ['42P01', '42703'].includes(e.code));
      res.status(500).json({
        error: isSchemaError
          ? "Referral tizimi sozlanmagan. Ma'lumotlar bazasiga 009_referral_system.sql migratsiyasini qo'llang."
          : 'Xatolik yuz berdi',
      });
    }
  };
}

export function postWithdraw(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as number;
      const amount = Math.round(Number(req.body?.amount) || 0);
      if (amount < MIN_WITHDRAWAL_AMOUNT) {
        return res.status(400).json({
          error: `Minimal summa ${MIN_WITHDRAWAL_AMOUNT.toLocaleString()} so'm`,
        });
      }
      const balanceRow = await repo.getUserReferralBalance(supabase, userId);
      const balance = balanceRow?.referral_balance ?? 0;
      if (amount > balance) {
        return res.status(400).json({ error: 'Balans yetarli emas' });
      }
      await repo.deductReferralBalance(supabase, userId, amount);
      const id = await repo.createWithdrawal(supabase, userId, amount);
      res.json({ success: true, id, amount });
    } catch (e) {
      console.error('[POST /referral/withdraw]', e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Xatolik yuz berdi' });
    }
  };
}

export function getDiscountEligibility(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as number;
      const raw = req.query.amount;
      const originalAmount = Math.round(Number(raw) || 0);
      if (originalAmount <= 0) {
        return res.status(400).json({ error: 'amount kerak' });
      }
      const result = await referralDiscountService.getReferralDiscountEligibility(
        supabase,
        userId,
        originalAmount
      );
      res.json(result);
    } catch (e) {
      console.error('[GET /referral/discount-eligible]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}
