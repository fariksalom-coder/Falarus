-- PLATFORMADA OXIRGI KO'RINISH.
--
-- Ilgari "qachon onlayn bo'lgan" faqat CHAT faolligidan olinardi
-- (`community_group_presence`). Natijada har kuni darsda o'tirgan, ammo
-- muloqotga kirmaydigan odam "hech qachon onlayn bo'lmagan" ko'rinardi —
-- support uchun bu yolg'on ma'lumot edi.
--
-- Endi belgi autentifikatsiya bosqichida qo'yiladi, ya'ni foydalanuvchi
-- ilovaning QAYSI qismida bo'lishidan qat'i nazar yoziladi: dars, lug'at,
-- reyting, chat — hammasi bir xil hisoblanadi.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- "Hozir kim onlayn" so'rovi uchun. Qisman indeks: hech qachon
-- kirmaganlar (NULL) baribir qidirilmaydi, ular indeksni shishirmasin.
CREATE INDEX IF NOT EXISTS idx_users_last_seen
  ON public.users (last_seen_at DESC)
  WHERE last_seen_at IS NOT NULL;

COMMENT ON COLUMN public.users.last_seen_at IS
  'Platformada oxirgi marta ko''ringan payt. Har so''rovda emas, bir necha daqiqada bir marta yangilanadi.';
