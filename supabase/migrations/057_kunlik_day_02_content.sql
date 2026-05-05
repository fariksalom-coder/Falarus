-- Kunlik kun 2: Qanday ahvolda? / Tanishuv (Как дела? / Знакомство).

DELETE FROM public.daily_practice_prompts WHERE day_number = 2;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number = 2
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number = 2;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number = 2;

DELETE FROM public.daily_vocab_words WHERE day_number = 2;

DELETE FROM public.daily_grammar_matches WHERE day_number = 2;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number = 2;
DELETE FROM public.daily_grammar_mcqs WHERE day_number = 2;
DELETE FROM public.daily_grammar_topics WHERE day_number = 2;

-- ---------- Grammar: tema ----------
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  2,
  'Qanday ahvolda? / Tanishuv (Как дела? / Знакомство)',
  $theory$
Rus tilida odamning ahvolini so‘rash va ism bilan tanishish uchun quyidagi iboralar ishlatiladi:

• Как дела? — Ishlar qalay? / Ahvollar yaxshimi?
• Как жизнь? — Hayot qalay?
• Хорошо — Yaxshi
• Неплохо — Yomon emas
• Отлично — Ajoyib
• Спасибо — Rahmat
• Пожалуйста — Iltimos / Marhamat
• Извините — Kechirasiz
• Как вас зовут? — Ismingiz nima? (rasmiy)
• Как тебя зовут? — Isming nima? (norasmiy)
• Меня зовут... — Mening ismim...
• Очень приятно — Tanishganimdan xursandman

Eslatma: «Как дела?» so‘ragiga ko‘pincha qisqa javob beriladi: «Хорошо, спасибо».

«Пожалуйста» so‘zi «rahmat» ga javob yoki iltimos ma’nosida ishlatiladi (masalan: Передайте, пожалуйста, книгу — Kitobni, iltimos, uzating).
$theory$
);

-- ---------- Grammar: TEST 1 ----------
INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (
    2,
    'rule',
    0,
    '«Qalay?» so‘ro‘g‘ining rus tilidagi ekvivalenti qaysi?',
    'Как жизнь?',
    'Как дела?',
    'Как вас зовут?',
    'Извините',
    1
  ),
  (
    2,
    'rule',
    1,
    '«Хорошо» so‘zining ma’nosi qaysi?',
    'Yomon',
    'Ajoyib',
    'Rahmat',
    'Yaxshi',
    3
  ),
  (
    2,
    'rule',
    2,
    '«Ismingiz nima?» rasmiy ruscha varianti qaysi?',
    'Как тебя зовут?',
    'Как вас зовут?',
    'Как дела?',
    'Очень приятно',
    1
  ),
  (
    2,
    'rule',
    3,
    '«Извините» qaysi holatda aytiladi?',
    'Salomlashganda',
    'Kechirim so‘raganda',
    'Xayrlashganda',
    'Minnatdorchilik bildirganda',
    1
  );

-- ---------- Grammar: TEST 3 (gap tuzish; tekshiruv bo‘shliqlar bilan qatorga qarab) ----------
INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (
    2,
    0,
    'uz',
    '(зовут, меня, Саша)',
    ARRAY['Меня', 'зовут', 'Саша', 'Как', 'дела'],
    'Меня зовут Саша'
  ),
  (
    2,
    1,
    'uz',
    'Savol va javob (to‘g‘ri variant: «Как дела?»)',
    ARRAY['Как', 'дела?', '–', 'Хорошо,', 'спасибо.', 'у', 'вас'],
    'Как дела? – Хорошо, спасибо.'
  ),
  (
    2,
    2,
    'uz',
    '(приятно, очень, познакомиться)',
    ARRAY['Очень', 'приятно', 'познакомиться', 'зовут', 'Спасибо'],
    'Очень приятно познакомиться'
  );

-- ---------- Grammar: TEST 2 (chap ruscha, o‘ng o‘zbekcha) ----------
INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (2, 0, 0, 'Спасибо', 'Rahmat'),
  (2, 0, 1, 'Пожалуйста', 'Iltimos'),
  (2, 0, 2, 'Неплохо', 'Yomon emas'),
  (2, 0, 3, 'Извините', 'Kechirasiz');

