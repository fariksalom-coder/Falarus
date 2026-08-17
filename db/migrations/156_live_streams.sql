-- 156_live_streams.sql
--
-- JONLI EFIR (vebinar). Support ochadi, ro'yxatdan o'tgan har qanday
-- foydalanuvchi kirib tomosha qiladi va yozma chatda savol beradi.
--
-- NIMA UCHUN `teacher_meet_sessions` EMAS: u dars jadvali va har bir yozuv
-- `teacher_user_id` ga MAJBURIY bog'langan — dars faqat o'sha ustozning
-- o'quvchilariga ko'rinadi. Efir esa hech qaysi ustozga tegishli emas va
-- hammaga ochiq, ya'ni boshqa qoidalar bilan yashaydi.
--
-- XAVFSIZLIK ESLATMASI: Jitsi'da autentifikatsiya "jitsi-anonymous", ya'ni
-- xonaga BIRINCHI kirgan odam moderator bo'ladi. Shuning uchun `room_slug`
-- tasodifiy va u talabaga FAQAT efir `live` bo'lgandan keyin beriladi —
-- support har doim birinchi kiradi va moderator bo'lib qoladi.

CREATE TABLE IF NOT EXISTS public.live_streams (
  id bigserial PRIMARY KEY,

  -- Jitsi xona nomi. Taxmin qilib bo'lmasligi uchun tasodifiy generatsiya
  -- qilinadi (server tomonda), shuning uchun global unikal.
  room_slug text NOT NULL UNIQUE CHECK (char_length(room_slug) BETWEEN 8 AND 80),

  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '',

  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),

  -- Rejalashtirilgan vaqt. Darhol boshlangan efirda NULL bo'lishi mumkin.
  starts_at timestamptz,
  duration_minutes integer NOT NULL DEFAULT 60
    CHECK (duration_minutes BETWEEN 10 AND 300),

  started_at timestamptz,
  ended_at timestamptz,

  created_by_admin_id integer,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Rejalashtirilgan efirda vaqt ko'rsatilishi shart; darhol boshlanganda
  -- `started_at` bilan yashaydi.
  CONSTRAINT live_streams_time_check
    CHECK (status <> 'scheduled' OR starts_at IS NOT NULL)
);

-- Talabaga ko'rsatiladigan asosiy so'rov: "hozir jonli bormi" va
-- "keyingi efirlar qachon".
CREATE INDEX IF NOT EXISTS idx_live_streams_status_starts
  ON public.live_streams (status, starts_at);

-- Bir vaqtda faqat BITTA efir jonli bo'lsin: ikkita efir bir vaqtda ochilsa
-- talabada qaysi banner chiqishi noaniq bo'lardi va support ikkiga bo'linardi.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_live_streams_single_live
  ON public.live_streams ((status))
  WHERE status = 'live';
