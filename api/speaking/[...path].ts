/**
 * Dedicated handler for /api/speaking/* so Vercel routes match reliably.
 */
import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { getRequestPathname, normalizeQueryPathSegments } from '../_lib/request.js';
import { routeSpeakingRequest } from '../_lib/speaking.js';

function segmentsFromPathname(req: VercelRequest): string[] {
  const pathname = getRequestPathname(req);
  const parts = pathname.split('/').filter(Boolean);
  const apiIdx = parts.indexOf('api');
  if (apiIdx >= 0 && parts[apiIdx + 1] === 'speaking') {
    return parts.slice(apiIdx + 2);
  }
  const pIdx = parts.indexOf('speaking');
  if (pIdx >= 0) {
    return parts.slice(pIdx + 1);
  }
  return [];
}

function getSpeakingPathSegments(req: VercelRequest): string[] {
  const fromPath = segmentsFromPathname(req);
  const fromQuery = normalizeQueryPathSegments(req.query.path as string | string[] | undefined);
  return fromPath.length >= fromQuery.length ? fromPath : fromQuery;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const segments = getSpeakingPathSegments(req);
  return routeSpeakingRequest(req, res, userId, segments);
}
