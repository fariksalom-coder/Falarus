-- 214: o'qituvchi katalogi uchun admin tumbleri va admin uchun aloqa ma'lumotlari.
--
-- catalog_visible — tasdiqlangan (active) o'qituvchi katalogda faqat admin
--   tumblerni yoqqandan keyin chiqadi. Yangi tasdiqlanganlar uchun default — o'chiq.
--   Hozir katalogda turgan (active) o'qituvchilar yo'qolib qolmasin — ular uchun yoqiladi.
-- contact_* — anketaning 1-qadamida so'raladi, FAQAT admin ko'radi (ommaviy
--   public_phone_e164 / telegram_username dan alohida: o'quvchi platformani chetlab
--   o'tib to'g'ridan-to'g'ri bog'lanmasin).

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS catalog_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS catalog_visible_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS catalog_visible_changed_by text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_telegram text,
  ADD COLUMN IF NOT EXISTS contact_whatsapp text;

UPDATE public.teacher_profiles SET catalog_visible = true, catalog_visible_changed_at = now(), catalog_visible_changed_by = 'migration 214'
WHERE profile_status = 'active' AND catalog_visible = false AND catalog_visible_changed_at IS NULL;

-- Tumbler ham tarixga yoziladi.
ALTER TABLE public.teacher_review_events DROP CONSTRAINT IF EXISTS teacher_review_events_action_check;
ALTER TABLE public.teacher_review_events ADD CONSTRAINT teacher_review_events_action_check
  CHECK (action IN ('submitted', 'approved', 'rejected', 'needs_revision', 'catalog_on', 'catalog_off'));

COMMIT;
