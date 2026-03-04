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

  // Auth
  app.post('/api/auth/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email,
          password: hashedPassword,
        })
        .select('id, first_name, last_name, email, level, onboarded')
        .single();
      if (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Email allaqachon mavjud' });
        throw error;
      }
      const token = jwt.sign({ id: user.id }, JWT_SECRET);
      res.json({
        token,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          level: user.level ?? 'A0',
          onboarded: user.onboarded ?? 0,
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

  // User
  app.get('/api/user/me', authenticate, async (req: any, res) => {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, level, onboarded, progress')
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
    });
  });

  app.post('/api/user/onboard', authenticate, async (req: any, res) => {
    const { level } = req.body;
    await supabase.from('users').update({ level, onboarded: 1 }).eq('id', req.userId);
    res.json({ success: true });
  });

  // Lessons
  app.get('/api/lessons', authenticate, async (req: any, res) => {
    const { data: user } = await supabase.from('users').select('level').eq('id', req.userId).single();
    if (!user?.level) return res.status(404).json({ error: 'User topilmadi' });
    const { data: lessons, error } = await supabase.from('lessons').select('*').eq('level', user.level);
    if (error) return res.status(500).json({ error: error.message });
    res.json(lessons ?? []);
  });

  app.get('/api/lessons/:id', authenticate, async (req: any, res) => {
    const { data: lesson, error: lessonErr } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (lessonErr || !lesson) return res.status(404).json({ error: 'Dars topilmadi' });
    const { data: exercises } = await supabase.from('exercises').select('*').eq('lesson_id', req.params.id);
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

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log('Server running on http://localhost:' + port);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
