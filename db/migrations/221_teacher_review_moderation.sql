-- O'QUVCHI SHARHLARI MODERATSIYASI.
--
-- Darsdan keyingi sharh endi darhol ochiq sahifaga chiqmaydi: admin tasdiqlagandan keyin
-- ko'rinadi va o'qituvchi reytingiga qo'shiladi. O'quvchi sharhni o'zgartirsa — qayta tekshiruvga.
-- Migratsiyagacha yozilgan sharhlar (ochiq turganlari) tasdiqlangan hisoblanadi.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.teacher_lesson_reviews
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS moderation_note text,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_lesson_reviews_status_check') THEN
    -- Eski sharhlar: yashirilmagani — tasdiqlangan, yashirilgani — rad etilgan.
    UPDATE public.teacher_lesson_reviews SET status = CASE WHEN hidden THEN 'rejected' ELSE 'approved' END;
    ALTER TABLE public.teacher_lesson_reviews
      ADD CONSTRAINT teacher_lesson_reviews_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teacher_lesson_reviews_status
  ON public.teacher_lesson_reviews (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_lesson_reviews_approved
  ON public.teacher_lesson_reviews (teacher_user_id, created_at DESC) WHERE status = 'approved';

-- «Yangi sharh» bildirishnomasi o'qituvchiga hech qachon yetmagan: tur ro'yxatda yo'q edi.
ALTER TABLE public.teacher_notifications DROP CONSTRAINT IF EXISTS teacher_notifications_type_check;
ALTER TABLE public.teacher_notifications ADD CONSTRAINT teacher_notifications_type_check CHECK (
  type IN (
    'teacher_profile_status', 'teacher_listing_payment', 'trial_lesson_paid', 'trial_lesson_teacher_notified',
    'trial_lesson_completed', 'student_review_available', 'teacher_feedback_required', 'monthly_course_confirmation_conflict',
    'chat_message', 'meet_room_assigned', 'meet_session_scheduled', 'lesson_paid', 'lesson_cancelled', 'lesson_completed',
    'withdrawal_processed', 'lesson_review'
  )
);

COMMIT;
