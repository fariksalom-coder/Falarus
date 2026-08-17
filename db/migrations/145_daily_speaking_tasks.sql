-- 145_daily_speaking_tasks.sql
--
-- 4-blok (gapirish) TESTIDAN KEYIN ochiladigan qo'shimcha gapirish
-- topshiriqlari. Ruscha topshiriq (`prompt_ru`) beriladi, o'zbekcha izoh
-- (`prompt_uz`) ixtiyoriy — tushunishga yordam uchun.
--
-- Tekshiruvni to'liq AI qiladi: etalon javob YO'Q (gapirish bo'limining
-- qolgan qismi bilan bir xil qoida).

CREATE TABLE IF NOT EXISTS public.daily_speaking_tasks (
  id          bigserial PRIMARY KEY,
  day_number  integer NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  prompt_ru   text    NOT NULL,
  prompt_uz   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_speaking_tasks_day_sort_key UNIQUE (day_number, sort_order)
);

CREATE INDEX IF NOT EXISTS daily_speaking_tasks_day_idx
  ON public.daily_speaking_tasks (day_number, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_speaking_tasks TO falarus_content_sql;
GRANT USAGE, SELECT ON SEQUENCE public.daily_speaking_tasks_id_seq TO falarus_content_sql;

-- Qolgan kontent jadvallari bilan bir xil rejim (ilova `falarus` roli jadval
-- EGASI, egalar RLS'ni chetlab o'tadi — ilovaga ta'sir qilmaydi).
ALTER TABLE public.daily_speaking_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS content_sql_console ON public.daily_speaking_tasks;
CREATE POLICY content_sql_console ON public.daily_speaking_tasks
  FOR ALL TO falarus_content_sql
  USING (true) WITH CHECK (true);

-- Nechta topshiriq bajarilgani (faqat oshadi — `mergeKunlikDayPatch` MAX_KEYS).
-- Kun «tugallandi» mezoniga QO'SHILMAYDI: aksariyat kunlarda bu kontent
-- hali yo'q va mezonga kirsa hamma kun birdan yopilib qolardi.
ALTER TABLE public.user_kunlik_day_progress
  ADD COLUMN IF NOT EXISTS speaking_tasks_done integer NOT NULL DEFAULT 0;
