import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase.js';
import { setCors, handleOptions } from '../../_lib/cors.js';
import { requireAuth } from '../../_lib/auth.js';

function parseBody(body: unknown): Record<string, unknown> {
  if (body == null) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const userId = requireAuth(req, res);
  if (userId == null) return;

  try {
    if (req.method === 'GET') {
      const { data: rows, error } = await supabase
        .from('vocabulary_progress')
        .select('topic_id, subtopic_id, part_id, result_count, stage_cards, stage_test, stage_pairs')
        .eq('user_id', userId);
      if (error) {
        console.error('[api/vocabulary/progress] GET error:', error.message);
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(rows ?? []);
    }

    if (req.method === 'POST') {
      const body = parseBody(req.body);
      const topicId = body.topic_id as string | undefined;
      const subtopicId = body.subtopic_id as string | undefined;
      const partId = body.part_id as string | undefined;
      const resultCount = typeof body.result_count === 'number' ? body.result_count : undefined;
      const stageCards = body.stage_cards as string | undefined;
      const stageTest = body.stage_test as string | undefined;
      const stagePairs = body.stage_pairs as string | undefined;

      if (!topicId || !subtopicId || !partId) {
        return res.status(400).json({ error: 'topic_id, subtopic_id, part_id kerak' });
      }

      const row: Record<string, unknown> = {
        user_id: userId,
        topic_id: topicId,
        subtopic_id: subtopicId,
        part_id: partId,
        result_count: resultCount ?? 0,
        updated_at: new Date().toISOString(),
      };
      if (stageCards !== undefined) row.stage_cards = stageCards;
      if (stageTest !== undefined) row.stage_test = stageTest;
      if (stagePairs !== undefined) row.stage_pairs = stagePairs;

      const { error } = await supabase.from('vocabulary_progress').upsert(row, {
        onConflict: 'user_id,topic_id,subtopic_id,part_id',
      });
      if (error) {
        console.error('[api/vocabulary/progress] POST error:', error.message);
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/vocabulary/progress]', err.message, err.stack);
    if (err.message.includes('SUPABASE')) {
      return res.status(503).json({ error: 'Server configuration error' });
    }
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
