/**
 * 7-dars — har bir vazifada bitta mashq turi.
 */

import type { LessonOneTask } from './lessonOneTasks';

export const LESSON_7_VAZIFA_CHOICE: Extract<LessonOneTask, { type: 'choice' }>[] = [
  {
    type: "choice",
    prompt: "дом —",
    options: [
      "домы",
      "дома",
      "доми"
    ],
    correct: "дома"
  },
  {
    type: "choice",
    prompt: "книга —",
    options: [
      "книги",
      "книгаы",
      "книгы"
    ],
    correct: "книги"
  },
  {
    type: "choice",
    prompt: "окно —",
    options: [
      "окна",
      "окны",
      "окни"
    ],
    correct: "окна"
  },
  {
    type: "choice",
    prompt: "парк —",
    options: [
      "паркы",
      "парки",
      "парка"
    ],
    correct: "парки"
  },
  {
    type: "choice",
    prompt: "слово —",
    options: [
      "слова",
      "словы",
      "слови"
    ],
    correct: "слова"
  },
  {
    type: "choice",
    prompt: "семья —",
    options: [
      "семьи",
      "семьяы",
      "семья"
    ],
    correct: "семьи"
  },
  {
    type: "choice",
    prompt: "стол —",
    options: [
      "столы",
      "стола",
      "столи"
    ],
    correct: "столы"
  },
  {
    type: "choice",
    prompt: "море —",
    options: [
      "моря",
      "мореы",
      "мореи"
    ],
    correct: "моря"
  },
  {
    type: "choice",
    prompt: "город —",
    options: [
      "городы",
      "города",
      "городи"
    ],
    correct: "города"
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
    prompt: "музей —",
    options: [
      "музеи",
      "музея",
      "музейы"
    ],
    correct: "музеи"
  },
  {
    type: "choice",
    prompt: "лист —",
    options: [
      "листы",
      "листья",
      "листя"
    ],
    correct: "листья"
  },
  {
    type: "choice",
    prompt: "тетрадь —",
    options: [
      "тетрады",
      "тетради",
      "тетрадя"
    ],
    correct: "тетради"
  },
  {
    type: "choice",
    prompt: "учитель —",
    options: [
      "учители",
      "учителя",
      "учительы"
    ],
    correct: "учителя"
  },
  {
    type: "choice",
    prompt: "дерево —",
    options: [
      "дерева",
      "деревья",
      "деревы"
    ],
    correct: "деревья"
  }
];

