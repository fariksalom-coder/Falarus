export type DailyCourseMcq = {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctIndex: number;
  /** Nega aynan shu javob to'g'ri — bo'sh bo'lishi mumkin. */
  explanation: string;
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

/**
 * Ibora testi: ruscha ibora + 4 ta variant (`daily_phrase_mcqs`).
 * Lug'at bo'limining 4-vazifasi — juftlik topishdan keyin keladi.
 *
 * DIQQAT: `correctIndex` bu yerda ATAYIN YO'Q. Javob kaliti brauzerga
 * yuborilmaydi — har bir javobni server tekshiradi
 * (`POST /api/kunlik-progress/:day/phrases/answer`). Aks holda sahifa
 * kodidan to'g'ri javoblarni oldindan bilib olish mumkin bo'lardi.
 */
export type DailyPhraseMcq = {
  id: number;
  phraseRu: string;
  /** Har doim 4 ta: A, B, C, D. */
  options: string[];
  sortOrder: number;
};

export type DailyVocabularySection = {
  words: DailyVocabWord[];
  phrases: DailyPhraseMcq[];
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

/**
 * Matn savoli (`daily_text_questions`) — o'qishdan keyingi tushunish testi.
 *
 * DIQQAT: `correctIndex` ATAYIN yo'q — javob kaliti brauzerga yuborilmaydi,
 * tekshiruv `POST /api/kunlik-progress/:day/text-questions/answer` da bo'ladi.
 */
export type DailyTextQuestion = {
  id: number;
  questionRu: string;
  /** Har doim 4 ta: A, B, C, D. */
  options: string[];
  sortOrder: number;
};

/** O'qish blokini yakunlash uchun kerakli eng kam foiz. */
export const READING_QUESTIONS_PASS_PERCENT = 70;

/**
 * Gapirish (4-blok): nechta xato urinishdan keyin to'g'ri javob ko'rsatilib,
 * «O'tkazish» tugmasi chiqadi.
 *
 * 1-xato — izoh va maslahat. 2-xatodan keyin to'g'ri javob ko'rsatiladi va
 * o'quvchi keyingi topshiriqqa o'tishi mumkin bo'ladi: bitta gapda tiqilib
 * qolish o'rganishni to'xtatadi. Qayta urinish baribir ochiq qoladi.
 */
export const SPEAKING_ATTEMPTS_BEFORE_SKIP = 2;

export type DailyReadingSection = {
  textId: string | null;
  title: string | null;
  bodyRu: string;
  lexemes: DailyReadingLexeme[];
  /** Matndan keyingi savollar (bo'sh bo'lishi mumkin). */
  questions: DailyTextQuestion[];
};

/**
 * Gapirish topshirig'i. Etalon ruscha javob ATAYIN yo'q — to'g'ri yoki
 * xatoligini AI o'zbekcha topshiriq va o'quvchi aytgan gapga qarab o'zi
 * baholaydi (`server/lib/openai.ts` → `checkTranslation`).
 */
export type DailyPracticePrompt = {
  id: number;
  uzText: string;
  sortOrder: number;
};

/**
 * Gapirish TESTIDAN KEYIN ochiladigan qo'shimcha topshiriq
 * (`daily_speaking_tasks`). Ruscha topshiriq beriladi, o'zbekcha izoh —
 * ixtiyoriy. Etalon javob yo'q: baholashni to'liq AI qiladi.
 */
export type DailySpeakingTask = {
  id: number;
  promptRu: string;
  promptUz: string | null;
  sortOrder: number;
};

/** Payload for GET /api/daily-course/day/:dayNumber */
export type DailyCourseDayBundle = {
  dayNumber: number;
  grammar: DailyGrammarSection | null;
  vocabulary: DailyVocabularySection | null;
  reading: DailyReadingSection | null;
  practice: DailyPracticePrompt[] | null;
  /** Gapirish testidan keyingi qo'shimcha topshiriqlar (bo'sh bo'lishi mumkin). */
  speakingTasks: DailySpeakingTask[];
};

export const DAILY_COURSE_DAY_MIN = 1;
export const DAILY_COURSE_DAY_MAX = 182;

/** Obunasiz kunlik kurs: faqat shu kunlar (grammatika, lug‘at, o‘qish, gapirish). */
export const FREE_KUNLIK_DAY_LIMIT = 1;

export function isFreeKunlikDay(dayNumber: number): boolean {
  return (
    Number.isInteger(dayNumber) &&
    dayNumber >= DAILY_COURSE_DAY_MIN &&
    dayNumber <= FREE_KUNLIK_DAY_LIMIT
  );
}

/** Whether a user may open lesson content for this day (API + section routes). */
export function canEnterKunlikDayContent(dayNumber: number, subscriptionActive: boolean): boolean {
  if (subscriptionActive) return true;
  return isFreeKunlikDay(dayNumber);
}

export function isValidDailyCourseDay(n: number): boolean {
  return Number.isInteger(n) && n >= DAILY_COURSE_DAY_MIN && n <= DAILY_COURSE_DAY_MAX;
}
