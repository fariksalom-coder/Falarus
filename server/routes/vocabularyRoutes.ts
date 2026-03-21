import { Router } from 'express';
import type { Supabase } from '../types/vocabulary';
import * as vocabularyController from '../controllers/vocabularyController';

export function createVocabularyRoutes(
  supabase: Supabase,
  authenticate: (req: any, res: any, next: any) => void
): Router {
  const router = Router();

  router.get('/vocabulary/topics', authenticate, vocabularyController.getTopics(supabase));
  router.get('/vocabulary/subtopics/:topicId', authenticate, vocabularyController.getSubtopics(supabase));
  router.get(
    '/vocabulary/subtopic/preview',
    authenticate,
    vocabularyController.getSubtopicPreviewQuery(supabase)
  );
  router.get('/vocabulary/subtopic/:subtopicId/preview', authenticate, vocabularyController.getSubtopicPreview(supabase));
  router.get('/vocabulary/word-groups/:subtopicId', authenticate, vocabularyController.getWordGroups(supabase));
  router.get('/vocabulary/tasks/:wordGroupId', authenticate, vocabularyController.getTasks(supabase));
  router.get('/vocabulary/words/:wordGroupId', authenticate, vocabularyController.getWords(supabase));
  router.get(
    '/vocabulary/daily-word-stats',
    authenticate,
    vocabularyController.getVocabularyDailyWordStats(supabase)
  );
  router.get(
    '/vocabulary/word-groups/:wordGroupId/steps',
    authenticate,
    vocabularyController.getWordGroupStepsState(supabase)
  );

  router.post('/vocabulary/flashcards/complete', authenticate, vocabularyController.postFlashcardsComplete(supabase));
  router.post('/vocabulary/test/finish', authenticate, vocabularyController.postTestFinish(supabase));
  router.post('/vocabulary/match/finish', authenticate, vocabularyController.postMatchFinish(supabase));
  router.post(
    '/vocabulary/word-groups/:wordGroupId/steps/1',
    authenticate,
    vocabularyController.postStep1Result(supabase)
  );
  router.post(
    '/vocabulary/word-groups/:wordGroupId/steps/2',
    authenticate,
    vocabularyController.postStep2Result(supabase)
  );

  return router;
}
