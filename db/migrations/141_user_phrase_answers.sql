-- 141_user_phrase_answers.sql
--
-- Ibora testining javoblari SERVERDA qayd etiladi.
--
-- Nima uchun kerak: javob kaliti endi brauzerga umuman yuborilmaydi.
-- O'quvchi variantni tanlaganda server uni tekshiradi, natijani SHU JADVALGA
-- yozadi va faqat shundan keyin "to'g'ri/xato" deb javob qaytaradi.
-- Yakunda ball ham shu jadvaldan sanaladi — klient yuborgan ro'yxatdan emas.
--
-- Har bir savolga urinishda BIR marta javob beriladi: qator allaqachon
-- bo'lsa, server eski javobni qaytaradi. Shu sababli javobni "so'rab bilib
-- olib", keyin to'g'risini yuborish mumkin emas.
--
-- Qaytadan ishlaganda (`/phrases/start`) shu kunning qatorlari o'chiriladi.

CREATE TABLE IF NOT EXISTS public.user_phrase_answers (
  user_id     bigint      NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phrase_id   bigint      NOT NULL REFERENCES public.daily_phrase_mcqs(id) ON DELETE CASCADE,
  choice      smallint    NOT NULL CHECK (choice BETWEEN 0 AND 3),
  is_correct  boolean     NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, phrase_id)
);

CREATE INDEX IF NOT EXISTS user_phrase_answers_user_idx
  ON public.user_phrase_answers (user_id);
