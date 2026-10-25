-- 1) Paid lessons (213) pay through Rahmat with product_code 'teacher_lesson', but the payments
--    CHECK from 121 never listed it: every checkout failed on INSERT.
-- 2) An approved teacher's profile edits wait for a moderator in teacher_profile_revisions
--    (one open revision per teacher) and reach the catalog only after approval.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_product_code_check;
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_product_code_check
      CHECK (product_code IN ('russian', 'patent', 'vnzh', 'teacher_listing', 'teacher_trial', 'teacher_lesson'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.teacher_profile_revisions (
  id bigserial PRIMARY KEY,
  teacher_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- teacher_profiles column -> new value (only whitelisted columns are ever applied).
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  review_comment text CHECK (length(review_comment) <= 1000),
  decided_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS teacher_profile_revisions_open_idx
  ON public.teacher_profile_revisions (teacher_user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS teacher_profile_revisions_teacher_idx
  ON public.teacher_profile_revisions (teacher_user_id, created_at DESC);

-- The app connects as `falarus`; keep the new table owned by it when run as postgres.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'falarus') THEN
    ALTER TABLE public.teacher_profile_revisions OWNER TO falarus;
    ALTER SEQUENCE public.teacher_profile_revisions_id_seq OWNER TO falarus;
  END IF;
END $$;

COMMIT;
