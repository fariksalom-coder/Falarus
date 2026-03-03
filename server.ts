import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { courseData } from './src/data/courseData.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('russian_learning.db');
const JWT_SECRET = 'super-secret-key-uz-ru';

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    level TEXT DEFAULT 'A0',
    onboarded INTEGER DEFAULT 0,
    progress REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT,
    module_name TEXT,
    title TEXT,
    content_uz TEXT,
    content_ru TEXT
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER,
    type TEXT,
    question_uz TEXT,
    options TEXT, -- JSON string
    correct_answer TEXT,
    FOREIGN KEY(lesson_id) REFERENCES lessons(id)
  );

  CREATE TABLE IF NOT EXISTS vocabulary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    word_ru TEXT,
    translation_uz TEXT,
    example_ru TEXT,
    learned INTEGER DEFAULT 0,
    repetition_stage INTEGER DEFAULT 0,
    next_review DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    lesson_id INTEGER,
    completed INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(lesson_id) REFERENCES lessons(id)
  );
`);

// Seeding function
function seedDatabase() {
  const lessonCount = db.prepare('SELECT COUNT(*) as count FROM lessons').get() as { count: number };
  if (lessonCount.count === 0) {
    console.log('Seeding database...');
    const insertLesson = db.prepare('INSERT INTO lessons (level, module_name, title, content_uz, content_ru) VALUES (?, ?, ?, ?, ?)');
    const insertExercise = db.prepare('INSERT INTO exercises (lesson_id, type, question_uz, options, correct_answer) VALUES (?, ?, ?, ?, ?)');

    courseData.forEach(levelData => {
      levelData.modules.forEach(module => {
        module.lessons.forEach(lesson => {
          const l = insertLesson.run(levelData.level, module.name, lesson.title, lesson.content_uz, lesson.content_ru);
          lesson.exercises.forEach(ex => {
            insertExercise.run(l.lastInsertRowid, ex.type, ex.question_uz, JSON.stringify(ex.options), ex.correct_answer);
          });
        });
      });
    });
    console.log('Database seeded successfully.');
  }
}

seedDatabase();

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const info = db.prepare('INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)').run(firstName, lastName, email, hashedPassword);
      const token = jwt.sign({ id: info.lastInsertRowid }, JWT_SECRET);
      res.json({ token, user: { id: info.lastInsertRowid, firstName, lastName, email, level: 'A0', onboarded: 0 } });
    } catch (e) {
      res.status(400).json({ error: 'Email allaqachon mavjud' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
    }
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email, level: user.level, onboarded: user.onboarded } });
  });

  // Middleware to verify JWT
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

  // User Routes
  app.get('/api/user/me', authenticate, (req: any, res) => {
    const user = db.prepare('SELECT id, first_name as firstName, last_name as lastName, email, level, onboarded, progress FROM users WHERE id = ?').get(req.userId);
    res.json(user);
  });

  app.post('/api/user/onboard', authenticate, (req: any, res) => {
    const { level } = req.body;
    db.prepare('UPDATE users SET level = ?, onboarded = 1 WHERE id = ?').run(level, req.userId);
    res.json({ success: true });
  });

  // Lesson Routes
  app.get('/api/lessons', authenticate, (req: any, res) => {
    const user = db.prepare('SELECT level FROM users WHERE id = ?').get(req.userId) as any;
    const lessons = db.prepare('SELECT * FROM lessons WHERE level = ?').all(user.level);
    res.json(lessons);
  });

  app.get('/api/lessons/:id', authenticate, (req: any, res) => {
    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
    const exercises = db.prepare('SELECT * FROM exercises WHERE lesson_id = ?').all(req.params.id);
    res.json({ ...lesson, exercises: exercises.map((e: any) => ({ ...e, options: JSON.parse(e.options) })) });
  });

  app.post('/api/lessons/:id/complete', authenticate, (req: any, res) => {
    db.prepare('INSERT OR REPLACE INTO user_progress (user_id, lesson_id, completed) VALUES (?, ?, 1)').run(req.userId, req.params.id);
    
    // Update overall progress
    const totalLessons = db.prepare('SELECT COUNT(*) as count FROM lessons WHERE level = (SELECT level FROM users WHERE id = ?)').get(req.userId) as any;
    const completedLessons = db.prepare('SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND completed = 1').get(req.userId) as any;
    const progress = totalLessons.count > 0 ? (completedLessons.count / totalLessons.count) * 100 : 0;
    db.prepare('UPDATE users SET progress = ? WHERE id = ?').run(progress, req.userId);
    
    res.json({ success: true, progress });
  });

  // Vocabulary Routes
  app.get('/api/vocabulary', authenticate, (req: any, res) => {
    const words = db.prepare('SELECT * FROM vocabulary WHERE user_id = ?').all(req.userId);
    res.json(words);
  });

  app.post('/api/vocabulary', authenticate, (req: any, res) => {
    const { word_ru, translation_uz, example_ru } = req.body;
    db.prepare('INSERT INTO vocabulary (user_id, word_ru, translation_uz, example_ru) VALUES (?, ?, ?, ?)').run(req.userId, word_ru, translation_uz, example_ru);
    res.json({ success: true });
  });

  // Vite integration
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

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
