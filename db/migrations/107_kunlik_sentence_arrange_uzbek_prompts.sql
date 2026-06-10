-- Gap tuzish: `prompt_text` dagi ruscha qavslardagi so‘z ro‘yxatlari
-- (masalan, «(утро, Доброе)») o‘zbekcha yo‘riqnomaga almashtiriladi.
-- UI ham `getSentenceArrangeDisplayPrompt` bilan qo‘shimcha himoya beradi.

UPDATE public.daily_grammar_sentence_arrange
SET prompt_text = 'Quyidagi so‘z kartochkalaridan foydalanib, rus tilida to‘g‘ri va to‘liq gapni tuzing.'
WHERE prompt_lang = 'uz'
  AND btrim(prompt_text) ~ '^\([^)]+\)$'
  AND prompt_text ~ '[А-Яа-яЁё]';

-- Kun 1: aniq maʼno (salomlashish mavzusi)
UPDATE public.daily_grammar_sentence_arrange
SET prompt_text = 'Xayrli tong'
WHERE day_number = 1 AND answer_ru = 'Доброе утро';

UPDATE public.daily_grammar_sentence_arrange
SET prompt_text = 'Ko‘rishguncha'
WHERE day_number = 1 AND answer_ru = 'До свидания';

UPDATE public.daily_grammar_sentence_arrange
SET prompt_text = 'Sashaga norasmiy salom'
WHERE day_number = 1 AND answer_ru = 'Привет, Саша';

UPDATE public.daily_grammar_sentence_arrange
SET prompt_text = 'Annaga rasmiy salom'
WHERE day_number = 1 AND answer_ru = 'Здравствуйте, Анна';
