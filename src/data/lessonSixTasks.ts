/**
 * 6-dars — har bir vazifada bitta mashq turi.
 */

import type { LessonOneTask } from './lessonOneTasks';

export const LESSON_6_VAZIFA_CHOICE: Extract<LessonOneTask, { type: 'choice' }>[] = [
  {
    type: "choice",
    prompt: "Чей дом? — ___ дом.",
    options: [
      "моя",
      "мой",
      "моё"
    ],
    correct: "мой"
  },
  {
    type: "choice",
    prompt: "Чья книга? — ___ книга.",
    options: [
      "мой",
      "моя",
      "моё"
    ],
    correct: "моя"
  },
  {
    type: "choice",
    prompt: "Чьё окно? — ___ окно.",
    options: [
      "моё",
      "моя",
      "мой"
    ],
    correct: "моё"
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
    prompt: "Это ___ письмо (mening).",
    options: [
      "моя",
      "моё",
      "мой"
    ],
    correct: "моё"
  },
  {
    type: "choice",
    prompt: "Это ___ телефон (sening).",
    options: [
      "твой",
      "твоя",
      "твоё"
    ],
    correct: "твой"
  },
  {
    type: "choice",
    prompt: "Это ___ школа (bizning).",
    options: [
      "наш",
      "наша",
      "наше"
    ],
    correct: "наша"
  },
  {
    type: "choice",
    prompt: "Это ___ дом (sizning).",
    options: [
      "ваша",
      "ваш",
      "ваше"
    ],
    correct: "ваш"
  },
  {
    type: "choice",
    prompt: "Это ___ книга (uning — erkak).",
    options: [
      "его",
      "её",
      "мой"
    ],
    correct: "его"
  },
  {
    type: "choice",
    prompt: "Это ___ машина (uning — ayol).",
    options: [
      "его",
      "её",
      "твоя"
    ],
    correct: "её"
  },
  {
    type: "choice",
    prompt: "Это ___ друзья (bizning).",
    options: [
      "наши",
      "наша",
      "наше"
    ],
    correct: "наши"
  },
  {
    type: "choice",
    prompt: "Чья школа? — ___ школа.",
    options: [
      "наша",
      "наш",
      "наше"
    ],
    correct: "наша"
  },
  {
    type: "choice",
    prompt: "Чей учитель? — ___ учитель.",
    options: [
      "мой",
      "моя",
      "моё"
    ],
    correct: "мой"
  },
  {
    type: "choice",
    prompt: "Чьё письмо? — ___ письмо.",
    options: [
      "твоё",
      "твоя",
      "твой"
    ],
    correct: "твоё"
  },
  {
    type: "choice",
    prompt: "Это ___ дом (ularning).",
    options: [
      "их",
      "наши",
      "ваша"
    ],
    correct: "их"
  },
  {
    type: "choice",
    prompt: "Это мой брат ___ моя сестра.",
    options: [
      "или",
      "и",
      "но"
    ],
    correct: "и"
  },
  {
    type: "choice",
    prompt: "Это твой дом ___ его дом?",
    options: [
      "и",
      "или",
      "но"
    ],
    correct: "или"
  },
  {
    type: "choice",
    prompt: "Это мой телефон, ___ не твой.",
    options: [
      "и",
      "но",
      "или"
    ],
    correct: "но"
  },
  {
    type: "choice",
    prompt: "Это ваша школа? — ___.",
    options: [
      "Нет",
      "И",
      "Но"
    ],
    correct: "Нет"
  },
  {
    type: "choice",
    prompt: "Это её книга ___ его книга?",
    options: [
      "или",
      "и",
      "но"
    ],
    correct: "или"
  },
  {
    type: "choice",
    prompt: "Это наш дом ___ наша квартира.",
    options: [
      "или",
      "и",
      "нет"
    ],
    correct: "и"
  }
];

