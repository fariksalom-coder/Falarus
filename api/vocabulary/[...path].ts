/**
 * Dedicated handler for /api/vocabulary/* so Vercel routes match reliably.
 * Root api/[...path].ts catch-all can miss multi-segment vocabulary paths on some deployments
 * and Vercel responds with a generic 404 before our handler runs.
 */
import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { getRequestPathname, normalizeQueryPathSegments } from '../_lib/request.js';
import { routeVocabularyRequest } from '../_lib/vocabulary.js';

function segmentsFromPathname(req: VercelRequest): string[] {
  const pathname = getRequestPathname(req);
  const parts = pathname.split('/').filter(Boolean);
  const apiIdx = parts.indexOf('api');
  if (apiIdx >= 0 && parts[apiIdx + 1] === 'vocabulary') {
    return parts.slice(apiIdx + 2);
  }
  const vocabIdx = parts.indexOf('vocabulary');
  if (vocabIdx >= 0) {
    return parts.slice(vocabIdx + 1);
  }
  // Nested serverless: pathname may be only /subtopics or /word-groups/... (no /api/vocabulary prefix).
  const tail = [
    'topics',
    'subtopics',
    'subtopic',
    'word-groups',
    'tasks',
    'progress',
    'daily-word-stats',
  ];
  if (parts.length >= 1 && tail.includes(parts[0])) {
    return parts;
  }
  return [];
}

function getVocabularyPathSegments(req: VercelRequest): string[] {
  const fromPath = segmentsFromPathname(req);
  const fromQuery = normalizeQueryPathSegments(req.query.path as string | string[] | undefined);
  return fromPath.length >= fromQuery.length ? fromPath : fromQuery;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const segments = getVocabularyPathSegments(req);
  return routeVocabularyRequest(req, res, userId, segments);
}
