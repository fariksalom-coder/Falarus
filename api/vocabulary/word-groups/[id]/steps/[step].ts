/** POST /api/vocabulary/word-groups/:wordGroupId/steps/1|2 — flashcards (1) / test (2) */
import '../../../../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../../../../_lib/cors.js';
import { requireAuth } from '../../../../_lib/auth.js';
import { routeVocabularyRequest } from '../../../../_lib/vocabulary.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  const userId = requireAuth(req, res);
  if (userId == null) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const rawId = req.query.id as string | string[] | undefined;
  const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
  const rawStep = req.query.step as string | string[] | undefined;
  const stepStr = Array.isArray(rawStep) ? rawStep[0] : rawStep;
  if (typeof idStr !== 'string' || !idStr.length) {
    return res.status(400).json({ error: 'Invalid wordGroupId' });
  }
  if (typeof stepStr !== 'string' || !stepStr.length) {
    return res.status(400).json({ error: 'Invalid step' });
  }
  return routeVocabularyRequest(req, res, userId, ['word-groups', idStr, 'steps', stepStr]);
}
