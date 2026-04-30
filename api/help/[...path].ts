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
  const normalizedPath = rest[0] === 'help' ? rest : ['help', ...rest];
  const proxiedReq = req as unknown as VercelRequest & { query: Record<string, unknown> };
  proxiedReq.query = {
    ...(req.query as Record<string, unknown>),
    path: normalizedPath,
  };

  return rootApiHandler(proxiedReq, res);
}
