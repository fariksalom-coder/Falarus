/**
 * Dedicated route for GET /api/vocabulary/word-groups/:subtopicId
 * (subtopic slug). More specific than [[...slug]] so Vercel always matches on prod.
 */
import '../../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../../_lib/cors.js';
import { requireAuth } from '../../_lib/auth.js';
import { routeVocabularyRequest } from '../../_lib/vocabulary.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const userId = requireAuth(req, res);
  if (userId == null) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const raw = req.query.subtopicId as string | string[] | undefined;
  const subtopicId = Array.isArray(raw) ? raw[0] : raw;
  if (typeof subtopicId !== 'string' || !subtopicId.length) {
    return res.status(400).json({ error: 'Invalid subtopicId' });
  }

  return routeVocabularyRequest(req, res, userId, ['word-groups', subtopicId]);
}
