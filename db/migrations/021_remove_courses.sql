-- 021_remove_courses.sql
-- Sync migrations with manual DB changes:
-- user already removed `public.courses`.
-- We must drop the FK from lesson_plan.course_id -> courses(id) before we can
-- drop `courses`. This migration is idempotent.

DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT tc.constraint_name
    INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
   AND tc.table_schema = ccu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'lesson_plan'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.column_name = 'course_id'
    AND ccu.table_name = 'courses';

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.lesson_plan DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

DROP TABLE IF EXISTS public.courses;

