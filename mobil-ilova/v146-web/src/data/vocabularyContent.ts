export type VocabularyEntry = {
  uzbek: string;
  russian: string;
};

export type VocabularyPart = {
  id: string;
  title: string;
  entries: VocabularyEntry[];
};

export type VocabularySubtopicContent = {
  topicId: string;
  subtopicId: string;
  parts: VocabularyPart[];
};

