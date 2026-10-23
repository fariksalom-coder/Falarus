-- PULLIK DARSLAR PLATFORMA ORQALI + O'QITUVCHI BALANSI.
--
-- O'quvchi o'qituvchi jadvalidan vaqt tanlaydi, Rahmat orqali to'laydi; dars FalaRus
-- video xonasida (o'z Jitsi) o'tadi. Dars yakunlanganda o'qituvchi balansiga
-- narx − komissiya yoziladi. Balans — jurnal (har harakat alohida qator), o'qituvchi
-- pul yechishga ariza beradi, admin uni qo'lda to'laydi.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.teacher_lessons (
  id bigserial PRIMARY KEY,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE RESTRICT,
  student_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  price_uzs integer NOT NULL CHECK (price_uzs > 0),
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid', 'disputed', 'completed', 'cancelled', 'refunded', 'expired')),
  payment_id bigint REFERENCES public.payments(id) ON DELETE SET NULL,
  -- Jitsi xonasi: taxmin qilib bo'lmaydigan nom, faqat ishtirokchilarga beriladi.
  room_slug text NOT NULL UNIQUE,
  student_message text NOT NULL DEFAULT '',
  -- Yakunlanganda qotiriladi: nechanchi dars, qaysi stavka, kimga qancha.
  lesson_number integer,
  commission_percent numeric(5,2),
  teacher_amount_uzs integer,
  platform_amount_uzs integer,
  completed_at timestamptz,
  completed_by text,
  dispute_reason text,
  cancelled_at timestamptz,
  cancelled_by text,
  cancel_reason text,
  refund_due boolean NOT NULL DEFAULT false,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
-- Bir vaqtga ikki o'quvchi yozilmasin (to'lov kutilayotgan bron ham joyni band qiladi).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_teacher_lessons_slot
  ON public.teacher_lessons (teacher_user_id, starts_at)
  WHERE status IN ('pending_payment', 'paid', 'disputed', 'completed');
CREATE INDEX IF NOT EXISTS idx_teacher_lessons_teacher ON public.teacher_lessons (teacher_user_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_lessons_student ON public.teacher_lessons (student_user_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_lessons_payment ON public.teacher_lessons (payment_id) WHERE payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.teacher_withdrawals (
  id bigserial PRIMARY KEY,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE RESTRICT,
  amount_uzs integer NOT NULL CHECK (amount_uzs > 0),
  -- Karta raqami va egasi: admin pulni shu rekvizitga o'tkazadi.
  card_number text NOT NULL,
  card_holder text NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'paid', 'rejected')),
  admin_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by text
);
CREATE INDEX IF NOT EXISTS idx_teacher_withdrawals_status ON public.teacher_withdrawals (status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_withdrawals_teacher ON public.teacher_withdrawals (teacher_user_id, requested_at DESC);

-- Balans jurnali: balans = summa. Dars uchun yozuv bitta (lesson_id unikal) — qayta yozilmaydi.
CREATE TABLE IF NOT EXISTS public.teacher_balance_entries (
  id bigserial PRIMARY KEY,
  teacher_user_id integer NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('lesson', 'withdrawal', 'withdrawal_return', 'adjustment')),
  amount_uzs integer NOT NULL CHECK (amount_uzs <> 0),
  lesson_id bigint UNIQUE REFERENCES public.teacher_lessons(id) ON DELETE RESTRICT,
  withdrawal_id bigint REFERENCES public.teacher_withdrawals(id) ON DELETE RESTRICT,
  note text NOT NULL DEFAULT '',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_balance_entries_teacher ON public.teacher_balance_entries (teacher_user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_teacher_balance_withdrawal_kind ON public.teacher_balance_entries (withdrawal_id, kind) WHERE withdrawal_id IS NOT NULL;

-- Sinov darsi ham FalaRus xonasida o'tadi.
ALTER TABLE public.teacher_trial_lessons ADD COLUMN IF NOT EXISTS room_slug text;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_teacher_trial_lessons_room ON public.teacher_trial_lessons (room_slug) WHERE room_slug IS NOT NULL;

-- Yangi bildirishnoma turlari: dars to'landi, dars yakunlandi, pul yechish natijasi.
ALTER TABLE public.teacher_notifications DROP CONSTRAINT IF EXISTS teacher_notifications_type_check;
ALTER TABLE public.teacher_notifications ADD CONSTRAINT teacher_notifications_type_check CHECK (
  type IN (
    'teacher_profile_status', 'teacher_listing_payment', 'trial_lesson_paid', 'trial_lesson_teacher_notified',
    'trial_lesson_completed', 'student_review_available', 'teacher_feedback_required', 'monthly_course_confirmation_conflict',
    'chat_message', 'meet_room_assigned', 'meet_session_scheduled',
    'lesson_paid', 'lesson_cancelled', 'lesson_completed', 'withdrawal_processed'
  )
);

COMMIT;
