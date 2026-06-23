-- Day 5 / sort_order 3: prompt "U shifokor, kasalxonada ishlaydi" needs "работает" in word bank.
UPDATE public.daily_grammar_sentence_arrange
SET
  word_bank = ARRAY['Она', 'врач', 'работает', 'в', 'больнице', 'больница'],
  answer_ru = 'Она врач, работает в больнице'
WHERE day_number = 5
  AND sort_order = 3;
