import type { SupabaseClient } from '@supabase/supabase-js';

export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PASSED';
export type LessonStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type UserTaskRow = {
  id: number;
  user_id: number;
  task_id: number;
  correct_answers: number;
  total_questions: number;
  percentage: number;
  points: number;
  status: TaskStatus;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
};

export type UserLessonRow = {
  id: number;
  user_id: number;
  lesson_id: number;
  status: LessonStatus;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
};

export type TaskPlanRow = {
  id: number;
  lesson_id: number;
  title: string;
  questions_count: number;
};

export type LessonProgressResponse = {
  lessonId: number;
  status: LessonStatus;
  tasks: Array<
    | { id: number; status: TaskStatus; percentage?: number }
    | { id: number; status: 'NOT_STARTED' }
  >;
};

export type Supabase = SupabaseClient;
