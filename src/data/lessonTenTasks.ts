/**
 * 10-dars — har bir vazifada bitta mashq turi.
 */

import type { LessonOneTask } from './lessonOneTasks';

export const LESSON_10_VAZIFA_CHOICE: Extract<LessonOneTask, { type: 'choice' }>[] = [
  {
    type: "choice",
    prompt: "o‘qimoq",
    options: [
      "читать",
      "читает",
      "читал"
    ],
    correct: "читать"
  },
  {
    type: "choice",
    prompt: "yozmoq",
    options: [
      "писал",
      "писать",
      "пишет"
    ],
    correct: "писать"
  },
  {
    type: "choice",
    prompt: "gapirmoq",
    options: [
      "говорит",
      "говорил",
      "говорить"
    ],
    correct: "говорить"
  },
  {
    type: "choice",
    prompt: "ishlamoq",
    options: [
      "работал",
      "работает",
      "работать"
    ],
    correct: "работать"
  },
  {
    type: "choice",
    prompt: "yordam bermoq",
    options: [
      "поможет",
      "помог",
      "помочь"
    ],
    correct: "помочь"
  },
  {
    type: "choice",
    prompt: "dam olmoq",
    options: [
      "отдыхает",
      "отдыхать",
      "отдыхал"
    ],
    correct: "отдыхать"
  },
  {
    type: "choice",
    prompt: "bilmoq",
    options: [
      "знает",
      "знал",
      "знать"
    ],
    correct: "знать"
  },
  {
    type: "choice",
    prompt: "tinglamoq",
    options: [
      "слушать",
      "слушает",
      "слушал"
    ],
    correct: "слушать"
  },
  {
    type: "choice",
    prompt: "shug‘ullanmoq",
    options: [
      "занимается",
      "заниматься",
      "занимался"
    ],
    correct: "заниматься"
  },
  {
    type: "choice",
    prompt: "kiyinish",
    options: [
      "одевался",
      "одевается",
      "одеваться"
    ],
    correct: "одеваться"
  },
  {
    type: "choice",
    prompt: "изуча…",
    options: [
      "-ть",
      "-ти",
      "-чь"
    ],
    correct: "-ть"
  },
  {
    type: "choice",
    prompt: "виде…",
    options: [
      "-ть",
      "-ти",
      "-чь"
    ],
    correct: "-ть"
  },
  {
    type: "choice",
    prompt: "бере…",
    options: [
      "-ть",
      "-ти",
      "-чь"
    ],
    correct: "-чь"
  },
  {
    type: "choice",
    prompt: "отдыха…",
    options: [
      "-ть",
      "-ти",
      "-чь"
    ],
    correct: "-ть"
  },
  {
    type: "choice",
    prompt: "спрашива…",
    options: [
      "-ть",
      "-ти",
      "-чь"
    ],
    correct: "-ть"
  },
  {
    type: "choice",
    prompt: "гуля…",
    options: [
      "-ть",
      "-ти",
      "-чь"
    ],
    correct: "-ть"
  },
  {
    type: "choice",
    prompt: "помо…",
    options: [
      "-ть",
      "-ти",
      "-чь"
    ],
    correct: "-чь"
  },
  {
    type: "choice",
    prompt: "нес…",
    options: [
      "-ть",
      "-ти",
      "-чь"
    ],
    correct: "-ти"
  },
  {
    type: "choice",
    prompt: "учи…ся",
    options: [
      "-ться",
      "-ти",
      "-чь"
    ],
    correct: "-ться"
  },
  {
    type: "choice",
    prompt: "занима…ся",
    options: [
      "-ться",
      "-ти",
      "-чь"
    ],
    correct: "-ться"
  }
];

export const LESSON_10_VAZIFA_SENTENCE: Extract<LessonOneTask, { type: 'sentence' }>[] = [
  {
    type: "sentence",
    prompt: "Gapni tuzing: kitob o‘qimoq",
    words: [
      "читать",
      "книга",
      "книги",
      "писать",
      "книгу"
    ],
    correct: "читать книгу"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: gazeta o‘qimoq",
    words: [
      "читать",
      "газеты",
      "газета",
      "писать",
      "газету"
    ],
    correct: "читать газету"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: xat yozmoq",
    words: [
      "писать",
      "письмо",
      "писал",
      "читать",
      "письма"
    ],
    correct: "писать письмо"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: qo‘shiq tinglamoq",
    words: [
      "слушать",
      "песни",
      "песня",
      "читать",
      "песню"
    ],
    correct: "слушать песню"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: sut ichmoq",
    words: [
      "пить",
      "молоко",
      "молока",
      "читать",
      "пил"
    ],
    correct: "пить молоко"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: film ko‘rmoq",
    words: [
      "смотреть",
      "фильм",
      "фильмы",
      "читать",
      "смотрит"
    ],
    correct: "смотреть фильм"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: masala yechmoq",
    words: [
      "решать",
      "задачи",
      "задача",
      "писать",
      "решил"
    ],
    correct: "решать задачи"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: muammo hal qilmoq",
    words: [
      "решать",
      "проблемы",
      "проблема",
      "читать",
      "решает"
    ],
    correct: "решать проблемы"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: radio tinglamoq",
    words: [
      "слушать",
      "радио",
      "радиа",
      "писать",
      "слушал"
    ],
    correct: "слушать радио"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: surat ko‘rmoq",
    words: [
      "смотреть",
      "фотографии",
      "фотография",
      "читать",
      "смотрел"
    ],
    correct: "смотреть фотографии"
  }
];

export const LESSON_10_VAZIFA_MATCHING: Extract<LessonOneTask, { type: 'matching' }>[] = [
  {
    type: 'matching',
    prompt: 'Juftini toping: infinitiv ↔ ma’no',
    pairs: [
      { left: 'читать', right: "o'qimoq" },
      { left: 'писать', right: 'yozmoq' },
      { left: 'говорить', right: 'gapirmoq' },
      { left: 'работать', right: 'ishlamoq' },
      { left: 'помочь', right: "yordam bermoq" },
      { left: 'отдыхать', right: 'dam olmoq' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'знать', right: 'bilmoq' },
      { left: 'слушать', right: 'tinglamoq' },
      { left: 'заниматься', right: "shug'ullanmoq" },
      { left: 'одеваться', right: 'kiyinmoq' },
      { left: 'смотреть', right: "ko'rmoq" },
    ],
  },
];

export const LESSON_10_VAZIFALARI: {
  vazifaId: number;
  label: string;
  hint: string;
  tasks: LessonOneTask[];
}[] = [
  { vazifaId: 1, label: 'Vazifa 1', hint: "To'g'ri javobni tanlang", tasks: LESSON_10_VAZIFA_CHOICE },
  { vazifaId: 2, label: 'Vazifa 2', hint: 'Juftini toping', tasks: LESSON_10_VAZIFA_MATCHING },
  { vazifaId: 3, label: 'Vazifa 3', hint: 'Gapni tuzing', tasks: LESSON_10_VAZIFA_SENTENCE },
];

export function getLessonTenVazifaConfig(vazifaId: number) {
  return LESSON_10_VAZIFALARI.find((v) => v.vazifaId === vazifaId) ?? null;
}
