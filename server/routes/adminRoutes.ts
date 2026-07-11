import { Router } from 'express';
import type { DbClient } from '../types/dbClient';
import multer from 'multer';
import { adminAuthMiddleware } from '../middleware/adminAuth';
import { createAdminController } from '../controllers/adminController';
import { createAdminGrammarController } from '../controllers/adminGrammarController';

const TEACHER_OWNER_SELECT = [
  'user_id',
  'first_name',
  'last_name',
  'display_name',
  'age',
  'avatar_url',
  'region',
  'city',
  'experience_years',
  'experience_months',
  'teaching_format',
  'headline',
  'about',
  'subjects',
  'teaching_levels',
  'languages',
  'monthly_course_price_amount',
  'monthly_course_price_currency',
  'rating_avg',
  'rating_count',
  'listing_paid_until',
  'telegram_username',
  'telegram_url',
  'whatsapp_phone_e164',
  'max_contact',
  'public_phone_e164',
  'public_email',
  'preferred_contact_method',
  'profile_status',
  'admin_note',
  'first_listing_discount_used',
  'created_at',
  'updated_at',
].join(', ');

export function createAdminRoutes(supabase: DbClient): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.mimetype)) {
        cb(new Error('Faqat JPG, PNG yoki WEBP ruxsat etiladi'));
        return;
      }
      cb(null, true);
    },
  });
  const ctrl = createAdminController(supabase);
  const grammar = createAdminGrammarController(supabase);

  router.post('/login', (req, res, next) => ctrl.login(req, res).catch(next));

  router.use(adminAuthMiddleware);

  router.get('/dashboard', (req, res, next) => ctrl.getDashboard(req, res).catch(next));

  // One-shot XP backfill — iterates all users, recomputes total_points from
  // user_kunlik_day_progress + streak + time. Safe to re-run.
  router.post('/recompute-xp', async (_req, res, next) => {
    try {
      const { recomputeUserXp } = await import('../services/xpService.js');
      const { data: users, error } = await supabase.from('users').select('id');
      if (error) throw error;
      let ok = 0, fail = 0;
      const failures: Array<{ id: number; message: string }> = [];
      for (const row of users ?? []) {
        try {
          await recomputeUserXp(supabase, (row as { id: number }).id);
          ok += 1;
        } catch (err) {
          fail += 1;
          failures.push({ id: (row as { id: number }).id, message: err instanceof Error ? err.message : String(err) });
        }
      }
      res.json({ processed: (users ?? []).length, ok, fail, failures });
    } catch (e) {
      next(e);
    }
  });
  router.get('/users', (req, res, next) => ctrl.getUsers(req, res).catch(next));
  router.post('/users', (req, res, next) => ctrl.createUser(req, res).catch(next));
  router.get('/users/:id', (req, res, next) => ctrl.getUserProfile(req, res).catch(next));
  router.get('/payments', (req, res, next) => ctrl.getPayments(req, res).catch(next));
  router.post('/payments/:id/confirm', (req, res, next) => ctrl.confirmPayment(req, res).catch(next));
  router.post('/payments/:id/reject', (req, res, next) => ctrl.rejectPayment(req, res).catch(next));
  router.post('/payments/:id/refund', (req, res, next) => ctrl.refundPayment(req, res).catch(next));
  router.get('/subscriptions', (req, res, next) => ctrl.getSubscriptions(req, res).catch(next));
  router.get('/teachers', async (_req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('teacher_profiles')
        .select(TEACHER_OWNER_SELECT)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      res.json(data ?? []);
    } catch (e) {
      next(e);
    }
  });
  router.post('/teachers/:userId/status', (req, res, next) => ctrl.updateTeacherStatus(req, res).catch(next));
  router.get('/teacher-trials', async (_req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('teacher_trial_lessons')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      res.json(data ?? []);
    } catch (e) {
      next(e);
    }
  });
  router.get('/card-tokens', (req, res, next) => ctrl.getCardTokens(req, res).catch(next));
  router.get('/click-payment-logs', (req, res, next) => ctrl.getClickPaymentLogs(req, res).catch(next));
  router.get('/referrals/withdrawals', (req, res, next) => ctrl.getWithdrawals(req, res).catch(next));
  router.post('/referrals/:id/approve', (req, res, next) => ctrl.approveWithdrawal(req, res).catch(next));
  router.post('/referrals/:id/reject', (req, res, next) => ctrl.rejectWithdrawal(req, res).catch(next));
  router.get('/support', (req, res, next) => ctrl.getSupportMessages(req, res).catch(next));
  router.post('/support/:id/reply', (req, res, next) => ctrl.replySupport(req, res).catch(next));
  router.get('/help/broadcast-preview', (req, res, next) => ctrl.getHelpBroadcastPreview(req, res).catch(next));
  router.post('/help/broadcast', (req, res, next) => ctrl.postHelpBroadcast(req, res).catch(next));
  router.post('/help/users/:userId/messages', (req, res, next) => ctrl.sendHelpDirectUserMessage(req, res).catch(next));
  router.get('/help/chats', (req, res, next) => ctrl.getSupportChats(req, res).catch(next));
  router.get('/help/chats/:chatId/messages', (req, res, next) => ctrl.getSupportChatMessages(req, res).catch(next));
  router.post('/help/chats/:chatId/messages', (req, res, next) => ctrl.sendSupportChatMessage(req, res).catch(next));
  router.post('/help/chats/:chatId/media', upload.single('image'), (req, res, next) =>
    ctrl.sendSupportChatMedia(req, res).catch(next)
  );
  router.post('/help/chats/:chatId/read', (req, res, next) => ctrl.markSupportChatRead(req, res).catch(next));
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

  router.get('/grammar/lessons', (req, res, next) => grammar.listLessons(req, res).catch(next));
  router.get('/grammar/lessons/:lessonId/questions', (req, res, next) => grammar.listQuestions(req, res).catch(next));
  router.post('/grammar/lessons/:lessonId/questions', (req, res, next) => grammar.createQuestion(req, res).catch(next));
  router.get('/grammar/questions/:questionId', (req, res, next) => grammar.getQuestion(req, res).catch(next));
  router.put('/grammar/questions/:questionId', (req, res, next) => grammar.updateQuestion(req, res).catch(next));

  return router;
}
