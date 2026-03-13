import type { Supabase, TaskStatus, LessonStatus } from '../types/progress';

const USER_TASKS = 'user_tasks';
const USER_LESSONS = 'user_lessons';
const TASK_PLAN = 'task_plan';
const LESSON_PLAN = 'lesson_plan';

export async function getTaskPlanByLesson(supabase: Supabase, lessonId: number) {
  const { data, error } = await supabase
    .from(TASK_PLAN)
    .select('id, lesson_id, title, questions_count')
    .eq('lesson_id', lessonId)
    .order('id', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getUserTask(
  supabase: Supabase,
  userId: number,
  taskId: number
) {
  const { data, error } = await supabase
    .from(USER_TASKS)
    .select('*')
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserTasksForLesson(
  supabase: Supabase,
  userId: number,
  taskIds: number[]
) {
  if (taskIds.length === 0) return [];
  const { data, error } = await supabase
    .from(USER_TASKS)
    .select('*')
    .eq('user_id', userId)
    .in('task_id', taskIds);
  if (error) throw error;
  return data ?? [];
}

export async function upsertUserTask(
  supabase: Supabase,
  userId: number,
  taskId: number,
  payload: {
    correct_answers?: number;
    total_questions?: number;
    percentage?: number;
    points?: number;
    status: TaskStatus;
    started_at?: string | null;
    completed_at?: string | null;
  }
) {
  const { error } = await supabase.from(USER_TASKS).upsert(
    {
      user_id: userId,
      task_id: taskId,
      ...payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,task_id' }
  );
  if (error) throw error;
}

export async function getUserLesson(
  supabase: Supabase,
  userId: number,
  lessonId: number
) {
  const { data, error } = await supabase
    .from(USER_LESSONS)
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertUserLesson(
  supabase: Supabase,
  userId: number,
  lessonId: number,
  payload: {
    status: LessonStatus;
    progress?: number;
    started_at?: string | null;
    completed_at?: string | null;
  }
) {
  const { error } = await supabase.from(USER_LESSONS).upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      ...payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' }
  );
  if (error) throw error;
}

export async function getLessonPlanById(supabase: Supabase, lessonId: number) {
  const { data, error } = await supabase
    .from(LESSON_PLAN)
    .select('id, course_id, title, order')
    .eq('id', lessonId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTaskPlanById(supabase: Supabase, taskId: number) {
  const { data, error } = await supabase
    .from(TASK_PLAN)
    .select('id, lesson_id, title, questions_count')
    .eq('id', taskId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
