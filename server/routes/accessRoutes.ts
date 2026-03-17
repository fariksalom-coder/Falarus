import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as subscriptionService from '../services/subscription.service';
import * as accessControlService from '../services/accessControl.service';

export function createAccessRoutes(
  supabase: SupabaseClient,
  authenticate: (req: any, res: any, next: any) => void
): Router {
  const router = Router();

  router.get('/user/access', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const access = await subscriptionService.getAccessInfo(supabase, Number.isFinite(userId) ? userId : 0);
      res.json({
        lessons_free_limit: access.lessons_free_limit,
        vocabulary_free_topic: access.vocabulary_free_topic,
        vocabulary_free_subtopic: access.vocabulary_free_subtopic,
        subscription_active: access.subscription_active,
        vocabulary_free_topic_id: access.vocabulary_free_topic_id ?? null,
        vocabulary_free_subtopic_id: access.vocabulary_free_subtopic_id ?? null,
      });
    } catch (e) {
      console.error('[GET /user/access]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  return router;
}

export async function getAccessForRequest(
  supabase: SupabaseClient,
  userId: number
): Promise<subscriptionService.AccessInfo> {
  return subscriptionService.getAccessInfo(supabase, userId);
}