export const LESSON_7_VAZIFA_SENTENCE: Extract<LessonOneTask, { type: 'sentence' }>[] = [
  {
    type: "sentence",
    prompt: "Gapni tuzing: katta uylar",
    words: [
      "большие",
      "большой",
      "дома",
      "дом"
    ],
    correct: "большие дома"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: yangi kitoblar",
    words: [
      "новые",
      "новый",
      "книги",
      "книга"
    ],
    correct: "новые книги"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: yaxshi o‘qituvchilar",
    words: [
      "хорошие",
      "хороший",
      "учителя",
      "учитель"
    ],
    correct: "хорошие учителя"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: katta shaharlar",
    words: [
      "большие",
      "большой",
      "города",
      "город"
    ],
    correct: "большие города"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: chiroyli qizlar",
    words: [
      "красивые",
      "красивая",
      "девочки",
      "девочка"
    ],
    correct: "красивые девочки"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: kichik parklar",
    words: [
      "маленькие",
      "маленький",
      "парки",
      "парк"
    ],
    correct: "маленькие парки"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: yangi oynalar",
    words: [
      "новые",
      "новое",
      "окна",
      "окно"
    ],
    correct: "новые окна"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: ko‘k dengizlar",
    words: [
      "синие",
      "синий",
      "моря",
      "море"
    ],
    correct: "синие моря"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: yaxshi do‘stlar",
    words: [
      "хорошие",
      "хороший",
      "друзья",
      "друг"
    ],
    correct: "хорошие друзья"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: baland daraxtlar",
    words: [
      "высокие",
      "высокий",
      "деревья",
      "дерево"
    ],
    correct: "высокие деревья"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: eski maktablar",
    words: [
      "старые",
      "старый",
      "школы",
      "школа"
    ],
    correct: "старые школы"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: yangi stullar",
    words: [
      "новые",
      "новый",
      "стулья",
      "стул"
    ],
    correct: "новые стулья"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: kichik derazalar",
    words: [
      "маленькие",
      "маленький",
      "окна",
      "окно"
    ],
    correct: "маленькие окна"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: uzun poezdlar",
    words: [
      "длинные",
      "длинный",
      "поезда",
      "поезд"
    ],
    correct: "длинные поезда"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: katta muzeylar",
    words: [
      "большие",
      "большой",
      "музеи",
      "музей"
    ],
    correct: "большие музеи"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu katta uylar va yangi maktablar.",
    words: [
      "это",
      "большие",
      "большой",
      "дома",
      "школы",
      "новые",
      "и",
      "но"
    ],
    correct: "это большие дома и новые школы"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu mening kitoblarim yoki sening kitoblaring?",
    words: [
      "это",
      "мои",
      "твои",
      "книги",
      "книги",
      "или",
      "и"
    ],
    correct: "это мои книги или твои книги"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu eski shaharlar, lekin yangi parklar.",
    words: [
      "это",
      "старые",
      "новые",
      "города",
      "парки",
      "но",
      "и"
    ],
    correct: "это старые города но новые парки"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu bizning o‘qituvchilarimiz va ularning do‘stlari.",
    words: [
      "это",
      "наши",
      "их",
      "учителя",
      "друзья",
      "и",
      "а"
    ],
    correct: "это наши учителя и их друзья"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu katta oynalar yoki kichik eshiklar?",
    words: [
      "это",
      "большие",
      "маленькие",
      "окна",
      "двери",
      "или",
      "но"
    ],
    correct: "это большие окна или маленькие двери"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu yangi stullar, lekin eski stol emas.",
    words: [
      "это",
      "новые",
      "старый",
      "стулья",
      "стол",
      "но",
      "не"
    ],
    correct: "это новые стулья но не старый стол"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu uning do‘stlari va mening aka-ukalarim.",
    words: [
      "это",
      "его",
      "мои",
      "друзья",
      "братья",
      "и",
      "а"
    ],
    correct: "это его друзья и мои братья"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu sizning maktablaringiz yoki bizning universitetlarimiz?",
    words: [
      "это",
      "ваши",
      "наши",
      "школы",
      "университеты",
      "или",
      "но"
    ],
    correct: "это ваши школы или наши университеты"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu katta daraxtlar va ko‘k dengizlar.",
    words: [
      "это",
      "высокие",
      "синие",
      "деревья",
      "моря",
      "и",
      "а"
    ],
    correct: "это высокие деревья и синие моря"
  },
  {
    type: "sentence",
    prompt: "Gapni tuzing: Bu yangi shaharlar, lekin eski uylar emas.",
    words: [
      "это",
      "новые",
      "старые",
      "города",
      "дома",
      "но",
      "не"
    ],
    correct: "это новые города но не старые дома"
  }
];

export const LESSON_7_VAZIFA_MATCHING: Extract<LessonOneTask, { type: 'matching' }>[] = [
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "дом",
        right: "дома"
      },
      {
        left: "город",
        right: "города"
      },
      {
        left: "поезд",
        right: "поезда"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "книга",
        right: "книги"
      },
      {
        left: "школа",
        right: "школы"
      },
      {
        left: "улица",
        right: "улицы"
      }
    ]
  },
  {
    type: "matching",
    prompt: "Juftini toping",
    pairs: [
      {
        left: "окно",
        right: "окна"
      },
      {
        left: "море",
        right: "моря"
      },
      {
        left: "слово",
        right: "слова"
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
        left: "лист",
        right: "листья"
      },
      {
        left: "дерево",
        right: "деревья"
      },
      {
        left: "стул",
        right: "стулья"
      }
    ]
  }
];

export const LESSON_7_VAZIFALARI: {
  vazifaId: number;
  label: string;
  hint: string;
  tasks: LessonOneTask[];
}[] = [
  { vazifaId: 1, label: 'Vazifa 1', hint: "To'g'ri javobni tanlang", tasks: LESSON_7_VAZIFA_CHOICE },
  { vazifaId: 2, label: 'Vazifa 2', hint: 'Juftini toping', tasks: LESSON_7_VAZIFA_MATCHING },
  { vazifaId: 3, label: 'Vazifa 3', hint: 'Gapni tuzing', tasks: LESSON_7_VAZIFA_SENTENCE },
];

export function getLessonSevenVazifaConfig(vazifaId: number) {
  return LESSON_7_VAZIFALARI.find((v) => v.vazifaId === vazifaId) ?? null;
}
