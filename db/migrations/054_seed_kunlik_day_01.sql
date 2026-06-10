-- Seed: kunlik kurs — kun 1 (salomlashish / xayrlashish).
-- Agar 053 qoʻllanmagan boʻlsa ham ishlaydi: kerakli ustunlar qoʻshiladi.
-- Takrorlanuvchi lemma uchun UNIQUE (text_id, word_ru_normalized) indeksi vaqtincha olinadi.

-- ---------- O‘qish jadvali ustunlari (053 bilan mos) ----------
ALTER TABLE public.daily_reading_passages ADD COLUMN IF NOT EXISTS text_id text;

UPDATE public.daily_reading_passages
SET text_id = 'kunlik-oqish-' || LPAD(day_number::text, 2, '0')
WHERE day_number IS NOT NULL AND (text_id IS NULL OR trim(text_id) = '');

ALTER TABLE public.daily_reading_lexemes ADD COLUMN IF NOT EXISTS text_id text;
ALTER TABLE public.daily_reading_lexemes ADD COLUMN IF NOT EXISTS word_ru_normalized text NOT NULL DEFAULT '';
ALTER TABLE public.daily_reading_lexemes ADD COLUMN IF NOT EXISTS translation_uz text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'audio_url'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'audio_ru'
  ) THEN
    ALTER TABLE public.daily_reading_lexemes RENAME COLUMN audio_url TO audio_ru;
  END IF;
END $$;

ALTER TABLE public.daily_reading_lexemes ADD COLUMN IF NOT EXISTS audio_ru text;
ALTER TABLE public.daily_reading_lexemes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    UPDATE public.daily_reading_lexemes l
    SET text_id = p.text_id
    FROM public.daily_reading_passages p
    WHERE l.day_number = p.day_number AND (l.text_id IS NULL OR trim(l.text_id) = '');
  END IF;
END $$;

UPDATE public.daily_reading_lexemes
SET word_ru_normalized = trim(lower(word_ru))
WHERE trim(coalesce(word_ru_normalized, '')) = '' AND word_ru IS NOT NULL;

DROP INDEX IF EXISTS public.uq_daily_reading_lexemes_text_word_norm;

DELETE FROM public.daily_practice_prompts WHERE day_number = 1;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 1
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 1;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 1;

DELETE FROM public.daily_vocab_words WHERE day_number = 1;

DELETE FROM public.daily_grammar_matches WHERE day_number = 1;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 1;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 1;
DELETE FROM public.daily_grammar_topics WHERE day_number = 1;

-- ---------- Grammar: tema ----------
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  1,
  'Salomlashish va xayrlashish',
  $theory$
🟢 1. Salomlashish (Приветствие)

Rus tilida kunning vaqtiga qarab salomlashamiz:

Доброе утро! — Xayrli tong
(ertalab aytiladi)

Добрый день! — Xayrli kun
(kun davomida aytiladi)

Добрый вечер! — Xayrli kech
(kechqurun aytiladi)

Здравствуйте! — Assalomu alaykum
(rasmiy shakl)

Привет! — Salom
(norasmiy shakl, do‘stlar uchun)

🔵 2. Xayrlashish (Прощание)

До свидания! — Ko‘rishguncha
(rasmiy xayrlashish)

Пока! — Xayr
(norasmiy xayrlashish)

Доброй ночи! — Xayrli tun
(uxlashdan oldin aytiladi)
$theory$
);

