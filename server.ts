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
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServer, isSupabaseTimeoutError } from './server/lib/createSupabaseServer.ts';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Busboy from 'busboy';
import path from 'path';
import { fileURLToPath } from 'url';
import { courseData } from './src/data/courseData.ts';
import { buildRequestLogContext, createRequestId, logError, logInfo } from './server/lib/logger.ts';
import { ensureSupportChatForUser } from './server/lib/ensureSupportChat.ts';
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
import { parseContactIdentifier, sanitizePhoneRaw } from './shared/authIdentifiers.ts';

const AUTH_USER_SELECT =
  'id, first_name, last_name, email, phone, password, level, onboarded, plan_name, plan_expires_at';
import { applyUserAccountPatch } from './shared/userAccountPatch.ts';
import { isPaymentsProductCodeSchemaError } from './shared/paymentsCompat.ts';
import { shouldPreservePreviousLessonTaskResult } from './shared/lessonTaskPassing.ts';
import { resolvePaymentProductFromRow } from './shared/paymentsProofUrl.ts';
import { listPatentVariantResults, persistPatentVariantResult } from './shared/patentVariantResultsDb.ts';
import { findOrCreateUserForSocial, SocialAuthError, verifyGoogleIdToken } from './server/services/socialAuth.service.ts';
import { resolveGoogleWebClientId } from './shared/googleOAuth.ts';
import { buildGrammarCatalogPayload } from './server/services/grammarCatalog.service.ts';
import {
  DAILY_COURSE_BUNDLE_FETCH_REV,
  fetchDailyCourseDayBundle,
} from './server/services/dailyCourseBundle.service.ts';
import {
  DAILY_COURSE_DAY_MAX,
  DAILY_COURSE_DAY_MIN,
  isFreeKunlikSpeakingDay,
  isValidDailyCourseDay,
} from './shared/dailyCourseDay.ts';
import { payloadFromQuestionContentEmbed } from './shared/questionContentPayload.ts';
import { getAccessInfo, getActiveSubscription } from './server/services/subscription.service.ts';
import { mergeRussianPlanForMeResponse } from './shared/russianProfilePlan.ts';
import { createIpRateLimitMiddleware, enforceRateLimit } from './server/lib/rateLimit.ts';
import { routePartnerRequest } from './server/services/partner.service.ts';
import { createClickMerchantRoutes, createPaymentRoutes } from './server/routes/paymentRoutes.ts';
import { runClickAutoRenewalCron } from './server/services/clickCardToken.service.ts';
import { runClickFiscalRetryCron } from './server/services/clickFiscal.service.ts';
import { resolveRussianTariffQuote } from './server/services/promoPricing.service.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase: SupabaseClient = createSupabaseServer(supabaseUrl, supabaseServiceKey);

const jwtSecretEnv = process.env.JWT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';
const TOKEN_TTL_SECONDS = Number(process.env.JWT_EXPIRES_SECONDS || 60 * 60 * 24 * 7);
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 10;
const GLOBAL_WINDOW_MS = 60 * 1000;
const GLOBAL_MAX_REQUESTS = 180;

if (!jwtSecretEnv || jwtSecretEnv.length < 32) {
  console.error('JWT_SECRET must be set to a strong value (>=32 chars)');
  process.exit(1);
}
const JWT_SECRET = jwtSecretEnv;
const HELP_CHAT_MEDIA_BUCKET = 'help-chat-media';
const HELP_CHAT_ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const HELP_CHAT_MAX_SIZE = 4 * 1024 * 1024; // 4 MB
const HELP_IMAGE_PREFIX = '__image__:';
const USER_PROFILE_SELECT_FULL =
  'id, first_name, last_name, email, phone, level, onboarded, progress, total_points, plan_name, plan_expires_at, billing_notice_uz';
const USER_PROFILE_SELECT_LEGACY =
  'id, first_name, last_name, email, phone, level, onboarded, progress';

function isUserProfileSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? (error as { code?: unknown }).code : null;
  const message = 'message' in error ? (error as { message?: unknown }).message : '';
  if (typeof code === 'string' && (code === 'PGRST204' || code === 'PGRST205')) return true;
  return typeof message === 'string' && message.toLowerCase().includes('schema cache');
}

function isSupabaseNoRowsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? (error as { code?: unknown }).code : null;
  return code === 'PGRST116';
}

function isLessonTaskResultsSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === 'PGRST204' ||
    message.includes('lesson_task_results') ||
    message.toLowerCase().includes('schema cache')
  );
}

async function fetchUserProfileById(userId: number) {
  let { data: user, error } = await supabase.from('users').select(USER_PROFILE_SELECT_FULL).eq('id', userId).maybeSingle();
  if (error && (isUserProfileSchemaError(error) || !isSupabaseNoRowsError(error))) {
    const legacy = await supabase.from('users').select(USER_PROFILE_SELECT_LEGACY).eq('id', userId).maybeSingle();
    user = legacy.data as typeof user;
    error = legacy.error;
  }
  return { user, error };
}

function mapUserProfile(user: Record<string, any>) {
  return {
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
    billingNoticeUz: user.billing_notice_uz ?? null,
  };
}

async function mergeProfileWithActiveSubscription(
  userId: number,
  profile: ReturnType<typeof mapUserProfile>
): Promise<ReturnType<typeof mapUserProfile>> {
  try {
    const sub = await getActiveSubscription(supabase, userId);
    const { planName, planExpiresAt } = mergeRussianPlanForMeResponse({
      planName: profile.planName,
      planExpiresAt: profile.planExpiresAt,
      subscription: sub ? { plan_type: sub.plan_type, expires_at: sub.expires_at } : null,
    });
    return { ...profile, planName, planExpiresAt };
  } catch (e) {
    console.error('[mergeProfileWithActiveSubscription]', e);
    return profile;
  }
}

// IP-based rate limiting now lives in server/lib/rateLimit.ts and is
// backed by Redis when REDIS_URL is set, with an in-memory LRU fallback.
// The old in-process Map limiter was unsafe behind a load balancer
// (each replica had its own counter, and the Map grew unbounded).

// Seed lessons and exercises from courseData if table is empty (dev / explicit opt-in only).
async function seedDatabase() {
  if (isProduction && process.env.ENABLE_DB_SEED !== '1') {
    console.log('[seed] skipped in production (set ENABLE_DB_SEED=1 to run on boot)');
    return;
  }

  const countResult = await Promise.race([
    supabase.from('lessons').select('*', { count: 'exact', head: true }),
    new Promise<{ count: null; error: { message: string } }>((resolve) => {
      setTimeout(
        () => resolve({ count: null, error: { message: 'lessons count timeout (10s)' } }),
        10_000
      );
    }),
  ]);
  const { count, error: countError } = countResult;
  if (countError) {
    console.warn('[seed] count check failed, skipping:', countError.message);
    return;
  }
  if ((count ?? 0) > 0) return;

  console.log('[seed] Seeding database...');
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
  console.log('[seed] Database seeded successfully.');
}

