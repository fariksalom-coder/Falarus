-- O'qish: sarlavhalarni yashirish (matn ustidagi «mavzu» nomi).
-- Hafta oxiridagi kunlik grammatika sarlavhalaridagi «takrorlash / Повторение» tilini neytrallashtirish.

UPDATE public.daily_reading_passages
SET title = '';

UPDATE public.daily_grammar_topics
SET title = 'Darslar 1–6: grammatika va muloqot'
WHERE day_number = 7;

UPDATE public.daily_grammar_topics
SET title = 'Predlog qatori (11–14 kun)'
WHERE day_number = 15;

UPDATE public.daily_grammar_topics
SET title = '1-spryazheniye: umumiy jadval (16–20)'
WHERE day_number = 20;

UPDATE public.daily_grammar_topics
SET title = '2‑спряжение va istisnolar (21–24 kun)'
WHERE day_number = 25;

UPDATE public.daily_grammar_topics
SET title = '«Быть» в прошедшем времени (26–29 kun)'
WHERE day_number = 30;

UPDATE public.daily_grammar_topics
SET title = 'Винительный падеж: в / на va boshqaruv (31–39 kun)'
WHERE day_number = 40;

UPDATE public.daily_vocab_words
SET word_uz = 'Grammatika jadvali', word_ru = 'Грамматическая таблица'
WHERE day_number = 25 AND word_ru = 'Повторение';

UPDATE public.daily_grammar_topics
SET theory_text = REPLACE(theory_text, 'Qisqa takrorlash:', 'Qisqa eslatma:')
WHERE day_number = 7 AND strpos(theory_text, 'Qisqa takrorlash:') > 0;
