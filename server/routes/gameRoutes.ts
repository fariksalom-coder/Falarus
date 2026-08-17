import { Router } from 'express';
import type { DbClient } from '../types/dbClient';
import * as subscriptionService from '../services/subscription.service';

/**
 * O'YINLARDAN BEPUL FOYDALANISH.
 *
 * To'lov qilmagan o'quvchi o'yinlarni jami `BEPUL_OYIN` marta ochadi, keyin
 * to'lov oynasi chiqadi. Premium o'quvchida chek yo'q.
 *
 * Hisob SERVERDA yuritiladi: brauzerdagi hisobni tozalash bilan chekni
 * aylanib o'tib bo'lmasin.
 */
const BEPUL_OYIN = 3;

export function createGameRoutes(
  supabase: DbClient,
  authenticate: (req: any, res: any, next: any) => void
): Router {
  const router = Router();

  /** Nechta bepul ochish ishlatilgani. */
  async function holat(userId: number): Promise<{
    premium: boolean;
    used: number;
    limit: number;
    allowed: boolean;
  }> {
    const access = await subscriptionService.getAccessInfo(supabase, userId);
    if (access.subscription_active) {
      return { premium: true, used: 0, limit: BEPUL_OYIN, allowed: true };
    }
    const { count } = await supabase
      .from('user_game_plays')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    const used = Number(count ?? 0);
    return { premium: false, used, limit: BEPUL_OYIN, allowed: used < BEPUL_OYIN };
  }

  /** Holatni ko'rish — hisobga yozmaydi (o'yinlar ro'yxatida ko'rsatiladi). */
  router.get('/games/quota', authenticate, async (req: any, res) => {
    try {
      res.json(await holat(Number(req.userId)));
    } catch (e) {
      console.error('[GET /api/games/quota]', e);
      res.status(500).json({ error: 'Maʼlumot yuklanmadi' });
    }
  });

  /**
   * O'yin ochildi — bitta bepul urinish yoziladi.
   *
   * Chek tugagan bo'lsa 402 qaytadi: klient to'lov oynasini ko'rsatadi.
   */
  router.post('/games/play', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const game = String(req.body?.game ?? '').trim().slice(0, 40) || 'game';
      const oldingi = await holat(userId);

      if (oldingi.premium) return res.json(oldingi);
      if (!oldingi.allowed) {
        return res.status(402).json({ ...oldingi, error: 'Bepul urinishlar tugadi' });
      }

      const { error } = await supabase
        .from('user_game_plays')
        .insert({ user_id: userId, game });
      if (error) throw error;

      const used = oldingi.used + 1;
      res.json({ premium: false, used, limit: BEPUL_OYIN, allowed: true });
    } catch (e) {
      console.error('[POST /api/games/play]', e);
      res.status(500).json({ error: 'Amal bajarilmadi' });
    }
  });

  return router;
}
