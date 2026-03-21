-- Align with manual removals: lesson completion uses lesson_task_results;
-- vocabulary aggregates use user_word_group_progress only (no subtopic/topic cache tables).
-- task_plan / user_tasks were unused by the current app.

DROP TABLE IF EXISTS public.user_tasks CASCADE;
DROP TABLE IF EXISTS public.task_plan CASCADE;
DROP TABLE IF EXISTS public.user_progress CASCADE;
DROP TABLE IF EXISTS public.user_subtopic_progress CASCADE;
DROP TABLE IF EXISTS public.user_topic_progress CASCADE;