-- ---------- Lug‘at: 15 ta so‘z ----------
INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (2, 0, 'Ishlar', 'Дела'),
  (2, 1, 'Hayot', 'Жизнь'),
  (2, 2, 'Yaxshi', 'Хорошо'),
  (2, 3, 'Ajoyib', 'Отлично'),
  (2, 4, 'Yomon emas', 'Неплохо'),
  (2, 5, 'Kechirasiz', 'Извините'),
  (2, 6, 'Iltimos', 'Пожалуйста'),
  (2, 7, 'Rahmat', 'Спасибо'),
  (2, 8, 'Ism', 'Имя'),
  (2, 9, 'Siz', 'Вы'),
  (2, 10, 'Sen', 'Ты'),
  (2, 11, 'Talaba', 'Студент'),
  (2, 12, 'Tanishmoq', 'Знакомиться'),
  (2, 13, 'Tanishganimdan xursandman', 'Очень приятно'),
  (2, 14, 'Vaqt', 'Время');

-- ---------- O‘qish ----------
INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  2,
  'Знакомство',
  $body$
– Здравствуйте! Как вас зовут?
– Меня зовут Анвар. А вас?
– Меня зовут Мария. Очень приятно.
– Мне тоже приятно. Как ваши дела?
– Спасибо, хорошо. А у вас?
– Неплохо. Вы студент?
– Да, я студент. Извините, мне нужно идти. До свидания!
– До свидания!
$body$,
  'kunlik-oqish-02'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-02', 'Здравствуйте', 'здравствуйте', 'Assalomu alaykum', NULL),
  ('kunlik-oqish-02', 'Как', 'как', 'Qanday', NULL),
  ('kunlik-oqish-02', 'вас', 'вас', 'Sizni / sizga', NULL),
  ('kunlik-oqish-02', 'зовут', 'зовут', 'Ism qo‘yiladi (so‘rash)', NULL),
  ('kunlik-oqish-02', 'Меня', 'меня', 'Meni (men haqimda)', NULL),
  ('kunlik-oqish-02', 'Анвар', 'анвар', 'Anvar (ism)', NULL),
  ('kunlik-oqish-02', 'А', 'а', 'Esa, va', NULL),
  ('kunlik-oqish-02', 'Мария', 'мария', 'Mariya (ism)', NULL),
  ('kunlik-oqish-02', 'Очень', 'очень', 'Juda', NULL),
  ('kunlik-oqish-02', 'приятно', 'приятно', 'Yoqimli', NULL),
  ('kunlik-oqish-02', 'Мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-02', 'тоже', 'тоже', 'Ham', NULL),
  ('kunlik-oqish-02', 'ваши', 'ваши', 'Sizning', NULL),
  ('kunlik-oqish-02', 'дела', 'дела', 'Ishlar', NULL),
  ('kunlik-oqish-02', 'Спасибо', 'спасибо', 'Rahmat', NULL),
  ('kunlik-oqish-02', 'хорошо', 'хорошо', 'Yaxshi', NULL),
  ('kunlik-oqish-02', 'у', 'у', 'Sizda / oldida (у вас)', NULL),
  ('kunlik-oqish-02', 'Неплохо', 'неплохо', 'Yomon emas', NULL),
  ('kunlik-oqish-02', 'Вы', 'вы', 'Siz', NULL),
  ('kunlik-oqish-02', 'студент', 'студент', 'Talaba', NULL),
  ('kunlik-oqish-02', 'Да', 'да', 'Ha', NULL),
  ('kunlik-oqish-02', 'я', 'я', 'Men', NULL),
  ('kunlik-oqish-02', 'Извините', 'извините', 'Kechirasiz', NULL),
  ('kunlik-oqish-02', 'нужно', 'нужно', 'Kerak', NULL),
  ('kunlik-oqish-02', 'идти', 'идти', 'Ketmoq, bormoq', NULL),
  ('kunlik-oqish-02', 'До', 'до', 'Ko‘rishguncha (до свидания)', NULL),
  ('kunlik-oqish-02', 'свидания', 'свидания', 'Ko‘rish (состав)', NULL);

-- ---------- Gapirish (10 ta) ----------
INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (2, 0, 'Ishlar qalay?', 'Как дела?'),
  (2, 1, 'Hayot qalay?', 'Как жизнь?'),
  (2, 2, 'Rahmat, yaxshi.', 'Спасибо, хорошо.'),
  (2, 3, 'Ismingiz nima?', 'Как вас зовут?'),
  (2, 4, 'Mening ismim Jahongir.', 'Меня зовут Джахонгир.'),
  (2, 5, 'Kechirasiz, siz talabamisiz?', 'Извините, вы студент?'),
  (2, 6, 'Ha, men talabaman.', 'Да, я студент.'),
  (2, 7, 'Siz bilan tanishganimdan xursandman.', 'Очень приятно с вами познакомиться.'),
  (2, 8, 'Menga ham yoqimli.', 'Мне тоже приятно.'),
  (2, 9, 'Kechirasiz, vaqtim yo‘q.', 'Извините, у меня нет времени.');
