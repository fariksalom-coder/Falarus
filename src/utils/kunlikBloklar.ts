import { TOTAL_DAYS } from '../data/dailyPlan';
import { isKunlikDayRowFullyComplete } from '../../shared/kunlikDayCompletion';
import type { KunlikDayProgress } from '../hooks/useKunlikProgress';

/**
 * KUNNING BESH BLOKI — YAGONA MANBA.
 *
 * Ketma-ketlik qoidasi (qaysi blok ochiq, qaysi biri qulf, qaysi biri
 * "hozir") IKKI joyda ko'rsatiladi: xaritada va kunning sahifasida.
 * Qoidani ikki marta yozish — eng tez buziladigan narsa: bir joyda
 * o'zgartirilsa, ikkinchisi jim qolib, o'quvchi bir ekranda "ochiq",
 * boshqasida "qulf" ko'radi.
 *
 * Shuning uchun qoida faqat SHU faylda turadi va ikkala ekran ham shu
 * yerdan o'qiydi.
 */

export const DEFAULT_ROW: Omit<KunlikDayProgress, 'day_number'> = {
  grammar_1: false,
  grammar_2: false,
  grammar_3: false,
  grammar_correct: 0,
  words_learned: 0,
  words_correct: 0,
  words_match: false,
  phrases_done: false,
  phrases_correct: 0,
  text_questions_correct: 0,
  speaking_tasks_done: 0,
  oqish_done: false,
  suhbat_done: false,
  speaking_level: 0,
};

export const QUESTS = [
  {
    id: 'grammar',
    titleKey: 'home.questGrammar',
    subtitleKey: 'home.questGrammarSub',
    route: (day: number) => `/kunlik-reja/kun/${day}/grammatika`,
    images: {
      done: '/app-mobile/images/home/block_icons/grammar_done.png',
      active: '/app-mobile/images/home/block_icons/grammar_current.png',
      locked: '/app-mobile/images/home/block_icons/grammar_locked.png',
    },
  },
  {
    id: 'vocabulary',
    titleKey: 'home.questVocab',
    subtitleKey: 'home.questVocabSub',
    route: (day: number) => `/kunlik-reja/kun/${day}/lugat`,
    images: {
      done: '/app-mobile/images/home/block_icons/vocabulary_done.png',
      active: '/app-mobile/images/home/block_icons/vocabulary_current.png',
      locked: '/app-mobile/images/home/block_icons/vocabulary_locked.png',
    },
  },
  {
    id: 'reading',
    titleKey: 'home.questReading',
    subtitleKey: 'home.questReadingSub',
    route: (day: number) => `/kunlik-reja/kun/${day}/oqish`,
    images: {
      done: '/app-mobile/images/home/block_icons/reading_done.png',
      active: '/app-mobile/images/home/block_icons/reading_current.png',
      locked: '/app-mobile/images/home/block_icons/reading_locked.png',
    },
  },
  {
    id: 'speaking',
    titleKey: 'home.questSpeaking',
    subtitleKey: 'home.questSpeakingSub',
    route: (day: number) => `/kunlik-reja/kun/${day}/gapirish`,
    images: {
      done: '/app-mobile/images/home/block_icons/speaking_done.png',
      active: '/app-mobile/images/home/block_icons/speaking_current.png',
      locked: '/app-mobile/images/home/block_icons/speaking_locked.png',
    },
  },
  /*
   * 5-BLOK — ustoz bilan jonli savol-javob. Ilgari grammatika oqimining
   * ichida, uchala mashqdan keyingi bosqich edi: o'quvchi u yergacha
   * yetib bormasdi. Endi kunning mustaqil bloki.
   */
  {
    id: 'suhbat',
    titleKey: 'home.questSuhbat',
    subtitleKey: 'home.questSuhbatSub',
    route: (day: number) => `/kunlik-reja/kun/${day}/savol-javob`,
    images: {
      done: '/app-mobile/images/home/block_icons/speaking_done.png',
      active: '/app-mobile/images/home/block_icons/speaking_current.png',
      locked: '/app-mobile/images/home/block_icons/speaking_locked.png',
    },
  },
] as const;

export type QuestState = 'done' | 'active' | 'locked';

export type QuestSlot = (typeof QUESTS)[number] & {
  state: QuestState;
  canOpen: boolean;
};


export function getRow(rows: Map<number, KunlikDayProgress>, day: number): KunlikDayProgress {
  return rows.get(day) ?? { day_number: day, ...DEFAULT_ROW };
}

function isGrammarDone(row: KunlikDayProgress): boolean {
  return row.grammar_1 && row.grammar_2 && row.grammar_3;
}

function isVocabularyDone(row: KunlikDayProgress): boolean {
  return row.words_match;
}

function isSpeakingDone(row: KunlikDayProgress, promptCount: number): boolean {
  return promptCount <= 0 || row.speaking_level >= promptCount;
}

export function buildQuestSlots(
  row: KunlikDayProgress,
  promptCount: number,
  oltin: boolean,
): QuestSlot[] {
  const raw = [
    { done: isGrammarDone(row), hasContent: true },
    { done: isVocabularyDone(row), hasContent: true },
    { done: row.oqish_done, hasContent: true },
    { done: isSpeakingDone(row, promptCount), hasContent: promptCount > 0 },
    { done: row.suhbat_done === true, hasContent: true },
  ];

  let activeAssigned = false;
  let previousIncomplete = false;

  return QUESTS.map((quest, index) => {
    const item = raw[index];
    let state: QuestState;

    if (previousIncomplete) {
      state = 'locked';
    } else if (item.done) {
      state = 'done';
    } else if (!item.hasContent) {
      state = 'locked';
      previousIncomplete = true;
    } else if (!activeAssigned) {
      state = 'active';
      activeAssigned = true;
      previousIncomplete = true;
    } else {
      state = 'locked';
    }

    /*
     * OLTIN A'ZO (support hisobi) — FAQAT 5-BLOK zanjirdan chiqarilgan.
     *
     * Qolgan to'rt blok hammaga bir xil tartibda ochiladi; savol-javobni
     * esa support butun kunni o'tmasdan ochib ko'ra olishi kerak.
     */
    if (oltin && quest.id === 'suhbat' && state === 'locked') state = 'active';

    return { ...quest, state, canOpen: state !== 'locked' };
  });
}

export function isDayComplete(row: KunlikDayProgress, promptCount: number): boolean {
  const counts = new Map<number, number>([[row.day_number, promptCount]]);
  return isKunlikDayRowFullyComplete(row, counts);
}

export function findCurrentDay(rows: Map<number, KunlikDayProgress>, promptCounts: Map<number, number>): number {
  for (let day = 1; day <= TOTAL_DAYS; day += 1) {
    if (!isDayComplete(getRow(rows, day), promptCounts.get(day) ?? 0)) return day;
  }
  return TOTAL_DAYS;
}
