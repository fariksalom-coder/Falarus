import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';

function parseEnvFile(filePath) {
  const out = {};
  if (!existsSync(filePath)) return out;
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    out[match[1]] = match[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return out;
}

const env = { ...parseEnvFile(resolve(process.cwd(), '.env')), ...process.env };
if (!env.DATABASE_URL) {
  console.error('db:verify requires DATABASE_URL');
  process.exit(1);
}

const checks = [
  'users',
  'lesson_task_results',
  'vocabulary_topics',
  'vocabulary_subtopics',
  'vocabulary_word_groups',
  'user_word_group_progress',
  'subscriptions',
  'leaderboard',
  'payments',
  'teacher_profiles',
  'teacher_trial_lessons',
];

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

try {
  for (const table of checks) {
    const result = await pool.query('select to_regclass($1) as name', [`public.${table}`]);
    if (!result.rows[0]?.name) {
      console.error(`Missing table: ${table}`);
      process.exitCode = 1;
    } else {
      console.log(`OK ${table}`);
    }
  }
} finally {
  await pool.end();
}

if (process.exitCode) process.exit(process.exitCode);
console.log('PostgreSQL schema verification passed.');
