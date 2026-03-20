import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccessInfo } from './subscription.js';
import {
  FREE_VOCAB_SUBTOPIC_ID,
  FREE_VOCAB_TOPIC_ID,
} from './freeVocabularyIds.js';
import { LESSONS } from '../../src/data/lessonsList.js';
import { courseData } from '../../src/data/courseData.ts';

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
  [key: string]: unknown;
};

export function applyLessonsLock(
  lessons: Array<{ id: number; [key: string]: unknown }>,
  access: AccessInfo
): LessonWithLock[] {
  const limit = access.subscription_active ? Infinity : access.lessons_free_limit;
  return lessons.map((lesson) => ({
    ...lesson,
    locked: lesson.id > limit,
  }));
}

export function applySubtopicsLock(
  subtopics: Array<{ id: string; topic_id?: string; [key: string]: unknown }>,
  topicId: string,
  access: AccessInfo
): SubtopicWithLock[] {
  if (access.subscription_active) {
    return subtopics.map((subtopic) => ({ ...subtopic, locked: false }));
  }
  const freeTopicId = access.vocabulary_free_topic_id;
  const freeSubtopicId = access.vocabulary_free_subtopic_id;
  const isFreeTopic = freeTopicId === topicId;

  return subtopics.map((subtopic) => {
    if (!isFreeTopic) {
      return { ...subtopic, locked: true };
    }
    const salomAlwaysFree =
      String(topicId) === FREE_VOCAB_TOPIC_ID &&
      String(subtopic.id) === FREE_VOCAB_SUBTOPIC_ID;
    const matchesAccessPair =
      freeSubtopicId != null && String(freeSubtopicId) === String(subtopic.id);
    return { ...subtopic, locked: !(salomAlwaysFree || matchesAccessPair) };
  });
}

export function canAccessLesson(lessonId: number, access: AccessInfo): boolean {
  if (access.subscription_active) return true;
  return lessonId <= access.lessons_free_limit;
}

export function canAccessSubtopic(
  topicId: string,
  subtopicId: string,
  access: AccessInfo
): boolean {
  if (access.subscription_active) return true;
  if (
    String(topicId) === FREE_VOCAB_TOPIC_ID &&
    String(subtopicId) === FREE_VOCAB_SUBTOPIC_ID
  ) {
    return true;
  }
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

type CourseLesson = {
  title: string;
  content_uz: string;
  content_ru: string;
};

const courseLessonCatalog: CourseLesson[] = courseData.flatMap((level) =>
  level.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      title: lesson.title,
      content_uz: lesson.content_uz ?? '',
      content_ru: lesson.content_ru ?? '',
    }))
  )
);

export async function getLessonPreview(
  supabase: SupabaseClient,
  lessonId: number
): Promise<LessonPreview | null> {
  void supabase; // not used: lesson content is served from static `courseData`

  const meta = LESSONS.find((l) => l.id === lessonId);
  if (!meta) return null;

  const courseLesson = courseLessonCatalog[lessonId - 1];
  const description =
    (courseLesson?.content_ru || courseLesson?.content_uz || '').slice(0, 120) ||
    'Dars mazmuni';

  return {
    title: courseLesson?.title || meta.title || 'Dars',
    description,
    preview_words: [],
    tasks_preview: Math.min(1, meta.exercisesTotal ?? 0),
  };
}

export type SubtopicPreview = {
  title: string;
  preview_words: Array<{ word: string; translation: string }>;
};

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

  const { data: groups, error: groupsError } = await supabase
    .from('vocabulary_word_groups')
    .select('id')
    .eq('subtopic_id', subtopicId)
    .order('id')
    .limit(1);
  if (groupsError) throw groupsError;

  let preview_words: Array<{ word: string; translation: string }> = [];
  const firstGroupId = groups?.[0]?.id;
  if (firstGroupId != null) {
    const { data: words, error: wordsError } = await supabase
      .from('vocabulary_words')
      .select('word, translation')
      .eq('word_group_id', firstGroupId)
      .order('id')
      .limit(3);
    if (wordsError) throw wordsError;
    preview_words = (words ?? []).map((word) => ({
      word: String(word.word ?? ''),
      translation: String(word.translation ?? ''),
    }));
  }

  return {
    title: subtopic.title || 'Mavzu',
    preview_words,
  };
}
