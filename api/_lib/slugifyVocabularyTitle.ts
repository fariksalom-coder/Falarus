/**
 * Kebab-case slug from a vocabulary subtopic title (Latin letters, digits, spaces, hyphens).
 * Keep in sync with SQL backfill in `supabase/migrations/025_vocabulary_subtopics_slug.sql`.
 */
export function slugifyVocabularyTitle(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
