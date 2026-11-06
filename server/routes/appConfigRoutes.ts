import { Router, type Response } from 'express';
import type { DbClient } from '../types/dbClient';
import { getAppConfig, withMediaVersions } from '../services/appConfig.service.js';
import { DEFAULT_APP_CONFIG } from '../../shared/appConfig.js';

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
      res.json({ ...config, media: await withMediaVersions(config.media) });
    } catch (e) {
      console.error('[GET /api/app-config]', e);
      // Narxlar bo'lmasa sahifa ishlamay qolmasin — zaxira qiymatlar.
      res.status(200).json({ ...DEFAULT_APP_CONFIG, fallback: true });
    }
  });
  return router;
}
