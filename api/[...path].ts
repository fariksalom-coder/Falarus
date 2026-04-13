/**
 * Single catch-all handler for the public and authenticated Vercel API.
 * Keeps serverless function count under Vercel Hobby limit (12).
 * All `/api/vocabulary/*` is routed here (Hobby 12-function limit — no separate `api/vocabulary/` functions).
 * This file covers the rest of `/api/*`.
 */
import './_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Busboy from 'busboy';
import { supabase } from './_lib/supabase.js';
import { setCors, handleOptions } from './_lib/cors.js';
import { requireAuth } from './_lib/auth.js';
import {
  getRequestPathname,
  normalizeQueryPathSegments,
  parseBody,
} from './_lib/request.js';
import { routeLessonsRequest, handleLessonTaskQuestionsGet } from './_lib/lessons.js';
import { handleGrammarCatalog } from './_lib/grammarCatalogHandler.js';
import { routeUserRequest } from './_lib/user.js';
import { routeVocabularyRequest } from './_lib/vocabulary.js';
import { routePartnerRequest } from './_lib/partner.js';
import { routeSpeakingRequest } from './_lib/speaking.js';
import {
  getReferralLink,
  getReferralStats,
  getReferralList,
  getReferralPageData,
  createWithdrawal,
} from './_lib/referral.js';
import { getActivityStreakPayload } from './_lib/activityStreak.js';
import { awardUserPoints } from './_lib/awardUserPoints.js';
import { syncUserLessonProgressPercent } from './_lib/lessonProgress.js';
import { buildRequestLogContext, logError } from './_lib/logger.js';
import { calculateImprovementDelta } from './_lib/scoring.js';
import { shouldPreservePreviousLessonTaskResult } from '../shared/lessonTaskPassing.js';
import { formatDateInAppTimezone } from './_lib/appDate.js';
import {
  getDailyPoints,
  getWeekStartDateString,
  getWeeklyPoints,
  isMissingLeaderboardColumnError,
} from '../shared/leaderboardPeriods.js';
import { assignCompetitionRanks } from '../shared/leaderboardRanks.js';
import { fetchPeriodLeaderboardFromEvents } from '../shared/periodLeaderboard.js';
import {
  getCourseProductPrice,
  isCourseProductCode,
  isCurrencyCode,
  isSubscriptionTariffType,
  normalizePaymentProductCode,
} from '../shared/paymentProducts.js';
import { isPaymentsProductCodeSchemaError } from '../shared/paymentsCompat.js';
import { embedFalarusProductInProofUrl } from '../shared/paymentsProofUrl.js';

const PAYMENT_PROOFS_BUCKET = 'payment-proofs';
const PAYMENT_ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const PAYMENT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function parseMultipartPayments(req: VercelRequest): Promise<{ fields: Record<string, string>; file: { buffer: Buffer; mimetype: string } | null }> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    let file: { buffer: Buffer; mimetype: string } | null = null;
    const chunks: Buffer[] = [];
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      reject(new Error('Content-Type must be multipart/form-data'));
      return;
    }
    const bb = Busboy({ headers: { 'content-type': contentType } });
    bb.on('field', (name: string, value: string) => { fields[name] = value; });
    bb.on('file', (name, stream, info) => {
      const { mimeType } = info;
      if (name !== 'upload_file') { stream.resume(); return; }
      if (!PAYMENT_ALLOWED_MIMES.includes(mimeType)) {
        stream.resume();
        reject(new Error('Faqat JPG, PNG, WEBP yoki PDF yuklashingiz mumkin'));
        return;
      }
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length > PAYMENT_MAX_SIZE) reject(new Error('Fayl 10 MB dan oshmasin'));
        else file = { buffer, mimetype: mimeType };
      });
      stream.on('error', reject);
    });
    bb.on('error', reject);
    bb.on('finish', () => resolve({ fields, file }));
    (req as NodeJS.ReadableStream).pipe(bb);
  });
}

