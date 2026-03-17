import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccessInfo } from './subscription.service';
import * as subscriptionService from './subscription.service';
import * as vocabRepo from '../repositories/vocabularyRepository';

export type LessonWithLock = {
  id: number;
  level?: string;
  module_name?: string;
  title?: string;
  content_uz?: string | null;
  content_ru?: string | null;
  locked: boolean;
  tasks_count?: number;
};

export type SubtopicWithLock = {
  id: string;
  topic_id?: string;
  title?: string;
  locked: boolean;
  [k: string]: unknown;
};

/**
 * Mark lessons with locked based on access. Free = first N by id.
 */
export function applyLessonsLock(
  lessons: Array<{ id: number; [k: string]: unknown }>,
  access: AccessInfo
): LessonWithLock[] {
  const limit = access.subscription_active ? Infinity : access.lessons_free_limit;
  return lessons.map((l) => ({
    ...l,
    locked: l.id > limit,
  }));
}

/**
 * Mark subtopics with locked. Subscription = all unlocked. Free = topic 1, subtopic 1 only.
 */
export function applySubtopicsLock(
  subtopics: Array<{ id: string; topic_id?: string; [k: string]: unknown }>,
  topicId: string,
  access: AccessInfo
): SubtopicWithLock[] {
  if (access.subscription_active) {
    return subtopics.map((s) => ({ ...s, locked: false }));
  }
  const freeTopicId = access.vocabulary_free_topic_id;
  const freeSubtopicId = access.vocabulary_free_subtopic_id;
  const isFreeTopic = freeTopicId === topicId;
  return subtopics.map((s) => {
    const locked = isFreeTopic ? !(freeSubtopicId === s.id) : true;
    return { ...s, locked };
  });
}

/**
 * Check if user can access full lesson content.
 */
export function canAccessLesson(lessonId: number, access: AccessInfo): boolean {
  if (access.subscription_active) return true;
  return lessonId <= access.lessons_free_limit;
}

/**
 * Check if user can access full subtopic content.
 * Free tier: only the first topic's first subtopic (by id) is allowed.
 * Uses String() so DB number/string id types do not break the check.
 */
export function canAccessSubtopic(
  topicId: string,
  subtopicId: string,
  access: AccessInfo
): boolean {
  if (access.subscription_active) return true;
  const freeTopicId = access.vocabulary_free_topic_id;
  const freeSubtopicId = access.vocabulary_free_subtopic_id;
  if (freeTopicId == null || freeSubtopicId == null) return false;
  return (
    String(freeTopicId) === String(topicId) &&
    String(freeSubtopicId) === String(subtopicId)
  );
}

export type LessonPreview = {
  title: string;
  description: string;
  preview_words: Array<{ word: string; translation: string }>;
  tasks_preview: number;
};

/**
 * Get lesson preview (title, description, 2 words sample, 1 task preview).
 */
export async function getLessonPreview(
  supabase: SupabaseClient,
  lessonId: number
): Promise<LessonPreview | null> {
  const { data: lesson, error: le } = await supabase
    .from('lessons')
    .select('id, title, content_uz, content_ru')
    .eq('id', lessonId)
    .single();
  if (le || !lesson) return null;
  const description =
    (lesson.content_ru || lesson.content_uz || '').slice(0, 120) || 'Dars mazmuni';
  const { count } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('lesson_id', lessonId);
  const tasksCount = count ?? 0;
  return {
    title: lesson.title || 'Dars',
    description,
    preview_words: [],
    tasks_preview: Math.min(1, tasksCount),
  };
}

export type SubtopicPreview = {
  title: string;
  preview_words: Array<{ word: string; translation: string }>;
};

/**
 * Get subtopic preview: title + 3 words from first word group.
 */
export async function getSubtopicPreview(
  supabase: SupabaseClient,
  subtopicId: string
): Promise<SubtopicPreview | null> {
  const { data: subtopic } = await supabase
    .from('vocabulary_subtopics')
    .select('id, title')
    .eq('id', subtopicId)
    .single();
  if (!subtopic) return null;
  const groups = await vocabRepo.getWordGroupsBySubtopic(supabase, subtopicId);
  let preview_words: Array<{ word: string; translation: string }> = [];
  if (groups.length > 0) {
    const words = await vocabRepo.getWordsByWordGroup(supabase, groups[0].id);
    preview_words = words.slice(0, 3).map((w) => ({ word: w.word, translation: w.translation }));
  }
  return {
    title: subtopic.title || 'Mavzu',
    preview_words,
  };
}
