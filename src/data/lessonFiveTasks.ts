/**
 * 5-dars — har bir vazifada bitta mashq turi.
 */

import type { LessonOneTask } from './lessonOneTasks';

export const LESSON_5_VAZIFA_CHOICE: Extract<LessonOneTask, { type: 'choice' }>[] = [
  {
    type: "choice",
    prompt: "словарь — bu",
    options: [
      "Женский",
      "Мужской",
      "Средний"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "дверь — bu",
    options: [
      "Мужской",
      "Женский",
      "Средний"
    ],
    correct: "Женский"
  },
  {
    type: "choice",
    prompt: "учитель — bu",
    options: [
      "Мужской",
      "Женский",
      "Средний"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "ночь — bu",
    options: [
      "Мужской",
      "Женский",
      "Средний"
    ],
    correct: "Женский"
  },
  {
    type: "choice",
    prompt: "январь — bu",
    options: [
      "Женский",
      "Мужской",
      "Средний"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "любовь — bu",
    options: [
      "Женский",
      "Мужской",
      "Средний"
    ],
    correct: "Женский"
  },
  {
    type: "choice",
    prompt: "день — bu",
    options: [
      "Мужской",
      "Женский",
      "Средний"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "тетрадь — bu",
    options: [
      "Мужской",
      "Женский",
      "Средний"
    ],
    correct: "Женский"
  },
  {
    type: "choice",
    prompt: "водитель — ___ хороший",
    options: [
      "он",
      "она",
      "оно"
    ],
    correct: "он"
  },
  {
    type: "choice",
    prompt: "площадь — ___ большая",
    options: [
      "он",
      "она",
      "оно"
    ],
    correct: "она"
  },
  {
    type: "choice",
    prompt: "июль — ___ жаркий",
    options: [
      "он",
      "она",
      "оно"
    ],
    correct: "он"
  },
  {
    type: "choice",
    prompt: "жизнь — ___ трудная",
    options: [
      "он",
      "она",
      "оно"
    ],
    correct: "она"
  },
  {
    type: "choice",
    prompt: "покупатель — bu",
    options: [
      "Женский",
      "Мужской",
      "Средний"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "кровать — bu",
    options: [
      "Мужской",
      "Женский",
      "Средний"
    ],
    correct: "Женский"
  },
  {
    type: "choice",
    prompt: "сентябрь — bu",
    options: [
      "Женский",
      "Мужской",
      "Средний"
    ],
    correct: "Мужской"
  }
];

export const LESSON_5_VAZIFA_SENTENCE: Extract<LessonOneTask, { type: 'sentence' }>[] = [
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: yangi lug‘at (erkak jins, -ь).',
    words: ['новый', 'словарь'],
    correct: 'новый словарь',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: katta eshik (ayol, -ь).',
    words: ['большая', 'дверь'],
    correct: 'большая дверь',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: yaxshi o‘qituvchi (erkak jins).',
    words: ['хороший', 'учитель'],
    correct: 'хороший учитель',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: qorong‘u tun (ayol, -ь).',
    words: ['тёмная', 'ночь'],
    correct: 'тёмная ночь',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: sovuq yanvar (erkak jins).',
    words: ['холодный', 'январь'],
    correct: 'холодный январь',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: kichik daftar (ayol, -ь).',
    words: ['маленькая', 'тетрадь'],
    correct: 'маленькая тетрадь',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: yorug‘ kun (erkak jins).',
    words: ['светлый', 'день'],
    correct: 'светлый день',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: keng maydon (ayol, -ь).',
    words: ['большая', 'площадь'],
    correct: 'большая площадь',
  },
];

export const LESSON_5_VAZIFA_MATCHING: Extract<LessonOneTask, { type: 'matching' }>[] = [
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Мужской",
        right: "словарь"
      },
      {
        left: "Женский",
        right: "дверь"
      }
    ]
  },
  {
    type: "matching",
    prompt: "2) Juftini toping",
    pairs: [
      {
        left: "Мужской",
        right: "учитель"
      },
      {
        left: "Женский",
        right: "ночь"
      }
    ]
  },
  {
    type: "matching",
    prompt: "3) Juftini toping",
    pairs: [
      {
        left: "Мужской",
        right: "январь"
      },
      {
        left: "Женский",
        right: "тетрадь"
      }
    ]
  },
  {
    type: "matching",
    prompt: "4) Juftini toping",
    pairs: [
      {
        left: "Мужской",
        right: "день"
      },
      {
        left: "Женский",
        right: "площадь"
      }
    ]
  },
  {
    type: "matching",
    prompt: "5) Juftini toping",
    pairs: [
      {
        left: "Мужской",
        right: "сентябрь"
      },
      {
        left: "Женский",
        right: "кровать"
      }
    ]
  }
];

export const LESSON_5_VAZIFALARI: {
  vazifaId: number;
  label: string;
  hint: string;
  tasks: LessonOneTask[];
}[] = [
  { vazifaId: 1, label: 'Vazifa 1', hint: "To'g'ri javobni tanlang", tasks: LESSON_5_VAZIFA_CHOICE },
  { vazifaId: 2, label: 'Vazifa 2', hint: 'Juftini toping', tasks: LESSON_5_VAZIFA_MATCHING },
  { vazifaId: 3, label: 'Vazifa 3', hint: 'Gapni tuzing', tasks: LESSON_5_VAZIFA_SENTENCE },
];

export function getLessonFiveVazifaConfig(vazifaId: number) {
  return LESSON_5_VAZIFALARI.find((v) => v.vazifaId === vazifaId) ?? null;
}
