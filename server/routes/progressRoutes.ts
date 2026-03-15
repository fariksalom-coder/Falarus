import { Router } from 'express';
import type { Supabase } from '../types/progress';
import * as progressController from '../controllers/progressController';

export function createProgressRoutes(
  supabase: Supabase,
  authenticate: (req: any, res: any, next: any) => void
): Router {
  const router = Router();

  router.get(
    '/lesson/:id/progress',
    authenticate,
    progressController.getLessonProgress(supabase)
  );
  router.post(
    '/task/start',
    authenticate,
    progressController.postTaskStart(supabase)
  );
  router.post(
    '/task/finish',
    authenticate,
    progressController.postTaskFinish(supabase)
  );
  router.get(
    '/task/:taskId/result',
    authenticate,
    progressController.getTaskResult(supabase)
  );
  router.get(
    '/user/statistics',
    authenticate,
    progressController.getUserStatisticsHandler(supabase)
  );

  return router;
}
