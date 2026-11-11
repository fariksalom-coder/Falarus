import { Router } from 'express';
import type { DbClient } from '../types/dbClient';
import * as subscriptionService from '../services/subscription.service';
import { pool } from '../lib/db.js';
import { first1000PromoEligible } from '../operator/promo.js';

export function createAccessRoutes(
  supabase: DbClient,
  authenticate: (req: any, res: any, next: any) => void
): Router {
  const router = Router();

  router.get('/user/access', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const access = await subscriptionService.getAccessInfo(supabase, Number.isFinite(userId) ? userId : 0);
      // The page shows the promo price only to whom the checkout will charge it.
      const promoEligible = pool ? await first1000PromoEligible(pool, userId).catch(() => false) : false;
      res.json({
        lessons_free_limit: access.lessons_free_limit,
        vocabulary_free_topic: access.vocabulary_free_topic,
        vocabulary_free_subtopic: access.vocabulary_free_subtopic,
        subscription_active: access.subscription_active,
        kunlik_review_days: access.kunlik_review_days ?? [],
        subscription_expires_at: access.subscription_expires_at ?? null,
        patent_course_active: access.patent_course_active,
        vnzh_course_active: access.vnzh_course_active,
        vocabulary_free_topic_id: access.vocabulary_free_topic_id ?? null,
        vocabulary_free_subtopic_id: access.vocabulary_free_subtopic_id ?? null,
        golden: access.golden === true,
        promo_eligible: promoEligible,
      });
    } catch (e) {
      console.error('[GET /user/access]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  return router;
}

export async function getAccessForRequest(
  supabase: DbClient,
  userId: number
): Promise<subscriptionService.AccessInfo> {
  return subscriptionService.getAccessInfo(supabase, userId);
}
