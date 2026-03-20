/**
 * Dedicated handler for /api/user/* so Vercel routes match reliably.
 * Root api/[...path].ts catch-all can mis-parse multi-segment paths on some deployments → 404 for /api/user/me.
 */
import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { getRequestPathname, normalizeQueryPathSegments } from '../_lib/request.js';
import { routeUserRequest } from '../_lib/user.js';

function getUserPathSegments(req: VercelRequest): string[] {
  const fromQuery = normalizeQueryPathSegments(req.query.path as string | string[] | undefined);
  if (fromQuery.length > 0) return fromQuery;

  const pathname = getRequestPathname(req);
  const parts = pathname.split('/').filter(Boolean);
  const apiIdx = parts.indexOf('api');
  if (apiIdx >= 0 && parts[apiIdx + 1] === 'user' && parts.length > apiIdx + 2) {
    return parts.slice(apiIdx + 2);
  }
  const uIdx = parts.indexOf('user');
  if (uIdx >= 0 && parts.length > uIdx + 1) {
    return parts.slice(uIdx + 1);
  }
  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const segments = getUserPathSegments(req);
  return routeUserRequest(req, res, userId, segments);
}
