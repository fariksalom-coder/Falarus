import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'matching',
    prompt: 'расти',
    pairs: [
      { left: 'он', right: 'рос' },
      { left: 'она', right: 'росла' },
      { left: 'они', right: 'росли' },
    ],
  },
  {
    type: 'choice',
    prompt: 'В саду ______ большой дуб.',
    options: ['рос', 'росла', 'росли'],
    correct: 'рос',
  },
  {
    type: 'choice',
    prompt: 'У дома ______ красивая роза.',
    options: ['рос', 'росла', 'росли'],
    correct: 'росла',
  },
  {
    type: 'choice',
    prompt: 'В лесу ______ высокие деревья.',
    options: ['рос', 'росла', 'росли'],
    correct: 'росли',
  },
  {
    type: 'choice',
    prompt: 'Рядом с домом ______ высокий тополь.',
    options: ['рос', 'росла', 'росли'],
    correct: 'рос',
  },
  {
    type: 'choice',
    prompt: 'На клумбе ______ красивые цветы.',
    options: ['рос', 'росла', 'росли'],
    correct: 'росли',
  },
  {
    type: 'sentence',
    prompt: "Bog‘da katta daraxt o‘sdi.",
    words: ['в', 'саду', 'рос', 'большой', 'дерево', 'вчера'],
    correct: 'В саду рос большой дерево.',
  },
  {
    type: 'sentence',
    prompt: 'Uy oldida gul o‘sdi.',
    words: ['у', 'дома', 'росла', 'красивая', 'роза', 'вчера'],
    correct: 'У дома росла красивая роза.',
  },
  {
    type: 'sentence',
    prompt: "O‘rmonda baland daraxtlar o‘sdi.",
    words: ['в', 'лесу', 'росли', 'высокие', 'деревья', 'рядом'],
    correct: 'В лесу росли высокие деревья.',
  },
  {
    type: 'sentence',
    prompt: "Bog‘da olma daraxti o‘sdi.",
    words: ['в', 'саду', 'росла', 'яблоня', 'большая'],
    correct: 'В саду росла яблоня.',
  },
  {
    type: 'sentence',
    prompt: 'Bu yerda daraxtlar o‘sdi.',
    words: ['здесь', 'росли', 'деревья', 'большие', 'раньше'],
    correct: 'Здесь росли большие деревья.',
  },

  {
    type: 'matching',
    prompt: 'лечь',
    pairs: [
      { left: 'он', right: 'лёг' },
      { left: 'она', right: 'легла' },
      { left: 'они', right: 'легли' },
    ],
  },
  {
    type: 'choice',
    prompt: 'Вчера он рано ______ спать.',
    options: ['лёг', 'легла', 'легли'],
    correct: 'лёг',
  },
  {
    type: 'choice',
    prompt: 'Девочка ______ на диван.',
    options: ['лёг', 'легла', 'легли'],
    correct: 'легла',
  },
  {
    type: 'choice',
    prompt: 'Дети ______ спать поздно.',
    options: ['лёг', 'легла', 'легли'],
    correct: 'легли',
  },
  {
    type: 'choice',
    prompt: 'Брат ______ на кровать.',
    options: ['лёг', 'легла', 'легли'],
    correct: 'лёг',
  },
  {
    type: 'choice',
    prompt: 'Сестра ______ отдыхать.',
    options: ['лёг', 'легла', 'легли'],
    correct: 'легла',
  },
  {
    type: 'sentence',
    prompt: 'Kecha u erta uxladi.',
    words: ['он', 'лёг', 'спать', 'рано', 'вчера'],
    correct: 'Он лёг спать рано.',
  },
  {
    type: 'sentence',
    prompt: 'U divanga yotdi.',
    words: ['она', 'легла', 'на', 'диван', 'вчера'],
    correct: 'Она легла на диван.',
  },
  {
    type: 'sentence',
    prompt: 'Bolalar uxlashga yotishdi.',
    words: ['дети', 'легли', 'спать', 'поздно', 'вчера'],
    correct: 'Дети легли спать поздно.',
  },
  {
    type: 'sentence',
    prompt: 'U karavotga yotdi.',
    words: ['он', 'лёг', 'на', 'кровать', 'быстро'],
    correct: 'Он лёг на кровать.',
  },
  {
    type: 'sentence',
    prompt: 'U dam olish uchun yotdi.',
    words: ['она', 'легла', 'отдыхать', 'вчера', 'дома'],
    correct: 'Она легла отдыхать.',
  },
];

export default function LessonFifteenTaskSixPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-15" />;
}
