import { Router } from 'express';
import type { DbClient } from '../types/dbClient';
import * as wordSwipeGameService from '../services/wordSwipeGame.service';

function parsePositiveInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return null;
  return n;
}

export function createWordSwipeGameRoutes(
  supabase: DbClient,
  authenticate: (req: any, res: any, next: any) => void,
): Router {
  const router = Router();

  router.get('/games/word-swipe/levels', async (_req, res) => {
    try {
      const result = await wordSwipeGameService.getLevels(supabase);
      res.json(result);
    } catch (e) {
      console.error('[games/word-swipe/levels]', e);
      res.status(500).json({ error: 'Darajalarni yuklab bo‘lmadi' });
    }
  });

  router.get('/games/word-swipe/stage', authenticate, async (req: any, res) => {
    try {
      const levelNumber = parsePositiveInt(req.query.level);
      const stageNumber = parsePositiveInt(req.query.stage);
      if (!levelNumber || !stageNumber || stageNumber > 50) {
        return res.status(400).json({ error: 'Noto‘g‘ri level yoki stage' });
      }

      const result = await wordSwipeGameService.getStage(
        supabase,
        levelNumber,
        stageNumber,
        req.userId,
      );

      if (result.kind === 'not_found') {
        return res.status(404).json({ error: 'Bosqich topilmadi' });
      }
      if (result.kind === 'forbidden') {
        return res.status(403).json({ error: 'Bu bosqich hali ochilmagan' });
      }

      res.json(result.payload);
    } catch (e) {
      console.error('[games/word-swipe/stage]', e);
      res.status(500).json({ error: 'Bosqichni yuklab bo‘lmadi' });
    }
  });

  router.get('/games/word-swipe/progress', authenticate, async (req: any, res) => {
    try {
      const progress = await wordSwipeGameService.getOrCreateProgress(supabase, req.userId);
      res.json(progress);
    } catch (e) {
      console.error('[games/word-swipe/progress GET]', e);
      res.status(500).json({ error: 'Progressni yuklab bo‘lmadi' });
    }
  });

  router.post('/games/word-swipe/progress', authenticate, async (req: any, res) => {
    try {
      const levelNumber = parsePositiveInt(req.body?.levelNumber);
      const stageNumber = parsePositiveInt(req.body?.stageNumber);
      const completed = Boolean(req.body?.completed);

      if (!levelNumber || !stageNumber || stageNumber > 50) {
        return res.status(400).json({ error: 'Noto‘g‘ri level yoki stage' });
      }

      const progress = await wordSwipeGameService.saveProgress(supabase, req.userId, {
        levelNumber,
        stageNumber,
        completed,
      });

      res.json(progress);
    } catch (e) {
      if (e instanceof wordSwipeGameService.WordSwipeAccessError) {
        return res.status(403).json({ error: 'Bu bosqich hali ochilmagan' });
      }
      console.error('[games/word-swipe/progress POST]', e);
      res.status(500).json({ error: 'Progressni saqlab bo‘lmadi' });
    }
  });

  return router;
}
