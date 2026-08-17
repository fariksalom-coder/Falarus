/**
 * dbStatus.mjs — lokal bazadagi asosiy jadvallar holati.
 * FAQAT LOKAL ISHLAB CHIQISH UCHUN.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.trim().match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m?.[1] === name) return m[2].replace(/^["']|["']$/g, '').trim();
  }
  return '';
}

const TABLES = [
  'users',
  'daily_grammar_topics',
  'daily_grammar_mcqs',
  'daily_grammar_sentence_arrange',
  'daily_grammar_matches',
  'daily_practice_prompts',
  'daily_vocab_words',
  'grammar_error_codes',
  'ai_grammar_lessons',
  'ai_grammar_blocks',
  'grammar_answer_explanations',
  'grammar_exercise_codes',
  'ai_lesson_sessions',
  'ai_usage',
  'user_grammar_mastery',
];

const client = new pg.Client({ connectionString: readEnv('DATABASE_URL') });
await client.connect();

for (const t of TABLES) {
  try {
    const r = await client.query(`SELECT count(*)::int AS n FROM ${t}`);
    console.log(`${t.padEnd(32)} ${String(r.rows[0].n).padStart(6)}`);
  } catch {
    console.log(`${t.padEnd(32)}      - (jadval yo'q)`);
  }
}

await client.end();
