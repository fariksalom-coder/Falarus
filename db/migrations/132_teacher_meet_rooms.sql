-- 132_teacher_meet_rooms.sql
-- Platforma ichidagi video darslar ("met"):
--   1. Admin xonalarni ko'plab yaratadi (band emas holatda turadi).
--   2. Admin xonani o'qituvchiga biriktiradi (yo'naltiradi).
--   3. O'qituvchi xonaga dars vaqtlarini qo'shadi.
--   4. Xona va darslar faqat shu o'qituvchiga yozilgan o'quvchilarga ko'rinadi
--      (teacher_trial_lessons: to'langan/rejalashtirilgan/yakunlangan).
-- Kirish huquqi backend API darajasida tekshiriladi.

CREATE TABLE IF NOT EXISTS public.teacher_meet_rooms (
  id bigserial PRIMARY KEY,

  -- Video provayder xonasining nomi (Jitsi room name). Global unikal bo'lishi shart.
  room_slug text NOT NULL UNIQUE CHECK (char_length(room_slug) BETWEEN 6 AND 80),
  provider text NOT NULL DEFAULT 'jitsi' CHECK (provider IN ('jitsi')),

  title text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',

  -- NULL = hali hech kimga biriktirilmagan (admin zaxirasi).
  teacher_user_id integer REFERENCES public.teacher_profiles(user_id) ON DELETE SET NULL,

  status text NOT NULL DEFAULT 'free'
    CHECK (status IN ('free', 'assigned', 'paused', 'archived')),

  created_by_admin_id integer,
  assigned_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Biriktirilgan xonada o'qituvchi bo'lishi shart, bo'sh xonada bo'lmasligi.
  CONSTRAINT teacher_meet_rooms_status_teacher CHECK (
    (status = 'free' AND teacher_user_id IS NULL)
    OR (status <> 'free' AND teacher_user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_teacher_meet_rooms_teacher
  ON public.teacher_meet_rooms (teacher_user_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_meet_rooms_status_created
  ON public.teacher_meet_rooms (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.teacher_meet_sessions (
  id bigserial PRIMARY KEY,
  room_id bigint NOT NULL REFERENCES public.teacher_meet_rooms(id) ON DELETE CASCADE,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,

  title text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 10 AND 300),
  timezone text NOT NULL DEFAULT 'Asia/Tashkent',

  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  created_by text NOT NULL DEFAULT 'teacher' CHECK (created_by IN ('teacher', 'admin')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_meet_sessions_teacher_start
  ON public.teacher_meet_sessions (teacher_user_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_meet_sessions_room_start
  ON public.teacher_meet_sessions (room_id, starts_at DESC);

-- Bildirishnoma turlariga video dars hodisalarini qo'shamiz.
ALTER TABLE public.teacher_notifications
  DROP CONSTRAINT IF EXISTS teacher_notifications_type_check;

ALTER TABLE public.teacher_notifications
  ADD CONSTRAINT teacher_notifications_type_check CHECK (
    type IN (
      'teacher_profile_status',
      'teacher_listing_payment',
      'trial_lesson_paid',
      'trial_lesson_teacher_notified',
      'trial_lesson_completed',
      'student_review_available',
      'teacher_feedback_required',
      'monthly_course_confirmation_conflict',
      'chat_message',
      'meet_room_assigned',
      'meet_session_scheduled'
    )
  );
