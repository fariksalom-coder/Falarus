-- Sync with manual removal: legacy per-part cache table is no longer used.
-- Progress is stored in user_word_group_progress and related tables.

DROP TABLE IF EXISTS public.vocabulary_progress;
