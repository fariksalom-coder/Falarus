import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { courseData } from './src/data/courseData.ts';

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (_req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // Admin panel first so /api/admin/* is never swallowed by other /api routes
  try {
    const { createAdminRoutes } = await import('./server/routes/adminRoutes');
    app.use('/api/admin', createAdminRoutes(supabase));
    console.log('Admin API: /api/admin (login, dashboard, users, payments, etc.)');
  } catch (err) {
    console.error('Admin routes failed to load:', err);
  }

  // Auth
  const { attachReferralOnRegister, resolveReferrerFromCode } = await import(
    './server/services/referral.service'
  );
  app.post('/api/auth/register', async (req, res) => {
    const { firstName, lastName, email, password, ref: refCode } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email,
          password: hashedPassword,
          onboarded: 1,
        })
        .select('id, first_name, last_name, email, level, onboarded')
        .single();
      if (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Email allaqachon mavjud' });
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
          email: user.email,
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
    const { email, password } = req.body;
    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error || !user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
    }
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
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
      req.userId = decoded.id;
      next();
    } catch (e) {
      res.status(401).json({ error: 'Yaroqsiz token' });
    }
  };

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
      .select('id, first_name, last_name, email, level, onboarded, progress, plan_name, plan_expires_at')
      .eq('id', req.userId)
      .single();
    if (error || !user) return res.status(404).json({ error: 'User topilmadi' });
    res.json({
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
  });

  app.post('/api/user/onboard', authenticate, async (req: any, res) => {
    const { level } = req.body;
    await supabase.from('users').update({ level, onboarded: 1 }).eq('id', req.userId);
    res.json({ success: true });
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

  // Leaderboard: "all" = cached top 100 from leaderboard table + Redis; weekly/monthly = from users
  const leaderboardCacheService = await import('./server/services/leaderboardCache.service');
  const leaderboardService = await import('./server/services/leaderboard.service');
  app.get('/api/leaderboard', authenticate, async (req: any, res) => {
    const period = (req.query.period as string) || 'weekly';
    const useTotalPoints = period === 'all';
    if (useTotalPoints) {
      try {
        const top = await leaderboardCacheService.getTop100Cached(supabase);
        const myPosition = await leaderboardService.getMyPosition(supabase, req.userId);
        const { data: me } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url')
          .eq('id', req.userId)
          .single();
        res.json({
          top: top.map((u) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            avatarUrl: u.avatarUrl,
            points: u.total_points,
            rank: u.rank,
          })),
          myRank: myPosition && me ? {
            rank: myPosition.rank,
            id: me.id,
            firstName: me.first_name,
            lastName: me.last_name,
            avatarUrl: me.avatar_url,
            points: myPosition.points,
          } : null,
        });
      } catch (e) {
        console.error('[api/leaderboard]', e);
        res.status(500).json({ error: 'Xatolik yuz berdi' });
      }
      return;
    }
    const col = period === 'monthly' ? 'monthly_points' : 'weekly_points';
    const { data: top, error: topErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url, total_points, points, weekly_points, monthly_points')
      .order(col, { ascending: false })
      .limit(100);
    if (topErr) {
      console.error('[api/leaderboard] top error:', topErr.message);
      return res.status(500).json({ error: topErr.message });
    }
    const { data: me, error: meErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url, total_points, points, weekly_points, monthly_points')
      .eq('id', req.userId)
      .single();
    if (meErr || !me) {
      return res.json({ top: top ?? [], myRank: null });
    }
    const myPoints = period === 'monthly' ? (me.monthly_points ?? 0) : (me.weekly_points ?? 0);
    const { count, error: countErr } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt(col, myPoints);
    const rank = countErr ? null : (count ?? 0) + 1;
    res.json({
      top: (top ?? []).map((u: any) => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        avatarUrl: u.avatar_url,
        points: period === 'monthly' ? (u.monthly_points ?? 0) : (u.weekly_points ?? 0),
      })),
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
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('points, weekly_points, monthly_points, total_points')
      .eq('id', req.userId)
      .single();
    if (fetchErr || !user) return res.status(404).json({ error: 'User topilmadi' });
    const points = (user.points ?? 0) + amount;
    const weekly_points = (user.weekly_points ?? 0) + amount;
    const monthly_points = (user.monthly_points ?? 0) + amount;
    const total_points = (user.total_points ?? 0) + amount;
    const { error: updateErr } = await supabase
      .from('users')
      .update({ points, weekly_points, monthly_points, total_points })
      .eq('id', req.userId);
    if (updateErr) {
      console.error('[api/user/points]', updateErr.message);
      return res.status(500).json({ error: updateErr.message });
    }
    const leaderboardSvc = await import('./server/services/leaderboard.service');
    const leaderboardCacheSvc = await import('./server/services/leaderboardCache.service');
    await leaderboardSvc.ensureUserInLeaderboard(supabase, req.userId);
    await leaderboardSvc.updateUserPoints(supabase, req.userId, total_points);
    await leaderboardCacheSvc.invalidateLeaderboardCache();
    res.json({ success: true, points, weekly_points, monthly_points, total_points });
  });

  // Lessons (freemium: locked flag, preview, protect full content)
  const { getAccessForRequest } = await import('./server/routes/accessRoutes');
  const accessControlService = await import('./server/services/accessControl.service');

  app.get('/api/lessons', authenticate, async (req: any, res) => {
    const { data: user } = await supabase.from('users').select('level').eq('id', req.userId).single();
    if (!user?.level) return res.status(404).json({ error: 'User topilmadi' });
    const { data: lessons, error } = await supabase.from('lessons').select('*').eq('level', user.level).order('id');
    if (error) return res.status(500).json({ error: error.message });
    const access = await getAccessForRequest(supabase, req.userId);
    const withLock = accessControlService.applyLessonsLock(lessons ?? [], access);
    const lessonIds = (lessons ?? []).map((l: any) => l.id);
    const { data: exCounts } = await supabase.from('exercises').select('lesson_id').in('lesson_id', lessonIds);
    const countByLesson: Record<number, number> = {};
    (exCounts ?? []).forEach((r: any) => { countByLesson[r.lesson_id] = (countByLesson[r.lesson_id] || 0) + 1; });
    const list = withLock.map((l: any) => ({
      id: l.id,
      level: l.level,
      module_name: l.module_name,
      title: l.title,
      content_uz: l.content_uz,
      content_ru: l.content_ru,
      locked: l.locked,
      tasks_count: countByLesson[l.id] ?? 0,
    }));
    res.json(list);
  });

  app.get('/api/lessons/:id/preview', authenticate, async (req: any, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid lesson id' });
    const preview = await accessControlService.getLessonPreview(supabase, id);
    if (!preview) return res.status(404).json({ error: 'Dars topilmadi' });
    res.json(preview);
  });

  app.get('/api/lessons/:id', authenticate, async (req: any, res) => {
    const id = Number(req.params.id);
    const access = await getAccessForRequest(supabase, req.userId);
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
    await supabase.from('user_progress').upsert(
      { user_id: req.userId, lesson_id: Number(req.params.id), completed: 1 },
      { onConflict: 'user_id,lesson_id' }
    );
    const { data: user } = await supabase.from('users').select('level').eq('id', req.userId).single();
    if (!user?.level) return res.json({ success: true, progress: 0 });
    const { count: total } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('level', user.level);
    const { count: completed } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('completed', 1);
    const progress = total && total > 0 ? ((completed ?? 0) / total) * 100 : 0;
    await supabase.from('users').update({ progress }).eq('id', req.userId);
    res.json({ success: true, progress });
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
    const row = {
      user_id: req.userId,
      lesson_path: String(lesson_path),
      task_number: Number(task_number),
      correct: Number(correct) || 0,
      total: Number(total) || 0,
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
