import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './supabase.js';
import { parseBody } from './request.js';
import { getAccessInfo } from './subscription.js';
import { buildRequestLogContext, logError } from './logger.js';
import { applyUserAccountPatch } from '../../shared/userAccountPatch.js';

async function handleMe(userId: number, res: VercelResponse) {
  const { data: user, error } = await supabase
    .from('users')
    .select(
      'id, first_name, last_name, email, phone, level, onboarded, progress, total_points, plan_name, plan_expires_at'
    )
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
  if (!user) return res.status(404).json({ error: 'User topilmadi' });
  return res.status(200).json({
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email ?? null,
    phone: user.phone ?? null,
    level: user.level,
    onboarded: user.onboarded,
    progress: user.progress,
    totalPoints: user.total_points ?? 0,
    planName: user.plan_name ?? null,
    planExpiresAt: user.plan_expires_at ?? null,
  });
}

async function handleAccount(userId: number, req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = parseBody(req.body);
  const result = await applyUserAccountPatch(supabase, userId, body);
  if (result.ok === false) {
    return res.status(result.status).json({ error: result.error });
  }
  return handleMe(userId, res);
}

async function handleOnboard(
  userId: number,
  req: VercelRequest,
  res: VercelResponse
) {
  const body = parseBody(req.body);
  const level = body.level as string | undefined;
  const { error } = await supabase
    .from('users')
    .update({ level, onboarded: 1 })
    .eq('id', userId);
  if (error) {
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
  return res.status(200).json({ success: true });
}

async function handlePayments(userId: number, res: VercelResponse) {
  const { data: rows, error } = await supabase
    .from('payments')
    .select(
      'id, tariff_type, product_code, currency, amount, payment_proof_url, created_at, status, approved_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
  return res.status(200).json(rows ?? []);
}

async function handleAccess(userId: number, res: VercelResponse) {
  const access = await getAccessInfo(supabase, userId);
  return res.status(200).json({
    lessons_free_limit: access.lessons_free_limit,
    vocabulary_free_topic: access.vocabulary_free_topic,
    vocabulary_free_subtopic: access.vocabulary_free_subtopic,
    subscription_active: access.subscription_active,
    patent_course_active: access.patent_course_active,
    vnzh_course_active: access.vnzh_course_active,
    vocabulary_free_topic_id: access.vocabulary_free_topic_id ?? null,
    vocabulary_free_subtopic_id: access.vocabulary_free_subtopic_id ?? null,
  });
}

export async function routeUserRequest(
  req: VercelRequest,
  res: VercelResponse,
  userId: number,
  segments: string[]
) {
  try {
    const segment = segments[0];
    if (segment === 'me') {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleMe(userId, res);
    }
    if (segment === 'onboard') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleOnboard(userId, req, res);
    }
    if (segment === 'access') {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleAccess(userId, res);
    }
    if (segment === 'payments') {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handlePayments(userId, res);
    }
    if (segment === 'account') {
      return await handleAccount(userId, req, res);
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError(
      'api.user.failed',
      err,
      buildRequestLogContext('vercel', req, { segments, userId })
    );
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
