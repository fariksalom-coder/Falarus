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
  router.get('/vocabulary/subtopic/:subtopicId/preview', authenticate, vocabularyController.getSubtopicPreview(supabase));
  router.get('/vocabulary/word-groups/:subtopicId', authenticate, vocabularyController.getWordGroups(supabase));
  router.get('/vocabulary/tasks/:wordGroupId', authenticate, vocabularyController.getTasks(supabase));
  router.get('/vocabulary/words/:wordGroupId', authenticate, vocabularyController.getWords(supabase));

  router.post('/vocabulary/flashcards/complete', authenticate, vocabularyController.postFlashcardsComplete(supabase));
  router.post('/vocabulary/test/finish', authenticate, vocabularyController.postTestFinish(supabase));
  router.post('/vocabulary/match/finish', authenticate, vocabularyController.postMatchFinish(supabase));

  return router;
}
