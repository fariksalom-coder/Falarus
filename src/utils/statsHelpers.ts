import { VOCABULARY_TOPICS } from '../data/vocabularyTopics';
import { getSubtopicContent, getTopicWordCount } from '../data/vocabularyContent';
import { getPartLearnedCount } from './vocabProgress';

export type TopicProgress = { topicId: string; title: string; learned: number; total: number };

export function getVocabularyStats(): { totalLearned: number; totalWords: number; byTopic: TopicProgress[] } {
  let totalLearned = 0;
  const byTopic: TopicProgress[] = [];

  for (const topic of VOCABULARY_TOPICS) {
    const total = getTopicWordCount(topic.id);
    let learned = 0;
    for (const sub of topic.subtopics) {
      const content = getSubtopicContent(topic.id, sub.id);
      if (!content) continue;
      for (const part of content.parts) {
        learned += getPartLearnedCount(topic.id, sub.id, part.id);
      }
    }
    totalLearned += learned;
    byTopic.push({
      topicId: topic.id,
      title: topic.title,
      learned,
      total,
    });
  }

  const totalWords = VOCABULARY_TOPICS.reduce((s, t) => s + getTopicWordCount(t.id), 0);
  return { totalLearned, totalWords, byTopic };
}
