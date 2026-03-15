import { Router } from 'express';
import type { Supabase } from '../types/referral';
import * as referralController from '../controllers/referralController';
import * as referralPaymentService from '../services/referralPayment.service';

export function createReferralRoutes(
  supabase: Supabase,
  authenticate: (req: any, res: any, next: any) => void
): Router {
  const router = Router();

  router.get('/referral/link', authenticate, referralController.getLink(supabase));
  router.get('/referral/stats', authenticate, referralController.getStats(supabase));
  router.get('/referral/list', authenticate, referralController.getList(supabase));
  router.post('/referral/withdraw', authenticate, referralController.postWithdraw(supabase));
  router.get(
    '/referral/discount-eligible',
    authenticate,
    referralController.getDiscountEligibility(supabase)
  );

  // Record payment: applies 10% discount if eligible, 25% reward to referrer (once), sets user plan
  router.post('/payments', authenticate, async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const originalAmount = Math.round(Number(req.body?.amount) || 0);
      const planName = req.body?.planName as string | undefined;
      const planDurationMonths = req.body?.planDurationMonths != null ? Number(req.body.planDurationMonths) : undefined;
      if (originalAmount <= 0) {
        return res.status(400).json({ error: 'amount kerak (0 dan katta)' });
      }
      const result = await referralPaymentService.recordPayment(supabase, {
        userId,
        originalAmount,
        planName: planName || undefined,
        planDurationMonths: planDurationMonths && [1, 3, 12].includes(planDurationMonths) ? planDurationMonths : undefined,
      });
      res.json(result);
    } catch (e) {
      console.error('[POST /api/payments]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  return router;
}