export const LESSON_6_VAZIFA_SENTENCE: Extract<LessonOneTask, { type: 'sentence' }>[] = [
  {
    type: "sentence",
    prompt: "Gapni tuzing: mening uyim",
    words: [
      "мой",
      "моя",
      "дом",
      "дома"
    ],
    correct: "мой дом"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: mening kitobim",
    words: [
      "мой",
      "моя",
      "книга",
      "книги"
    ],
    correct: "моя книга"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: mening oynaim",
    words: [
      "моё",
      "мой",
      "окно",
      "окна"
    ],
    correct: "моё окно"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: sening telefoning",
    words: [
      "твой",
      "твоя",
      "телефон",
      "телефоны"
    ],
    correct: "твой телефон"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: bizning maktabimiz",
    words: [
      "наша",
      "наш",
      "школа",
      "школы"
    ],
    correct: "наша школа"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: sizning mashinangiz",
    words: [
      "ваша",
      "ваш",
      "машина",
      "машины"
    ],
    correct: "ваша машина"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: uning (erkak) uyi",
    words: [
      "его",
      "её",
      "дом",
      "дома"
    ],
    correct: "его дом"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: uning (ayol) kitobi",
    words: [
      "его",
      "её",
      "книга",
      "книги"
    ],
    correct: "её книга"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: bizning do‘stlarimiz",
    words: [
      "наши",
      "наша",
      "друзья",
      "друг"
    ],
    correct: "наши друзья"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: ularning uyi",
    words: [
      "их",
      "наш",
      "дом",
      "дома"
    ],
    correct: "их дом"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: mening onam va otam",
    words: [
      "моя",
      "мой",
      "мама",
      "папа",
      "и"
    ],
    correct: "моя мама и мой папа"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: bu mening uyim va maktabim",
    words: [
      "это",
      "мой",
      "моя",
      "дом",
      "школа",
      "и"
    ],
    correct: "это мой дом и моя школа"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: bu sening kitobing yoki mening kitobim",
    words: [
      "это",
      "твоя",
      "моя",
      "книга",
      "книга",
      "или"
    ],
    correct: "это твоя книга или моя книга"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: bu mening telefonim, lekin seniki emas",
    words: [
      "это",
      "мой",
      "твой",
      "телефон",
      "но",
      "не"
    ],
    correct: "это мой телефон но не твой"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: bu sening mashinangmi? — ha",
    words: [
      "это",
      "твоя",
      "машина",
      "да"
    ],
    correct: "это твоя машина да"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: bu uning uyi? — yo‘q",
    words: [
      "это",
      "его",
      "дом",
      "нет"
    ],
    correct: "это его дом нет"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: bu mening uyim yoki uning uyi",
    words: [
      "это",
      "мой",
      "его",
      "дом",
      "дом",
      "или"
    ],
    correct: "это мой дом или его дом"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: bu bizning maktabimiz va sizning maktabingiz",
    words: [
      "это",
      "наша",
      "ваша",
      "школа",
      "школа",
      "и"
    ],
    correct: "это наша школа и ваша школа"
  }
];

export const LESSON_6_VAZIFA_MATCHING: Extract<LessonOneTask, { type: 'matching' }>[] = [
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Чей дом?",
        right: "Это мой дом."
      },
      {
        left: "Чья машина?",
        right: "Это моя машина."
      },
      {
        left: "Чьё окно?",
        right: "Это моё окно."
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Чей телефон?",
        right: "Это твой телефон."
      },
      {
        left: "Чья школа?",
        right: "Это твоя школа."
      },
      {
        left: "Чьё письмо?",
        right: "Это твоё письмо."
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Чей город?",
        right: "Это наш город."
      },
      {
        left: "Чья квартира?",
        right: "Это наша квартира."
      },
      {
        left: "Чьё здание?",
        right: "Это наше здание."
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Чей учитель?",
        right: "Это ваш учитель."
      },
      {
        left: "Чья семья?",
        right: "Это ваша семья."
      },
      {
        left: "Чьё место?",
        right: "Это ваше место."
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Чей дом? (uning — erkak)",
        right: "Это его дом."
      },
      {
        left: "Чья машина? (uning — ayol)",
        right: "Это её машина."
      },
      {
        left: "Чьё окно? (ularning)",
        right: "Это их окно."
      }
    ]
  }
];

export const LESSON_6_VAZIFALARI: {
  vazifaId: number;
  label: string;
  hint: string;
  tasks: LessonOneTask[];
}[] = [
  { vazifaId: 1, label: 'Vazifa 1', hint: "To'g'ri javobni tanlang", tasks: LESSON_6_VAZIFA_CHOICE },
  { vazifaId: 2, label: 'Vazifa 2', hint: 'Gapni tuzing', tasks: LESSON_6_VAZIFA_SENTENCE },
  { vazifaId: 3, label: 'Vazifa 3', hint: 'Juftini toping', tasks: LESSON_6_VAZIFA_MATCHING },
];

export function getLessonSixVazifaConfig(vazifaId: number) {
  return LESSON_6_VAZIFALARI.find((v) => v.vazifaId === vazifaId) ?? null;
}
