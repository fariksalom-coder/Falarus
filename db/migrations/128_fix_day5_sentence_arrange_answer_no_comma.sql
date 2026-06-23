-- Word-bank tasks have no comma token; answer must match assembled words.
UPDATE public.daily_grammar_sentence_arrange
SET answer_ru = 'Она врач работает в больнице'
WHERE day_number = 5
  AND sort_order = 3;
