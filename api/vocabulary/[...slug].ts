/**
 * /api/vocabulary/* catch-all (required slug). Use with index.ts for /api/vocabulary root.
 * Replaces optional [[...slug]] — better Vercel matching on production.
 */
import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { getRequestPathname, normalizeQueryPathSegments } from '../_lib/request.js';
import { routeVocabularyRequest } from '../_lib/vocabulary.js';

function segmentsFromVercelSlug(req: VercelRequest): string[] {
  const slug = req.query.slug as string | string[] | undefined;
  if (slug == null) return [];
  if (Array.isArray(slug)) return slug.map(String).filter(Boolean);
  if (typeof slug === 'string' && slug.length > 0) {
    return slug.split('/').filter(Boolean);
  }
  return [];
}

function segmentsFromPathname(req: VercelRequest): string[] {
  const pathname = getRequestPathname(req);
  const parts = pathname.split('/').filter(Boolean);
  const apiIdx = parts.indexOf('api');
  if (apiIdx >= 0 && parts[apiIdx + 1] === 'vocabulary') {
    return parts.slice(apiIdx + 2);
  }
  const vIdx = parts.indexOf('vocabulary');
  if (vIdx >= 0) return parts.slice(vIdx + 1);
  if (
    parts.length > 0 &&
    (parts[0] === 'word-groups' ||
      parts[0] === 'topics' ||
      parts[0] === 'subtopics' ||
      parts[0] === 'subtopic' ||
      parts[0] === 'tasks' ||
      parts[0] === 'progress' ||
      parts[0] === 'daily-word-stats' ||
      parts[0] === 'match' ||
      parts[0] === 'flashcards' ||
      parts[0] === 'test')
  ) {
    return parts;
  }
  return [];
}

function getVocabularySegments(req: VercelRequest): string[] {
  const fromSlug = segmentsFromVercelSlug(req);
  const fromQueryPath = normalizeQueryPathSegments(req.query.path as string | string[] | undefined);
  const fromPath = segmentsFromPathname(req);
  const best = fromSlug.length >= fromPath.length ? fromSlug : fromPath;
  return best.length >= fromQueryPath.length ? best : fromQueryPath;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const segments = getVocabularySegments(req);
  return routeVocabularyRequest(req, res, userId, segments);
}
