/**
 * 4-dars — har bir vazifada bitta mashq turi.
 */

import type { LessonOneTask } from './lessonOneTasks';

export const LESSON_4_VAZIFA_CHOICE: Extract<LessonOneTask, { type: 'choice' }>[] = [
  {
    type: "choice",
    prompt: "\"дом\" — bu",
    options: [
      "Женский",
      "Мужской",
      "Средний"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "\"машина\" — bu",
    options: [
      "Мужской",
      "Средний",
      "Женский"
    ],
    correct: "Женский"
  },
  {
    type: "choice",
    prompt: "\"окно\" — bu",
    options: [
      "Средний",
      "Мужской",
      "Женский"
    ],
    correct: "Средний"
  },
  {
    type: "choice",
    prompt: "\"город\" — bu",
    options: [
      "Женский",
      "Мужской",
      "Средний"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "\"школа\" — bu",
    options: [
      "Мужской",
      "Женский",
      "Средний"
    ],
    correct: "Женский"
  },
  {
    type: "choice",
    prompt: "\"море\" — bu",
    options: [
      "Мужской",
      "Средний",
      "Женский"
    ],
    correct: "Средний"
  },
  {
    type: "choice",
    prompt: "\"телефон\" — bu",
    options: [
      "Мужской",
      "Средний",
      "Женский"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "\"книга\" — bu",
    options: [
      "Средний",
      "Женский",
      "Мужской"
    ],
    correct: "Женский"
  },
  {
    type: "choice",
    prompt: "\"письмо\" — bu",
    options: [
      "Женский",
      "Мужской",
      "Средний"
    ],
    correct: "Средний"
  },
  {
    type: "choice",
    prompt: "\"врач\" — bu",
    options: [
      "Мужской",
      "Женский",
      "Средний"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "\"здание\" — bu",
    options: [
      "Средний",
      "Мужской",
      "Женский"
    ],
    correct: "Средний"
  },
  {
    type: "choice",
    prompt: "\"работа\" — bu",
    options: [
      "Мужской",
      "Средний",
      "Женский"
    ],
    correct: "Женский"
  },
  {
    type: "choice",
    prompt: "\"поле\" — bu",
    options: [
      "Женский",
      "Средний",
      "Мужской"
    ],
    correct: "Средний"
  },
  {
    type: "choice",
    prompt: "\"студент\" — bu",
    options: [
      "Мужской",
      "Женский",
      "Средний"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "\"дверь\" — bu",
    options: [
      "Мужской",
      "Женский",
      "Средний"
    ],
    correct: "Женский"
  },
  {
    type: "choice",
    prompt: "\"дедушка\" — bu",
    options: [
      "Женский",
      "Мужской",
      "Средний"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "\"папа\" — bu",
    options: [
      "Мужской",
      "Средний",
      "Женский"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "\"юноша\" — bu",
    options: [
      "Женский",
      "Средний",
      "Мужской"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "\"кофе\" — bu",
    options: [
      "Средний",
      "Мужской",
      "Женский"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "\"время\" — bu",
    options: [
      "Женский",
      "Мужской",
      "Средний"
    ],
    correct: "Средний"
  },
  {
    type: "choice",
    prompt: "\"имя\" — bu",
    options: [
      "Средний",
      "Мужской",
      "Женский"
    ],
    correct: "Средний"
  },
  {
    type: "choice",
    prompt: "\"мужчина\" — bu",
    options: [
      "Мужской",
      "Женский",
      "Средний"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "\"пламя\" — bu",
    options: [
      "Средний",
      "Мужской",
      "Женский"
    ],
    correct: "Средний"
  },
  {
    type: "choice",
    prompt: "\"дедушка\" — ___ хороший",
    options: [
      "он",
      "она",
      "оно"
    ],
    correct: "он"
  },
  {
    type: "choice",
    prompt: "\"время\" — ___ быстрое",
    options: [
      "он",
      "она",
      "оно"
    ],
    correct: "оно"
  }
];

export const LESSON_4_VAZIFA_SENTENCE: Extract<LessonOneTask, { type: 'sentence' }>[] = [
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: katta uy (erkak jins).',
    words: ['большой', 'дом'],
    correct: 'большой дом',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: chiroyli mashina (ayol jins).',
    words: ['красивая', 'машина'],
    correct: 'красивая машина',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: katta oyna (o‘rta jins).',
    words: ['большое', 'окно'],
    correct: 'большое окно',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: yangi shahar (erkak jins).',
    words: ['новый', 'город'],
    correct: 'новый город',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: eski maktab (ayol).',
    words: ['старая', 'школа'],
    correct: 'старая школа',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: ko‘k dengiz (o‘rta).',
    words: ['синее', 'море'],
    correct: 'синее море',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: yaxshi talaba (erkak jins).',
    words: ['хороший', 'студент'],
    correct: 'хороший студент',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: ochiq eshik (ayol).',
    words: ['открытая', 'дверь'],
    correct: 'открытая дверь',
  },
];

export const LESSON_4_VAZIFA_MATCHING: Extract<LessonOneTask, { type: 'matching' }>[] = [
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Мужской",
        right: "дом"
      },
      {
        left: "Женский",
        right: "мама"
      },
      {
        left: "Средний",
        right: "окно"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Мужской",
        right: "город"
      },
      {
        left: "Женский",
        right: "машина"
      },
      {
        left: "Средний",
        right: "море"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Мужской",
        right: "телефон"
      },
      {
        left: "Женский",
        right: "школа"
      },
      {
        left: "Средний",
        right: "письмо"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Мужской",
        right: "студент"
      },
      {
        left: "Женский",
        right: "книга"
      },
      {
        left: "Средний",
        right: "здание"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Мужской",
        right: "врач"
      },
      {
        left: "Женский",
        right: "работа"
      },
      {
        left: "Средний",
        right: "поле"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Мужской",
        right: "директор"
      },
      {
        left: "Женский",
        right: "комната"
      },
      {
        left: "Средний",
        right: "озеро"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Мужской",
        right: "банк"
      },
      {
        left: "Женский",
        right: "дверь"
      },
      {
        left: "Средний",
        right: "село"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Мужской",
        right: "учитель"
      },
      {
        left: "Женский",
        right: "неделя"
      },
      {
        left: "Средний",
        right: "место"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Мужской",
        right: "магазин"
      },
      {
        left: "Женский",
        right: "страна"
      },
      {
        left: "Средний",
        right: "время"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Мужской",
        right: "парень"
      },
      {
        left: "Женский",
        right: "семья"
      },
      {
        left: "Средний",
        right: "окно"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping (istisnolar)",
    pairs: [
      {
        left: "Мужской",
        right: "папа"
      },
      {
        left: "Женский",
        right: "мама"
      },
      {
        left: "Средний",
        right: "время"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping (istisnolar)",
    pairs: [
      {
        left: "Мужской",
        right: "дедушка"
      },
      {
        left: "Женский",
        right: "семья"
      },
      {
        left: "Средний",
        right: "имя"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping (istisnolar)",
    pairs: [
      {
        left: "Мужской",
        right: "юноша"
      },
      {
        left: "Женский",
        right: "ночь"
      },
      {
        left: "Средний",
        right: "пламя"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping (istisnolar)",
    pairs: [
      {
        left: "Мужской",
        right: "мужчина"
      },
      {
        left: "Женский",
        right: "дверь"
      },
      {
        left: "Средний",
        right: "знамя"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping (istisnolar)",
    pairs: [
      {
        left: "Мужской",
        right: "кофе"
      },
      {
        left: "Женский",
        right: "работа"
      },
      {
        left: "Средний",
        right: "семя"
      }
    ]
  }
];

export const LESSON_4_VAZIFALARI: {
  vazifaId: number;
  label: string;
  hint: string;
  tasks: LessonOneTask[];
}[] = [
  { vazifaId: 1, label: 'Vazifa 1', hint: "To'g'ri javobni tanlang", tasks: LESSON_4_VAZIFA_CHOICE },
  { vazifaId: 2, label: 'Vazifa 2', hint: 'Juftini toping', tasks: LESSON_4_VAZIFA_MATCHING },
  { vazifaId: 3, label: 'Vazifa 3', hint: 'Gapni tuzing', tasks: LESSON_4_VAZIFA_SENTENCE },
];

export function getLessonFourVazifaConfig(vazifaId: number) {
  return LESSON_4_VAZIFALARI.find((v) => v.vazifaId === vazifaId) ?? null;
}
