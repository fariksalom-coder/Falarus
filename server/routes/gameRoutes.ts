import { Router } from 'express';
import type { DbClient } from '../types/dbClient';
import * as subscriptionService from '../services/subscription.service';
import { pool } from '../lib/db';

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
    const userId = Number(req.userId);
    let premium: boolean;
    try { premium = (await subscriptionService.getAccessInfo(supabase, userId)).subscription_active; }
    catch { return res.status(503).json({ error: 'Hisob holatini tekshirib bo‘lmadi' }); }
    const client = pool ? await pool.connect().catch(() => null) : null;
    if (!client) return res.status(503).json({ error: 'Maʼlumotlar bazasi mavjud emas' });
    try {
      const game = String(req.body?.game ?? '').trim().slice(0, 40) || 'game';
      // All games share the same user lock with dialogue sessions.
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const usedBefore = premium ? 0 : Number((await client.query('SELECT count(*) FROM user_game_plays WHERE user_id=$1', [userId])).rows[0].count);
      const oldingi = { premium, used: usedBefore, limit: BEPUL_OYIN, allowed: premium || usedBefore < BEPUL_OYIN };

      if (oldingi.premium) {
        await client.query('COMMIT');
        return res.json(oldingi);
      }
      if (!oldingi.allowed) {
        await client.query('COMMIT');
        return res.status(402).json({ ...oldingi, error: 'Bepul urinishlar tugadi' });
      }

      await client.query('INSERT INTO user_game_plays(user_id,game) VALUES($1,$2)', [userId,game]);
      await client.query('COMMIT');

      const used = oldingi.used + 1;
      res.json({ premium: false, used, limit: BEPUL_OYIN, allowed: true });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('[POST /api/games/play]', e);
      res.status(500).json({ error: 'Amal bajarilmadi' });
    } finally {
      client.release();
    }
  });

  return router;
}
