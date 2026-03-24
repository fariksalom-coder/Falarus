/**
 * Dedicated handler for /api/admin/payments/:id/:action on Vercel.
 * Some deployments can return 404 for deep catch-all admin routes.
 */
import '../../../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import adminHandler from '../../[...path].js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const idRaw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const actionRaw = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
  const id = typeof idRaw === 'string' ? idRaw : '';
  const action = typeof actionRaw === 'string' ? actionRaw : '';

  const anyReq = req as any;
  anyReq.query = {
    ...(anyReq.query ?? {}),
    path: ['payments', id, action],
  };

  return adminHandler(req, res);
}
