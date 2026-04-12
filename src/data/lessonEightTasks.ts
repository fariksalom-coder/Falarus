/**
 * 8-dars — har bir vazifada bitta mashq turi.
 */

import type { LessonOneTask } from './lessonOneTasks';

export const LESSON_8_VAZIFA_CHOICE: Extract<LessonOneTask, { type: 'choice' }>[] = [
  {
    type: "choice",
    prompt: "\"книга\" — bu",
    options: [
      "Мужской",
      "Женский",
      "Средний"
    ],
    correct: "Женский"
  },
  {
    type: "choice",
    prompt: "Кто она? — ___ врач.",
    options: [
      "Он",
      "Она",
      "Они"
    ],
    correct: "Она"
  },
  {
    type: "choice",
    prompt: "\"быстро\" — bu",
    options: [
      "Ot",
      "Ravish",
      "Sifat"
    ],
    correct: "Ravish"
  },
  {
    type: "choice",
    prompt: "дом —",
    options: [
      "дома",
      "домы",
      "доми"
    ],
    correct: "дома"
  },
  {
    type: "choice",
    prompt: "Это ___ машина (mening).",
    options: [
      "мой",
      "моя",
      "моё"
    ],
    correct: "моя"
  },
  {
    type: "choice",
    prompt: "словарь — bu",
    options: [
      "Мужской",
      "Женский",
      "Средний"
    ],
    correct: "Мужской"
  },
  {
    type: "choice",
    prompt: "\"три\" — bu",
    options: [
      "Son",
      "Sifat",
      "Fe’l"
    ],
    correct: "Son"
  },
  {
    type: "choice",
    prompt: "брат —",
    options: [
      "браты",
      "братья",
      "братя"
    ],
    correct: "братья"
  },
  {
    type: "choice",
    prompt: "Это мой дом, ___ не твой.",
    options: [
      "и",
      "или",
      "но"
    ],
    correct: "но"
  },
  {
    type: "choice",
    prompt: "время — bu",
    options: [
      "Мужской",
      "Женский",
      "Средний"
    ],
    correct: "Средний"
  },
  {
    type: "choice",
    prompt: "Это новая школа ___ старый дом.",
    options: [
      "и",
      "но",
      "или"
    ],
    correct: "и"
  }
];

export const LESSON_8_VAZIFA_SENTENCE: Extract<LessonOneTask, { type: 'sentence' }>[] = [
  {
    type: "sentence",
    prompt: "Gapni tuzing: Men talabaman.",
    words: [
      "я",
      "студент"
    ],
    correct: "я студент"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: U yaxshi shifokor.",
    words: [
      "она",
      "врач",
      "хороший"
    ],
    correct: "она хороший врач"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu mening telefonim.",
    words: [
      "это",
      "мой",
      "телефон"
    ],
    correct: "это мой телефон"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Biz Samarqanddanmiz.",
    words: [
      "мы",
      "из",
      "Самарканд"
    ],
    correct: "мы из Самарканд"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Ular ruscha gaplashadi.",
    words: [
      "они",
      "говорят",
      "по-русски"
    ],
    correct: "они говорят по-русски"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bular katta shaharlar.",
    words: [
      "большие",
      "города",
      "это"
    ],
    correct: "это большие города"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Mening kitobim va sening kitobing.",
    words: [
      "моя",
      "книга",
      "и",
      "твоя",
      "книга"
    ],
    correct: "моя книга и твоя книга"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Eski uylar, lekin yangi park.",
    words: [
      "старые",
      "дома",
      "но",
      "новый",
      "парк"
    ],
    correct: "старые дома но новый парк"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bizning o‘qituvchilarimiz yaxshi.",
    words: [
      "наши",
      "учителя",
      "хорошие"
    ],
    correct: "наши учителя хорошие"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Uning do‘stlari uyda.",
    words: [
      "его",
      "друзья",
      "дома"
    ],
    correct: "его друзья дома"
  }
];

export const LESSON_8_VAZIFA_MATCHING: Extract<LessonOneTask, { type: 'matching' }>[] = [
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "дом",
        right: "мой"
      },
      {
        left: "книга",
        right: "моя"
      },
      {
        left: "окно",
        right: "моё"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "брат",
        right: "братья"
      },
      {
        left: "друг",
        right: "друзья"
      },
      {
        left: "сын",
        right: "сыновья"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "учитель",
        right: "он"
      },
      {
        left: "ночь",
        right: "она"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Чей дом?",
        right: "Это мой дом."
      },
      {
        left: "Чья школа?",
        right: "Это моя школа."
      },
      {
        left: "Чьё письмо?",
        right: "Это моё письмо."
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "город",
        right: "города"
      },
      {
        left: "дерево",
        right: "деревья"
      },
      {
        left: "лист",
        right: "листья"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "быстро",
        right: "читать"
      },
      {
        left: "красивый",
        right: "машина"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "мама",
        right: "Женский"
      },
      {
        left: "папа",
        right: "Мужской"
      },
      {
        left: "время",
        right: "Средний"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Мы",
        right: "biz"
      },
      {
        left: "Ты",
        right: "sen"
      },
      {
        left: "Они",
        right: "ular"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Это его дом.",
        right: "Мужской"
      },
      {
        left: "Это моя книга.",
        right: "Женский"
      },
      {
        left: "Это моё окно.",
        right: "Средний"
      }
    ]
  }
];

export const LESSON_8_VAZIFALARI: {
  vazifaId: number;
  label: string;
  hint: string;
  tasks: LessonOneTask[];
}[] = [
  { vazifaId: 1, label: 'Vazifa 1', hint: "To'g'ri javobni tanlang", tasks: LESSON_8_VAZIFA_CHOICE },
  { vazifaId: 2, label: 'Vazifa 2', hint: 'Gapni tuzing', tasks: LESSON_8_VAZIFA_SENTENCE },
  { vazifaId: 3, label: 'Vazifa 3', hint: 'Juftini toping', tasks: LESSON_8_VAZIFA_MATCHING },
];

export function getLessonEightVazifaConfig(vazifaId: number) {
  return LESSON_8_VAZIFALARI.find((v) => v.vazifaId === vazifaId) ?? null;
}
