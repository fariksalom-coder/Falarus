import type { Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validateGrammarQuestionPayload } from '../../shared/grammarQuestionContent.js';

export function createAdminGrammarController(supabase: SupabaseClient) {
  async function listLessons(_req: Request, res: Response) {
    const { data, error } = await supabase
      .from('lessons')
      .select('id, title, lesson_path, is_active')
      .order('id', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ lessons: data ?? [] });
  }

  async function listQuestions(req: Request, res: Response) {
    const lessonId = Number(req.params.lessonId);
    if (!Number.isFinite(lessonId)) return res.status(400).json({ error: 'lessonId kerak' });
    const taskRaw = req.query.task;
    const taskNum = taskRaw != null && String(taskRaw).trim() !== '' ? Number(taskRaw) : null;

    let q = supabase
      .from('questions')
      .select('id, lesson_id, type, prompt, order_index, is_active, version, difficulty, skill, meta')
      .eq('lesson_id', lessonId)
      .order('order_index', { ascending: true });

    if (taskNum != null && Number.isFinite(taskNum)) {
      const lo = taskNum * 1000;
      const hi = taskNum * 1000 + 999;
      q = q.gte('order_index', lo).lte('order_index', hi);
    }

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ questions: data ?? [] });
  }

  async function getQuestion(req: Request, res: Response) {
    const id = Number(req.params.questionId);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'questionId kerak' });
    const { data: row, error } = await supabase.from('questions').select('*').eq('id', id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!row) return res.status(404).json({ error: 'Savol topilmadi' });
    const { data: contentRow } = await supabase
      .from('question_content')
      .select('content, answer')
      .eq('question_id', id)
      .maybeSingle();
    return res.json({
      question: row,
      content: contentRow?.content ?? {},
      answer: contentRow?.answer ?? {},
    });
  }

  async function updateQuestion(req: Request, res: Response) {
    const id = Number(req.params.questionId);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'questionId kerak' });
    const body = req.body ?? {};
    const type = String(body.type ?? '');
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    const order_index = Number(body.order_index);
    const is_active = Boolean(body.is_active);
    const content = body.content;
    const answer = body.answer;
    const difficulty = Number(body.difficulty);
    const skill = typeof body.skill === 'string' ? body.skill : 'grammar';
    const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};

    if (!Number.isFinite(order_index)) return res.status(400).json({ error: 'order_index kerak' });
    const vErr = validateGrammarQuestionPayload(type, content, answer);
    if (vErr) return res.status(400).json({ error: vErr });

    const { data: existing, error: exErr } = await supabase.from('questions').select('id').eq('id', id).maybeSingle();
    if (exErr) return res.status(500).json({ error: exErr.message });
    if (!existing) return res.status(404).json({ error: 'Savol topilmadi' });

    const { error: uq } = await supabase
      .from('questions')
      .update({
        type,
        prompt,
        order_index,
        is_active,
        difficulty: Number.isFinite(difficulty) ? difficulty : 1,
        skill: skill.trim() || 'grammar',
        meta,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (uq) return res.status(500).json({ error: uq.message });

    const { error: uc } = await supabase.from('question_content').upsert(
      {
        question_id: id,
        content: content ?? {},
        answer: answer ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'question_id' },
    );
    if (uc) return res.status(500).json({ error: uc.message });
    return res.json({ ok: true });
  }

  async function createQuestion(req: Request, res: Response) {
    const lessonId = Number(req.params.lessonId);
    if (!Number.isFinite(lessonId)) return res.status(400).json({ error: 'lessonId kerak' });
    const body = req.body ?? {};
    const type = String(body.type ?? 'choice');
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    const order_index = Number(body.order_index);
    const is_active = body.is_active !== false;
    const content = body.content ?? {};
    const answer = body.answer ?? {};
    const difficulty = Number(body.difficulty);
    const skill = typeof body.skill === 'string' ? body.skill : 'grammar';
    const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};

    if (!Number.isFinite(order_index)) return res.status(400).json({ error: 'order_index kerak' });
    const vErr = validateGrammarQuestionPayload(type, content, answer);
    if (vErr) return res.status(400).json({ error: vErr });

    const { data: inserted, error: iq } = await supabase
      .from('questions')
      .insert({
        lesson_id: lessonId,
        type,
        prompt,
        order_index,
        is_active,
        difficulty: Number.isFinite(difficulty) ? difficulty : 1,
        skill: skill.trim() || 'grammar',
        meta,
      })
      .select('id')
      .single();
    if (iq || !inserted) return res.status(500).json({ error: iq?.message ?? 'Insert xato' });

    const qid = Number((inserted as { id: number }).id);
    const { error: cq } = await supabase.from('question_content').insert({
      question_id: qid,
      content,
      answer,
    });
    if (cq) return res.status(500).json({ error: cq.message });
    return res.status(201).json({ id: qid });
  }

  return {
    listLessons,
    listQuestions,
    getQuestion,
    updateQuestion,
    createQuestion,
  };
}
