-- 158: Grammatika javoblari qayd etiladi va XP barcha mashqlarga yoyiladi.
--
-- NIMA UCHUN:
--   1. XP faqat ibora testlaridan berilardi (kuniga eng ko'pi 10 ball).
--      O'quvchi kunning eng og'ir ishini — 20 savollik grammatika testini —
--      bajarib, hech qanday ball ko'rmasdi.
--   2. Grammatika testidagi javoblar hech qayerda saqlanmasdi: xato javob
--      ekrandan ketishi bilan yo'qolardi, shuning uchun "xatolar ustida
--      ishlash" ham, takrorlash ham qurib bo'lmasdi.
--
-- Ibora testlari (`user_phrase_answers`) allaqachon shu tartibda ishlaydi —
-- bu jadval ataylab o'sha shaklda, farqi faqat manba jadvalida.

ALTER TABLE user_kunlik_day_progress
  ADD COLUMN IF NOT EXISTS grammar_correct SMALLINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS user_grammar_answers (
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mcq_id      BIGINT NOT NULL REFERENCES daily_grammar_mcqs(id) ON DELETE CASCADE,
  choice      SMALLINT NOT NULL CHECK (choice >= 0 AND choice <= 3),
  is_correct  BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mcq_id)
);

CREATE INDEX IF NOT EXISTS user_grammar_answers_user_idx
  ON user_grammar_answers (user_id);

-- Takrorlash mini-testi FAQAT xato javoblarni so'raydi, shuning uchun
-- alohida qisman indeks: to'g'ri javoblar ko'p, ular bu so'rovga kirmaydi.
CREATE INDEX IF NOT EXISTS user_grammar_answers_wrong_idx
  ON user_grammar_answers (user_id, answered_at DESC)
  WHERE is_correct = false;
