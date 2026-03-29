/**
 * Dedicated serverless route for /api/patent/results (GET/POST).
 * Vercel sometimes does not invoke the root api/[...path].ts catch-all for this path
 * (platform 404 text/plain). This file guarantees a matching function.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import '../_lib/suppress-dep0169.js';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { parseBody } from '../_lib/request.js';
import { listPatentVariantResults, persistPatentVariantResult } from '../../shared/patentVariantResultsDb.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const userId = requireAuth(req, res);
  if (userId == null) return;

  try {
    if (req.method === 'GET') {
      const { data, error } = await listPatentVariantResults(supabase, userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data ?? []);
    }

    if (req.method === 'POST') {
      const body = parseBody(req.body);
      const variantNumber = Number(body.variant_number);
      const correctCount = Number(body.correct_count);
      const totalCount = Number(body.total_count || 22);
      if (!Number.isInteger(variantNumber) || variantNumber < 1 || variantNumber > 11) {
        return res.status(400).json({ error: 'variant_number noto‘g‘ri' });
      }
      if (!Number.isInteger(correctCount) || correctCount < 0) {
        return res.status(400).json({ error: 'correct_count noto‘g‘ri' });
      }
      if (!Number.isInteger(totalCount) || totalCount <= 0) {
        return res.status(400).json({ error: 'total_count noto‘g‘ri' });
      }
      if (correctCount > totalCount) {
        return res.status(400).json({ error: 'correct_count total_count dan oshmasin' });
      }
      const { data, error } = await persistPatentVariantResult(
        supabase,
        userId,
        variantNumber,
        correctCount,
        totalCount
      );
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(500).json({ error: 'Patent natijasi saqlanmadi' });
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Xatolik yuz berdi';
    return res.status(500).json({ error: message });
  }
}
