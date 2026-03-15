import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminAuthMiddleware } from '../middleware/adminAuth';
import { createAdminController } from '../controllers/adminController';

export function createAdminRoutes(supabase: SupabaseClient): Router {
  const router = Router();
  const ctrl = createAdminController(supabase);

  router.post('/login', (req, res, next) => ctrl.login(req, res).catch(next));

  router.use(adminAuthMiddleware);

  router.get('/dashboard', (req, res, next) => ctrl.getDashboard(req, res).catch(next));
  router.get('/users', (req, res, next) => ctrl.getUsers(req, res).catch(next));
  router.get('/users/:id', (req, res, next) => ctrl.getUserProfile(req, res).catch(next));
  router.get('/payments', (req, res, next) => ctrl.getPayments(req, res).catch(next));
  router.post('/payments/:id/confirm', (req, res, next) => ctrl.confirmPayment(req, res).catch(next));
  router.post('/payments/:id/reject', (req, res, next) => ctrl.rejectPayment(req, res).catch(next));
  router.get('/subscriptions', (req, res, next) => ctrl.getSubscriptions(req, res).catch(next));
  router.get('/referrals/withdrawals', (req, res, next) => ctrl.getWithdrawals(req, res).catch(next));
  router.post('/referrals/:id/approve', (req, res, next) => ctrl.approveWithdrawal(req, res).catch(next));
  router.post('/referrals/:id/reject', (req, res, next) => ctrl.rejectWithdrawal(req, res).catch(next));
  router.get('/support', (req, res, next) => ctrl.getSupportMessages(req, res).catch(next));
  router.post('/support/:id/reply', (req, res, next) => ctrl.replySupport(req, res).catch(next));
  router.get('/pricing', (req, res, next) => ctrl.getPricing(req, res).catch(next));
  router.put('/pricing/update', (req, res, next) => ctrl.updatePricing(req, res).catch(next));
  router.get('/payment-methods', (req, res, next) => ctrl.getPaymentMethods(req, res).catch(next));
  router.post('/payment-methods', (req, res, next) => ctrl.createPaymentMethod(req, res).catch(next));
  router.put('/payment-methods/:id', (req, res, next) => ctrl.updatePaymentMethod(req, res).catch(next));
  router.post('/payment-methods/:id/toggle', (req, res, next) => ctrl.togglePaymentMethod(req, res).catch(next));
  router.delete('/payment-methods/:id', (req, res, next) => ctrl.deletePaymentMethod(req, res).catch(next));
  router.get('/tariff-prices', (req, res, next) => ctrl.getTariffPrices(req, res).catch(next));
  router.put('/tariff-prices', (req, res, next) => ctrl.updateTariffPrice(req, res).catch(next));
  router.put('/tariff-prices/bulk', (req, res, next) => ctrl.bulkUpdateTariffPrices(req, res).catch(next));

  return router;
}
