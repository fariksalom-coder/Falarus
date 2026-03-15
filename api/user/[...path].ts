/**
 * Single handler for GET /api/user/me, POST /api/user/onboard, GET /api/user/access
 * to stay under Vercel Hobby 12-function limit.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';

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

async function hasActiveAccess(userId: number): Promise<boolean> {
  const now = new Date().toISOString();
  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('expires_at', now)
    .limit(1)
    .maybeSingle();
  if (subErr) throw subErr;
  if (sub) return true;
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('plan_expires_at')
    .eq('id', userId)
    .single();
  if (userErr || !user?.plan_expires_at) return false;
  return new Date(user.plan_expires_at) > new Date();
}

async function handleMe(userId: number, res: VercelResponse) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, level, onboarded, progress, plan_name, plan_expires_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('[api/user/me]', error.message);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
  if (!user) return res.status(404).json({ error: 'User topilmadi' });
  return res.status(200).json({
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    level: user.level,
    onboarded: user.onboarded,
    progress: user.progress,
    planName: user.plan_name ?? null,
    planExpiresAt: user.plan_expires_at ?? null,
  });
}

async function handleOnboard(userId: number, req: VercelRequest, res: VercelResponse) {
  const body = parseBody(req.body);
  const level = body.level as string | undefined;
  const { error } = await supabase.from('users').update({ level, onboarded: 1 }).eq('id', userId);
  if (error) {
    console.error('[api/user/onboard]', error.message);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
  return res.status(200).json({ success: true });
}

async function handlePayments(userId: number, res: VercelResponse) {
  const { data: rows, error } = await supabase
    .from('payments')
    .select('id, tariff_type, currency, amount, payment_proof_url, created_at, status, approved_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[api/user/payments]', error.message);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
  return res.status(200).json(rows ?? []);
}

async function handleAccess(userId: number, res: VercelResponse) {
  const subscriptionActive = await hasActiveAccess(userId);
  let vocabulary_free_topic_id: string | null = null;
  let vocabulary_free_subtopic_id: string | null = null;
  const { data: firstTopic } = await supabase
    .from('vocabulary_topics')
    .select('id')
    .order('id')
    .limit(1)
    .maybeSingle();
  if (firstTopic?.id) {
    vocabulary_free_topic_id = firstTopic.id;
    const { data: firstSub } = await supabase
      .from('vocabulary_subtopics')
      .select('id')
      .eq('topic_id', firstTopic.id)
      .order('id')
      .limit(1)
      .maybeSingle();
    if (firstSub?.id) vocabulary_free_subtopic_id = firstSub.id;
  }
  return res.status(200).json({
    lessons_free_limit: 3,
    vocabulary_free_topic: 1,
    vocabulary_free_subtopic: 1,
    subscription_active: subscriptionActive,
    vocabulary_free_topic_id: vocabulary_free_topic_id ?? null,
    vocabulary_free_subtopic_id: vocabulary_free_subtopic_id ?? null,
  });
}

function getPathSegment(req: VercelRequest): string | undefined {
  const path = req.query.path;
  if (path !== undefined) {
    const seg = Array.isArray(path) ? path[0] : path;
    if (typeof seg === 'string') return seg;
  }
  const url = req.url || (req as any).originalUrl || '';
  const pathname = typeof url === 'string' ? url.split('?')[0] : '';
  const parts = pathname.split('/').filter(Boolean);
  const userIndex = parts.indexOf('user');
  if (userIndex >= 0 && userIndex < parts.length - 1) return parts[userIndex + 1];
  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const segment = getPathSegment(req);

  const userId = requireAuth(req, res);
  if (userId == null) return;

  try {
    if (segment === 'me' && req.method === 'GET') {
      return await handleMe(userId, res);
    }
    if (segment === 'onboard' && req.method === 'POST') {
      return await handleOnboard(userId, req, res);
    }
    if (segment === 'access' && req.method === 'GET') {
      return await handleAccess(userId, res);
    }
    if (segment === 'payments' && req.method === 'GET') {
      return await handlePayments(userId, res);
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/user/[...path]]', err.message);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
