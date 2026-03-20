/**
 * Dedicated handler for /api/vocabulary/* (topics, subtopics, word-groups, steps, …).
 * Root api/[...path].ts can mis-parse or miss routes on Vercel → 404 for /api/vocabulary/topics.
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
  const vIdx = parts.indexOf('vocabulary');
  if (vIdx >= 0) {
    return parts.slice(vIdx + 1);
  }
  return [];
}

/** Vercel sometimes truncates pathname OR query.path — take the longer segment list. */
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
