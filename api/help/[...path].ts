/**
 * Dedicated handler for /api/help/* on Vercel.
 * Some deployments can return 404 for deep root catch-all API routes.
 */
import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import rootApiHandler from '../[...path].js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathParam = (req.query as { path?: string | string[] }).path;
  const rest = Array.isArray(pathParam)
    ? pathParam.filter((s): s is string => typeof s === 'string' && s.length > 0)
    : typeof pathParam === 'string' && pathParam.length > 0
      ? [pathParam]
      : [];

  const anyReq = req as unknown as { query: Record<string, unknown> };
  anyReq.query = {
    ...(anyReq.query ?? {}),
    path: ['help', ...rest],
  };

  return rootApiHandler(req, res);
}
