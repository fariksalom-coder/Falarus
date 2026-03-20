-- 022_remove_deleted_core_tables.sql
-- Sync migrations with manual DB deletions:
-- current DB has no `lessons`, `exercises`, `vocabulary`, `lesson_plan`, `user_lessons`
-- We must drop them (and drop referencing FKs first) so `supabase db push` doesn't recreate them.

DO $$
DECLARE
  parent_oid oid;
  r record;
BEGIN
  -- lessons <- exercises.user_progress (FKs)
  SELECT c.oid INTO parent_oid
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'lessons';

  IF parent_oid IS NOT NULL THEN
    FOR r IN
      SELECT conrelid::regclass AS child_table, conname AS constraint_name
      FROM pg_constraint
      WHERE confrelid = parent_oid AND contype = 'f'
    LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.child_table, r.constraint_name);
    END LOOP;
  END IF;
END $$;

DROP TABLE IF EXISTS public.exercises;
DROP TABLE IF EXISTS public.lessons;

-- lesson_plan <- task_plan.user_lessons (FKs)
DO $$
DECLARE
  parent_oid oid;
  r record;
BEGIN
  SELECT c.oid INTO parent_oid
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'lesson_plan';

  IF parent_oid IS NOT NULL THEN
    FOR r IN
      SELECT conrelid::regclass AS child_table, conname AS constraint_name
      FROM pg_constraint
      WHERE confrelid = parent_oid AND contype = 'f'
    LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.child_table, r.constraint_name);
    END LOOP;
  END IF;
END $$;

DROP TABLE IF EXISTS public.user_lessons;
DROP TABLE IF EXISTS public.lesson_plan;

-- vocabulary <- (usually none in this repo, but drop referencing FKs for safety)
DO $$
DECLARE
  parent_oid oid;
  r record;
BEGIN
  SELECT c.oid INTO parent_oid
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'vocabulary';

  IF parent_oid IS NOT NULL THEN
    FOR r IN
      SELECT conrelid::regclass AS child_table, conname AS constraint_name
      FROM pg_constraint
      WHERE confrelid = parent_oid AND contype = 'f'
    LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.child_table, r.constraint_name);
    END LOOP;
  END IF;
END $$;

DROP TABLE IF EXISTS public.vocabulary;

