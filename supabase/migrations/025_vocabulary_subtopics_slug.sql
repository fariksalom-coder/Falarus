-- Public URL slug per subtopic (kebab-case from title). Resolves /api/vocabulary/word-groups/:slug.

ALTER TABLE vocabulary_subtopics
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Match TS `slugifyVocabularyTitle`: lower, strip non [a-z0-9 space hyphen], spaces → single hyphen, collapse hyphens.
UPDATE vocabulary_subtopics
SET slug = trim(
  both '-'
  FROM
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(trim(title)), '[^a-z0-9[:space:]-]+', '', 'g'),
        '[[:space:]]+',
        '-',
        'g'
      ),
      '-+',
      '-',
      'g'
    )
)
WHERE slug IS NULL;

UPDATE vocabulary_subtopics
SET slug = id
WHERE slug IS NULL OR slug = '';

-- Deduplicate: second and later rows in each slug group get -2, -3, …
WITH numbered AS (
  SELECT
    id,
    slug AS base_slug,
    row_number() OVER (
      PARTITION BY slug
      ORDER BY
        id
    ) AS rn
  FROM
    vocabulary_subtopics
)
UPDATE vocabulary_subtopics v
SET
  slug = CASE
    WHEN n.rn = 1 THEN n.base_slug
    ELSE n.base_slug || '-' || n.rn::text
  END
FROM
  numbered n
WHERE
  v.id = n.id;

ALTER TABLE vocabulary_subtopics
ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vocabulary_subtopics_slug_key ON vocabulary_subtopics (slug);
