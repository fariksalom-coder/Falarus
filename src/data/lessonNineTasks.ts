/**
 * 9-dars — har bir vazifada bitta mashq turi.
 */

import type { LessonOneTask } from './lessonOneTasks';

export const LESSON_9_VAZIFA_CHOICE: Extract<LessonOneTask, { type: 'choice' }>[] = [
  {
    type: "choice",
    prompt: "Sifat qaysi savolga javob beradi?",
    options: [
      "Кто?",
      "Какой?",
      "Сколько?"
    ],
    correct: "Какой?"
  },
  {
    type: "choice",
    prompt: "дом uchun to‘g‘ri shaklni tanlang",
    options: [
      "большая дом",
      "большой дом",
      "большое дом"
    ],
    correct: "большой дом"
  },
  {
    type: "choice",
    prompt: "книга uchun to‘g‘ri shakl",
    options: [
      "новая книга",
      "новый книга",
      "новое книга"
    ],
    correct: "новая книга"
  },
  {
    type: "choice",
    prompt: "молоко uchun to‘g‘ri shakl",
    options: [
      "вкусный молоко",
      "вкусное молоко",
      "вкусная молоко"
    ],
    correct: "вкусное молоко"
  },
  {
    type: "choice",
    prompt: "Ko‘plikdagi to‘g‘ri shakl",
    options: [
      "новые книги",
      "новая книги",
      "новый книги"
    ],
    correct: "новые книги"
  },
  {
    type: "choice",
    prompt: "Qaysi antonim to‘g‘ri?",
    options: [
      "новый — старый",
      "новый — длинный",
      "новый — добрый"
    ],
    correct: "новый — старый"
  },
  {
    type: "choice",
    prompt: "Qaysi antonim to‘g‘ri?",
    options: [
      "трудный — лёгкий",
      "трудный — высокий",
      "трудный — новый"
    ],
    correct: "трудный — лёгкий"
  },
  {
    type: "choice",
    prompt: "Какая? savoliga mos so‘zni tanlang",
    options: [
      "большая",
      "большой",
      "большое"
    ],
    correct: "большая"
  },
  {
    type: "choice",
    prompt: "Какое? savoliga mos so‘zni tanlang",
    options: [
      "лёгкий",
      "лёгкое",
      "лёгкая"
    ],
    correct: "лёгкое"
  },
  {
    type: "choice",
    prompt: "Какие? savoliga mos so‘zni tanlang",
    options: [
      "старые",
      "старый",
      "старая"
    ],
    correct: "старые"
  }
];

export const LESSON_9_VAZIFA_SENTENCE: Extract<LessonOneTask, { type: 'sentence' }>[] = [
  {
    type: "sentence",
    prompt: "Gapni tuzing: Kichik bola",
    words: [
      "маленький",
      "мальчик",
      "маленькая"
    ],
    correct: "маленький мальчик"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Yangi mashina",
    words: [
      "новая",
      "машина",
      "новый"
    ],
    correct: "новая машина"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Toza sut",
    words: [
      "чистое",
      "молоко",
      "чистый"
    ],
    correct: "чистое молоко"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Katta uy",
    words: [
      "большой",
      "дом",
      "большая"
    ],
    correct: "большой дом"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Qiziqarli kitob",
    words: [
      "интересная",
      "книга",
      "интересный"
    ],
    correct: "интересная книга"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Yaxshi odam",
    words: [
      "хороший",
      "человек",
      "хорошая"
    ],
    correct: "хороший человек"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Katta muammo",
    words: [
      "большая",
      "проблема",
      "большой"
    ],
    correct: "большая проблема"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Yengil masala",
    words: [
      "лёгкая",
      "задача",
      "лёгкий"
    ],
    correct: "лёгкая задача"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Eski uylar",
    words: [
      "старые",
      "дома",
      "старый"
    ],
    correct: "старые дома"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Foydali maslahat",
    words: [
      "полезный",
      "совет",
      "полезная"
    ],
    correct: "полезный совет"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu mening telefonim, bu esa sening kitobing.",
    words: [
      "это",
      "это",
      "мой",
      "твоя",
      "телефон",
      "книга",
      "а",
      "моя"
    ],
    correct: "это мой телефон а это твоя книга"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu mening katta uyim, bu esa uning kichik uyi.",
    words: [
      "это",
      "это",
      "мой",
      "его",
      "маленький",
      "большой",
      "дом",
      "дом",
      "а"
    ],
    correct: "это мой большой дом а это его маленький дом"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu bizning yangi maktabimiz, bu esa sizning eski maktabingiz.",
    words: [
      "это",
      "это",
      "наша",
      "ваша",
      "новая",
      "старая",
      "школа",
      "школа",
      "а"
    ],
    correct: "это наша новая школа а это ваша старая школа"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu uning qiziqarli kitobi, bu esa mening yangi kitobim.",
    words: [
      "это",
      "это",
      "его",
      "моя",
      "интересная",
      "новая",
      "книга",
      "книга",
      "а"
    ],
    correct: "это его интересная книга а это моя новая книга"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu sening chiroyli mashinang, bu esa mening eski mashinam.",
    words: [
      "это",
      "это",
      "твоя",
      "моя",
      "красивая",
      "старая",
      "машина",
      "машина",
      "а"
    ],
    correct: "это твоя красивая машина а это моя старая машина"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu bizning katta shaharimiz, bu esa ularning kichik shahri.",
    words: [
      "это",
      "это",
      "наш",
      "их",
      "маленький",
      "большой",
      "город",
      "город",
      "а"
    ],
    correct: "это наш большой город а это их маленький город"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu mening yangi telefonim va uning eski telefoni.",
    words: [
      "это",
      "это",
      "мой",
      "его",
      "новый",
      "старый",
      "телефон",
      "телефон",
      "и"
    ],
    correct: "это мой новый телефон и это его старый телефон"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu sizning yaxshi o‘qituvchingiz, bu esa bizning yangi o‘qituvchimiz.",
    words: [
      "это",
      "это",
      "ваш",
      "наш",
      "хороший",
      "новый",
      "учитель",
      "учитель",
      "а"
    ],
    correct: "это ваш хороший учитель а это наш новый учитель"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu mening issiq choyim, bu esa sening sovuq suving.",
    words: [
      "это",
      "это",
      "мой",
      "твоя",
      "горячий",
      "холодная",
      "чай",
      "вода",
      "а"
    ],
    correct: "это мой горячий чай а это твоя холодная вода"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu uning katta uyi va ularning kichik uyi.",
    words: [
      "это",
      "это",
      "его",
      "их",
      "большой",
      "маленький",
      "дом",
      "дом",
      "и"
    ],
    correct: "это его большой дом и это их маленький дом"
  }
];

