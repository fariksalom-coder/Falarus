/**
 * Dedicated route so Vercel always matches `/api/grammar/catalog` (avoids catch-all edge cases).
 */
import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { handleGrammarCatalog } from '../_lib/grammarCatalogHandler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const userId = requireAuth(req, res);
  if (userId == null) return;
  return handleGrammarCatalog(userId, res);
}
