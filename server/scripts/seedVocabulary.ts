/**
 * Seed vocabulary_topics, vocabulary_subtopics, vocabulary_word_groups, vocabulary_words
 * from frontend data (vocabularyTopics + vocabularyContent).
 * Run from project root: npx tsx server/scripts/seedVocabulary.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { VOCABULARY_TOPICS } from '../../src/data/vocabularyTopics';
import { VOCABULARY_CONTENT } from '../../src/data/vocabularyContent';
import { slugifyVocabularyTitle } from '../../api/_lib/slugifyVocabularyTitle';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertWithRetry<T>(
  fn: () => PromiseLike<{ error: any; data?: T }>,
  retries = 3
): Promise<{ error: any; data?: T }> {
  for (let i = 0; i < retries; i++) {
    const result = await fn();
    const is502 = result.error?.message?.includes('502') || result.error?.message?.includes('Bad gateway');
    if (!result.error || (!is502 && i === 0)) return result;
    if (is502 && i < retries - 1) {
      console.warn(`Retry ${i + 1}/${retries} after 502...`);
      await new Promise((r) => setTimeout(r, 3000));
    } else {
      return result;
    }
  }
  return { error: new Error('Max retries') };
}

async function main() {
  console.log('Seeding vocabulary tables...');

  for (const topic of VOCABULARY_TOPICS) {
    const { error: topicErr } = await supabase
      .from('vocabulary_topics')
      .upsert({ id: topic.id, title: topic.title }, { onConflict: 'id' });
    if (topicErr) {
      console.error('topic', topic.id, topicErr);
      throw topicErr;
    }
    for (const subtopic of topic.subtopics) {
      const slug =
        slugifyVocabularyTitle(subtopic.title) || subtopic.id;
      const { error: subErr } = await supabase.from('vocabulary_subtopics').upsert(
        { id: subtopic.id, topic_id: topic.id, title: subtopic.title, slug },
        { onConflict: 'id' }
      );
      if (subErr) {
        console.error('subtopic', subtopic.id, subErr);
        throw subErr;
      }
    }
  }
  console.log('Topics and subtopics done.');

  for (const content of VOCABULARY_CONTENT) {
    for (const part of content.parts) {
      const totalWords = part.entries.length;
      const { data: existing } = await supabase
        .from('vocabulary_word_groups')
        .select('id')
        .eq('subtopic_id', content.subtopicId)
        .eq('part_id', part.id)
        .maybeSingle();
      if (existing?.id) {
        await supabase.from('vocabulary_words').delete().eq('word_group_id', existing.id);
      }
      const { data: wg, error: wgErr } = await supabase
        .from('vocabulary_word_groups')
        .upsert(
          {
            subtopic_id: content.subtopicId,
            part_id: part.id,
            title: part.title,
            total_words: totalWords,
          },
          { onConflict: 'subtopic_id,part_id' }
        )
        .select('id')
        .single();
      if (wgErr) {
        console.error('word_group', content.subtopicId, part.id, wgErr);
        throw wgErr;
      }
      const wordGroupId = wg?.id;
      if (!wordGroupId) continue;

      const BATCH = 80;
      for (let i = 0; i < part.entries.length; i += BATCH) {
        const batch = part.entries.slice(i, i + BATCH).map((entry) => ({
          word_group_id: wordGroupId,
          word: entry.russian,
          translation: entry.uzbek,
        }));
        const { error: wordErr } = await insertWithRetry(() =>
          supabase.from('vocabulary_words').insert(batch).then((r) => ({ error: r.error, data: r.data }))
        );
        if (wordErr) {
          console.error('word batch', wordGroupId, batch[0]?.word, wordErr);
          throw wordErr;
        }
      }
    }
  }
  console.log('Word groups and words done.');
}

main()
  .then(() => {
    console.log('Vocabulary seed complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
