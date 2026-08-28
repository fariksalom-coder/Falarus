import { Router } from 'express';
import type { DatabaseClient } from '../types/referral';
import * as referralController from '../controllers/referralController';

export function createReferralRoutes(
  supabase: DatabaseClient,
  authenticate: (req: any, res: any, _next: any) => void
): Router {
  const router = Router();

  router.get('/referral', authenticate, (req: any, res, next) => {
    const action = typeof req.query.action === 'string' ? req.query.action : '';
    const handler =
      action === 'page' ? referralController.getPage(supabase) :
      action === 'link' ? referralController.getLink(supabase) :
      action === 'stats' ? referralController.getStats(supabase) :
      action === 'list' ? referralController.getList(supabase) :
      null;
    if (handler) {
      const p = handler(req, res);
      return typeof p?.then === 'function' ? p.catch(next) : p;
    }
    next();
  });
  router.get('/referral/link', authenticate, referralController.getLink(supabase));
  router.get('/referral/stats', authenticate, referralController.getStats(supabase));
  router.get('/referral/list', authenticate, referralController.getList(supabase));
  router.post('/referral/withdraw', authenticate, referralController.postWithdraw(supabase));
  router.post('/referral', authenticate, (req: any, res) => {
    return referralController.postWithdraw(supabase)(req, res);
  });
  /*
   * BU YERDA `POST /payments` BOR EDI — O'CHIRILDI (2026-08-17).
   *
   * U faqat `authenticate` ortida turardi va `planName` bilan
   * `planDurationMonths` ni to'g'ridan-to'g'ri so'rov tanasidan olib
   * `users.plan_expires_at` ni yozar hamda faol obuna yaratardi. Ya'ni
   * ro'yxatdan o'tgan istalgan o'quvchi bitta so'rov bilan o'ziga bir
   * yillik premium berib olishi mumkin edi — na to'lov shlyuzi, na admin
   * tasdig'i tekshirilardi.
   *
   * Amalda u ishlamay turgandi: `server.ts` da `/api/payments` avvalroq
   * ulanadi (`createPaymentRoutes`) va uning ildiz `POST /` handleri shu
   * manzilni o'ziga oladi. Lekin bu tasodifiy himoya — ulash tartibi
   * o'zgarsa yoki o'sha handler nomi almashsa teshik darhol ochilardi.
   *
   * Frontend uni hech qachon chaqirmagan (`planDurationMonths` src/ da
   * umuman uchramaydi). Obuna berishning yagona to'g'ri yo'llari:
   * to'lov shlyuzi callback'i (`shared/paymentActivation.ts`) va admin
   * paneli (`adminController`).
   */

  return router;
}