-- ---------- Grammar: test (4 variant) ----------
INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (1, 'rule', 0, 'Xayrli tong', 'Добрый день!', 'Доброе утро!', 'Добрый вечер!', 'Привет!', 1),
  (1, 'rule', 1, 'Xayrli kun', 'Доброе утро!', 'Добрый день!', 'Добрый вечер!', 'Здравствуйте!', 1),
  (1, 'rule', 2, 'Xayrli kech', 'Добрый вечер!', 'Доброе утро!', 'Добрый день!', 'Пока!', 0),
  (1, 'rule', 3, 'Assalomu alaykum', 'Привет!', 'Здравствуйте!', 'Пока!', 'Доброй ночи!', 1),
  (1, 'rule', 4, 'Salom', 'Здравствуйте!', 'Привет!', 'Добрый день!', 'До свидания!', 1),
  (1, 'rule', 5, 'Ko‘rishguncha', 'Пока!', 'До свидания!', 'Доброй ночи!', 'Привет!', 1),
  (1, 'rule', 6, 'Xayr', 'До свидания!', 'Пока!', 'Здравствуйте!', 'Добрый день!', 1),
  (1, 'rule', 7, 'Xayrli tun', 'Добрый вечер!', 'Доброй ночи!', 'Доброе утро!', 'Пока!', 1),
  (1, 'rule', 8, 'Ertalab salomlashish', 'Добрый вечер!', 'Доброе утро!', 'Пока!', 'Здравствуйте!', 1),
  (1, 'rule', 9, 'Kechqurun salomlashish', 'Добрый день!', 'Добрый вечер!', 'Доброе утро!', 'Пока!', 1),
  (1, 'rule', 10, 'Rasmiy salomlashish', 'Привет!', 'Пока!', 'Здравствуйте!', 'Доброй ночи!', 2),
  (1, 'rule', 11, 'Norasmiy salomlashish', 'Здравствуйте!', 'Привет!', 'До свидания!', 'Добрый день!', 1),
  (1, 'rule', 12, 'Rasmiy xayrlashish', 'Пока!', 'До свидания!', 'Привет!', 'Добрый вечер!', 1),
  (1, 'rule', 13, 'Uyqudan oldin nima deymiz?', 'Пока!', 'Добрый день!', 'Доброй ночи!', 'Здравствуйте!', 2),
  (1, 'rule', 14, 'Do‘st bilan xayrlashish', 'До свидания!', 'Пока!', 'Здравствуйте!', 'Добрый день!', 1);

-- ---------- Grammar: gaplar tuzish (word_bank) ----------
INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (1, 0, 'uz', 'Xayrli tong', ARRAY['Добрый', 'Доброе', 'утро', 'день', 'вечер'], 'Доброе утро'),
  (1, 1, 'uz', 'Xayrli kun', ARRAY['Добрый', 'Доброе', 'день', 'вечер', 'утро'], 'Добрый день'),
  (1, 2, 'uz', 'Xayrli kech', ARRAY['Добрый', 'вечер', 'утро', 'день', 'Доброе'], 'Добрый вечер'),
  (1, 3, 'uz', 'Xayrli tun', ARRAY['Доброй', 'ночь', 'ночи', 'Добрый', 'вечер'], 'Доброй ночи'),
  (1, 4, 'uz', 'Ko‘rishguncha', ARRAY['До', 'свидания', 'вечер', 'утро', 'Привет'], 'До свидания'),
  (1, 5, 'uz', 'Salom', ARRAY['Привет', 'Здравствуйте', 'Пока', 'Добрый', 'вечер'], 'Привет'),
  (1, 6, 'uz', 'Assalomu alaykum', ARRAY['Здравствуйте', 'Привет', 'Пока', 'Добрый', 'день'], 'Здравствуйте'),
  (1, 7, 'uz', 'Xayr', ARRAY['Пока', 'Здравствуйте', 'Добрый', 'вечер', 'утро'], 'Пока'),
  (1, 8, 'uz', 'Ertalab salomlashish', ARRAY['Доброе', 'утро', 'вечер', 'день', 'Пока'], 'Доброе утро'),
  (1, 9, 'uz', 'Kechqurun salomlashish', ARRAY['Добрый', 'вечер', 'утро', 'день', 'Здравствуйте'], 'Добрый вечер'),
  (1, 10, 'uz', 'Rasmiy xayrlashish', ARRAY['До', 'свидания', 'Пока', 'Привет', 'утро'], 'До свидания'),
  (1, 11, 'uz', 'Uyqudan oldin', ARRAY['Доброй', 'ночи', 'вечер', 'день', 'утро'], 'Доброй ночи');

-- ---------- Grammar: juftlik ----------
INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (1, 0, 0, 'Доброе', 'утро'),
  (1, 0, 1, 'Добрый', 'день'),
  (1, 0, 2, 'Вечер', 'Добрый'),
  (1, 0, 3, 'Доброй', 'ночи'),
  (1, 0, 4, 'До', 'свидания'),
  (1, 0, 5, 'При', 'вет'),
  (1, 0, 6, 'Здра', 'вствуйте'),
  (1, 0, 7, 'По', 'ка');

