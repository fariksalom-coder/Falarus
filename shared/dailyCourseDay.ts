export type DailyCourseMcq = {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctIndex: number;
};

export type DailyCourseMatchPair = { left: string; right: string };

/** One «найди пару» exercise: pairs with the same blockSortOrder belong together. */
export type DailyCourseMatchSet = { blockSortOrder: number; pairs: DailyCourseMatchPair[] };

/** Собрать предложение из слов (банк токенов) + эталон по-русски. */
export type DailyGrammarSentenceArrange = {
  id: number;
  promptLang: 'uz' | 'ru';
  promptText: string;
  wordBank: string[];
  answerRu: string;
  sortOrder: number;
};

export type DailyGrammarTopic = {
  title: string;
  theoryText: string;
};

export type DailyGrammarSection = {
  topic: DailyGrammarTopic | null;
  ruleMcqs: DailyCourseMcq[];
  sentenceMcqs: DailyCourseMcq[];
  sentenceArrange: DailyGrammarSentenceArrange[];
  matchSets: DailyCourseMatchSet[];
};

/** Одна строка словаря дня: карточки и задания строятся из этого списка. */
export type DailyVocabWord = {
  id: number;
  wordUz: string;
  wordRu: string;
  sortOrder: number;
};

export type DailyVocabularySection = {
  words: DailyVocabWord[];
};

/** Как vocabulary_text_dictionary: словарь по тексту для кликабельных слов при чтении. */
export type DailyReadingLexeme = {
  id: number;
  textId: string;
  wordRu: string;
  wordRuNormalized: string;
  translationUz: string;
  audioRu: string | null;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DailyReadingSection = {
  textId: string | null;
  title: string | null;
  bodyRu: string;
  lexemes: DailyReadingLexeme[];
};

export type DailyPracticePrompt = {
  id: number;
  uzText: string;
  ruCorrect: string;
  sortOrder: number;
};

/** Payload for GET /api/daily-course/day/:dayNumber */
export type DailyCourseDayBundle = {
  dayNumber: number;
  grammar: DailyGrammarSection | null;
  vocabulary: DailyVocabularySection | null;
  reading: DailyReadingSection | null;
  practice: DailyPracticePrompt[] | null;
};

export const DAILY_COURSE_DAY_MIN = 1;
export const DAILY_COURSE_DAY_MAX = 182;

/** Obunasiz kunlik kurs: faqat shu kunlar (grammatika, lug‘at, o‘qish, gapirish). */
export const FREE_KUNLIK_DAY_LIMIT = 1;

/** @deprecated Use FREE_KUNLIK_DAY_LIMIT */
export const FREE_KUNLIK_SPEAKING_DAY_LIMIT = FREE_KUNLIK_DAY_LIMIT;

export function isFreeKunlikDay(dayNumber: number): boolean {
  return (
    Number.isInteger(dayNumber) &&
    dayNumber >= DAILY_COURSE_DAY_MIN &&
    dayNumber <= FREE_KUNLIK_DAY_LIMIT
  );
}

/** Kunlik gapirish AI tekshiruvi — obunasiz faqat bepul kunlar uchun. */
export function isFreeKunlikSpeakingDay(dayNumber: number): boolean {
  return isFreeKunlikDay(dayNumber);
}

/** Whether a user may open lesson content for this day (API + section routes). */
export function canEnterKunlikDayContent(dayNumber: number, subscriptionActive: boolean): boolean {
  if (subscriptionActive) return true;
  return isFreeKunlikDay(dayNumber);
}

export function isValidDailyCourseDay(n: number): boolean {
  return Number.isInteger(n) && n >= DAILY_COURSE_DAY_MIN && n <= DAILY_COURSE_DAY_MAX;
}
