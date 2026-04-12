/**
 * Supabase `questions` jadvalidagi faol savollar sonini `getExpectedLessonTaskCount` bilan solishtiradi.
 * `SUPABASE_URL` va `SUPABASE_SERVICE_ROLE_KEY` kerak. Importdan keyin ishlating.
 */
import { createClient } from '@supabase/supabase-js';
import { LESSONS } from '../src/data/lessonsList';
import { getExpectedLessonTaskCount } from '../src/data/unifiedLessonVazifaRegistry';
import { aggregateTasksByLesson, type QuestionRow } from '../shared/grammarCatalog';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function main() {
  const strict = process.argv.includes('--strict');
  const sb = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: qrows, error } = await sb
    .from('questions')
    .select('lesson_id, order_index')
    .eq('is_active', true);
  if (error) throw error;

  const agg = aggregateTasksByLesson((qrows ?? []) as QuestionRow[]);
  const mismatches: string[] = [];

  for (const meta of LESSONS) {
    const path = meta.path;
    for (let task = 1; task <= meta.exercisesTotal; task += 1) {
      const expected = getExpectedLessonTaskCount(path, task);
      if (expected == null) continue;
      const actual = agg.get(meta.id)?.get(task) ?? 0;
      if (actual !== expected) {
        mismatches.push(`${path} task=${task}: db=${actual} expected=${expected}`);
      }
    }
  }

  if (mismatches.length > 0) {
    console.warn(`Ogohlantirish: ${mismatches.length} ta farq (DB vs static registry):`);
    for (const m of mismatches.slice(0, 40)) console.warn(`  ${m}`);
    if (mismatches.length > 40) console.warn(`  ... yana ${mismatches.length - 40} ta`);
    if (strict) process.exit(1);
  } else {
    console.log('OK: DB savollar soni static registry bilan mos.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
