import 'dotenv/config';

// Suppress DEP0169 url.parse() deprecation from dependencies (e.g. multer/busboy)
const origEmitWarning = process.emitWarning;
process.emitWarning = function (
  warning: string | Error,
  arg1?: string | Function | ErrorConstructor | NodeJS.EmitWarningOptions,
  arg2?: string | Function | ErrorConstructor,
  arg3?: string | Function | ErrorConstructor
) {
  const m = typeof warning === 'string' ? warning : warning?.message ?? '';
  if (m.includes('url.parse') || m.includes('DEP0169')) return;
  return (origEmitWarning as any).call(process, warning, arg1 as any, arg2 as any, arg3 as any);
};

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { courseData } from './src/data/courseData.ts';
import { buildRequestLogContext, createRequestId, logError, logInfo } from './server/lib/logger.ts';
import { formatDateInAppTimezone } from './server/lib/appDate.ts';
import {
  buildPeriodicPointsUpdate,
  getDailyPoints,
  getWeekStartDateString,
  getWeeklyPoints,
  isMissingLeaderboardColumnError,
} from './shared/leaderboardPeriods.ts';
import { assignCompetitionRanks } from './shared/leaderboardRanks.ts';
import { fetchPeriodLeaderboardFromEvents } from './shared/periodLeaderboard.ts';
import { insertPointEvent } from './shared/pointEvents.ts';
import { parseContactIdentifier } from './shared/authIdentifiers.ts';
import { applyUserAccountPatch } from './shared/userAccountPatch.ts';
import { isPaymentsProductCodeSchemaError } from './shared/paymentsCompat.ts';
import { shouldPreservePreviousLessonTaskResult } from './shared/lessonTaskPassing.ts';
import { resolvePaymentProductFromRow } from './shared/paymentsProofUrl.ts';
import { listPatentVariantResults, persistPatentVariantResult } from './shared/patentVariantResultsDb.ts';
import { buildGrammarCatalogPayload } from './api/_lib/grammarCatalogHandler.ts';
import { payloadFromQuestionContentEmbed } from './shared/questionContentPayload.ts';
import { getAccessInfo } from './api/_lib/subscription.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-uz-ru';

// Seed lessons and exercises from courseData if table is empty
async function seedDatabase() {
  const { count, error: countError } = await supabase.from('lessons').select('*', { count: 'exact', head: true });
  if (countError || (count ?? 0) > 0) return;
  console.log('Seeding database...');
  for (const levelData of courseData) {
    for (const module of levelData.modules) {
      for (const lesson of module.lessons) {
        const { data: lessonRow, error: lessonErr } = await supabase
          .from('lessons')
          .insert({
            level: levelData.level,
            module_name: module.name,
            title: lesson.title,
            content_uz: lesson.content_uz,
            content_ru: lesson.content_ru,
          })
          .select('id')
          .single();
        if (lessonErr || !lessonRow) continue;
        for (const ex of lesson.exercises) {
          await supabase.from('exercises').insert({
            lesson_id: lessonRow.id,
            type: ex.type,
            question_uz: ex.question_uz,
            options: JSON.stringify(ex.options),
            correct_answer: ex.correct_answer,
          });
        }
      }
    }
  }
  console.log('Database seeded successfully.');
}