-- ---------- Vocabulary (kunlik so‘zlar) ----------
INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (1, 0, 'Xayrli', 'Добрый'),
  (1, 1, 'Tong', 'Утро'),
  (1, 2, 'Kun', 'День'),
  (1, 3, 'Kech', 'Вечер'),
  (1, 4, 'Tun', 'Ночь'),
  (1, 5, 'Assalomu alaykum', 'Здравствуйте'),
  (1, 6, 'Salom', 'Привет'),
  (1, 7, 'Ko‘rishguncha tuzilmasi (до)', 'До'),
  (1, 8, 'Ko‘rishish', 'Свидания'),
  (1, 9, 'Xayr', 'Пока'),
  (1, 10, 'Salomlashish', 'Приветствие'),
  (1, 11, 'Xayrlashish', 'Прощание');

-- ---------- Reading: matn + lug‘at ----------
INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  1,
  'Salomlashish va xayrlashish — o‘qish',
  $body$
Сегодня у меня был длинный и интересный день. Утром я проснулся и сказал семье: «Доброе утро!». Настроение было хорошее. По дороге на работу я встретил соседа и поздоровался: «Здравствуйте!». Днём в офисе я говорил коллегам: «Добрый день!», мы обсуждали работу и помогали друг другу. Вечером я встретился с другом, сказал: «Привет! Добрый вечер!», и мы долго разговаривали. Когда я вернулся домой, я сказал всем: «До свидания!», а перед сном написал другу: «Пока! Доброй ночи!».
$body$,
  'kunlik-oqish-01'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-01', 'Сегодня', 'сегодня', 'Bugun', NULL),
  ('kunlik-oqish-01', 'у', 'у', 'tegishlilik bildiradi («у меня был» → menda bor edi)', NULL),
  ('kunlik-oqish-01', 'меня', 'меня', 'menda', NULL),
  ('kunlik-oqish-01', 'был', 'был', 'edi', NULL),
  ('kunlik-oqish-01', 'длинный', 'длинный', 'uzun', NULL),
  ('kunlik-oqish-01', 'и', 'и', 'va', NULL),
  ('kunlik-oqish-01', 'интересный', 'интересный', 'qiziqarli', NULL),
  ('kunlik-oqish-01', 'день', 'день', 'kun', NULL),
  ('kunlik-oqish-01', 'Утром', 'утром', 'ertalab', NULL),
  ('kunlik-oqish-01', 'я', 'я', 'men', NULL),
  ('kunlik-oqish-01', 'проснулся', 'проснулся', 'uyg‘ondim', NULL),
  ('kunlik-oqish-01', 'сказал', 'сказал', 'dedim', NULL),
  ('kunlik-oqish-01', 'семье', 'семье', 'oilamga', NULL),
  ('kunlik-oqish-01', 'Доброе', 'доброе', 'xayrli', NULL),
  ('kunlik-oqish-01', 'утро', 'утро', 'tong', NULL),
  ('kunlik-oqish-01', 'Настроение', 'настроение', 'kayfiyat', NULL),
  ('kunlik-oqish-01', 'было', 'было', 'edi', NULL),
  ('kunlik-oqish-01', 'хорошее', 'хорошее', 'yaxshi', NULL),
  ('kunlik-oqish-01', 'По', 'по', 'yo‘nalish/harakat bo‘ylab («по дороге» → yo‘l bo‘ylab)', NULL),
  ('kunlik-oqish-01', 'дороге', 'дороге', 'yo‘lda', NULL),
  ('kunlik-oqish-01', 'на', 'на', 'yo‘nalish («на работу» → ishga)', NULL),
  ('kunlik-oqish-01', 'работу', 'работу', 'ishga', NULL),
  ('kunlik-oqish-01', 'встретил', 'встретил', 'uchratdim', NULL),
  ('kunlik-oqish-01', 'соседа', 'соседа', 'qo‘shnini', NULL),
  ('kunlik-oqish-01', 'поздоровался', 'поздоровался', 'salomlashdim', NULL),
  ('kunlik-oqish-01', 'Здравствуйте', 'здравствуйте', 'assalomu alaykum', NULL),
  ('kunlik-oqish-01', 'Днём', 'днём', 'kunduzi', NULL),
  ('kunlik-oqish-01', 'в', 'в', 'joylashuv («в офисе» → ofisda)', NULL),
  ('kunlik-oqish-01', 'офисе', 'офисе', 'ofisda', NULL),
  ('kunlik-oqish-01', 'говорил', 'говорил', 'aytdim', NULL),
  ('kunlik-oqish-01', 'коллегам', 'коллегам', 'hamkasblarga', NULL),
  ('kunlik-oqish-01', 'Добрый', 'добрый', 'xayrli', NULL),
  ('kunlik-oqish-01', 'мы', 'мы', 'biz', NULL),
  ('kunlik-oqish-01', 'обсуждали', 'обсуждали', 'muhokama qildik', NULL),
  ('kunlik-oqish-01', 'работу', 'работу', 'ishni', NULL),
  ('kunlik-oqish-01', 'помогали', 'помогали', 'yordam berdik', NULL),
  ('kunlik-oqish-01', 'друг другу', 'друг другу', 'bir-biriga', NULL),
  ('kunlik-oqish-01', 'Вечером', 'вечером', 'kechqurun', NULL),
  ('kunlik-oqish-01', 'встретился', 'встретился', 'uchrashdim', NULL),
  ('kunlik-oqish-01', 'с', 'с', 'birga bilan («с другом»)', NULL),
  ('kunlik-oqish-01', 'другом', 'другом', 'do‘stim bilan', NULL),
  ('kunlik-oqish-01', 'Привет', 'привет', 'salom', NULL),
  ('kunlik-oqish-01', 'вечер', 'вечер', 'kech', NULL),
  ('kunlik-oqish-01', 'долго', 'долго', 'uzoq', NULL),
  ('kunlik-oqish-01', 'разговаривали', 'разговаривали', 'gaplashdik', NULL),
  ('kunlik-oqish-01', 'Когда', 'когда', 'qachon', NULL),
  ('kunlik-oqish-01', 'вернулся', 'вернулся', 'qaytdim', NULL),
  ('kunlik-oqish-01', 'домой', 'домой', 'uyga', NULL),
  ('kunlik-oqish-01', 'всем', 'всем', 'hammaga', NULL),
  ('kunlik-oqish-01', 'До', 'до', 'davomiylik («до свидания»)', NULL),
  ('kunlik-oqish-01', 'свидания', 'свидания', 'ko‘rish', NULL),
  ('kunlik-oqish-01', 'а', 'а', 'va', NULL),
  ('kunlik-oqish-01', 'перед', 'перед', 'oldin (vaqt bo‘yicha)', NULL),
  ('kunlik-oqish-01', 'сном', 'сном', 'uyqudan oldin', NULL),
  ('kunlik-oqish-01', 'написал', 'написал', 'yozdim', NULL),
  ('kunlik-oqish-01', 'другу', 'другу', 'do‘stimga', NULL),
  ('kunlik-oqish-01', 'Пока', 'пока', 'xayr', NULL),
  ('kunlik-oqish-01', 'Доброй', 'доброй', 'xayrli', NULL),
  ('kunlik-oqish-01', 'ночи', 'ночи', 'tun', NULL);

