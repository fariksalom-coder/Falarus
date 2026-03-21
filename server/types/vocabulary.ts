import type { SupabaseClient } from '@supabase/supabase-js';

export type Supabase = SupabaseClient;

export type VocabularyTopicRow = {
  id: string;
  title: string;
};

export type VocabularySubtopicRow = {
  id: string;
  topic_id: string;
  title: string;
  slug: string;
};

export type VocabularyWordGroupRow = {
  id: number;
  subtopic_id: string;
  part_id: string;
  title: string;
  total_words: number;
};

export type VocabularyWordRow = {
  id: number;
  word_group_id: number;
  word: string;
  translation: string;
};

export type UserWordGroupProgressRow = {
  id: number;
  user_id: number;
  word_group_id: number;
  learned_words: number;
  total_words: number;
  flashcards_completed: boolean;
  flashcards_known: number;
  flashcards_unknown: number;
  test_best_correct: number;
  test_last_correct: number;
  test_last_incorrect: number;
  test_last_percentage: number;
  test_passed: boolean;
  match_completed: boolean;
  progress_percent: number;
  updated_at: string;
};

export type UserSubtopicProgressRow = {
  id: number;
  user_id: number;
  subtopic_id: string;
  learned_words: number;
  total_words: number;
  progress_percent: number;
  updated_at: string;
};

export type UserTopicProgressRow = {
  id: number;
  user_id: number;
  topic_id: string;
  learned_words: number;
  total_words: number;
  progress_percent: number;
  updated_at: string;
};

export type VocabularyTasksStatus = {
  flashcards_status: 'completed' | 'not_started';
  test_status: 'locked' | 'not_started' | 'completed';
  match_status: 'locked' | 'not_started' | 'completed';
  learned_words: number;
  total_words: number;
  test_best_correct: number;
  match_unlocked: boolean;
};
