import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { LESSONS } from '../src/data/lessonsList';

type Inventory = {
  lessons: Array<{
    lessonPath: string;
    taskNumber: number;
    sourceFile: string;
    tasks: Array<{
      type: string;
      prompt: string;
      content: Record<string, unknown>;
      answer: Record<string, unknown>;
      difficulty?: number;
      skill?: string;
      meta?: Record<string, unknown>;
    }>;
  }>;
};

const DRY_RUN = process.argv.includes('--dry-run');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function lessonIdFromPath(lessonPath: string): number | null {
  const m = lessonPath.match(/\/lesson-(\d+)/);
  return m ? Number(m[1]) : null;
}

async function main() {
  const invPath = path.resolve(process.cwd(), 'scripts/generated/lesson_tasks_inventory.json');
  const text = await fs.readFile(invPath, 'utf8');
  const inventory: Inventory = JSON.parse(text);

  const supabase = DRY_RUN
    ? null
    : createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

  let lessonCount = 0;
  let questionCount = 0;
  const blockOffsets = new Map<string, number>();
  for (const group of inventory.lessons) {
    const lessonId = lessonIdFromPath(group.lessonPath);
    if (!lessonId) continue;
    const meta = LESSONS.find((l) => l.id === lessonId);
    const title = meta?.title ?? group.lessonPath;

    lessonCount += 1;
    if (!DRY_RUN) {
      const { error } = await supabase!.from('lessons').upsert({
        id: lessonId,
        title,
        lesson_path: group.lessonPath,
        is_active: true,
      }, { onConflict: 'id' });
      if (error) throw error;
    }

    const offsetKey = `${lessonId}:${group.taskNumber}`;
    const startOffset = blockOffsets.get(offsetKey) ?? 0;
    const questionRows = group.tasks.map((task, i) => {
      questionCount += 1;
      const orderIndex = group.taskNumber * 1000 + startOffset + i + 1;
      return {
        lesson_id: lessonId,
        type: task.type,
        prompt: task.prompt ?? '',
        order_index: orderIndex,
        version: 1,
        difficulty: Number.isFinite(Number(task.difficulty)) ? Number(task.difficulty) : 1,
        skill: typeof task.skill === 'string' && task.skill.trim() ? task.skill.trim() : 'grammar',
        meta: task.meta ?? {},
        is_active: true,
      };
    });
    if (DRY_RUN) continue;

    const { data: questionData, error: qErr } = await supabase!
      .from('questions')
      .upsert(questionRows, { onConflict: 'lesson_id,order_index' })
      .select('id,order_index');
    if (qErr) throw qErr;

    const byOrder = new Map<number, number>();
    for (const q of questionData ?? []) {
      byOrder.set(Number((q as { order_index: number }).order_index), Number((q as { id: number }).id));
    }
    const contentRows = group.tasks
      .map((task, i) => {
        const orderIndex = group.taskNumber * 1000 + startOffset + i + 1;
        const questionId = byOrder.get(orderIndex);
        if (!questionId) return null;
        return {
          question_id: questionId,
          content: task.content ?? {},
          answer: task.answer ?? {},
        };
      })
      .filter((row): row is { question_id: number; content: Record<string, unknown>; answer: Record<string, unknown> } => Boolean(row));

    if (contentRows.length > 0) {
      const { error: cErr } = await supabase!.from('question_content').upsert(contentRows, { onConflict: 'question_id' });
      if (cErr) throw cErr;
    }
    blockOffsets.set(offsetKey, startOffset + group.tasks.length);
  }

  console.log(`${DRY_RUN ? '[dry-run] ' : ''}lessons: ${lessonCount}, questions: ${questionCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
