/**
 * All routes under /api/vocabulary/word-groups/*
 * - GET .../word-groups/:subtopicId  (list groups for subtopic slug)
 * - GET .../word-groups/:id/steps
 * - POST .../word-groups/:id/steps/1 | /2
 *
 * Single catch-all avoids Vercel missing POST .../steps/1 (404) when only [subtopicId].ts existed.
 */
import '../../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../../_lib/cors.js';
import { requireAuth } from '../../_lib/auth.js';
import { getRequestPathname, normalizeQueryPathSegments } from '../../_lib/request.js';
import { routeVocabularyRequest } from '../../_lib/vocabulary.js';

function tailFromQuery(req: VercelRequest): string[] {
  const raw = req.query.segments as string | string[] | undefined;
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string' && raw.length > 0) {
    return raw.split('/').filter(Boolean);
  }
  return [];
}

function tailFromPathname(req: VercelRequest): string[] {
  const pathname = getRequestPathname(req);
  const parts = pathname.split('/').filter(Boolean);
  const i = parts.indexOf('word-groups');
  if (i < 0) return [];
  return parts.slice(i + 1);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const fromQuery = tailFromQuery(req);
  const fromPath = tailFromPathname(req);
  const fromExtra = normalizeQueryPathSegments(req.query.path as string | string[] | undefined);
  let tail = fromQuery.length >= fromPath.length ? fromQuery : fromPath;
  if (fromExtra.length > tail.length) tail = fromExtra;

  if (tail.length === 0) {
    return res.status(400).json({ error: 'Missing word-groups path' });
  }

  const segments = ['word-groups', ...tail];
  return routeVocabularyRequest(req, res, userId, segments);
}