export const LESSON_9_VAZIFA_MATCHING: Extract<LessonOneTask, { type: 'matching' }>[] = [
  {
    type: "matching",
    prompt: "Juftini toping (antonimlar)",
    pairs: [
      {
        left: "новый",
        right: "старый"
      },
      {
        left: "дорогой",
        right: "дешёвый"
      },
      {
        left: "богатый",
        right: "бедный"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping (antonimlar)",
    pairs: [
      {
        left: "длинный",
        right: "короткий"
      },
      {
        left: "светлый",
        right: "тёмный"
      },
      {
        left: "трудный",
        right: "лёгкий"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping (antonimlar)",
    pairs: [
      {
        left: "холодный",
        right: "горячий"
      },
      {
        left: "сложный",
        right: "простой"
      },
      {
        left: "интересный",
        right: "скучный"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping (rodga moslashuv)",
    pairs: [
      {
        left: "дом",
        right: "большой"
      },
      {
        left: "книга",
        right: "большая"
      },
      {
        left: "море",
        right: "большое"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping (rodga moslashuv)",
    pairs: [
      {
        left: "мальчик",
        right: "добрый"
      },
      {
        left: "машина",
        right: "новая"
      },
      {
        left: "пальто",
        right: "новое"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping (rodga moslashuv)",
    pairs: [
      {
        left: "сумка",
        right: "маленькая"
      },
      {
        left: "телефон",
        right: "дорогой"
      },
      {
        left: "часы",
        right: "новые"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "Какой?",
        right: "мужской род"
      },
      {
        left: "Какая?",
        right: "женский род"
      },
      {
        left: "Какое?",
        right: "средний род"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "старый",
        right: "старое"
      },
      {
        left: "новый",
        right: "новая"
      },
      {
        left: "лёгкий",
        right: "лёгкие"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "молоко",
        right: "вкусное"
      },
      {
        left: "проблема",
        right: "сложная"
      },
      {
        left: "книга",
        right: "интересная"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "высокий",
        right: "низкий"
      },
      {
        left: "хороший",
        right: "плохой"
      },
      {
        left: "первый",
        right: "последний"
      }
    ]
  }
];

export const LESSON_9_VAZIFALARI: {
  vazifaId: number;
  label: string;
  hint: string;
  tasks: LessonOneTask[];
}[] = [
  { vazifaId: 1, label: 'Vazifa 1', hint: "To'g'ri javobni tanlang", tasks: LESSON_9_VAZIFA_CHOICE },
  { vazifaId: 2, label: 'Vazifa 2', hint: 'Gapni tuzing', tasks: LESSON_9_VAZIFA_SENTENCE },
  { vazifaId: 3, label: 'Vazifa 3', hint: 'Juftini toping', tasks: LESSON_9_VAZIFA_MATCHING },
];

export function getLessonNineVazifaConfig(vazifaId: number) {
  return LESSON_9_VAZIFALARI.find((v) => v.vazifaId === vazifaId) ?? null;
}