-- «работу» ikki marta turli kontekstda — word_ru_normalized bir xil; UNIQUE yo‘q, ikkala qator saqlanadi.

-- ---------- Practice (gapirish) ----------
INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (1, 0, 'Xayrli tong, Ali!', 'Доброе утро, Али!'),
  (1, 1, 'Salom, do‘stim!', 'Привет, мой друг!'),
  (1, 2, 'Assalomu alaykum, Anna!', 'Здравствуйте, Анна!'),
  (1, 3, 'Xayrli kun, o‘qituvchi!', 'Добрый день, учитель!'),
  (1, 4, 'Xayr, akam!', 'Пока, мой брат!'),
  (1, 5, 'Ko‘rishguncha, ona!', 'До свидания, мама!'),
  (1, 6, 'Xayrli kech, do‘stlar!', 'Добрый вечер, друзья!'),
  (1, 7, 'Xayrli tun, dada!', 'Доброй ночи, папа!'),
  (1, 8, 'Salom, ishlar qalay?', 'Привет, как дела?'),
  (1, 9, 'Assalomu alaykum, qo‘shnim!', 'Здравствуйте, мой сосед!');

-- Takrorlanmaydigan lemma qatorlari uchun indeksni qayta tiklash (ixtiyoriy).
-- «работу» kabi bir xil normalized ikki qator bor — avval birini birlashtiring yoki indeksni tiklamang:
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_reading_lexemes_text_word_norm
--   ON public.daily_reading_lexemes (text_id, word_ru_normalized);