const ROOT_API_PREFIXES = new Set([
  'referral',
  'payments',
  'pricing',
  'tariff-prices',
  'payment-methods',
  'grammar',
  'lessons',
  'leaderboard',
  'lesson-task-results',
  'lesson-task-questions',
  'activity',
  'user',
  'vocabulary',
  'partner',
  'speaking',
]);

function getPathParts(req: VercelRequest): string[] {
  const fromQuery = normalizeQueryPathSegments(req.query.path as string | string[] | undefined);
  if (fromQuery.length > 0) return fromQuery;
  const pathname = getRequestPathname(req);
  const parts = pathname.split('/').filter(Boolean);
  const apiIndex = parts.indexOf('api');
  if (apiIndex >= 0 && apiIndex < parts.length - 1) return parts.slice(apiIndex + 1);
  // Vercel may invoke with only the tail path, e.g. /activity/streak (no /api prefix)
  if (parts.length > 0 && ROOT_API_PREFIXES.has(parts[0])) {
    return parts;
  }
  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const path = getPathParts(req);

  // /api/referral?action=... — moved from dedicated function to keep under Vercel limit
  if (path[0] === 'referral') {
    const userId = requireAuth(req, res);
    if (userId == null) return;
    const action = typeof req.query.action === 'string' ? req.query.action : '';
    try {
      if (action === 'page' && req.method === 'GET') {
        const data = await getReferralPageData(supabase, userId);
        return res.status(200).json(data);
      }
      if (action === 'link' && req.method === 'GET') {
        const result = await getReferralLink(supabase, userId);
        return res.status(200).json(result);
      }
      if (action === 'stats' && req.method === 'GET') {
        const stats = await getReferralStats(supabase, userId);
        return res.status(200).json(stats);
      }
      if (action === 'list' && req.method === 'GET') {
        const list = await getReferralList(supabase, userId);
        return res.status(200).json(list);
      }
      if (req.method === 'POST') {
        const body = parseBody(req.body);
        const amount = Math.round(Number(body.amount) || 0);
        const result = await createWithdrawal(supabase, userId, amount);
        return res.status(200).json({ success: true, id: result.id, amount: result.amount });
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error('[api/referral]', action, err.message);
      if (action === 'link') {
        const isSchema = /referral_code|referrals|relation|column/i.test(err.message);
        return res.status(500).json({
          error: isSchema
            ? "Referral tizimi sozlanmagan. Ma'lumotlar bazasiga 009_referral_system.sql migratsiyasini qo'llang."
            : 'Xatolik yuz berdi',
        });
      }
      if (req.method === 'POST') {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  }

  // POST /api/payments — inline to avoid extra serverless function (Vercel 12 limit)
  if (path[0] === 'payments' && path.length === 1 && req.method === 'POST') {
    const userId = requireAuth(req, res);
    if (userId == null) return;
    try {
      const { fields, file } = await parseMultipartPayments(req);
      const productCode = normalizePaymentProductCode(fields.product_code);
      const tariffType = (fields.tariff_type || '').trim();
      const currency = (fields.currency || '').toUpperCase();
      if (!isCurrencyCode(currency))
        return res.status(400).json({ error: 'currency kerak: UZS, RUB, USD' });
      if (productCode === 'russian' && !isSubscriptionTariffType(tariffType))
        return res.status(400).json({ error: 'tariff_type kerak: month, 3months, year' });
      let pendingQuery = supabase
        .from('payments')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .eq('product_code', productCode)
        .limit(1)
        .maybeSingle();
      let { data: pending, error: pendingErr } = await pendingQuery;
      if (pendingErr && isPaymentsProductCodeSchemaError(pendingErr)) {
        const legacy = await supabase
          .from('payments')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .limit(1)
          .maybeSingle();
        pending = legacy.data;
      }
      if (pending) {
        return res.status(400).json({
          error: 'PENDING_PAYMENT',
          message: "To'lovingiz tekshirilmoqda. Administrator tez orada to'lovni tasdiqlaydi. Tasdiqlangandan so'ng sizga kursga kirish ochiladi.",
        });
      }
      if (!file || !file.buffer.length)
        return res.status(400).json({ error: 'Chek yoki skrinshot faylini yuklang' });
      let amount = 0;
      if (productCode === 'russian') {
        const priceKey =
          tariffType === 'year'
            ? 'year'
            : tariffType === '3months'
              ? 'three_months'
              : 'month';
        const { data: priceRow } = await supabase
          .from('tariff_prices')
          .select('price')
          .eq('currency', currency)
          .eq('tariff_type', priceKey)
          .maybeSingle();
        amount = priceRow != null ? Number((priceRow as { price: number }).price) : 0;
      } else if (isCourseProductCode(productCode)) {
        amount = getCourseProductPrice(productCode, currency);
      }
      const ext = file.mimetype === 'application/pdf' ? 'pdf' : file.mimetype.split('/')[1] || 'jpg';
      const pathStr = `${userId}/${Date.now()}_proof.${ext}`;
      const { data: bucketList } = await supabase.storage.listBuckets();
      const bucketExists = (bucketList ?? []).some((b: { name: string }) => b.name === PAYMENT_PROOFS_BUCKET);
      if (!bucketExists) await supabase.storage.createBucket(PAYMENT_PROOFS_BUCKET, { public: true });
      const { error: uploadErr } = await supabase.storage.from(PAYMENT_PROOFS_BUCKET).upload(pathStr, file.buffer, { contentType: file.mimetype, upsert: false });
      if (uploadErr) {
        console.error('[payment upload]', uploadErr);
        return res.status(500).json({ error: 'Fayl yuklanmadi' });
      }
      const { data: urlData } = supabase.storage.from(PAYMENT_PROOFS_BUCKET).getPublicUrl(pathStr);
      const paymentProofUrl = urlData?.publicUrl ?? null;
      const paymentTime =
        (fields.payment_time && new Date(fields.payment_time).toISOString()) || new Date().toISOString();
      const insertBase: Record<string, unknown> = {
        user_id: userId,
        tariff_type: productCode === 'russian' ? tariffType : null,
        currency,
        amount,
        payment_proof_url: paymentProofUrl,
        payment_time: paymentTime,
        status: 'pending',
      };
      let { data: row, error: insertErr } = await supabase
        .from('payments')
        .insert({ ...insertBase, product_code: productCode })
        .select('id')
        .single();
      if (insertErr && isPaymentsProductCodeSchemaError(insertErr)) {
        const proofUrl =
          productCode === 'russian'
            ? paymentProofUrl
            : embedFalarusProductInProofUrl(paymentProofUrl, productCode);
        const legacyBase = {
          ...insertBase,
          payment_proof_url: proofUrl,
          tariff_type: productCode === 'russian' ? tariffType : 'month',
        };
        const legacyIns = await supabase.from('payments').insert(legacyBase).select('id').single();
        row = legacyIns.data;
        insertErr = legacyIns.error;
      }
      if (insertErr) {
        console.error('[payments insert]', insertErr);
        return res.status(500).json({ error: insertErr.message });
      }
      return res.status(200).json({ success: true, id: (row as { id: number }).id });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Xatolik yuz berdi';
      console.error('[POST /api/payments]', message);
      return res.status(500).json({ error: message });
    }
  }

  if (path[0] === 'grammar' && path[1] === 'catalog' && path.length === 2) {
    const userId = requireAuth(req, res);
    if (userId == null) return;
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    return handleGrammarCatalog(userId, res);
  }

  if (path[0] === 'lessons') {
    const userId = requireAuth(req, res);
    if (userId == null) return;
    return routeLessonsRequest(req, res, userId, path.slice(1));
  }

  if (path[0] === 'user') {
    const userId = requireAuth(req, res);
    if (userId == null) return;
    return routeUserRequest(req, res, userId, path.slice(1));
  }

  if (path[0] === 'vocabulary') {
    const userId = requireAuth(req, res);
    if (userId == null) return;
    return routeVocabularyRequest(req, res, userId, path.slice(1));
  }

  if (path[0] === 'partner') {
    const userId = requireAuth(req, res);
    if (userId == null) return;
    return routePartnerRequest(req, res, userId, path.slice(1));
  }

  if (path[0] === 'speaking') {
    const userId = requireAuth(req, res);
    if (userId == null) return;
    return routeSpeakingRequest(req, res, userId, path.slice(1));
  }

  // /api/patent/results — implemented in api/patent/results.ts (Vercel catch-all 404 for this path)

  // /api/lesson-task-results — merged from dedicated function to reduce serverless count
  if (path[0] === 'lesson-task-results') {
    const userId = requireAuth(req, res);
    if (userId == null) return;
    try {
      if (req.method === 'GET') {
        const lessonPath = req.query.lesson_path as string | undefined;
        let q = supabase
          .from('lesson_task_results')
          .select('lesson_path, task_number, correct, total')
          .eq('user_id', userId);
        if (lessonPath) q = q.eq('lesson_path', lessonPath);
        const { data: rows, error } = await q;
        if (error) {
          console.error('[api/lesson-task-results] GET error:', error.message);
          return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(rows ?? []);
      }

      if (req.method === 'POST') {
        const body = parseBody(req.body);
        const lessonPath = body.lesson_path as string | undefined;
        const taskNumber = (body as any).task_number;
        const correct = Number((body as any).correct) || 0;
        const total = Number((body as any).total) || 0;

        if (!lessonPath || taskNumber == null) {
          return res.status(400).json({ error: 'lesson_path va task_number kerak' });
        }

        const tn = Number(taskNumber);
        const { data: prevRow } = await supabase
          .from('lesson_task_results')
          .select('correct, total')
          .eq('user_id', userId)
          .eq('lesson_path', String(lessonPath))
          .eq('task_number', tn)
          .maybeSingle();

        const prev =
          prevRow != null && prevRow.correct != null && prevRow.total != null
            ? { correct: Number(prevRow.correct), total: Number(prevRow.total) }
            : null;
        if (shouldPreservePreviousLessonTaskResult(prev, correct, total)) {
          const progress = await syncUserLessonProgressPercent(supabase, userId);
          return res.status(200).json({ success: true, preserved: true, progress });
        }

        const prevCorrect = Number(prevRow?.correct ?? 0);
        const delta = calculateImprovementDelta(prevCorrect, correct);
        await awardUserPoints(userId, delta, {
          source: 'lesson_task_result',
          sourceRef: `${String(lessonPath)}#${tn}`,
          eventKey: `lesson_task_result:${userId}:${String(lessonPath)}:${tn}:correct:${correct}`,
        });

        const row = {
          user_id: userId,
          lesson_path: String(lessonPath),
          task_number: tn,
          correct,
          total,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('lesson_task_results').upsert(row, {
          onConflict: 'user_id,lesson_path,task_number',
        });
        if (error) {
          console.error('[api/lesson-task-results] POST error:', error.message);
          return res.status(500).json({ error: error.message });
        }
        const progress = await syncUserLessonProgressPercent(supabase, userId);
        return res.status(200).json({ success: true, progress });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError(
        'api.lesson_task_results.failed',
        err,
        buildRequestLogContext('vercel', req, { path: 'lesson-task-results', userId })
      );
      if (err.message.includes('SUPABASE')) {
        return res.status(503).json({ error: 'Server configuration error' });
      }
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  }

  /** Same as Express `GET /api/lesson-task-questions` — frontend uses query params (Vercel-safe). */
  if (path[0] === 'lesson-task-questions') {
    const userId = requireAuth(req, res);
    if (userId == null) return;
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    return handleLessonTaskQuestionsGet(req, res, userId);
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // /api/pricing — public active plans (no auth)
  if (path[0] === 'pricing' && path.length === 1) {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('id, plan_name, duration_days, price, discount_percent, active')
        .eq('active', true)
        .order('duration_days', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data ?? []);
    } catch (e) {
      console.error('[api/pricing]', e instanceof Error ? e.message : e);
      return res.status(500).json({ error: 'Xatolik' });
    }
  }

  // /api/tariff-prices?currency=UZS — public (no auth)
  if (path[0] === 'tariff-prices' && path.length === 1) {
    const currency = (typeof req.query.currency === 'string' ? req.query.currency : '').toUpperCase();
    if (!['UZS', 'RUB', 'USD'].includes(currency)) {
      return res.status(400).json({ error: 'currency kerak: UZS, RUB, USD' });
    }
    try {
      const { data, error } = await supabase
        .from('tariff_prices')
        .select('tariff_type, price')
        .eq('currency', currency);
      if (error) throw error;
      const rows = (data ?? []) as { tariff_type: string; price: number }[];
      const out: Record<string, number> = {};
      rows.forEach((r) => { out[r.tariff_type] = Number(r.price); });
      return res.status(200).json({ month: out.month, three_months: out.three_months, year: out.year });
    } catch (e) {
      console.error('[api/tariff-prices]', e instanceof Error ? e.message : e);
      return res.status(500).json({ error: 'Xatolik' });
    }
  }

  // /api/payment-methods?currency=RUB — public (no auth)
  if (path[0] === 'payment-methods' && path.length === 1) {
    const currency = (typeof req.query.currency === 'string' ? req.query.currency : '').toUpperCase();
    if (!['UZS', 'RUB', 'USD'].includes(currency)) {
      return res.status(400).json({ error: 'currency kerak: UZS, RUB, USD' });
    }
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('card_number, phone_number, card_holder_name')
        .eq('currency', currency)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json(data ?? null);
    } catch (e) {
      console.error('[api/payment-methods]', e instanceof Error ? e.message : e);
      return res.status(500).json({ error: 'Xatolik' });
    }
  }

  // /api/leaderboard
  if (path[0] === 'leaderboard') {
    const userId = requireAuth(req, res);
    if (userId == null) return;
    const requestedPeriod = (typeof req.query.period === 'string' ? req.query.period : 'weekly') || 'weekly';
    const period = ['daily', 'weekly', 'all', 'monthly'].includes(requestedPeriod)
      ? requestedPeriod
      : 'weekly';
    const useTotalPoints = period === 'all';
    const today = formatDateInAppTimezone(new Date());
    const weekStart = getWeekStartDateString(today);
    try {
      if (useTotalPoints) {
        const { data: topRows, error: topErr } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url, total_points')
          .eq('hide_from_leaderboard', false)
          .order('total_points', { ascending: false })
          .order('id', { ascending: true })
          .limit(100);
        if (topErr) throw topErr;
        const top = assignCompetitionRanks((topRows ?? []).map((r: any) => ({
          id: r.id,
          firstName: r.first_name ?? '',
          lastName: r.last_name ?? '',
          avatarUrl: r.avatar_url ?? null,
          points: Number(r.total_points ?? 0),
        })));
        const { data: me } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url, total_points, hide_from_leaderboard')
          .eq('id', userId)
          .single();
        if (!me || me.hide_from_leaderboard) {
          return res.status(200).json({ top, myRank: null });
        }
        const myPoints = Number(me.total_points ?? 0);
        const { count, error: countErr } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('hide_from_leaderboard', false)
          .gt('total_points', myPoints);
        return res.status(200).json({
          top,
          myRank:
            countErr || !me
              ? null
              : {
                  rank: (count ?? 0) + 1,
                  id: me.id,
                  firstName: me.first_name,
                  lastName: me.last_name,
                  avatarUrl: me.avatar_url,
                  points: myPoints,
                },
        });
      }

      if (period === 'monthly') {
        const { data: top, error: topErr } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url, monthly_points')
          .eq('hide_from_leaderboard', false)
          .order('monthly_points', { ascending: false })
          .limit(100);
        if (topErr) throw topErr;
        const { data: me, error: meErr } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url, monthly_points, hide_from_leaderboard')
          .eq('id', userId)
          .single();
        if (meErr || !me || me.hide_from_leaderboard) return res.status(200).json({ top: top ?? [], myRank: null });
        const myPoints = me.monthly_points ?? 0;
        const { count, error: countErr } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('hide_from_leaderboard', false)
          .gt('monthly_points', myPoints);
        const rank = countErr ? null : (count ?? 0) + 1;
        return res.status(200).json({
          top: (top ?? []).map((u: any) => ({
            id: u.id,
            firstName: u.first_name,
            lastName: u.last_name,
            avatarUrl: u.avatar_url,
            points: u.monthly_points ?? 0,
          })),
          myRank:
            rank == null
              ? null
              : {
                  rank,
                  id: me.id,
                  firstName: me.first_name,
                  lastName: me.last_name,
                  avatarUrl: me.avatar_url,
                  points: myPoints,
                },
        });
      }

      if (period === 'daily') {
        const periodFromEvents = await fetchPeriodLeaderboardFromEvents(supabase, userId, 'daily', today);
        if (periodFromEvents != null) {
          return res.status(200).json(periodFromEvents);
        }
        const { data: top, error: topErr } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url, points, points_date')
          .eq('hide_from_leaderboard', false)
          .eq('points_date', today)
          .gt('points', 0)
          .order('points', { ascending: false })
          .limit(100);
        if (topErr && !isMissingLeaderboardColumnError(topErr, 'points_date')) throw topErr;
        if (topErr && isMissingLeaderboardColumnError(topErr, 'points_date')) {
          const { data: legacyTop, error: legacyTopErr } = await supabase
            .from('users')
            .select('id, first_name, last_name, avatar_url, points')
            .eq('hide_from_leaderboard', false)
            .gt('points', 0)
            .order('points', { ascending: false })
            .limit(100);
          if (legacyTopErr) throw legacyTopErr;
          const { data: legacyMe, error: legacyMeErr } = await supabase
            .from('users')
            .select('id, first_name, last_name, avatar_url, points, hide_from_leaderboard')
            .eq('id', userId)
            .single();
          if (legacyMeErr || !legacyMe || legacyMe.hide_from_leaderboard) return res.status(200).json({ top: legacyTop ?? [], myRank: null });
          const myPoints = legacyMe.points ?? 0;
          const { count, error: legacyCountErr } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('hide_from_leaderboard', false)
            .gt('points', myPoints);
          const rank = legacyCountErr ? null : (count ?? 0) + 1;
          return res.status(200).json({
            top: assignCompetitionRanks((legacyTop ?? []).map((u: any) => ({
              id: u.id,
              firstName: u.first_name,
              lastName: u.last_name,
              avatarUrl: u.avatar_url,
              points: u.points ?? 0,
            }))),
            myRank:
              rank == null
                ? null
                : {
                    rank,
                    id: legacyMe.id,
                    firstName: legacyMe.first_name,
                    lastName: legacyMe.last_name,
                    avatarUrl: legacyMe.avatar_url,
                    points: myPoints,
                  },
          });
        }
        const { data: me, error: meErr } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url, points, points_date, hide_from_leaderboard')
          .eq('id', userId)
          .single();
        if (meErr || !me || me.hide_from_leaderboard) return res.status(200).json({ top: top ?? [], myRank: null });
        const myPoints = getDailyPoints(me, today);
        const { count, error: countErr } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('hide_from_leaderboard', false)
          .eq('points_date', today)
          .gt('points', myPoints > 0 ? myPoints : 0);
        const rank = countErr ? null : (count ?? 0) + 1;
        return res.status(200).json({
          top: assignCompetitionRanks((top ?? []).map((u: any) => ({
            id: u.id,
            firstName: u.first_name,
            lastName: u.last_name,
            avatarUrl: u.avatar_url,
            points: u.points ?? 0,
          }))),
          myRank:
            rank == null
              ? null
              : {
                  rank,
                  id: me.id,
                  firstName: me.first_name,
                  lastName: me.last_name,
                  avatarUrl: me.avatar_url,
                  points: myPoints,
                },
        });
      }

      const periodFromEvents = await fetchPeriodLeaderboardFromEvents(supabase, userId, 'weekly', weekStart);
      if (periodFromEvents != null) {
        return res.status(200).json(periodFromEvents);
      }

      const { data: top, error: topErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, weekly_points, weekly_points_week_start')
        .eq('hide_from_leaderboard', false)
        .eq('weekly_points_week_start', weekStart)
        .gt('weekly_points', 0)
        .order('weekly_points', { ascending: false })
        .limit(100);
      if (topErr && !isMissingLeaderboardColumnError(topErr, 'weekly_points_week_start')) throw topErr;
      if (topErr && isMissingLeaderboardColumnError(topErr, 'weekly_points_week_start')) {
        const { data: legacyTop, error: legacyTopErr } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url, weekly_points')
          .eq('hide_from_leaderboard', false)
          .gt('weekly_points', 0)
          .order('weekly_points', { ascending: false })
          .limit(100);
        if (legacyTopErr) throw legacyTopErr;
        const { data: legacyMe, error: legacyMeErr } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url, weekly_points, hide_from_leaderboard')
          .eq('id', userId)
          .single();
        if (legacyMeErr || !legacyMe || legacyMe.hide_from_leaderboard) return res.status(200).json({ top: legacyTop ?? [], myRank: null });
        const myPoints = legacyMe.weekly_points ?? 0;
        const { count, error: legacyCountErr } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('hide_from_leaderboard', false)
          .gt('weekly_points', myPoints);
        const rank = legacyCountErr ? null : (count ?? 0) + 1;
        return res.status(200).json({
          top: assignCompetitionRanks((legacyTop ?? []).map((u: any) => ({
            id: u.id,
            firstName: u.first_name,
            lastName: u.last_name,
            avatarUrl: u.avatar_url,
            points: u.weekly_points ?? 0,
          }))),
          myRank:
            rank == null
              ? null
              : {
                  rank,
                  id: legacyMe.id,
                  firstName: legacyMe.first_name,
                  lastName: legacyMe.last_name,
                  avatarUrl: legacyMe.avatar_url,
                  points: myPoints,
                },
        });
      }
      const { data: me, error: meErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, weekly_points, weekly_points_week_start, hide_from_leaderboard')
        .eq('id', userId)
        .single();
      if (meErr || !me || me.hide_from_leaderboard) return res.status(200).json({ top: top ?? [], myRank: null });
      const myPoints = getWeeklyPoints(me, today);
      const { count, error: countErr } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('hide_from_leaderboard', false)
        .eq('weekly_points_week_start', weekStart)
        .gt('weekly_points', myPoints > 0 ? myPoints : 0);
      const rank = countErr ? null : (count ?? 0) + 1;
      return res.status(200).json({
        top: assignCompetitionRanks((top ?? []).map((u: any) => ({
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          avatarUrl: u.avatar_url,
          points: u.weekly_points ?? 0,
        }))),
        myRank:
          rank == null
            ? null
            : {
                rank,
                id: me.id,
                firstName: me.first_name,
                lastName: me.last_name,
                avatarUrl: me.avatar_url,
                points: myPoints,
              },
      });
    } catch (e) {
      console.error('[api/leaderboard]', e instanceof Error ? e.message : e);
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  }

  // /api/streak (vercel.json rewrites /api/activity/streak → here) and /api/activity/streak
  if (req.method === 'GET') {
    const isStreak =
      (path[0] === 'streak' && path.length === 1) ||
      (path[0] === 'activity' && path[1] === 'streak');
    if (isStreak) {
      const userId = requireAuth(req, res);
      if (userId == null) return;
      try {
        const payload = await getActivityStreakPayload(supabase, userId);
        return res.status(200).json(payload);
      } catch (e) {
        console.error('[api/streak]', e instanceof Error ? e.message : e);
        return res.status(500).json({ error: 'Xatolik yuz berdi' });
      }
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