async function startServer() {
  await seedDatabase();

  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (_req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use((req: any, res, next) => {
    const requestId = req.headers['x-request-id'] || createRequestId();
    req.requestId = Array.isArray(requestId) ? requestId[0] : requestId;
    res.setHeader('X-Request-Id', String(req.requestId));
    const startedAt = Date.now();
    res.on('finish', () => {
      if (!String(req.originalUrl || req.url || '').startsWith('/api/')) return;
      logInfo(
        'express.api.request',
        buildRequestLogContext('express', req, {
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        })
      );
    });
    next();
  });

  // Admin panel first so /api/admin/* is never swallowed by other /api routes
  try {
    const { createAdminRoutes } = await import('./server/routes/adminRoutes');
    app.use('/api/admin', createAdminRoutes(supabase));
    console.log('Admin API: /api/admin (login, dashboard, users, payments, etc.)');
  } catch (err) {
    logError('express.admin.routes_failed_to_load', err);
  }

  // Public pricing (no auth) — for tariff page
  app.get('/api/pricing', async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('id, plan_name, duration_days, price, discount_percent, active')
        .eq('active', true)
        .order('duration_days', { ascending: true });
      if (error) throw error;
      res.json(data ?? []);
    } catch (e) {
      console.error('[GET /api/pricing]', e);
      res.status(500).json({ error: 'Xatolik' });
    }
  });

  // Public tariff prices by currency (no auth) — month, three_months, year
  app.get('/api/tariff-prices', async (req, res) => {
    const currency = (req.query.currency as string)?.toUpperCase();
    if (!currency || !['UZS', 'RUB', 'USD'].includes(currency)) {
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
      res.json({ month: out.month, three_months: out.three_months, year: out.year });
    } catch (e) {
      console.error('[GET /api/tariff-prices]', e);
      res.status(500).json({ error: 'Xatolik' });
    }
  });

  // Public active payment method by currency (no auth)
  app.get('/api/payment-methods', async (req, res) => {
    const currency = (req.query.currency as string)?.toUpperCase();
    if (!currency || !['UZS', 'RUB', 'USD'].includes(currency)) {
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
      res.json(data ?? null);
    } catch (e) {
      console.error('[GET /api/payment-methods]', e);
      res.status(500).json({ error: 'Xatolik' });
    }
  });

  // Auth
  const { attachReferralOnRegister, resolveReferrerFromCode } = await import(
    './server/services/referral.service'
  );
  app.post('/api/auth/register', async (req, res) => {
    const { firstName, lastName, password, ref: refCode, identifier, email: legacyEmail } = req.body ?? {};
    const contactRaw =
      typeof identifier === 'string' && identifier.trim()
        ? identifier.trim()
        : typeof legacyEmail === 'string' && legacyEmail.trim()
          ? legacyEmail.trim()
          : '';
    const parsed = parseContactIdentifier(contactRaw);
    if (parsed.ok === false) {
      return res.status(400).json({ error: parsed.error });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Parol kiritilishi shart' });
    }
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          first_name: firstName ?? '',
          last_name: lastName ?? '',
          email: parsed.email,
          phone: parsed.phone,
          password: hashedPassword,
          onboarded: 1,
        })
        .select('id, first_name, last_name, email, phone, level, onboarded')
        .single();
      if (error) {
        if (error.code === '23505') {
          return res.status(400).json({ error: "Bu email yoki telefon allaqachon ro'yxatdan o'tgan" });
        }
        throw error;
      }
      if (refCode && typeof refCode === 'string') {
        const referrerId = await resolveReferrerFromCode(supabase, refCode, user.id);
        if (referrerId != null && referrerId !== user.id) {
          await attachReferralOnRegister(supabase, referrerId, user.id);
        }
      }
      const { ensureUserInLeaderboard } = await import('./server/services/leaderboard.service');
      await ensureUserInLeaderboard(supabase, user.id).catch(() => {});
      const token = jwt.sign({ id: user.id }, JWT_SECRET);
      res.json({
        token,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email ?? null,
          phone: user.phone ?? null,
          level: user.level ?? 'A0',
          onboarded: 1,
          planName: null,
          planExpiresAt: null,
        },
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { password, identifier, email: legacyEmail } = req.body ?? {};
    const idRaw =
      typeof identifier === 'string' && identifier.trim()
        ? identifier.trim()
        : typeof legacyEmail === 'string' && legacyEmail.trim()
          ? legacyEmail.trim()
          : '';
    if (!idRaw || !password) {
      return res.status(400).json({ error: "Email/telefon va parol kiritilishi shart" });
    }
    const parsed = parseContactIdentifier(idRaw);
    if (parsed.ok === false) {
      return res.status(400).json({ error: parsed.error });
    }
    let q = supabase.from('users').select('*');
    if (parsed.email) {
      q = q.eq('email', parsed.email);
    } else {
      q = q.eq('phone', parsed.phone!);
    }
    const { data: user, error } = await q.maybeSingle();
    if (error || !user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Email, telefon yoki parol noto'g'ri" });
    }
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email ?? null,
        phone: user.phone ?? null,
        level: user.level,
        onboarded: user.onboarded,
        planName: user.plan_name ?? null,
        planExpiresAt: user.plan_expires_at ?? null,
      },
    });
  });

  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Ruxsat berilmagan' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const rawId = decoded.id ?? decoded.sub;
      const userId = Number(rawId);
      if (!Number.isFinite(userId) || userId < 1) return res.status(401).json({ error: 'Yaroqsiz token' });
      req.userId = userId;
      next();
    } catch (e) {
      res.status(401).json({ error: 'Yaroqsiz token' });
    }
  };

  // Payment submission (tariff + currency + proof file)
  try {
    const { createPaymentRoutes } = await import('./server/routes/paymentRoutes');
    app.use('/api/payments', createPaymentRoutes(supabase, authenticate));
    console.log('Payments API: POST /api/payments (auth + file upload)');
  } catch (err) {
    console.error('Payment routes failed:', err);
  }

  // Progress tracking (lesson/task status)
  const { createProgressRoutes } = await import('./server/routes/progressRoutes');
  app.use('/api', createProgressRoutes(supabase, authenticate));

  // Vocabulary (So'zlar): topics, subtopics, word groups, tasks, flashcards/test/match
  const { createVocabularyRoutes } = await import('./server/routes/vocabularyRoutes');
  app.use('/api', createVocabularyRoutes(supabase, authenticate));

  // Activity / streak (Ketma-ket kunlar)
  const { createActivityRoutes } = await import('./server/routes/activityRoutes');
  app.use('/api', createActivityRoutes(supabase, authenticate));

  // Referral (referral link, stats, list, withdraw, discount, payments)
  const { createReferralRoutes } = await import('./server/routes/referralRoutes');
  app.use('/api', createReferralRoutes(supabase, authenticate));

  // Access (freemium: GET /user/access)
  const { createAccessRoutes } = await import('./server/routes/accessRoutes');
  app.use('/api', createAccessRoutes(supabase, authenticate));

  // User
  app.get('/api/user/me', authenticate, async (req: any, res) => {
    const { data: user, error } = await supabase
      .from('users')
      .select(
        'id, first_name, last_name, email, phone, level, onboarded, progress, total_points, plan_name, plan_expires_at'
      )
      .eq('id', req.userId)
      .single();
    if (error || !user) return res.status(404).json({ error: 'User topilmadi' });
    res.json({
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
  });

  app.patch('/api/user/account', authenticate, async (req: any, res) => {
    const result = await applyUserAccountPatch(supabase, req.userId, req.body ?? {});
    if (result.ok === false) {
      return res.status(result.status).json({ error: result.error });
    }
    const { data: user, error } = await supabase
      .from('users')
      .select(
        'id, first_name, last_name, email, phone, level, onboarded, progress, total_points, plan_name, plan_expires_at'
      )
      .eq('id', req.userId)
      .single();
    if (error || !user) return res.status(404).json({ error: 'User topilmadi' });
    res.json({
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
  });

  app.post('/api/user/onboard', authenticate, async (req: any, res) => {
    const { level } = req.body;
    await supabase.from('users').update({ level, onboarded: 1 }).eq('id', req.userId);
    res.json({ success: true });
  });

  app.get('/api/user/payments', authenticate, async (req: any, res) => {
    const PAY_FULL =
      'id, tariff_type, product_code, currency, amount, payment_proof_url, created_at, status, approved_at';
    const PAY_LEGACY =
      'id, tariff_type, currency, amount, payment_proof_url, created_at, status, approved_at';
    let { data: rows, error } = await supabase
      .from('payments')
      .select(PAY_FULL)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    if (error && isPaymentsProductCodeSchemaError(error)) {
      const second = await supabase
        .from('payments')
        .select(PAY_LEGACY)
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false });
      rows = second.data as typeof rows;
      error = second.error;
    }
    if (error) return res.status(500).json({ error: error.message });
    res.json(
      (rows ?? []).map((row: any) => ({
        ...row,
        product_code: resolvePaymentProductFromRow(row),
      }))
    );
  });

  app.get('/api/patent/results', authenticate, async (req: any, res) => {
    const { data, error } = await listPatentVariantResults(supabase, req.userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data ?? []);
  });

  app.post('/api/patent/results', authenticate, async (req: any, res) => {
    const variantNumber = Number(req.body?.variant_number);
    const correctCount = Number(req.body?.correct_count);
    const totalCount = Number(req.body?.total_count || 22);
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
      req.userId,
      variantNumber,
      correctCount,
      totalCount
    );
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(500).json({ error: 'Patent natijasi saqlanmadi' });
    res.json(data);
  });

  // User: request subscription payment (by card) — admin confirms later
  app.post('/api/payment-request', authenticate, async (req: any, res) => {
    const { plan_type, amount } = req.body || {};
    if (!plan_type || !['monthly', 'three_months', 'yearly'].includes(plan_type)) {
      return res.status(400).json({ error: 'plan_type kerak: monthly, three_months, yearly' });
    }
    const amt = Number(amount);
    if (!(amt > 0)) return res.status(400).json({ error: 'amount kerak' });
    const { data: row, error } = await supabase
      .from('subscription_payment_requests')
      .insert({
        user_id: req.userId,
        plan_type,
        amount: amt,
        payment_method: 'card',
        status: 'pending',
      })
      .select('id')
      .single();
    if (error) {
      console.error('[POST /api/payment-request]', error);
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, id: (row as any).id });
  });

  // User: send support message
  app.post('/api/support', authenticate, async (req: any, res) => {
    const message = req.body?.message;
    if (!message || String(message).trim() === '') {
      return res.status(400).json({ error: 'message kerak' });
    }
    const { error } = await supabase.from('support_messages').insert({
      user_id: req.userId,
      message: String(message).trim(),
      status: 'new',
    });
    if (error) {
      console.error('[POST /api/support]', error);
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  });

  // Leaderboard: "all" = cached top 100 from leaderboard table + Redis; daily/weekly = period-aware user counters
  const leaderboardService = await import('./server/services/leaderboard.service');
  app.get('/api/leaderboard', authenticate, async (req: any, res) => {
    const requestedPeriod = (req.query.period as string) || 'weekly';
    const period = ['daily', 'weekly', 'all', 'monthly'].includes(requestedPeriod)
      ? requestedPeriod
      : 'weekly';
    const useTotalPoints = period === 'all';
    const today = formatDateInAppTimezone(new Date());
    const weekStart = getWeekStartDateString(today);
    if (useTotalPoints) {
      try {
        const { data: topRows, error: topErr } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url, total_points')
          .order('total_points', { ascending: false })
          .order('id', { ascending: true })
          .limit(100);
        if (topErr) throw topErr;
        const { data: me } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url, total_points')
          .eq('id', req.userId)
          .single();
        const myPoints = Number(me?.total_points ?? 0);
        const { count, error: countErr } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gt('total_points', myPoints);
        res.json({
          top: assignCompetitionRanks((topRows ?? []).map((u: any) => ({
            id: u.id,
            firstName: u.first_name,
            lastName: u.last_name,
            avatarUrl: u.avatar_url,
            points: u.total_points ?? 0,
          }))),
          myRank: me && !countErr ? {
            rank: (count ?? 0) + 1,
            id: me.id,
            firstName: me.first_name,
            lastName: me.last_name,
            avatarUrl: me.avatar_url,
            points: myPoints,
          } : null,
        });
      } catch (e) {
        console.error('[api/leaderboard]', e);
        res.status(500).json({ error: 'Xatolik yuz berdi' });
      }
      return;
    }

    if (period === 'monthly') {
      const { data: top, error: topErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, monthly_points')
        .order('monthly_points', { ascending: false })
        .limit(100);
      if (topErr) {
        console.error('[api/leaderboard] top error:', topErr.message);
        return res.status(500).json({ error: topErr.message });
      }
      const { data: me, error: meErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, monthly_points')
        .eq('id', req.userId)
        .single();
      if (meErr || !me) {
        return res.json({ top: top ?? [], myRank: null });
      }
      const myPoints = me.monthly_points ?? 0;
      const { count, error: countErr } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('monthly_points', myPoints);
      const rank = countErr ? null : (count ?? 0) + 1;
      return res.json({
        top: assignCompetitionRanks((top ?? []).map((u: any) => ({
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          avatarUrl: u.avatar_url,
          points: u.monthly_points ?? 0,
        }))),
        myRank: rank == null ? null : {
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
      const periodFromEvents = await fetchPeriodLeaderboardFromEvents(supabase, req.userId, 'daily', today);
      if (periodFromEvents != null) {
        return res.json(periodFromEvents);
      }
      const { data: top, error: topErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, points, points_date')
        .eq('points_date', today)
        .gt('points', 0)
        .order('points', { ascending: false })
        .limit(100);
      if (topErr && !isMissingLeaderboardColumnError(topErr, 'points_date')) {
        console.error('[api/leaderboard] top error:', topErr.message);
        return res.status(500).json({ error: topErr.message });
      }
      if (topErr && isMissingLeaderboardColumnError(topErr, 'points_date')) {
        const { data: legacyTop, error: legacyTopErr } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url, points')
          .gt('points', 0)
          .order('points', { ascending: false })
          .limit(100);
        if (legacyTopErr) {
          console.error('[api/leaderboard] top error:', legacyTopErr.message);
          return res.status(500).json({ error: legacyTopErr.message });
        }
        const { data: legacyMe, error: legacyMeErr } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url, points')
          .eq('id', req.userId)
          .single();
        if (legacyMeErr || !legacyMe) {
          return res.json({ top: legacyTop ?? [], myRank: null });
        }
        const myPoints = legacyMe.points ?? 0;
        const { count, error: legacyCountErr } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gt('points', myPoints);
        const rank = legacyCountErr ? null : (count ?? 0) + 1;
        return res.json({
          top: assignCompetitionRanks((legacyTop ?? []).map((u: any) => ({
            id: u.id,
            firstName: u.first_name,
            lastName: u.last_name,
            avatarUrl: u.avatar_url,
            points: u.points ?? 0,
          }))),
          myRank: rank == null ? null : {
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
        .select('id, first_name, last_name, avatar_url, points, points_date')
        .eq('id', req.userId)
        .single();
      if (meErr || !me) {
        return res.json({ top: top ?? [], myRank: null });
      }
      const myPoints = getDailyPoints(me, today);
      const { count, error: countErr } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('points_date', today)
        .gt('points', myPoints > 0 ? myPoints : 0);
      const rank = countErr ? null : (count ?? 0) + 1;
      return res.json({
        top: assignCompetitionRanks((top ?? []).map((u: any) => ({
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          avatarUrl: u.avatar_url,
          points: u.points ?? 0,
        }))),
        myRank: rank == null ? null : {
          rank,
          id: me.id,
          firstName: me.first_name,
          lastName: me.last_name,
          avatarUrl: me.avatar_url,
          points: myPoints,
        },
      });
    }

    const periodFromEvents = await fetchPeriodLeaderboardFromEvents(supabase, req.userId, 'weekly', weekStart);
    if (periodFromEvents != null) {
      return res.json(periodFromEvents);
    }

    const { data: top, error: topErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url, weekly_points, weekly_points_week_start')
      .eq('weekly_points_week_start', weekStart)
      .gt('weekly_points', 0)
      .order('weekly_points', { ascending: false })
      .limit(100);
    if (topErr && !isMissingLeaderboardColumnError(topErr, 'weekly_points_week_start')) {
      console.error('[api/leaderboard] top error:', topErr.message);
      return res.status(500).json({ error: topErr.message });
    }
    if (topErr && isMissingLeaderboardColumnError(topErr, 'weekly_points_week_start')) {
      const { data: legacyTop, error: legacyTopErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, weekly_points')
        .gt('weekly_points', 0)
        .order('weekly_points', { ascending: false })
        .limit(100);
      if (legacyTopErr) {
        console.error('[api/leaderboard] top error:', legacyTopErr.message);
        return res.status(500).json({ error: legacyTopErr.message });
      }
      const { data: legacyMe, error: legacyMeErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, weekly_points')
        .eq('id', req.userId)
        .single();
      if (legacyMeErr || !legacyMe) {
        return res.json({ top: legacyTop ?? [], myRank: null });
      }
      const myPoints = legacyMe.weekly_points ?? 0;
      const { count, error: legacyCountErr } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('weekly_points', myPoints);
      const rank = legacyCountErr ? null : (count ?? 0) + 1;
      return res.json({
        top: assignCompetitionRanks((legacyTop ?? []).map((u: any) => ({
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          avatarUrl: u.avatar_url,
          points: u.weekly_points ?? 0,
        }))),
        myRank: rank == null ? null : {
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
      .select('id, first_name, last_name, avatar_url, weekly_points, weekly_points_week_start')
      .eq('id', req.userId)
      .single();
    if (meErr || !me) {
      return res.json({ top: top ?? [], myRank: null });
    }
    const myPoints = getWeeklyPoints(me, today);
    const { count, error: countErr } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('weekly_points_week_start', weekStart)
      .gt('weekly_points', myPoints > 0 ? myPoints : 0);
    const rank = countErr ? null : (count ?? 0) + 1;
    res.json({
      top: assignCompetitionRanks((top ?? []).map((u: any) => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        avatarUrl: u.avatar_url,
        points: u.weekly_points ?? 0,
      }))),
      myRank: rank == null ? null : {
        rank,
        id: me.id,
        firstName: me.first_name,
        lastName: me.last_name,
        avatarUrl: me.avatar_url,
        points: myPoints,
      },
    });
  });

  app.get('/api/leaderboard/me', authenticate, async (req: any, res) => {
    try {
      const pos = await leaderboardService.getMyPosition(supabase, req.userId);
      if (!pos) return res.status(404).json({ error: 'Reytingda topilmadi' });
      res.json({ rank: pos.rank, points: pos.points });
    } catch (e) {
      console.error('[api/leaderboard/me]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  app.post('/api/user/points', authenticate, async (req: any, res) => {
    const amount = Math.max(0, Number(req.body?.amount) || 0);
    if (amount === 0) return res.status(400).json({ error: 'amount kerak' });
    const today = formatDateInAppTimezone(new Date());
    try {
      const pointEventStatus = await insertPointEvent(supabase, {
        userId: req.userId,
        points: amount,
        source: 'manual_user_points',
        sourceRef: 'api/user/points',
        eventKey: req.body?.event_key ? String(req.body.event_key) : null,
        eventType: 'award',
        activityDate: today,
      });
      if (pointEventStatus === 'duplicate') {
        return res.json({ success: true, duplicate: true });
      }
    } catch (pointEventError) {
      console.error('[api/user/points] point event', pointEventError);
    }
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('points, points_date, weekly_points, weekly_points_week_start, monthly_points, total_points')
      .eq('id', req.userId)
      .single();
    if (fetchErr || !user) return res.status(404).json({ error: 'User topilmadi' });
    const nextPoints = buildPeriodicPointsUpdate(user, amount, today);
    const { error: updateErr } = await supabase
      .from('users')
      .update(nextPoints)
      .eq('id', req.userId);
    if (updateErr) {
      console.error('[api/user/points]', updateErr.message);
      return res.status(500).json({ error: updateErr.message });
    }
    const leaderboardSvc = await import('./server/services/leaderboard.service');
    const leaderboardCacheSvc = await import('./server/services/leaderboardCache.service');
    await leaderboardSvc.ensureUserInLeaderboard(supabase, req.userId);
    await leaderboardSvc.updateUserPoints(supabase, req.userId, nextPoints.total_points);
    await leaderboardCacheSvc.invalidateLeaderboardCache();
    res.json({ success: true, ...nextPoints });
  });

  // Lessons (freemium: locked flag, preview, protect full content)
  const { getAccessForRequest } = await import('./server/routes/accessRoutes');
  const accessControlService = await import('./server/services/accessControl.service');
  const lessonsCache = await import('./server/cache/lessonsCache');
  const lessonProgressSnapshotService = await import('./server/services/lessonProgressSnapshot.service');

  app.get('/api/lessons', authenticate, async (req: any, res) => {
    const userId = Number(req.userId);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
    const cached = lessonsCache.getCachedLessonsList(userId);
    if (cached != null) return res.json(cached);
    // NOTE: the `lessons` table has been removed from the DB (migration 022).
    // We now use the static LESSONS list from the frontend data file.
    const { LESSONS } = await import('./src/data/lessonsList.ts');
    const access = await getAccessForRequest(supabase, userId);
    const withLock = accessControlService.applyLessonsLock(
      LESSONS.map((l) => ({ id: l.id, title: l.title })),
      access
    );
    const list = withLock.map((l) => ({
      id: l.id,
      title: l.title,
      locked: l.locked,
    }));
    lessonsCache.setCachedLessonsList(userId, list);
    res.json(list);
  });

  app.get('/api/lessons/preview', authenticate, async (req: any, res) => {
    const raw = req.query.lesson_id ?? req.query.lessonId;
    const s = Array.isArray(raw) ? raw[0] : raw;
    const id = Number(typeof s === 'string' ? s.trim() : s);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'lesson_id query parameter required' });
    }
    const preview = await accessControlService.getLessonPreview(supabase, id);
    if (!preview) return res.status(404).json({ error: 'Dars topilmadi' });
    res.json(preview);
  });

  app.get('/api/lessons/:id/preview', authenticate, async (req: any, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid lesson id' });
    const preview = await accessControlService.getLessonPreview(supabase, id);
    if (!preview) return res.status(404).json({ error: 'Dars topilmadi' });
    res.json(preview);
  });

  app.get('/api/lessons/:lessonId/tasks/:taskNumber', authenticate, async (req: any, res) => {
    const userId = Number(req.userId);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
    const lessonId = Number(req.params.lessonId);
    const taskNumber = Number(req.params.taskNumber);
    if (!Number.isFinite(lessonId) || lessonId <= 0 || !Number.isFinite(taskNumber) || taskNumber <= 0) {
      return res.status(400).json({ error: 'lesson yoki task raqami noto‘g‘ri' });
    }
    const access = await getAccessForRequest(supabase, userId);
    if (!accessControlService.canAccessLesson(lessonId, access)) {
      return res.status(403).json({ error: 'locked', message: 'Ushbu dars uchun tarif kerak' });
    }
    const start = taskNumber * 1000;
    const end = start + 999;
    const { data, error } = await supabase
      .from('questions')
      .select('id,type,prompt,order_index,version,difficulty,skill,meta,question_content(content,answer)')
      .eq('lesson_id', lessonId)
      .eq('is_active', true)
      .gte('order_index', start)
      .lte('order_index', end)
      .order('order_index', { ascending: true });
    if (error) {
      console.error('[lessons/:id/tasks]', error.message);
      return res.status(500).json({ error: 'Savollar yuklanmadi' });
    }
    const items = (data ?? []).map((q: any) => {
      const payload = payloadFromQuestionContentEmbed(q.question_content);
      return {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        order_index: q.order_index,
        version: q.version ?? 1,
        difficulty: q.difficulty ?? 1,
        skill: q.skill ?? 'grammar',
        meta: q.meta ?? {},
        content: payload.content ?? {},
        answer: payload.answer ?? {},
      };
    });
    res.json(items);
  });

  /** Same data as `/api/lessons/:id/tasks/:n` — flat path for Vercel/proxies that mishandle nested lesson URLs. */
  app.get('/api/lesson-task-questions', authenticate, async (req: any, res) => {
    const userId = Number(req.userId);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
    const lessonId = Number(req.query.lesson_id);
    const taskNumber = Number(req.query.task_number);
    if (!Number.isFinite(lessonId) || lessonId <= 0 || !Number.isFinite(taskNumber) || taskNumber <= 0) {
      return res.status(400).json({ error: 'lesson_id va task_number kerak' });
    }
    const access = await getAccessForRequest(supabase, userId);
    if (!accessControlService.canAccessLesson(lessonId, access)) {
      return res.status(403).json({ error: 'locked', message: 'Ushbu dars uchun tarif kerak' });
    }
    const start = taskNumber * 1000;
    const end = start + 999;
    const { data, error } = await supabase
      .from('questions')
      .select('id,type,prompt,order_index,version,difficulty,skill,meta,question_content(content,answer)')
      .eq('lesson_id', lessonId)
      .eq('is_active', true)
      .gte('order_index', start)
      .lte('order_index', end)
      .order('order_index', { ascending: true });
    if (error) {
      console.error('[lesson-task-questions]', error.message);
      return res.status(500).json({ error: 'Savollar yuklanmadi' });
    }
    const items = (data ?? []).map((q: any) => {
      const payload = payloadFromQuestionContentEmbed(q.question_content);
      return {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        order_index: q.order_index,
        version: q.version ?? 1,
        difficulty: q.difficulty ?? 1,
        skill: q.skill ?? 'grammar',
        meta: q.meta ?? {},
        content: payload.content ?? {},
        answer: payload.answer ?? {},
      };
    });
    res.json(items);
  });

  app.get('/api/lessons/:id', authenticate, async (req: any, res) => {
    const id = Number(req.params.id);
    const userId = Number(req.userId);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
    const access = await getAccessForRequest(supabase, userId);
    if (!accessControlService.canAccessLesson(id, access)) {
      return res.status(403).json({ error: 'locked', message: 'Ushbu dars uchun tarif kerak' });
    }
    const { data: lesson, error: lessonErr } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();
    if (lessonErr || !lesson) return res.status(404).json({ error: 'Dars topilmadi' });
    const { data: exercises } = await supabase.from('exercises').select('*').eq('lesson_id', id);
    const exercisesParsed = (exercises ?? []).map((e: any) => ({
      ...e,
      options: typeof e.options === 'string' ? JSON.parse(e.options) : e.options,
    }));
    res.json({ ...lesson, exercises: exercisesParsed });
  });

  app.post('/api/lessons/:id/complete', authenticate, async (req: any, res) => {
    try {
      await lessonProgressSnapshotService.recordFullLessonPassInTaskResults(
        supabase,
        Number(req.userId),
        Number(req.params.id)
      );
    } catch (e) {
      console.error('[lessons/complete] lesson_task_results', e);
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
    const progress = await lessonProgressSnapshotService.syncUserLessonProgressPercent(
      supabase,
      Number(req.userId)
    );
    res.json({ success: true, progress });
  });

  app.get('/api/lessons/path/:encodedPath/tasks/:taskNumber', authenticate, async (req: any, res) => {
    const userId = Number(req.userId);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
    let lessonPath = '';
    try {
      lessonPath = decodeURIComponent(String(req.params.encodedPath));
    } catch {
      return res.status(400).json({ error: 'lessonPath noto‘g‘ri' });
    }
    const taskNumber = Number(req.params.taskNumber);
    const lessonIdMatch = lessonPath.match(/\/lesson-(\d+)/);
    const lessonId = lessonIdMatch ? Number(lessonIdMatch[1]) : null;
    if (!lessonId || !Number.isFinite(taskNumber) || taskNumber <= 0) {
      return res.status(400).json({ error: 'lessonPath yoki taskNumber noto‘g‘ri' });
    }
    const access = await getAccessForRequest(supabase, userId);
    if (!accessControlService.canAccessLesson(lessonId, access)) {
      return res.status(403).json({ error: 'locked', message: 'Ushbu dars uchun tarif kerak' });
    }
    const start = taskNumber * 1000;
    const end = start + 999;
    const { data, error } = await supabase
      .from('questions')
      .select('id,type,prompt,order_index,version,difficulty,skill,meta,question_content(content,answer)')
      .eq('lesson_id', lessonId)
      .eq('is_active', true)
      .gte('order_index', start)
      .lte('order_index', end)
      .order('order_index', { ascending: true });
    if (error) {
      console.error('[lessons/path/tasks]', error.message);
      return res.status(500).json({ error: 'Savollar yuklanmadi' });
    }
    const items = (data ?? []).map((q: any) => {
      const payload = payloadFromQuestionContentEmbed(q.question_content);
      return {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        order_index: q.order_index,
        version: q.version ?? 1,
        difficulty: q.difficulty ?? 1,
        skill: q.skill ?? 'grammar',
        meta: q.meta ?? {},
        content: payload.content ?? {},
        answer: payload.answer ?? {},
      };
    });
    res.json(items);
  });

  app.get('/api/grammar/catalog', authenticate, async (req: any, res) => {
    const userId = Number(req.userId);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
    const result = await buildGrammarCatalogPayload(supabase, userId);
    if (result.ok === false) return res.status(500).json({ error: result.error });
    res.json(result.payload);
  });

  // Vocabulary
  app.get('/api/vocabulary', authenticate, async (req: any, res) => {
    const { data: words, error } = await supabase.from('vocabulary').select('*').eq('user_id', req.userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json(words ?? []);
  });

  app.post('/api/vocabulary', authenticate, async (req: any, res) => {
    const { word_ru, translation_uz, example_ru } = req.body;
    const { error } = await supabase.from('vocabulary').insert({
      user_id: req.userId,
      word_ru,
      translation_uz,
      example_ru,
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // ---------------------------------------------------------------------------
  // Partner (Naparnik) routes — delegate to the same handler used by Vercel
  // ---------------------------------------------------------------------------
  app.use('/api/partner', authenticate, async (req: any, res) => {
    const userId = req.userId as number;
    const access = await getAccessInfo(supabase, userId);
    if (!access.subscription_active) return res.status(403).json({ error: 'Obuna kerak' });

    const fullPath = (req.originalUrl || req.url || '').split('?')[0];
    const segments = fullPath.replace(/^\/api\/partner\/?/, '').split('/').filter(Boolean);
    const s0 = segments[0];
    const s1 = segments[1];
    const s2 = segments[2];

    try {
      if (s0 === 'status' && req.method === 'GET') {
        const [profileRes, matchRes, outgoingRes, incomingRes] = await Promise.all([
          supabase.from('partner_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
          supabase.from('partner_matches').select('id, user1_id, user2_id, matched_at')
            .eq('status', 'active').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).maybeSingle(),
          supabase.from('partner_requests').select('id, receiver_id, created_at')
            .eq('sender_id', userId).eq('status', 'pending').maybeSingle(),
          supabase.from('partner_requests').select('id').eq('receiver_id', userId).eq('status', 'pending'),
        ]);
        let partnerProfile = null;
        if (matchRes.data) {
          const partnerId = matchRes.data.user1_id === userId ? matchRes.data.user2_id : matchRes.data.user1_id;
          const { data } = await supabase.from('partner_profiles')
            .select('user_id, display_name, age, gender, language_level, goal, about')
            .eq('user_id', partnerId).maybeSingle();
          partnerProfile = data;
        }
        return res.json({
          hasProfile: !!profileRes.data,
          match: matchRes.data ? { ...matchRes.data, partner_profile: partnerProfile } : null,
          outgoingRequest: outgoingRes.data ?? null,
          incomingRequestsCount: (incomingRes.data ?? []).length,
        });
      }

      if (s0 === 'profile' && req.method === 'GET') {
        const { data } = await supabase.from('partner_profiles').select('*').eq('user_id', userId).maybeSingle();
        return res.json(data);
      }
      if (s0 === 'profile' && req.method === 'POST') {
        const { display_name, age, gender, language_level, goal, about = '', seeking = '' } = req.body;
        const { data, error } = await supabase.from('partner_profiles')
          .upsert({ user_id: userId, display_name, age: Number(age), gender, language_level, goal, about, seeking, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
          .select().single();
        if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });
        return res.json(data);
      }
      if (s0 === 'people' && req.method === 'GET') {
        const { data: activeMatch } = await supabase.from('partner_matches').select('id')
          .eq('status', 'active').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).maybeSingle();
        if (activeMatch) return res.json([]);
        const { data } = await supabase.from('partner_profiles')
          .select('user_id, display_name, age, gender, language_level, goal, about, seeking')
          .neq('user_id', userId).order('created_at', { ascending: false }).limit(50);
        return res.json(data ?? []);
      }
      if (s0 === 'request' && !s1 && req.method === 'POST') {
        const receiverId = Number(req.body.receiver_id);
        const { data } = await supabase.from('partner_requests')
          .insert({ sender_id: userId, receiver_id: receiverId }).select().single();
        return res.status(201).json(data);
      }
      if ((s0 === 'requests' && s1 === 'incoming' || s0 === 'incoming-requests') && req.method === 'GET') {
        const { data } = await supabase.from('partner_requests')
          .select('id, sender_id, status, created_at')
          .eq('receiver_id', userId).eq('status', 'pending').order('created_at', { ascending: false });
        const senderIds = (data ?? []).map((r: any) => r.sender_id);
        const profiles: Record<number, any> = {};
        if (senderIds.length) {
          const { data: profs } = await supabase.from('partner_profiles')
            .select('user_id, display_name, age, language_level, goal, about').in('user_id', senderIds);
          for (const p of profs ?? []) profiles[p.user_id] = p;
        }
        return res.json((data ?? []).map((r: any) => ({ ...r, sender_profile: profiles[r.sender_id] ?? null })));
      }
      if (s0 === 'request' && s1 && s2 === 'accept' && req.method === 'POST') {
        const requestId = Number(s1);
        const { data: rq } = await supabase.from('partner_requests').select('id, sender_id, receiver_id, status')
          .eq('id', requestId).eq('receiver_id', userId).maybeSingle();
        if (!rq || rq.status !== 'pending') return res.status(404).json({ error: 'Topilmadi' });
        await supabase.from('partner_requests').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', requestId);
        await supabase.from('partner_requests').update({ status: 'rejected', responded_at: new Date().toISOString() })
          .eq('status', 'pending').or(`sender_id.eq.${rq.sender_id},sender_id.eq.${userId},receiver_id.eq.${rq.sender_id},receiver_id.eq.${userId}`).neq('id', requestId);
        const { data: match } = await supabase.from('partner_matches').insert({ user1_id: rq.sender_id, user2_id: userId }).select().single();
        return res.json(match);
      }
      if (s0 === 'accept-request' && req.method === 'POST') {
        const requestId = Number(req.query.id);
        const { data: rq } = await supabase.from('partner_requests').select('id, sender_id, receiver_id, status')
          .eq('id', requestId).eq('receiver_id', userId).maybeSingle();
        if (!rq || rq.status !== 'pending') return res.status(404).json({ error: 'Topilmadi' });
        await supabase.from('partner_requests').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', requestId);
        await supabase.from('partner_requests').update({ status: 'rejected', responded_at: new Date().toISOString() })
          .eq('status', 'pending').or(`sender_id.eq.${rq.sender_id},sender_id.eq.${userId},receiver_id.eq.${rq.sender_id},receiver_id.eq.${userId}`).neq('id', requestId);
        const { data: match } = await supabase.from('partner_matches').insert({ user1_id: rq.sender_id, user2_id: userId }).select().single();
        return res.json(match);
      }
      if (s0 === 'request' && s1 && s2 === 'reject' && req.method === 'POST') {
        await supabase.from('partner_requests').update({ status: 'rejected', responded_at: new Date().toISOString() }).eq('id', Number(s1)).eq('receiver_id', userId);
        return res.json({ success: true });
      }
      if (s0 === 'reject-request' && req.method === 'POST') {
        await supabase.from('partner_requests').update({ status: 'rejected', responded_at: new Date().toISOString() }).eq('id', Number(req.query.id)).eq('receiver_id', userId);
        return res.json({ success: true });
      }
      if (s0 === 'match' && !s1 && req.method === 'GET') {
        const { data: match } = await supabase.from('partner_matches').select('id, user1_id, user2_id, status, matched_at')
          .eq('status', 'active').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).maybeSingle();
        if (!match) return res.json(null);
        const partnerId = match.user1_id === userId ? match.user2_id : match.user1_id;
        const { data: profile } = await supabase.from('partner_profiles')
          .select('user_id, display_name, age, gender, language_level, goal, about').eq('user_id', partnerId).maybeSingle();
        return res.json({ ...match, partner_profile: profile });
      }
      if ((s0 === 'match' && s1 === 'end' || s0 === 'end-match') && req.method === 'POST') {
        const { data: match } = await supabase.from('partner_matches').select('id')
          .eq('status', 'active').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).maybeSingle();
        if (!match) return res.status(404).json({ error: 'Topilmadi' });
        await supabase.from('partner_matches').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', match.id);
        return res.json({ success: true });
      }
      if (s0 === 'messages' && req.method === 'GET') {
        const matchId = Number(req.query.match_id);
        let q = supabase.from('chat_messages').select('id, match_id, sender_id, content, created_at')
          .eq('match_id', matchId).order('created_at', { ascending: false }).limit(50);
        if (req.query.before) q = q.lt('created_at', String(req.query.before));
        const { data } = await q;
        return res.json((data ?? []).reverse());
      }
      if (s0 === 'messages' && req.method === 'POST') {
        const { match_id, content } = req.body;
        const { data } = await supabase.from('chat_messages')
          .insert({ match_id: Number(match_id), sender_id: userId, content: String(content).trim() }).select().single();
        return res.status(201).json(data);
      }
      return res.status(404).json({ error: 'Not found' });
    } catch (e) {
      console.error('[partner]', e);
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  // Lesson task results (e.g. /lesson-14 topshiriq 1–16)
  app.get('/api/lesson-task-results', authenticate, async (req: any, res) => {
    const lessonPath = req.query.lesson_path as string | undefined;
    let q = supabase
      .from('lesson_task_results')
      .select('lesson_path, task_number, correct, total')
      .eq('user_id', req.userId);
    if (lessonPath) q = q.eq('lesson_path', lessonPath);
    const { data: rows, error } = await q;
    if (error) {
      console.error('[api/lesson-task-results] GET error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    res.json(rows ?? []);
  });

  app.post('/api/lesson-task-results', authenticate, async (req: any, res) => {
    const { lesson_path, task_number, correct, total } = req.body;
    if (!lesson_path || task_number == null) {
      return res.status(400).json({ error: 'lesson_path va task_number kerak' });
    }
    const lessonPath = String(lesson_path);
    const taskNumber = Number(task_number);
    const correctCount = Number(correct) || 0;
    const totalCount = Number(total) || 0;
    const { calculateImprovementDelta } = await import('./server/services/scoringRules.service');
    const { data: prevRow } = await supabase
      .from('lesson_task_results')
      .select('correct, total')
      .eq('user_id', req.userId)
      .eq('lesson_path', lessonPath)
      .eq('task_number', taskNumber)
      .maybeSingle();
    const prev =
      prevRow != null && prevRow.correct != null && prevRow.total != null
        ? { correct: Number(prevRow.correct), total: Number(prevRow.total) }
        : null;
    if (shouldPreservePreviousLessonTaskResult(prev, correctCount, totalCount)) {
      return res.json({ success: true, preserved: true });
    }
    const prevCorrect = Number(prevRow?.correct ?? 0);
    const delta = calculateImprovementDelta(prevCorrect, correctCount);
    if (delta > 0) {
      const today = formatDateInAppTimezone(new Date());
      try {
        const pointEventStatus = await insertPointEvent(supabase, {
          userId: req.userId,
          points: delta,
          source: 'lesson_task_result',
          sourceRef: `${lessonPath}#${taskNumber}`,
          eventKey: `lesson_task_result:${req.userId}:${lessonPath}:${taskNumber}:correct:${correctCount}`,
          eventType: 'award',
          activityDate: today,
        });
        if (pointEventStatus !== 'duplicate') {
          const { data: user } = await supabase
            .from('users')
            .select('points, points_date, weekly_points, weekly_points_week_start, monthly_points, total_points')
            .eq('id', req.userId)
            .single();
          if (user) {
            const nextPoints = buildPeriodicPointsUpdate(user, delta, today);
            await supabase
              .from('users')
              .update(nextPoints)
              .eq('id', req.userId);
            const leaderboardSvc = await import('./server/services/leaderboard.service');
            const leaderboardCacheSvc = await import('./server/services/leaderboardCache.service');
            await leaderboardSvc.ensureUserInLeaderboard(supabase, req.userId);
            await leaderboardSvc.updateUserPoints(supabase, req.userId, nextPoints.total_points);
            await leaderboardCacheSvc.invalidateLeaderboardCache();
          }
        }
      } catch (pointEventError) {
        console.error('[api/lesson-task-results] point event', pointEventError);
      }
    }
    const row = {
      user_id: req.userId,
      lesson_path: lessonPath,
      task_number: taskNumber,
      correct: correctCount,
      total: totalCount,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('lesson_task_results').upsert(row, {
      onConflict: 'user_id,lesson_path,task_number',
    });
    if (error) {
      console.error('[api/lesson-task-results] POST error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  });

  // Vite / static
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const { startLeaderboardCron } = await import('./server/services/leaderboardCron.service');
  startLeaderboardCron(supabase);

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log('Server running on http://localhost:' + port);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
