import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'choice',
    prompt: 'Когда я писал письмо, мой друг …',
    options: ['слушал', 'послушал'],
    correct: 'слушал',
  },
  {
    type: 'choice',
    prompt: 'Когда я написал письмо, мы …',
    options: ['начинали смотреть телевизор', 'начали смотреть телевизор'],
    correct: 'начали смотреть телевизор',
  },
  {
    type: 'choice',
    prompt: 'Когда мы сделали домашнее задание, мы …',
    options: ['шли в кино', 'пошли в кино'],
    correct: 'пошли в кино',
  },
  {
    type: 'choice',
    prompt: 'Когда мы повторили слова, мы …',
    options: ['выполняли упражнения', 'выполнили упражнения'],
    correct: 'выполнили упражнения',
  },
  {
    type: 'choice',
    prompt: 'Когда я прочитал текст, я …',
    options: ['пересказывал его', 'пересказал его'],
    correct: 'пересказал его',
  },
  {
    type: 'choice',
    prompt: 'Студенты внимательно слушали, когда преподаватель …',
    options: ['объяснял', 'объяснил'],
    correct: 'объяснял',
  },
  {
    type: 'choice',
    prompt: 'Когда мы пришли в кинотеатр, мы …',
    options: ['покупали билеты', 'купили билеты'],
    correct: 'купили билеты',
  },
  {
    type: 'choice',
    prompt: 'Когда я играл в шахматы, мой брат …',
    options: ['перевел текст', 'переводил текст'],
    correct: 'переводил текст',
  },
  {
    type: 'choice',
    prompt: 'Когда сестра готовила обед, я …',
    options: ['разговаривал по телефону', 'сказал по телефону'],
    correct: 'разговаривал по телефону',
  },
  {
    type: 'choice',
    prompt: 'Когда сестра приготовила обед, мы …',
    options: ['начинали обедать', 'начали обедать'],
    correct: 'начали обедать',
  },

  {
    type: 'sentence',
    prompt: "Men xat yozayotganimda, do‘stim musiqa tinglayotgan edi.",
    words: ['когда', 'я', 'писал', 'письмо', 'мой', 'друг', 'слушал', 'музыку', 'послушал'],
    correct: 'Когда я писал письмо, мой друг слушал музыку.',
  },
  {
    type: 'sentence',
    prompt: "Men xat yozib bo‘lgach, biz televizor ko‘ra boshladik.",
    words: ['когда', 'я', 'написал', 'письмо', 'мы', 'начали', 'смотреть', 'телевизор', 'начинали'],
    correct: 'Когда я написал письмо, мы начали смотреть телевизор.',
  },
  {
    type: 'sentence',
    prompt: "Biz uy vazifasini qilganimizdan keyin kinoga bordik.",
    words: ['когда', 'мы', 'сделали', 'домашнее', 'задание', 'мы', 'пошли', 'в', 'кино', 'шли'],
    correct: 'Когда мы сделали домашнее задание, мы пошли в кино.',
  },
  {
    type: 'sentence',
    prompt: "Biz so‘zlarni takrorlaganimizdan keyin mashqlarni bajardik.",
    words: ['когда', 'мы', 'повторили', 'слова', 'мы', 'выполнили', 'упражнения', 'выполняли'],
    correct: 'Когда мы повторили слова, мы выполнили упражнения.',
  },
  {
    type: 'sentence',
    prompt: "Men matnni o‘qib bo‘lgach, uni qayta hikoya qildim.",
    words: ['когда', 'я', 'прочитал', 'текст', 'я', 'пересказал', 'его', 'пересказывал'],
    correct: 'Когда я прочитал текст, я пересказал его.',
  },
  {
    type: 'sentence',
    prompt: "Talabalar diqqat bilan tinglayotgan edi, o‘qituvchi tushuntirayotgan edi.",
    words: ['студенты', 'внимательно', 'слушали', 'когда', 'преподаватель', 'объяснял', 'объяснил'],
    correct: 'Студенты внимательно слушали, когда преподаватель объяснял.',
  },
  {
    type: 'sentence',
    prompt: "Biz kinoteatrga kelganimizdan keyin chiptalarni sotib oldik.",
    words: ['когда', 'мы', 'пришли', 'в', 'кинотеатр', 'мы', 'купили', 'билеты', 'покупали'],
    correct: 'Когда мы пришли в кинотеатр, мы купили билеты.',
  },
  {
    type: 'sentence',
    prompt: "Men shaxmat o‘ynayotganimda, akam matn tarjima qilayotgan edi.",
    words: ['когда', 'я', 'играл', 'в', 'шахматы', 'мой', 'брат', 'переводил', 'текст', 'перевел'],
    correct: 'Когда я играл в шахматы, мой брат переводил текст.',
  },
  {
    type: 'sentence',
    prompt: "Singlim ovqat tayyorlayotganida, men telefon orqali gaplashayotgan edim.",
    words: ['когда', 'сестра', 'готовила', 'обед', 'я', 'разговаривал', 'по', 'телефону', 'сказал'],
    correct: 'Когда сестра готовила обед, я разговаривал по телефону.',
  },
  {
    type: 'sentence',
    prompt: "Singlim ovqat tayyorlagach, biz ovqatlana boshladik.",
    words: ['когда', 'сестра', 'приготовила', 'обед', 'мы', 'начали', 'обедать', 'начинали'],
    correct: 'Когда сестра приготовила обед, мы начали обедать.',
  },
];

export default function LessonSeventeenTaskTwelvePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-17" lessonPath="/lesson-17" taskNumber={12} />;
}
