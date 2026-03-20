import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

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

const envFromFile = parseEnvFile(resolve(process.cwd(), '.env'));
const env = { ...envFromFile, ...process.env };
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('db:verify requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const checks = [
  { label: 'users', table: 'users', select: 'id,progress,total_points' },
  { label: 'user_progress', table: 'user_progress', select: 'user_id,lesson_id,completed' },
  {
    label: 'lesson_task_results',
    table: 'lesson_task_results',
    select: 'user_id,lesson_path,task_number,correct,total',
  },
  { label: 'vocabulary_topics', table: 'vocabulary_topics', select: 'id,title' },
  {
    label: 'vocabulary_subtopics',
    table: 'vocabulary_subtopics',
    select: 'id,topic_id,title',
  },
  {
    label: 'vocabulary_word_groups',
    table: 'vocabulary_word_groups',
    select: 'id,subtopic_id,part_id,total_words',
  },
  {
    label: 'user_word_group_progress',
    table: 'user_word_group_progress',
    select:
      'user_id,word_group_id,learned_words,total_words,flashcards_known,flashcards_unknown,test_last_correct,test_last_incorrect,test_last_percentage,test_passed,test_best_correct,match_completed,progress_percent',
  },
  {
    label: 'user_subtopic_progress',
    table: 'user_subtopic_progress',
    select: 'user_id,subtopic_id,learned_words,total_words,progress_percent',
  },
  {
    label: 'user_topic_progress',
    table: 'user_topic_progress',
    select: 'user_id,topic_id,learned_words,total_words,progress_percent',
  },
  {
    label: 'user_vocabulary_step2_attempts',
    table: 'user_vocabulary_step2_attempts',
    select:
      'user_id,word_group_id,activity_date,correct_answers,incorrect_answers,total_questions,percentage',
  },
  { label: 'subscriptions', table: 'subscriptions', select: 'user_id,plan_type,expires_at,status' },
  { label: 'leaderboard', table: 'leaderboard', select: 'user_id,total_points,rank' },
  {
    label: 'subscription_payment_requests',
    table: 'subscription_payment_requests',
    select: 'user_id,plan_type,amount,status',
  },
  {
    label: 'payments',
    table: 'payments',
    select: 'user_id,tariff_type,currency,status,created_at',
  },
];

let failed = false;

for (const check of checks) {
  const { error } = await supabase.from(check.table).select(check.select).limit(1);
  if (error) {
    failed = true;
    console.error(`[FAIL] ${check.label}: ${error.message}`);
    continue;
  }
  console.log(`[OK] ${check.label}`);
}

if (failed) {
  process.exit(1);
}

console.log('Supabase schema verification passed.');
