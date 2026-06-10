-- Teacher marketplace foundation.
-- Plain PostgreSQL-compatible schema: access control should be enforced by the backend API.

-- Payment products:
-- - teacher_listing: teacher pays to be visible in the public teacher list.
-- - teacher_trial: student pays for a paid trial lesson with a teacher.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_product_code_check'
  ) THEN
    ALTER TABLE public.payments DROP CONSTRAINT payments_product_code_check;
  END IF;
END $$;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_product_code_check
  CHECK (product_code IN ('russian', 'patent', 'vnzh', 'teacher_listing', 'teacher_trial'));

CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  user_id integer PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,

  first_name text NOT NULL,
  last_name text NOT NULL,
  display_name text GENERATED ALWAYS AS (trim(first_name || ' ' || last_name)) STORED,
  age integer NOT NULL CHECK (age BETWEEN 16 AND 99),
  avatar_url text,
  region text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',

  experience_years integer NOT NULL DEFAULT 0 CHECK (experience_years >= 0 AND experience_years <= 80),
  experience_months integer NOT NULL DEFAULT 0 CHECK (experience_months BETWEEN 0 AND 11),
  teaching_format text NOT NULL DEFAULT 'online'
    CHECK (teaching_format IN ('online', 'offline', 'online_offline')),
  headline text NOT NULL DEFAULT '',
  about text NOT NULL DEFAULT '',
  subjects text[] NOT NULL DEFAULT ARRAY[]::text[],
  teaching_levels text[] NOT NULL DEFAULT ARRAY[]::text[],
  languages text[] NOT NULL DEFAULT ARRAY['uz', 'ru']::text[],

  -- Monthly individual course price shown in the teacher profile.
  monthly_course_price_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (monthly_course_price_amount >= 0),
  monthly_course_price_currency text NOT NULL DEFAULT 'RUB' CHECK (monthly_course_price_currency IN ('UZS', 'RUB', 'USD')),

  -- Contacts are shown to the student only after paid trial booking.
  telegram_username text,
  telegram_url text,
  whatsapp_phone_e164 text,
  max_contact text,
  public_phone_e164 text,
  public_email text,
  preferred_contact_method text CHECK (
    preferred_contact_method IS NULL
    OR preferred_contact_method IN ('telegram', 'whatsapp', 'max', 'phone', 'email', 'in_app_chat')
  ),

  profile_status text NOT NULL DEFAULT 'draft'
    CHECK (profile_status IN ('draft', 'pending_review', 'active', 'paused', 'rejected')),
  admin_note text NOT NULL DEFAULT '',
  listing_paid_until timestamptz,
  first_listing_discount_used boolean NOT NULL DEFAULT false,

  rating_avg numeric(3,2) NOT NULL DEFAULT 0 CHECK (rating_avg >= 0 AND rating_avg <= 5),
  rating_count integer NOT NULL DEFAULT 0 CHECK (rating_count >= 0),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_public
  ON public.teacher_profiles (profile_status, listing_paid_until DESC, rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_subjects
  ON public.teacher_profiles USING gin (subjects);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_levels
  ON public.teacher_profiles USING gin (teaching_levels);

CREATE TABLE IF NOT EXISTS public.teacher_listing_plans (
  code text PRIMARY KEY,
  title text NOT NULL,
  duration_days integer NOT NULL CHECK (duration_days > 0),
  price_amount numeric(12,2) NOT NULL CHECK (price_amount >= 0),
  currency text NOT NULL DEFAULT 'UZS' CHECK (currency IN ('UZS', 'RUB', 'USD')),
  is_intro_offer boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.teacher_listing_plans (code, title, duration_days, price_amount, currency, is_intro_offer)
VALUES
  ('teacher_listing_first_month_uzs', 'Birinchi oy uchun o‘qituvchi ro‘yxati', 30, 69000, 'UZS', true),
  ('teacher_listing_month_uzs', 'O‘qituvchi ro‘yxati: 1 oy', 30, 299000, 'UZS', false)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  duration_days = EXCLUDED.duration_days,
  price_amount = EXCLUDED.price_amount,
  currency = EXCLUDED.currency,
  is_intro_offer = EXCLUDED.is_intro_offer,
  is_active = true;

CREATE TABLE IF NOT EXISTS public.teacher_listing_subscriptions (
  id bigserial PRIMARY KEY,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  payment_id bigint REFERENCES public.payments(id) ON DELETE SET NULL,
  plan_code text NOT NULL REFERENCES public.teacher_listing_plans(code),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'refunded')),
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_listing_subscriptions_teacher_status
  ON public.teacher_listing_subscriptions (teacher_user_id, status, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_listing_subscriptions_payment
  ON public.teacher_listing_subscriptions (payment_id);

CREATE TABLE IF NOT EXISTS public.teacher_trial_pricing (
  code text PRIMARY KEY,
  price_rub numeric(12,2) NOT NULL DEFAULT 490 CHECK (price_rub >= 0),
  rub_to_uzs_rate numeric(12,2) NOT NULL DEFAULT 150 CHECK (rub_to_uzs_rate > 0),
  price_uzs numeric(12,2) NOT NULL DEFAULT 73500 CHECK (price_uzs >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.teacher_trial_pricing (code, price_rub, rub_to_uzs_rate, price_uzs)
VALUES ('teacher_trial_default', 490, 150, 73500)
ON CONFLICT (code) DO UPDATE SET
  price_rub = EXCLUDED.price_rub,
  rub_to_uzs_rate = EXCLUDED.rub_to_uzs_rate,
  price_uzs = EXCLUDED.price_uzs,
  is_active = true;

CREATE TABLE IF NOT EXISTS public.teacher_availability_rules (
  id bigserial PRIMARY KEY,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_minutes integer NOT NULL DEFAULT 60 CHECK (slot_minutes BETWEEN 15 AND 240),
  timezone text NOT NULL DEFAULT 'Asia/Tashkent',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_availability_rules_time_order CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_teacher_availability_rules_teacher_weekday
  ON public.teacher_availability_rules (teacher_user_id, weekday, is_active);

CREATE TABLE IF NOT EXISTS public.teacher_availability_exceptions (
  id bigserial PRIMARY KEY,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  start_time time,
  end_time time,
  is_available boolean NOT NULL DEFAULT false,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_availability_exceptions_time_order
    CHECK (start_time IS NULL OR end_time IS NULL OR start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_teacher_availability_exceptions_teacher_date
  ON public.teacher_availability_exceptions (teacher_user_id, exception_date);

CREATE TABLE IF NOT EXISTS public.teacher_trial_lessons (
  id bigserial PRIMARY KEY,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  student_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  payment_id bigint REFERENCES public.payments(id) ON DELETE SET NULL,

  requested_starts_at timestamptz,
  scheduled_starts_at timestamptz,
  scheduled_ends_at timestamptz,
  timezone text NOT NULL DEFAULT 'Asia/Tashkent',

  price_rub_snapshot numeric(12,2) NOT NULL DEFAULT 490 CHECK (price_rub_snapshot >= 0),
  rub_to_uzs_rate_snapshot numeric(12,2) NOT NULL DEFAULT 150 CHECK (rub_to_uzs_rate_snapshot > 0),
  price_uzs_snapshot numeric(12,2) NOT NULL DEFAULT 73500 CHECK (price_uzs_snapshot >= 0),
  paid_currency text CHECK (paid_currency IS NULL OR paid_currency IN ('UZS', 'RUB', 'USD')),

  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (
      status IN (
        'pending_payment',
        'paid',
        'teacher_notified',
        'scheduled',
        'completed_by_teacher',
        'completed',
        'cancelled',
        'refunded'
      )
    ),

  student_phone_e164 text,
  student_email text,
  student_message text NOT NULL DEFAULT '',
  contact_shared_at timestamptz,
  teacher_notified_at timestamptz,
  completed_by_teacher_at timestamptz,
  completed_at timestamptz,
  cancelled_by integer REFERENCES public.users(id) ON DELETE SET NULL,
  cancellation_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_trial_lessons_no_self CHECK (teacher_user_id <> student_user_id),
  CONSTRAINT teacher_trial_lessons_time_order CHECK (
    scheduled_starts_at IS NULL
    OR scheduled_ends_at IS NULL
    OR scheduled_starts_at < scheduled_ends_at
  )
);

CREATE INDEX IF NOT EXISTS idx_teacher_trial_lessons_teacher_status
  ON public.teacher_trial_lessons (teacher_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_trial_lessons_student_status
  ON public.teacher_trial_lessons (student_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_trial_lessons_payment
  ON public.teacher_trial_lessons (payment_id);

CREATE TABLE IF NOT EXISTS public.teacher_trial_contacts_shared (
  trial_lesson_id bigint PRIMARY KEY REFERENCES public.teacher_trial_lessons(id) ON DELETE CASCADE,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  student_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  telegram_username text,
  telegram_url text,
  whatsapp_phone_e164 text,
  max_contact text,
  public_phone_e164 text,
  public_email text,
  preferred_contact_method text,
  shared_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_trial_contacts_shared_student
  ON public.teacher_trial_contacts_shared (student_user_id, shared_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_trial_contacts_shared_teacher
  ON public.teacher_trial_contacts_shared (teacher_user_id, shared_at DESC);

CREATE TABLE IF NOT EXISTS public.teacher_conversations (
  id bigserial PRIMARY KEY,
  trial_lesson_id bigint REFERENCES public.teacher_trial_lessons(id) ON DELETE SET NULL,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  student_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_conversations_no_self CHECK (teacher_user_id <> student_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_conversations_trial_unique
  ON public.teacher_conversations (trial_lesson_id)
  WHERE trial_lesson_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teacher_conversations_student
  ON public.teacher_conversations (student_user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_conversations_teacher
  ON public.teacher_conversations (teacher_user_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.teacher_conversation_messages (
  id bigserial PRIMARY KEY,
  conversation_id bigint NOT NULL REFERENCES public.teacher_conversations(id) ON DELETE CASCADE,
  sender_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 3000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_teacher_conversation_messages_conversation_created
  ON public.teacher_conversation_messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.teacher_student_reviews (
  id bigserial PRIMARY KEY,
  trial_lesson_id bigint NOT NULL UNIQUE REFERENCES public.teacher_trial_lessons(id) ON DELETE CASCADE,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  student_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  liked_lesson boolean,
  lesson_platform text CHECK (
    lesson_platform IS NULL OR lesson_platform IN ('telegram', 'whatsapp', 'max', 'zoom', 'google_meet', 'phone', 'other')
  ),
  lesson_duration_minutes integer CHECK (lesson_duration_minutes IS NULL OR lesson_duration_minutes > 0),
  what_liked text NOT NULL DEFAULT '',
  what_was_missing text NOT NULL DEFAULT '',
  disadvantages text NOT NULL DEFAULT '',
  opinion text NOT NULL DEFAULT '',
  enrolled_monthly_course boolean,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_student_reviews_teacher_created
  ON public.teacher_student_reviews (teacher_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_student_reviews_student_created
  ON public.teacher_student_reviews (student_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.teacher_lesson_feedback (
  id bigserial PRIMARY KEY,
  trial_lesson_id bigint NOT NULL UNIQUE REFERENCES public.teacher_trial_lessons(id) ON DELETE CASCADE,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  student_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  lesson_went_well boolean,
  positives text NOT NULL DEFAULT '',
  negatives text NOT NULL DEFAULT '',
  difficulties text NOT NULL DEFAULT '',
  next_steps text NOT NULL DEFAULT '',
  teacher_comment text NOT NULL DEFAULT '',
  student_enrolled_monthly_course boolean,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_lesson_feedback_teacher_created
  ON public.teacher_lesson_feedback (teacher_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_lesson_feedback_student_created
  ON public.teacher_lesson_feedback (student_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.teacher_monthly_course_confirmations (
  id bigserial PRIMARY KEY,
  trial_lesson_id bigint NOT NULL UNIQUE REFERENCES public.teacher_trial_lessons(id) ON DELETE CASCADE,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  student_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_claimed_enrolled boolean,
  teacher_claimed_enrolled boolean,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'matched_yes', 'matched_no', 'conflict', 'resolved')),
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_monthly_course_confirmations_status
  ON public.teacher_monthly_course_confirmations (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_monthly_course_confirmations_teacher
  ON public.teacher_monthly_course_confirmations (teacher_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_monthly_course_confirmations_student
  ON public.teacher_monthly_course_confirmations (student_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.teacher_notifications (
  id bigserial PRIMARY KEY,
  recipient_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (
    type IN (
      'teacher_profile_status',
      'teacher_listing_payment',
      'trial_lesson_paid',
      'trial_lesson_teacher_notified',
      'trial_lesson_completed',
      'student_review_available',
      'teacher_feedback_required',
      'monthly_course_confirmation_conflict',
      'chat_message'
    )
  ),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  entity_type text,
  entity_id bigint,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_notifications_recipient_created
  ON public.teacher_notifications (recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_notifications_unread
  ON public.teacher_notifications (recipient_user_id, read_at)
  WHERE read_at IS NULL;