async function startServer() {
  await seedDatabase();

  const app = express();
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  const globalRateLimiter = createIpRateLimitMiddleware(
    'global',
    GLOBAL_WINDOW_MS / 1000,
    GLOBAL_MAX_REQUESTS
  );
  const authRateLimiter = createIpRateLimitMiddleware(
    'auth',
    AUTH_WINDOW_MS / 1000,
    AUTH_MAX_ATTEMPTS,
    'Juda koʻp urinish. Bir necha daqiqadan keyin qayta urinib koʻring.'
  );
  // Voice answers are sent as base64 JSON payloads; keep limit above default.
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    const rawUrl = String(req.originalUrl || req.url || '');
    let decodedUrl = rawUrl;
    try {
      decodedUrl = decodeURIComponent(rawUrl);
    } catch {
      // keep raw URL when decode fails
    }
    const normalized = decodedUrl.toLowerCase();
    const blocked = ['.env', '.git'];
    if (blocked.some((segment) => normalized.includes(segment))) {
      return res.status(403).send('Forbidden');
    }
    return next();
  });
  app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));
  app.use((req, res, next) => {
    const url = String(req.originalUrl || req.url || '');
    // Apply rate limits only for API calls.
    if (!url.startsWith('/api/')) {
      return next();
    }
    // Help chat long-polling can be frequent; avoid blocking message sends with global 429.
    if (url.startsWith('/api/help/') || url.startsWith('/api/admin/help/')) {
      return next();
    }
    return globalRateLimiter(req, res, next);
  });
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const origin = process.env.CORS_ORIGIN;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Prevent stale API responses (e.g. old 410 from disk cache) from being reused by browsers.
    if (String(req.originalUrl || req.url || '').startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
    // Ovozli javob (Speaking, kunlik gapirish) uchun `microphone=(self)` kerak; `()` butunlay taqiqlaydi.
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; script-src 'self' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; connect-src 'self' https:; frame-src https://accounts.google.com; frame-ancestors 'none';"
      );
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  // Standalone /api/vocabulary/* and /api/support/* used to be 410'd here
  // as a soft-deprecation gate while the kunlik refactor was in flight.
  // Both routes are gone now (handlers deleted, frontend stopped calling
  // them), so we let Express fall through to a normal 404.
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

  app.get('/api/health', async (_req, res) => {
    const started = Date.now();
    try {
      const probe = await Promise.race([
        supabase.from('users').select('id', { head: true, count: 'exact' }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('supabase probe timeout')), 5_000)
        ),
      ]);
      if (probe.error) {
        return res.status(503).json({
          ok: false,
          error: probe.error.message,
          durationMs: Date.now() - started,
        });
      }
      return res.json({
        ok: true,
        durationMs: Date.now() - started,
        dailyCourseFetch: DAILY_COURSE_BUNDLE_FETCH_REV,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(503).json({ ok: false, error: message, durationMs: Date.now() - started });
    }
  });

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

  // Public tariff prices by currency (no auth) — month, year
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
      res.json({ month: out.month, year: out.year });
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
  app.post('/api/auth/register', authRateLimiter, async (req, res) => {
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
      const insertRow: Record<string, unknown> = {
        first_name: firstName ?? '',
        last_name: lastName ?? '',
        email: parsed.email,
        phone: parsed.phone,
        password: hashedPassword,
        onboarded: 1,
      };
      if (parsed.phone) {
        insertRow.phone_raw = sanitizePhoneRaw(contactRaw);
        insertRow.phone_normalized = parsed.phone;
        insertRow.country_code = parsed.phoneCountryIso ?? null;
        insertRow.phone_verified = false;
        insertRow.phone_invalid = false;
      }
      const { data: user, error } = await supabase
        .from('users')
        .insert(insertRow)
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
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
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

  app.post('/api/auth/login', authRateLimiter, async (req, res) => {
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
    let user: Record<string, unknown> | null = null;
    let lookupErr: { message: string } | null = null;

    if (parsed.email) {
      const r = await supabase.from('users').select(AUTH_USER_SELECT).eq('email', parsed.email).maybeSingle();
      lookupErr = r.error ?? null;
      user = (r.data as Record<string, unknown>) ?? null;
    } else {
      const ph = parsed.phone!;
      const first = await supabase.from('users').select(AUTH_USER_SELECT).eq('phone_normalized', ph).maybeSingle();
      if (first.error) {
        lookupErr = first.error;
      } else if (first.data) {
        user = first.data as Record<string, unknown>;
      } else {
        const second = await supabase.from('users').select(AUTH_USER_SELECT).eq('phone', ph).maybeSingle();
        lookupErr = second.error ?? null;
        user = (second.data as Record<string, unknown>) ?? null;
      }
    }

    if (lookupErr) {
      console.error('[login]', lookupErr.message);
      if (isSupabaseTimeoutError(lookupErr)) {
        return res.status(503).json({
          error: 'Server vaqtincha band. Bir necha soniyadan keyin qayta urinib ko‘ring.',
        });
      }
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }

    if (!user || !(await bcrypt.compare(password, user.password as string))) {
      return res.status(401).json({ error: "Email, telefon yoki parol noto'g'ri" });
    }
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
    const sub = await getActiveSubscription(supabase, Number(user.id));
    const planFields = mergeRussianPlanForMeResponse({
      planName: (user.plan_name as string | null | undefined) ?? null,
      planExpiresAt: (user.plan_expires_at as string | null | undefined) ?? null,
      subscription: sub ? { plan_type: sub.plan_type, expires_at: sub.expires_at } : null,
    });
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
        planName: planFields.planName,
        planExpiresAt: planFields.planExpiresAt,
      },
    });
  });

  // GET /api/auth/google/client-id — let the SPA discover the OAuth client id
  // without it being baked into the build (fallback when VITE_ env is missing).
  app.get('/api/auth/google/client-id', (_req, res) => {
    const clientId = resolveGoogleWebClientId({
      GOOGLE_OAUTH_WEB_CLIENT_ID: process.env.GOOGLE_OAUTH_WEB_CLIENT_ID,
      GOOGLE_OAUTH_SERVER_CLIENT_ID: process.env.GOOGLE_OAUTH_SERVER_CLIENT_ID,
    });
    res.json({ clientId });
  });

  // POST /api/auth/google — verify the Google ID token, find/create the local
  // user, return the same `{ token, user }` shape as /api/auth/login.
  app.post('/api/auth/google', authRateLimiter, async (req, res) => {
    const idToken = typeof req.body?.idToken === 'string' ? req.body.idToken.trim() : '';
    if (!idToken) {
      return res.status(400).json({ error: 'idToken kerak' });
    }
    try {
      const identity = await verifyGoogleIdToken(idToken);
      const { user } = await findOrCreateUserForSocial(supabase, identity);
      const userId = Number((user as { id: number }).id);
      const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
      const sub = await getActiveSubscription(supabase, userId);
      const planFields = mergeRussianPlanForMeResponse({
        planName: (user.plan_name as string | null | undefined) ?? null,
        planExpiresAt: (user.plan_expires_at as string | null | undefined) ?? null,
        subscription: sub ? { plan_type: sub.plan_type, expires_at: sub.expires_at } : null,
      });
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
          planName: planFields.planName,
          planExpiresAt: planFields.planExpiresAt,
        },
      });
    } catch (err) {
      if (err instanceof SocialAuthError) {
        const causeMessage = err.cause instanceof Error ? err.cause.message : err.cause ? String(err.cause) : '';
        console.error('[auth/google]', err.publicMessage, causeMessage ? `cause=${causeMessage}` : '');
        return res.status(err.httpStatus).json({ error: err.publicMessage });
      }
      console.error('[auth/google]', err);
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Ruxsat berilmagan' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      const rawId = decoded.id ?? decoded.sub;
      const userId = Number(rawId);
      if (!Number.isFinite(userId) || userId < 1) return res.status(401).json({ error: 'Yaroqsiz token' });
      req.userId = userId;
      next();
    } catch (e) {
      res.status(401).json({ error: 'Yaroqsiz token' });
    }
  };

  app.get('/api/user/tariff-prices', authenticate, async (req: any, res) => {
    const currency = (req.query.currency as string)?.toUpperCase();
    if (!currency || !['UZS', 'RUB', 'USD'].includes(currency)) {
      return res.status(400).json({ error: 'currency kerak: UZS, RUB, USD' });
    }
    const startPromo = String(req.query.start_promo ?? '') === '1';
    try {
      const month = await resolveRussianTariffQuote(supabase, {
        userId: req.userId,
        currency: currency as 'UZS' | 'RUB' | 'USD',
        tariffType: 'month',
        startPromoIfMissing: startPromo,
      });
      const year = await resolveRussianTariffQuote(supabase, {
        userId: req.userId,
        currency: currency as 'UZS' | 'RUB' | 'USD',
        tariffType: 'year',
        startPromoIfMissing: startPromo,
      });
      return res.json({
        currency,
        month: month.finalAmount,
        year: year.finalAmount,
        quotes: {
          month: {
            base_amount: month.baseAmount,
            final_amount: month.finalAmount,
            discount_amount: month.discountAmount,
          },
          year: {
            base_amount: year.baseAmount,
            final_amount: year.finalAmount,
            discount_amount: year.discountAmount,
          },
        },
        promo: {
          started_at: month.promo.startedAt,
          expires_at: month.promo.expiresAt,
          is_active: month.promo.isActive,
          remaining_sec: month.promo.remainingSec,
        },
      });
    } catch (e) {
      console.error('[GET /api/user/tariff-prices]', e);
      return res.status(500).json({ error: 'Xatolik' });
    }
  });

  app.all('/api/cron/click-auto-pay', async (req: any, res: any) => {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const secret = process.env.CLICK_CRON_SECRET || process.env.CRON_SECRET;
    const auth = req.headers.authorization;
    if (!secret || auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const result = await runClickAutoRenewalCron(supabase);
      return res.json(result);
    } catch (e) {
      console.error('[cron/click-auto-pay]', e);
      return res.status(500).json({ error: 'Cron failed' });
    }
  });

  app.all('/api/cron/click-fiscal-retry', async (req: any, res: any) => {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const secret = process.env.CLICK_CRON_SECRET || process.env.CRON_SECRET;
    const auth = req.headers.authorization;
    if (!secret || auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const result = await runClickFiscalRetryCron(supabase);
      return res.json(result);
    } catch (e) {
      console.error('[cron/click-fiscal-retry]', e);
      return res.status(500).json({ error: 'Cron failed' });
    }
  });

  // Payment submission (manual proof + Click)
  app.use('/api/payments', createPaymentRoutes(supabase, authenticate));
  app.use('/api/click', createClickMerchantRoutes(supabase));

  // Activity / streak (Ketma-ket kunlar)
  const { createActivityRoutes } = await import('./server/routes/activityRoutes');
  app.use('/api', createActivityRoutes(supabase, authenticate));

  // Kunlik reja block completions (single table for all blocks)
  const { createKunlikProgressRoutes } = await import('./server/routes/kunlikProgressRoutes');
  app.use('/api', createKunlikProgressRoutes(supabase, authenticate));

  // Statistics (course progress, activity calendar, record-course-day)
  const { createStatsRoutes } = await import('./server/routes/statsRoutes');
  app.use('/api', createStatsRoutes(supabase, authenticate));

  // Referral (referral link, stats, list, withdraw, discount, payments)
  const { createReferralRoutes } = await import('./server/routes/referralRoutes');
  app.use('/api', createReferralRoutes(supabase, authenticate));

  // Access (freemium: GET /user/access)
  const { createAccessRoutes } = await import('./server/routes/accessRoutes');
  app.use('/api', createAccessRoutes(supabase, authenticate));

  // User
  app.get('/api/user/me', authenticate, async (req: any, res) => {
    const { user, error } = await fetchUserProfileById(req.userId);
    if (error || !user) {
      if (error && !isSupabaseNoRowsError(error)) {
        return res.status(500).json({ error: 'Profilni yuklab bo‘lmadi' });
      }
      return res.status(404).json({ error: 'User topilmadi' });
    }
    const profile = mapUserProfile(user);
    res.json(await mergeProfileWithActiveSubscription(req.userId, profile));
  });

  app.patch('/api/user/account', authenticate, async (req: any, res) => {
    const result = await applyUserAccountPatch(supabase, req.userId, req.body ?? {});
    if (result.ok === false) {
      return res.status(result.status).json({ error: result.error });
    }
    const { user, error } = await fetchUserProfileById(req.userId);
    if (error || !user) {
      if (error && !isSupabaseNoRowsError(error)) {
        return res.status(500).json({ error: 'Profilni yuklab bo‘lmadi' });
      }
      return res.status(404).json({ error: 'User topilmadi' });
    }
    const profile = mapUserProfile(user);
    res.json(await mergeProfileWithActiveSubscription(req.userId, profile));
  });

  app.post('/api/user/onboard', authenticate, async (req: any, res) => {
    const { level } = req.body;
    await supabase.from('users').update({ level, onboarded: 1 }).eq('id', req.userId);
    res.json({ success: true });
  });

  app.get('/api/user/payments', authenticate, async (req: any, res) => {
    try {
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
      if (error) {
        const msg =
          error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string'
            ? (error as { message: string }).message
            : 'Xatolik';
        return res.status(500).json({ error: msg });
      }
      res.json(
        (rows ?? []).map((row: any) => ({
          ...row,
          product_code: resolvePaymentProductFromRow(row),
        }))
      );
    } catch (e) {
      console.error('[GET /api/user/payments]', e);
      const msg =
        e instanceof Error
          ? e.message
          : e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
            ? (e as { message: string }).message
            : 'Xatolik';
      if (!res.headersSent) res.status(500).json({ error: msg });
    }
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
    if (!plan_type || !['monthly', 'yearly'].includes(plan_type)) {
      return res.status(400).json({ error: 'plan_type kerak: monthly, yearly' });
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

  // /api/support was removed when standalone support flow was replaced by
  // the help-chat (/api/help/chats/*). The route was already gated by 410
  // middleware above; the handler below is dead and has been removed.

  function isMissingSupportChatSchemaError(error: unknown): boolean {
    const message = typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : String(error ?? '');
    return message.includes('support_chats') || message.includes('support_chat_messages');
  }

  app.get('/api/help/chats', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const chatId = await ensureSupportChatForUser(supabase, userId);

      const [{ data: chat, error: chatErr }, { data: lastRows, error: lastErr }, { count, error: countErr }] = await Promise.all([
        supabase
          .from('support_chats')
          .select('id, status, created_at, updated_at, last_message_at, user_last_read_at')
          .eq('id', chatId)
          .single(),
        supabase
          .from('support_chat_messages')
          .select('id, content, sender_type, created_at')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('support_chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chatId)
          .eq('sender_type', 'admin')
          .gt('created_at', new Date(0).toISOString()),
      ]);

      if (chatErr) return res.status(500).json({ error: chatErr.message });
      if (lastErr) return res.status(500).json({ error: lastErr.message });
      if (countErr) return res.status(500).json({ error: countErr.message });
      const userLastReadAt = chat?.user_last_read_at ? String(chat.user_last_read_at) : null;

      let unreadCount = Number(count ?? 0);
      if (userLastReadAt) {
        const { count: unreadFiltered, error: unreadErr } = await supabase
          .from('support_chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chatId)
          .eq('sender_type', 'admin')
          .gt('created_at', userLastReadAt);
        if (unreadErr) return res.status(500).json({ error: unreadErr.message });
        unreadCount = Number(unreadFiltered ?? 0);
      }

      const last = lastRows?.[0] ?? null;
      return res.json([
        {
          id: Number(chat!.id),
          title: 'Admin',
          status: chat!.status,
          created_at: chat!.created_at,
          updated_at: chat!.updated_at,
          last_message_at: chat!.last_message_at,
          last_message: last
            ? {
                id: Number(last.id),
                content: String(last.content),
                sender_type: String(last.sender_type),
                created_at: String(last.created_at),
              }
            : null,
          unread_count: unreadCount,
        },
      ]);
    } catch (e: any) {
      if (isMissingSupportChatSchemaError(e)) {
        const { data: lastSupportRows } = await supabase
          .from('support_messages')
          .select('id, message, reply, created_at, answered_at, status')
          .eq('user_id', Number(req.userId))
          .order('created_at', { ascending: false })
          .limit(1);
        const last = lastSupportRows?.[0] ?? null;
        const lastMessageAt = last ? String(last.answered_at ?? last.created_at) : null;
        const lastMessageContent = last
          ? String(last.reply ?? last.message)
          : null;
        const unreadCount = last?.status === 'answered' && !last?.reply ? 0 : 0;
        return res.json([
          {
            id: -1,
            title: 'Admin',
            status: 'open',
            created_at: new Date(0).toISOString(),
            updated_at: lastMessageAt ?? new Date(0).toISOString(),
            last_message_at: lastMessageAt,
            last_message: lastMessageContent
              ? {
                  id: Number(last.id ?? 0),
                  content: lastMessageContent,
                  sender_type: last?.reply ? 'admin' : 'user',
                  created_at: lastMessageAt ?? String(last.created_at),
                }
              : null,
            unread_count: unreadCount,
          },
        ]);
      }
      console.error('[GET /api/help/chats]', e);
      return res.status(500).json({ error: e?.message || 'Xatolik' });
    }
  });

  app.get('/api/help/chats/:chatId/messages', authenticate, async (req: any, res) => {
    const userId = Number(req.userId);
    const chatId = Number(req.params.chatId);
    if (!chatId) return res.status(400).json({ error: 'Invalid chat id' });
    if (chatId === -1) {
      const { data: rows, error } = await supabase
        .from('support_messages')
        .select('id, message, reply, created_at, answered_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) return res.status(500).json({ error: error.message });
      const mapped = (rows ?? []).flatMap((r: any) => {
        const rawMessage = String(r.message ?? '');
        const userMessage = rawMessage.startsWith('[ADMIN_NOTE]')
          ? []
          : [{
              id: Number(r.id) * 2,
              chat_id: -1,
              sender_type: 'user',
              sender_user_id: userId,
              content: rawMessage,
              created_at: String(r.created_at),
            }];
        const adminMessage = r.reply
          ? [{
              id: Number(r.id) * 2 + 1,
              chat_id: -1,
              sender_type: 'admin',
              sender_user_id: null,
              content: String(r.reply),
              created_at: String(r.answered_at ?? r.created_at),
            }]
          : rawMessage.startsWith('[ADMIN_NOTE]')
            ? [{
                id: Number(r.id) * 2 + 1,
                chat_id: -1,
                sender_type: 'admin',
                sender_user_id: null,
                content: rawMessage.slice('[ADMIN_NOTE]'.length).trim(),
                created_at: String(r.created_at),
              }]
            : [];
        return [...userMessage, ...adminMessage];
      });
      return res.json(mapped);
    }

    const { data: chat, error: chatErr } = await supabase
      .from('support_chats')
      .select('id, user_id')
      .eq('id', chatId)
      .single();
    if (chatErr || !chat) return res.status(404).json({ error: 'Chat topilmadi' });
    if (Number(chat.user_id) !== userId) return res.status(403).json({ error: 'Ruxsat yo‘q' });

    const { data: rows, error } = await supabase
      .from('support_chat_messages')
      .select('id, chat_id, sender_type, sender_user_id, content, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(300);
    if (error) {
      console.error('[GET /api/help/chats/:chatId/messages]', error);
      return res.status(500).json({ error: error.message });
    }
    return res.json(rows ?? []);
  });

  async function parseHelpChatMultipartImage(
    req: express.Request
  ): Promise<{ file: { buffer: Buffer; mimetype: string } | null }> {
    return new Promise((resolve, reject) => {
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('multipart/form-data')) {
        reject(new Error('Content-Type must be multipart/form-data'));
        return;
      }
      let file: { buffer: Buffer; mimetype: string } | null = null;
      const chunks: Buffer[] = [];
      const bb = Busboy({ headers: { 'content-type': contentType } });
      bb.on('file', (name, stream, info) => {
        if (name !== 'image') {
          stream.resume();
          return;
        }
        const mimeType = info.mimeType;
        if (!HELP_CHAT_ALLOWED_MIMES.includes(mimeType)) {
          stream.resume();
          reject(new Error('Faqat JPG, PNG yoki WEBP ruxsat etiladi'));
          return;
        }
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          if (buffer.length > HELP_CHAT_MAX_SIZE) {
            reject(new Error('Rasm hajmi 4 MB dan oshmasligi kerak'));
            return;
          }
          file = { buffer, mimetype: mimeType };
        });
        stream.on('error', reject);
      });
      bb.on('error', reject);
      bb.on('finish', () => resolve({ file }));
      (req as unknown as NodeJS.ReadableStream).pipe(bb);
    });
  }

  app.post('/api/help/chats/:chatId/media', authenticate, async (req: any, res) => {
    const userId = Number(req.userId);
    const chatId = Number(req.params.chatId);
    if (!chatId) return res.status(400).json({ error: 'Invalid chat id' });

    try {
      const { file } = await parseHelpChatMultipartImage(req);
      if (!file) return res.status(400).json({ error: 'Rasm yuklanmadi' });
      const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
      const objectPath = `${userId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const { data: buckets } = await supabase.storage.listBuckets();
      const hasBucket = (buckets ?? []).some((b: any) => b.name === HELP_CHAT_MEDIA_BUCKET);
      if (!hasBucket) await supabase.storage.createBucket(HELP_CHAT_MEDIA_BUCKET, { public: true });
      const { error: uploadErr } = await supabase.storage
        .from(HELP_CHAT_MEDIA_BUCKET)
        .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });
      if (uploadErr) return res.status(500).json({ error: uploadErr.message });
      const { data: publicData } = supabase.storage.from(HELP_CHAT_MEDIA_BUCKET).getPublicUrl(objectPath);
      const imageUrl = publicData?.publicUrl;
      if (!imageUrl) return res.status(500).json({ error: 'Rasm URL olinmadi' });
      const content = `${HELP_IMAGE_PREFIX}${imageUrl}`;

      if (chatId === -1) {
        const { data: created, error } = await supabase
          .from('support_messages')
          .insert({ user_id: userId, message: content, status: 'new' })
          .select('id, message, created_at')
          .single();
        if (error || !created) return res.status(500).json({ error: error?.message || 'Rasm yuborilmadi' });
        return res.status(201).json({
          id: Number((created as any).id) * 2,
          chat_id: -1,
          sender_type: 'user',
          sender_user_id: userId,
          content: String((created as any).message),
          created_at: String((created as any).created_at),
        });
      }

      const { data: chat, error: chatErr } = await supabase
        .from('support_chats')
        .select('id, user_id')
        .eq('id', chatId)
        .single();
      if (chatErr || !chat) return res.status(404).json({ error: 'Chat topilmadi' });
      if (Number(chat.user_id) !== userId) return res.status(403).json({ error: 'Ruxsat yo‘q' });

      const now = new Date().toISOString();
      const { data: created, error: createErr } = await supabase
        .from('support_chat_messages')
        .insert({
          chat_id: chatId,
          sender_type: 'user',
          sender_user_id: userId,
          content,
          created_at: now,
        })
        .select('id, chat_id, sender_type, sender_user_id, content, created_at')
        .single();
      if (createErr || !created) return res.status(500).json({ error: createErr?.message || 'Rasm yuborilmadi' });
      await supabase.from('support_chats').update({ updated_at: now, last_message_at: now }).eq('id', chatId);
      return res.status(201).json(created);
    } catch (e: any) {
      return res.status(400).json({ error: e?.message || 'Rasm yuborilmadi' });
    }
  });

  app.post('/api/help/chats/:chatId/messages', authenticate, async (req: any, res) => {
    const userId = Number(req.userId);
    const chatId = Number(req.params.chatId);
    const content = String(req.body?.content ?? '').trim();
    if (!chatId) return res.status(400).json({ error: 'Invalid chat id' });
    if (!content) return res.status(400).json({ error: 'Xabar bo‘sh' });
    if (chatId === -1) {
      const { data: created, error } = await supabase
        .from('support_messages')
        .insert({
          user_id: userId,
          message: content,
          status: 'new',
        })
        .select('id, message, created_at')
        .single();
      if (error || !created) return res.status(500).json({ error: error?.message || 'Xabar yuborilmadi' });
      return res.status(201).json({
        id: Number((created as any).id) * 2,
        chat_id: -1,
        sender_type: 'user',
        sender_user_id: userId,
        content: String((created as any).message),
        created_at: String((created as any).created_at),
      });
    }

    const { data: chat, error: chatErr } = await supabase
      .from('support_chats')
      .select('id, user_id')
      .eq('id', chatId)
      .single();
    if (chatErr || !chat) return res.status(404).json({ error: 'Chat topilmadi' });
    if (Number(chat.user_id) !== userId) return res.status(403).json({ error: 'Ruxsat yo‘q' });

    const now = new Date().toISOString();
    const { data: created, error: msgErr } = await supabase
      .from('support_chat_messages')
      .insert({
        chat_id: chatId,
        sender_type: 'user',
        sender_user_id: userId,
        content,
        created_at: now,
      })
      .select('id, chat_id, sender_type, sender_user_id, content, created_at')
      .single();
    if (msgErr || !created) return res.status(500).json({ error: msgErr?.message || 'Xabar yuborilmadi' });

    const { error: updErr } = await supabase
      .from('support_chats')
      .update({ updated_at: now, last_message_at: now })
      .eq('id', chatId);
    if (updErr) return res.status(500).json({ error: updErr.message });

    return res.status(201).json(created);
  });

  app.post('/api/help/chats/:chatId/read', authenticate, async (req: any, res) => {
    const userId = Number(req.userId);
    const chatId = Number(req.params.chatId);
    if (!chatId) return res.status(400).json({ error: 'Invalid chat id' });
    if (chatId === -1) return res.json({ success: true });

    const { data: chat, error: chatErr } = await supabase
      .from('support_chats')
      .select('id, user_id')
      .eq('id', chatId)
      .single();
    if (chatErr || !chat) return res.status(404).json({ error: 'Chat topilmadi' });
    if (Number(chat.user_id) !== userId) return res.status(403).json({ error: 'Ruxsat yo‘q' });

    const { error } = await supabase
      .from('support_chats')
      .update({ user_last_read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', chatId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
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

  app.get('/api/daily-course/day/:dayNumber', authenticate, async (req: any, res) => {
    const dayNumber = Number(req.params.dayNumber);
    if (!isValidDailyCourseDay(dayNumber)) {
      return res.status(400).json({
        error: `Kun raqami ${DAILY_COURSE_DAY_MIN}–${DAILY_COURSE_DAY_MAX} oralig‘ida bo‘lishi kerak`,
      });
    }
    const result = await fetchDailyCourseDayBundle(supabase, dayNumber);
    if (result.ok === false) {
      console.error('[GET /api/daily-course/day/:dayNumber]', { dayNumber, error: result.error });
      return res.status(500).json({ error: result.error });
    }
    res.json(result.bundle);
  });

  // Standalone /api/vocabulary endpoints were removed when the product
  // collapsed into the 182-day kunlik plan. Vocab is now exercised inside
  // each day's block via /api/kunlik-progress and /api/daily-course/* —
  // there is no separate vocabulary table flow anymore. The 410
  // middleware near the top of startServer() already shields these paths.

  // ---------------------------------------------------------------------------
  // Partner (Naparnik) routes — delegate to the same handler used by Vercel
  // ---------------------------------------------------------------------------
  app.use('/api/partner', authenticate, async (req: any, res) => {
    const userId = req.userId as number;

    const fullPath = (req.originalUrl || req.url || '').split('?')[0];
    const segments = fullPath.replace(/^\/api\/partner\/?/, '').split('/').filter(Boolean);
    return routePartnerRequest(req as any, res as any, userId, segments);

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
            .eq('sender_id', userId).eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
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
        const outgoingRequests = outgoingRes.data ?? [];
        const outgoingReceiverIds = outgoingRequests.map((r: any) => r.receiver_id);
        const outgoingProfilesById: Record<number, any> = {};
        if (outgoingReceiverIds.length > 0) {
          const { data } = await supabase.from('partner_profiles')
            .select('user_id, display_name, age, gender, language_level, goal, about')
            .in('user_id', outgoingReceiverIds);
          for (const profile of data ?? []) {
            outgoingProfilesById[profile.user_id] = profile;
          }
        }
        return res.json({
          hasProfile: !!profileRes.data,
          match: matchRes.data ? { ...matchRes.data, partner_profile: partnerProfile } : null,
          outgoingRequests: outgoingRequests.map((request: any) => ({
            ...request,
            receiver_profile: outgoingProfilesById[request.receiver_id] ?? null,
          })),
          outgoingRequestsCount: outgoingRequests.length,
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
        const { data } = await supabase.from('partner_profiles')
          .select('user_id, display_name, age, gender, language_level, goal, about, seeking')
          .neq('user_id', userId).order('created_at', { ascending: false }).limit(50);
        return res.json(data ?? []);
      }
      if (s0 === 'request' && !s1 && req.method === 'POST') {
        const receiverId = Number(req.body.receiver_id);
        if (!Number.isFinite(receiverId) || receiverId === userId) {
          return res.status(400).json({ error: 'Noto\'g\'ri foydalanuvchi' });
        }
        const { data: senderActiveMatch } = await supabase.from('partner_matches').select('id')
          .eq('status', 'active').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).maybeSingle();
        if (senderActiveMatch) return res.status(400).json({ error: 'Sizda allaqachon sherik bor' });
        const { data: receiverActiveMatch } = await supabase.from('partner_matches').select('id')
          .eq('status', 'active').or(`user1_id.eq.${receiverId},user2_id.eq.${receiverId}`).maybeSingle();
        if (receiverActiveMatch) return res.status(400).json({ error: 'Tanlangan foydalanuvchida allaqachon sherik bor' });
        const { data: duplicatePending } = await supabase.from('partner_requests').select('id')
          .eq('status', 'pending')
          .or(`and(sender_id.eq.${userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${userId})`)
          .maybeSingle();
        if (duplicatePending) return res.status(400).json({ error: 'Bu foydalanuvchi bilan faol so\'rov allaqachon mavjud' });
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
      if ((s0 === 'requests' && s1 === 'outgoing' || s0 === 'outgoing-requests') && req.method === 'GET') {
        const { data } = await supabase.from('partner_requests')
          .select('id, receiver_id, status, created_at')
          .eq('sender_id', userId).eq('status', 'pending').order('created_at', { ascending: false });
        const receiverIds = (data ?? []).map((r: any) => r.receiver_id);
        const profiles: Record<number, any> = {};
        if (receiverIds.length) {
          const { data: profs } = await supabase.from('partner_profiles')
            .select('user_id, display_name, age, language_level, goal, about').in('user_id', receiverIds);
          for (const p of profs ?? []) profiles[p.user_id] = p;
        }
        return res.json((data ?? []).map((r: any) => ({ ...r, receiver_profile: profiles[r.receiver_id] ?? null })));
      }
      if (s0 === 'request' && s1 && s2 === 'accept' && req.method === 'POST') {
        const requestId = Number(s1);
        const { data: rq } = await supabase.from('partner_requests').select('id, sender_id, receiver_id, status')
          .eq('id', requestId).eq('receiver_id', userId).maybeSingle();
        if (!rq || rq.status !== 'pending') return res.status(404).json({ error: 'Topilmadi' });
        const [{ data: senderActive }, { data: receiverActive }] = await Promise.all([
          supabase.from('partner_matches').select('id').eq('status', 'active').or(`user1_id.eq.${rq.sender_id},user2_id.eq.${rq.sender_id}`).maybeSingle(),
          supabase.from('partner_matches').select('id').eq('status', 'active').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).maybeSingle(),
        ]);
        if (senderActive || receiverActive) {
          return res.status(400).json({ error: 'Foydalanuvchilardan birida allaqachon faol sherik bor' });
        }
        await supabase.from('partner_requests').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', requestId);
        await supabase.from('partner_requests').update({ status: 'rejected', responded_at: new Date().toISOString() })
          .eq('status', 'pending').or(`sender_id.eq.${rq.sender_id},sender_id.eq.${userId},receiver_id.eq.${rq.sender_id},receiver_id.eq.${userId}`).neq('id', requestId);
        const { data: match, error: matchErr } = await supabase
          .from('partner_matches')
          .insert({ user1_id: rq.sender_id, user2_id: userId })
          .select()
          .single();
        if (matchErr || !match) return res.status(500).json({ error: 'Sheriklik yaratilmadi' });
        return res.json(match);
      }
      if (s0 === 'accept-request' && req.method === 'POST') {
        const requestId = Number(req.query.id);
        const { data: rq } = await supabase.from('partner_requests').select('id, sender_id, receiver_id, status')
          .eq('id', requestId).eq('receiver_id', userId).maybeSingle();
        if (!rq || rq.status !== 'pending') return res.status(404).json({ error: 'Topilmadi' });
        const [{ data: senderActive }, { data: receiverActive }] = await Promise.all([
          supabase.from('partner_matches').select('id').eq('status', 'active').or(`user1_id.eq.${rq.sender_id},user2_id.eq.${rq.sender_id}`).maybeSingle(),
          supabase.from('partner_matches').select('id').eq('status', 'active').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).maybeSingle(),
        ]);
        if (senderActive || receiverActive) {
          return res.status(400).json({ error: 'Foydalanuvchilardan birida allaqachon faol sherik bor' });
        }
        await supabase.from('partner_requests').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', requestId);
        await supabase.from('partner_requests').update({ status: 'rejected', responded_at: new Date().toISOString() })
          .eq('status', 'pending').or(`sender_id.eq.${rq.sender_id},sender_id.eq.${userId},receiver_id.eq.${rq.sender_id},receiver_id.eq.${userId}`).neq('id', requestId);
        const { data: match, error: matchErr } = await supabase
          .from('partner_matches')
          .insert({ user1_id: rq.sender_id, user2_id: userId })
          .select()
          .single();
        if (matchErr || !match) return res.status(500).json({ error: 'Sheriklik yaratilmadi' });
        return res.json(match);
      }
      if (s0 === 'request' && s1 && s2 === 'reject' && req.method === 'POST') {
        await supabase.from('partner_requests').update({ status: 'rejected', responded_at: new Date().toISOString() }).eq('id', Number(s1)).eq('receiver_id', userId);
        return res.json({ success: true });
      }
      if (s0 === 'request' && s1 && s2 === 'cancel' && req.method === 'POST') {
        const requestId = Number(s1);
        const { data: rq } = await supabase.from('partner_requests').select('id, sender_id, status')
          .eq('id', requestId).eq('sender_id', userId).maybeSingle();
        if (!rq || rq.status !== 'pending') return res.status(404).json({ error: 'Topilmadi' });
        await supabase.from('partner_requests').update({ status: 'rejected', responded_at: new Date().toISOString() }).eq('id', requestId);
        return res.json({ success: true });
      }
      if (s0 === 'reject-request' && req.method === 'POST') {
        await supabase.from('partner_requests').update({ status: 'rejected', responded_at: new Date().toISOString() }).eq('id', Number(req.query.id)).eq('receiver_id', userId);
        return res.json({ success: true });
      }
      if (s0 === 'cancel-request' && req.method === 'POST') {
        const requestId = Number(req.query.id);
        const { data: rq } = await supabase.from('partner_requests').select('id, sender_id, status')
          .eq('id', requestId).eq('sender_id', userId).maybeSingle();
        if (!rq || rq.status !== 'pending') return res.status(404).json({ error: 'Topilmadi' });
        await supabase.from('partner_requests').update({ status: 'rejected', responded_at: new Date().toISOString() }).eq('id', requestId);
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

  // ---------------------------------------------------------------------------
  // Speaking trainer routes
  // ---------------------------------------------------------------------------
  app.use('/api/speaking', authenticate, async (req: any, res) => {
    const userId = req.userId as number;
    const access = await getAccessInfo(supabase, userId);

    // `app.use('/api/speaking', …)` ichida Express odatda `req.url` ni `/check` qilib beradi.
    // Baʼzi proxylar / middleware lar `req.url` da toʻliq `/api/speaking/...` qoldirishi mumkin —
    // ikkala holatni ham `segments[0] === 'check'` qilib chiqaramiz.
    const rawMounted = String(req.url || '').split('?')[0];
    let segments = rawMounted
      .replace(/^\/+/, '')
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!segments.length || segments[0] === 'api') {
      let fullPath = String(req.originalUrl || req.url || '').split('?')[0];
      try {
        if (/^https?:\/\//i.test(fullPath)) {
          fullPath = new URL(fullPath).pathname;
        }
      } catch {
        /* ignore */
      }
      segments = fullPath
        .replace(/^\/api\/speaking\/?/i, '')
        .replace(/^\/+/, '')
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const s0 = segments[0];

    const kunlikDayRaw = Number(req.body?.day_number);
    const kunlikDayNumber =
      Number.isFinite(kunlikDayRaw) && isValidDailyCourseDay(Math.floor(kunlikDayRaw))
        ? Math.floor(kunlikDayRaw)
        : null;

    if (!access.subscription_active) {
      const kunlikAiRoute =
        (s0 === 'check' || s0 === 'transcribe') && req.method === 'POST';
      const freeKunlikDay =
        kunlikDayNumber != null && isFreeKunlikSpeakingDay(kunlikDayNumber);
      if (!kunlikAiRoute || !freeKunlikDay) {
        return res.status(403).json({ error: 'Obuna kerak' });
      }
    }

    try {
      if (s0 === 'topics' && req.method === 'GET') {
        const { data: taskRows } = await supabase.from('speaking_tasks').select('topic, level');
        const { data: catalogRows } = await supabase
          .from('speaking_topics_catalog')
          .select('topic, level, order_index')
          .order('order_index', { ascending: true });

        const map = new Map<string, { topic: string; level: string; count: number; order: number }>();
        for (const row of taskRows ?? []) {
          const ex = map.get(row.topic);
          if (ex) {
            ex.count++;
            continue;
          }
          const fromCatalog = (catalogRows ?? []).find((c: any) => c.topic === row.topic);
          map.set(row.topic, {
            topic: row.topic,
            level: fromCatalog?.level ?? row.level,
            count: 1,
            order: fromCatalog?.order_index ?? 9999,
          });
        }
        for (const c of catalogRows ?? []) {
          if (!map.has(c.topic)) {
            map.set(c.topic, {
              topic: c.topic,
              level: c.level,
              count: 0,
              order: c.order_index ?? 9999,
            });
          }
        }

        return res.json(
          Array.from(map.values())
            .sort((a, b) => (a.order - b.order) || a.topic.localeCompare(b.topic))
            .map(({ topic, level, count }) => ({ topic, level, count }))
        );
      }

      if (s0 === 'tasks' && req.method === 'GET') {
        const topic = req.query.topic as string | undefined;
        const lessonId = req.query.lesson_id ? Number(req.query.lesson_id) : undefined;
        let q = supabase.from('speaking_tasks')
          .select('id, uz_text, ru_correct, topic, level, lesson_id, sort_order')
          .order('sort_order', { ascending: true }).limit(50);
        if (topic) q = q.eq('topic', topic);
        if (lessonId) q = q.eq('lesson_id', lessonId);
        const { data } = await q;
        return res.json(data ?? []);
      }

      if (s0 === 'check' && req.method === 'POST') {
        if (!(await enforceRateLimit(res, `ai:speaking-check:${userId}`, 30, 60))) return;
        const body = req.body ?? {};
        const userAnswer = String(body.user_answer ?? '').trim();
        const mode = String(body.mode ?? 'text');
        const attempt = Math.max(1, Number(body.attempt) || 1);

        if (!userAnswer) return res.status(400).json({ error: 'Javob kiritilmagan' });
        if (mode !== 'text' && mode !== 'voice') return res.status(400).json({ error: 'mode noto\'g\'ri' });

        const uzInline = String(body.uz_text ?? '').trim();
        const ruInline = String(body.ru_correct ?? '').trim();

        let uzText: string;
        let ruCorrect: string;
        let persistTaskId: number | null = null;

        if (uzInline && ruInline) {
          uzText = uzInline;
          ruCorrect = ruInline;
        } else {
          const taskId = Number(body.task_id);
          if (!Number.isFinite(taskId)) return res.status(400).json({ error: 'task_id kerak' });

          const { data: task } = await supabase.from('speaking_tasks')
            .select('id, uz_text, ru_correct').eq('id', taskId).maybeSingle();
          if (!task) return res.status(404).json({ error: 'Topshiriq topilmadi' });

          uzText = task.uz_text;
          ruCorrect = task.ru_correct;
          persistTaskId = task.id;
        }

        const { checkTranslation } = await import('./server/lib/openai.js');
        const result = await checkTranslation(uzText, ruCorrect, userAnswer, attempt);

        if (persistTaskId !== null) {
          await supabase.from('speaking_results').insert({
            user_id: userId,
            task_id: persistTaskId,
            user_answer: userAnswer,
            mode,
            status: result.status,
            feedback: result.feedback,
          });
        }
        return res.json(result);
      }

      if (s0 === 'transcribe' && req.method === 'POST') {
        if (!(await enforceRateLimit(res, `ai:speaking-transcribe:${userId}`, 20, 60))) return;
        const audioBase64 = String(req.body.audio ?? '');
        if (!audioBase64) return res.status(400).json({ error: 'audio kerak' });
        const buffer = Buffer.from(audioBase64, 'base64');
        if (buffer.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'Audio juda katta (max 5MB)' });
        const { transcribeAudio } = await import('./server/lib/openai.js');
        const text = await transcribeAudio(buffer, 'recording.webm');
        return res.json({ text });
      }

      if (s0 === 'stats' && req.method === 'GET') {
        const { data } = await supabase.from('speaking_results').select('status').eq('user_id', userId);
        const rows = data ?? [];
        return res.json({
          total: rows.length,
          correct: rows.filter((r: any) => r.status === 'correct').length,
          partial: rows.filter((r: any) => r.status === 'partial').length,
          wrong: rows.filter((r: any) => r.status === 'wrong').length,
        });
      }

      return res.status(404).json({ error: 'Not found' });
    } catch (e) {
      console.error('[speaking]', e);
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
      if (isLessonTaskResultsSchemaError(error)) {
        return res.json([]);
      }
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
    const { data: prevRow, error: prevError } = await supabase
      .from('lesson_task_results')
      .select('correct, total')
      .eq('user_id', req.userId)
      .eq('lesson_path', lessonPath)
      .eq('task_number', taskNumber)
      .maybeSingle();
    if (prevError && isLessonTaskResultsSchemaError(prevError)) {
      return res.json({ success: true, skipped: 'lesson_task_results_missing' });
    }
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
      if (isLessonTaskResultsSchemaError(error)) {
        return res.json({ success: true, skipped: 'lesson_task_results_missing' });
      }
      console.error('[api/lesson-task-results] POST error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  });

  // Vite / static
  if (process.env.NODE_ENV !== 'production') {
    // Unmatched /api/* would otherwise fall through to Vite and return an empty 404,
    // which looks like a "missing route" bug. Prefer an explicit JSON body.
    app.use((req, res, next) => {
      const pathOnly = String(req.originalUrl || req.url || '').split('?')[0];
      if (!pathOnly.startsWith('/api/')) return next();
      return res.status(404).json({
        error: 'API endpoint topilmadi',
        method: req.method,
        path: pathOnly,
      });
    });
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      if (String(req.path || '').startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint topilmadi' });
      }
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const leaderboardCronEnabled = String(process.env.ENABLE_LEADERBOARD_CRON ?? 'false').toLowerCase() === 'true';
  if (leaderboardCronEnabled) {
    const { startLeaderboardCron } = await import('./server/services/leaderboardCron.service');
    startLeaderboardCron(supabase);
  } else {
    console.warn('[leaderboardCron] disabled by ENABLE_LEADERBOARD_CRON flag');
  }

  // Click auto-pay (every 15min) and fiscal retry (every hour at :45)
  // used to be scheduled by vercel.json. They now run in-process via
  // node-cron, gated by ENABLE_INTERNAL_CRON. Redis-backed distributed
  // lock makes it safe to set the flag on every replica.
  const { startInternalCron } = await import('./server/lib/cronScheduler.ts');
  const cronActivated = startInternalCron(supabase);
  if (cronActivated) {
    console.log('[internalCron] click-auto-pay + click-fiscal-retry scheduled');
  } else {
    console.warn('[internalCron] disabled by ENABLE_INTERNAL_CRON flag');
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log('Server running on http://localhost:' + port);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
