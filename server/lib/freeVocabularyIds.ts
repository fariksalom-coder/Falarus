import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Must match the first topic + its first subtopic in `src/data/vocabularyTopics.ts`.
 * Do NOT use lexicographic `order('id')` on subtopics: e.g. `oila` sorts before `salomlashish-…`.
 */
export const FREE_VOCAB_TOPIC_ID = 'kundalik-hayot';
export const FREE_VOCAB_SUBTOPIC_ID = 'salomlashish-xayrlashish-odob';

export type FreeVocabularyIds = {
  vocabulary_free_topic_id: string | null;
  vocabulary_free_subtopic_id: string | null;
};

/**
 * IDs used for freemium vocabulary (applySubtopicsLock, canAccessSubtopic, /user/access).
 * Prefers canonical app slugs when present in DB; otherwise first topic/subtopic by id (legacy).
 */
export async function resolveFreeVocabularyIds(
  supabase: SupabaseClient
): Promise<FreeVocabularyIds> {
  const { data: preferredSub } = await supabase
    .from('vocabulary_subtopics')
    .select('id, topic_id')
    .eq('id', FREE_VOCAB_SUBTOPIC_ID)
    .eq('topic_id', FREE_VOCAB_TOPIC_ID)
    .maybeSingle();

  if (preferredSub?.id != null && preferredSub.topic_id != null) {
    return {
      vocabulary_free_topic_id: String(preferredSub.topic_id),
      vocabulary_free_subtopic_id: String(preferredSub.id),
    };
  }

  let vocabulary_free_topic_id: string | null = null;
  let vocabulary_free_subtopic_id: string | null = null;
  const { data: firstTopic } = await supabase
    .from('vocabulary_topics')
    .select('id')
    .order('id')
    .limit(1)
    .maybeSingle();
  if (firstTopic?.id) {
    vocabulary_free_topic_id = String(firstTopic.id);
    const { data: firstSub } = await supabase
      .from('vocabulary_subtopics')
      .select('id')
      .eq('topic_id', vocabulary_free_topic_id)
      .order('id')
      .limit(1)
      .maybeSingle();
    if (firstSub?.id) vocabulary_free_subtopic_id = String(firstSub.id);
  }
  return { vocabulary_free_topic_id, vocabulary_free_subtopic_id };
}
