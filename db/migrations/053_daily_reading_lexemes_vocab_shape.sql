-- Reading lexemes aligned with vocabulary_text_dictionary: text_id, word_ru_normalized, audio_ru, updated_at.

ALTER TABLE public.daily_reading_passages ADD COLUMN IF NOT EXISTS text_id text;

UPDATE public.daily_reading_passages
SET text_id = 'kunlik-oqish-' || LPAD(day_number::text, 2, '0')
WHERE text_id IS NULL;

ALTER TABLE public.daily_reading_passages ALTER COLUMN text_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_reading_passages_text_id
  ON public.daily_reading_passages(text_id);

-- Lexeme rows: link by text_id (slug), drop day_number FK.
ALTER TABLE public.daily_reading_lexemes ADD COLUMN IF NOT EXISTS text_id text;

UPDATE public.daily_reading_lexemes l
SET text_id = p.text_id
FROM public.daily_reading_passages p
WHERE p.day_number = l.day_number AND l.text_id IS NULL;

ALTER TABLE public.daily_reading_lexemes ALTER COLUMN text_id SET NOT NULL;

ALTER TABLE public.daily_reading_lexemes
  DROP CONSTRAINT IF EXISTS daily_reading_lexemes_day_number_fkey;

ALTER TABLE public.daily_reading_lexemes DROP COLUMN IF EXISTS day_number;

ALTER TABLE public.daily_reading_lexemes
  ADD CONSTRAINT daily_reading_lexemes_text_id_fkey
  FOREIGN KEY (text_id) REFERENCES public.daily_reading_passages(text_id) ON DELETE CASCADE;

ALTER TABLE public.daily_reading_lexemes ADD COLUMN IF NOT EXISTS word_ru_normalized text NOT NULL DEFAULT '';

UPDATE public.daily_reading_lexemes
SET word_ru_normalized = trim(lower(word_ru))
WHERE word_ru_normalized = '';

ALTER TABLE public.daily_reading_lexemes ALTER COLUMN word_ru_normalized DROP DEFAULT;

ALTER TABLE public.daily_reading_lexemes RENAME COLUMN audio_url TO audio_ru;

ALTER TABLE public.daily_reading_lexemes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP INDEX IF EXISTS public.idx_daily_reading_lexemes_day;

CREATE INDEX IF NOT EXISTS idx_daily_reading_lexemes_text_sort
  ON public.daily_reading_lexemes (text_id, sort_order);

CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_reading_lexemes_text_word_norm
  ON public.daily_reading_lexemes (text_id, word_ru_normalized);

-- Авто‑slug текста при INSERT/UPDATE, если text_id не задан вручную (как произвольный text_id у матнов).
CREATE OR REPLACE FUNCTION public.set_daily_reading_passage_text_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.text_id IS NULL OR trim(NEW.text_id) = '' THEN
    NEW.text_id := 'kunlik-oqish-' || LPAD(NEW.day_number::text, 2, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_daily_reading_passages_text_id ON public.daily_reading_passages;

CREATE TRIGGER tr_daily_reading_passages_text_id
  BEFORE INSERT OR UPDATE OF day_number, text_id ON public.daily_reading_passages
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_daily_reading_passage_text_id();
