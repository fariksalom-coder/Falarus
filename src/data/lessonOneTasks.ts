/**
 * 1-dars mashqlari — tur bo‘yicha 3 ta vazifa (UnifiedLessonPracticePage).
 */

export type ChoiceTask = {
  type: 'choice';
  prompt: string;
  options: string[];
  correct: string;
};

export type SentenceTask = {
  type: 'sentence';
  prompt: string;
  words: string[];
  correct: string;
};

export type MatchingTask = {
  type: 'matching';
  prompt: string;
  pairs: { left: string; right: string }[];
};

export type LessonOneTask = ChoiceTask | SentenceTask | MatchingTask;

export const LESSON_ONE_VAZIFA_CHOICE: ChoiceTask[] = [
  {
    type: 'choice',
    prompt: 'Xayrli kun!',
    options: ['Доброй ночи!', 'Доброе утро!', 'Добрый день!'],
    correct: 'Добрый день!',
  },
  {
    type: 'choice',
    prompt: 'Xayrli tong!',
    options: ['Добрый вечерь', 'Доброе утро!', 'Добрый день'],
    correct: 'Доброе утро!',
  },
  {
    type: 'choice',
    prompt: 'Xayrli kech!',
    options: ['Доброе утро!', 'Добрый день!', 'Добрый вечер!'],
    correct: 'Добрый вечер!',
  },
  {
    type: 'choice',
    prompt: 'Salom!',
    options: ['Привет', 'Здравствуйте!', 'Доброе утро!'],
    correct: 'Привет',
  },
  {
    type: 'choice',
    prompt: 'Assalomu alaykum!',
    options: ['Привет!', 'Здравствуйте!', 'Добрый день!'],
    correct: 'Здравствуйте!',
  },
  {
    type: 'choice',
    prompt: 'Xayr!',
    options: ['До свидание!', 'Пока!', 'Привет!'],
    correct: 'Пока!',
  },
  {
    type: 'choice',
    prompt: "Ko'rishguncha!",
    options: ['До свидание!', 'Пока!', 'Привет!'],
    correct: 'До свидание!',
  },
  {
    type: 'choice',
    prompt: "Sizning ismingiz nima? (rasmiy)",
    options: ['Как тебя зовут?', 'Как вас зовут?', 'Кто вы?'],
    correct: 'Как вас зовут?',
  },
  {
    type: 'choice',
    prompt: 'Sening isming nima?',
    options: ['Как вас зовут?', 'Как тебя зовут?', 'Откуда ты?'],
    correct: 'Как тебя зовут?',
  },
  {
    type: 'choice',
    prompt: 'Mening ismim Farmon.',
    options: ['Я Farmon.', 'Меня зовут Фармон.', 'Мой имя Фармон.'],
    correct: 'Меня зовут Фармон.',
  },
  {
    type: 'choice',
    prompt: 'Siz qayerdansiz? (rasmiy)',
    options: ['Где вы живёте?', 'Откуда вы?', 'Кто вы?'],
    correct: 'Откуда вы?',
  },
  {
    type: 'choice',
    prompt: 'Qayerdansan?',
    options: ['Откуда вы?', 'Откуда ты?', 'Где ты работаешь?'],
    correct: 'Откуда ты?',
  },
  {
    type: 'choice',
    prompt: 'Men O‘zbekistondanman.',
    options: ['Я Узбекистан.', 'Я из Узбекистана.', 'Я в Узбекистане.'],
    correct: 'Я из Узбекистана.',
  },
  {
    type: 'choice',
    prompt: 'Men Buxorodanman.',
    options: ['Я из Бухары.', 'Я Бухара.', 'Я в Бухара.'],
    correct: 'Я из Бухары.',
  },
  {
    type: 'choice',
    prompt: "Siz kim bo‘lib ishlaysiz?",
    options: ['Где вы работаете?', 'Кем вы работаете?', 'Кто вы?'],
    correct: 'Кем вы работаете?',
  },
  {
    type: 'choice',
    prompt: "Kim bo'lib ishlaysan?",
    options: ['Кем ты работаешь?', 'Кто ты?', 'Где ты?'],
    correct: 'Кем ты работаешь?',
  },
  {
    type: 'choice',
    prompt: 'Men haydovchiman.',
    options: ['Я водитель.', 'Я работает водитель.', 'Я из водитель.'],
    correct: 'Я водитель.',
  },
  {
    type: 'choice',
    prompt: 'U muhandis.',
    options: ['Он учитель.', 'Он инженер.', 'Он студент.'],
    correct: 'Он инженер.',
  },
];

export const LESSON_ONE_VAZIFA_MATCHING: MatchingTask[] = [
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Добрый', right: 'день' },
      { left: 'Доброе', right: 'утро' },
      { left: 'Доброй', right: 'ночи' },
      { left: 'До', right: 'свидание' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Как', right: 'вас зовут?' },
      { left: 'Как', right: 'тебя зовут?' },
      { left: 'Меня', right: 'зовут Фармон' },
      { left: 'Очень', right: 'приятно' },
    ],
  },
];

export const LESSON_ONE_VAZIFA_SENTENCE: SentenceTask[] = [
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Xayrli kun!',
    words: ['Добрый', 'Доброе', 'Доброй', 'день', 'утро', 'ночи'],
    correct: 'Добрый день',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Xayrli tun!',
    words: ['Добрый', 'Доброе', 'Доброй', 'день', 'утро', 'ночи'],
    correct: 'Доброй ночи',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Mening ismim Ali.',
    words: ['меня', 'зовут', 'Али'],
    correct: 'меня зовут Али',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Sizning ismingiz nima?',
    words: ['как', 'вас', 'зовут'],
    correct: 'как вас зовут',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Men Samarqanddanman.',
    words: ['я', 'из', 'Самарканда'],
    correct: 'я из Самарканда',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Siz qayerdansiz?',
    words: ['откуда', 'вы'],
    correct: 'откуда вы',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Men talabaman.',
    words: ['я', 'студент'],
    correct: 'я студент',
  },
  {
    type: 'sentence',
    prompt: "Gapni tuzing: U o‘qituvchi.",
    words: ['он', 'учитель'],
    correct: 'он учитель',
  },
];

export const LESSON_ONE_VAZIFALARI: {
  vazifaId: number;
  label: string;
  hint: string;
  tasks: LessonOneTask[];
}[] = [
  {
    vazifaId: 1,
    label: 'Vazifa 1',
    hint: "To'g'ri javobni tanlang",
    tasks: LESSON_ONE_VAZIFA_CHOICE,
  },
  {
    vazifaId: 2,
    label: 'Vazifa 2',
    hint: 'Juftini toping',
    tasks: LESSON_ONE_VAZIFA_MATCHING,
  },
  {
    vazifaId: 3,
    label: 'Vazifa 3',
    hint: 'Gapni tuzing',
    tasks: LESSON_ONE_VAZIFA_SENTENCE,
  },
];

export function getLessonOneVazifaConfig(vazifaId: number) {
  return LESSON_ONE_VAZIFALARI.find((v) => v.vazifaId === vazifaId) ?? null;
}

export const LESSON_ONE_VAZIFA_TOTAL = LESSON_ONE_VAZIFALARI.length;
