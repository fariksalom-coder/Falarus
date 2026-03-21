-- Optional repair: set public slug = primary key id for every subtopic.
-- Use when title-derived slugs in 025 differ from route segments (static VOCABULARY_TOPICS ids).
-- Safe while `id` values are unique URL-safe strings (this app’s seed).

UPDATE vocabulary_subtopics
SET
  slug = id;
