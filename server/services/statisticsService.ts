import type { Supabase } from '../types/progress';
import { getUserCompletedLessonsCount } from './lessonProgressSnapshot.service.js';

const USERS = 'users';

export type UserStatistics = {
  total_points: number;
  tasks_completed: number;
  lessons_completed: number;
  average_accuracy: number;
};

/**
 * User statistics. `tasks_completed` / average accuracy use lesson_task_results
 * (legacy user_tasks / task_plan removed).
 */
export async function getUserStatistics(
  supabase: Supabase,
  userId: number
): Promise<UserStatistics> {
  const { data: user, error: userErr } = await supabase
    .from(USERS)
    .select('total_points')
    .eq('id', userId)
    .single();
  if (userErr || !user) {
    return {
      total_points: 0,
      tasks_completed: 0,
      lessons_completed: 0,
      average_accuracy: 0,
    };
  }

  const lessonsCompleted = await getUserCompletedLessonsCount(supabase as any, userId);

  const { data: taskRows, error: taskRowsErr } = await supabase
    .from('lesson_task_results')
    .select('correct, total')
    .eq('user_id', userId)
    .gt('total', 0);
  if (taskRowsErr) throw taskRowsErr;

  const rows = taskRows ?? [];
  const passedRows = rows.filter(
    (r) => Number(r.total) > 0 && Number(r.correct) / Number(r.total) >= 0.8
  );

  let averageAccuracy = 0;
  if (rows.length > 0) {
    const sum = rows.reduce(
      (acc, r) => acc + (Number(r.correct) / Number(r.total)) * 100,
      0
    );
    averageAccuracy = Math.round((sum / rows.length) * 100) / 100;
  }

  return {
    total_points: user.total_points ?? 0,
    tasks_completed: passedRows.length,
    lessons_completed: lessonsCompleted,
    average_accuracy: averageAccuracy,
  };
}
