import { Router, type Response } from 'express';
import type { DbClient } from '../types/dbClient';
import { getAppConfig, withMediaVersions } from '../services/appConfig.service.js';
import { DEFAULT_APP_CONFIG } from '../../shared/appConfig.js';
import { pool } from '../lib/db.js';
import { first1000PromoStatus } from '../operator/promo.js';
import { FIRST_1000_PROMO } from '../../shared/russianTariffs.js';

/** Seat counter for the promo badge; every client polls app-config, so one count per 30 s is enough. */
let promoCache: { at: number; left: number } | null = null;
async function promoLeft(): Promise<number | null> {
  if (promoCache && Date.now() - promoCache.at < 30_000) return promoCache.left;
  if (!pool) return null;
  const { left } = await first1000PromoStatus(pool);
  promoCache = { at: Date.now(), left };
  return left;
}

/**
 * GET /api/app-config — narxlar, maxsus taklif va videolar (kirish shart emas).
 *
 * Sayt va mobil ilovalar shu bitta javobdan foydalanadi. `no-cache`: brauzer
 * har safar serverdan so'raydi (ETag bilan arzon), shunda admin o'zgartirgan
 * narx ilovada darhol ko'rinadi.
 */
export function createAppConfigRoutes(supabase: DbClient): Router {
  const router = Router();
  router.get('/app-config', async (_req, res: Response) => {
    res.setHeader('Cache-Control', 'no-cache');
    try {
      const config = await getAppConfig(supabase);
      const left = await promoLeft().catch(() => null);
      const promo = left === 0 ? null : { code: FIRST_1000_PROMO.code, limit: FIRST_1000_PROMO.limit, left, prices: FIRST_1000_PROMO.prices };
      res.json({ ...config, promo, media: await withMediaVersions(config.media) });
    } catch (e) {
      console.error('[GET /api/app-config]', e);
      // Narxlar bo'lmasa sahifa ishlamay qolmasin — zaxira qiymatlar.
      res.status(200).json({ ...DEFAULT_APP_CONFIG, fallback: true });
    }
  });
  return router;
}
