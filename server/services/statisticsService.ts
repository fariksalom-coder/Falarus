import type { Supabase } from '../types/progress';

const USERS = 'users';
const USER_TASKS = 'user_tasks';
const USER_LESSONS = 'user_lessons';

export type UserStatistics = {
  total_points: number;
  tasks_completed: number;
  lessons_completed: number;
  average_accuracy: number;
};

/**
 * Get user statistics: total_points, tasks_completed, lessons_completed, average_accuracy.
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

  const { count: tasksCompleted, error: tasksErr } = await supabase
    .from(USER_TASKS)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'PASSED');
  if (tasksErr) throw tasksErr;

  const { count: lessonsCompleted, error: lessonsErr } = await supabase
    .from(USER_LESSONS)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'COMPLETED');
  if (lessonsErr) throw lessonsErr;

  const { data: taskRows, error: taskRowsErr } = await supabase
    .from(USER_TASKS)
    .select('percentage, total_questions')
    .eq('user_id', userId)
    .gt('total_questions', 0);
  if (taskRowsErr) throw taskRowsErr;

  let averageAccuracy = 0;
  if (taskRows && taskRows.length > 0) {
    const sum = taskRows.reduce((acc, r) => acc + (r.percentage ?? 0), 0);
    averageAccuracy = Math.round((sum / taskRows.length) * 100) / 100;
  }

  return {
    total_points: user.total_points ?? 0,
    tasks_completed: tasksCompleted ?? 0,
    lessons_completed: lessonsCompleted ?? 0,
    average_accuracy: averageAccuracy,
  };
}
