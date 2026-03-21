/** GET/POST /api/vocabulary (root — user word list, add word) */
import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { routeVocabularyRequest } from '../_lib/vocabulary.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  const userId = requireAuth(req, res);
  if (userId == null) return;
  return routeVocabularyRequest(req, res, userId, []);
}
