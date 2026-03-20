/**
 * Dedicated handler for /api/lessons/* (list, :id, :id/preview, :id/complete).
 * Root api/[...path].ts can mis-parse multi-segment lesson URLs on Vercel → 404 with empty body.
 */
import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { getRequestPathname, normalizeQueryPathSegments } from '../_lib/request.js';
import { routeLessonsRequest } from '../_lib/lessons.js';

function getLessonPathSegments(req: VercelRequest): string[] {
  // Prefer pathname: Vercel's req.query.path for [...path] is often only the FIRST segment,
  // so /api/lessons/1/preview becomes ["1"] and preview is lost → wrong handler / 404.
  const pathname = getRequestPathname(req);
  const parts = pathname.split('/').filter(Boolean);
  const apiIdx = parts.indexOf('api');
  if (apiIdx >= 0 && parts[apiIdx + 1] === 'lessons') {
    return parts.slice(apiIdx + 2);
  }
  const lIdx = parts.indexOf('lessons');
  if (lIdx >= 0) {
    return parts.slice(lIdx + 1);
  }
  return normalizeQueryPathSegments(req.query.path as string | string[] | undefined);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const segments = getLessonPathSegments(req);
  return routeLessonsRequest(req, res, userId, segments);
}
