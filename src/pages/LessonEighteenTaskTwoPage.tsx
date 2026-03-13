import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Всегда … к уроку.', options: ['готовьтесь', 'подготовьтесь'], correct: 'готовьтесь' },
  { type: 'choice', prompt: 'К следующему уроку … к уроку.', options: ['готовьтесь', 'подготовьтесь'], correct: 'подготовьтесь' },
  { type: 'choice', prompt: 'Всегда … тексты внимательно.', options: ['читайте', 'прочитайте'], correct: 'читайте' },
  { type: 'choice', prompt: 'К следующему уроку … этот текст.', options: ['читайте', 'прочитайте'], correct: 'прочитайте' },
  { type: 'choice', prompt: 'Всегда … новые слова в тетрадь.', options: ['выписывайте', 'выпишите'], correct: 'выписывайте' },
  { type: 'choice', prompt: 'К следующему уроку … новые слова.', options: ['выписывайте', 'выпишите'], correct: 'выпишите' },
  { type: 'choice', prompt: 'Всегда … план текста.', options: ['составляйте', 'составьте'], correct: 'составляйте' },
  { type: 'choice', prompt: 'К следующему уроку … план текста.', options: ['составляйте', 'составьте'], correct: 'составьте' },
  { type: 'choice', prompt: 'Всегда … пять предложений.', options: ['пишите', 'напишите'], correct: 'пишите' },
  { type: 'choice', prompt: 'К следующему уроку … пять предложений.', options: ['пишите', 'напишите'], correct: 'напишите' },
  { type: 'choice', prompt: 'Всегда … на вопросы преподавателя.', options: ['отвечайте', 'ответьте'], correct: 'отвечайте' },
  { type: 'choice', prompt: 'К следующему уроку … на вопросы.', options: ['отвечайте', 'ответьте'], correct: 'ответьте' },

  {
    type: 'sentence',
    prompt: 'Har doim darsga tayyorlaning.',
    words: ['всегда', 'готовьтесь', 'к', 'уроку', 'подготовьтесь'],
    correct: 'Всегда готовьтесь к уроку.',
  },
  {
    type: 'sentence',
    prompt: 'Keyingi darsga tayyorlaning.',
    words: ['к', 'следующему', 'уроку', 'подготовьтесь', 'готовьтесь'],
    correct: 'К следующему уроку подготовьтесь.',
  },
  {
    type: 'sentence',
    prompt: 'Har doim matnlarni diqqat bilan o‘qing.',
    words: ['всегда', 'читайте', 'тексты', 'внимательно', 'прочитайте'],
    correct: 'Всегда читайте тексты внимательно.',
  },
  {
    type: 'sentence',
    prompt: 'Keyingi darsga bu matnni o‘qing.',
    words: ['к', 'следующему', 'уроку', 'прочитайте', 'этот', 'текст', 'читайте'],
    correct: 'К следующему уроку прочитайте этот текст.',
  },
  {
    type: 'sentence',
    prompt: 'Har doim yangi so‘zlarni daftarga yozib boring.',
    words: ['всегда', 'выписывайте', 'новые', 'слова', 'в', 'тетрадь', 'выпишите'],
    correct: 'Всегда выписывайте новые слова в тетрадь.',
  },
  {
    type: 'sentence',
    prompt: 'Keyingi darsga yangi so‘zlarni yozib chiqing.',
    words: ['к', 'следующему', 'уроку', 'выпишите', 'новые', 'слова', 'выписывайте'],
    correct: 'К следующему уроку выпишите новые слова.',
  },
  {
    type: 'sentence',
    prompt: 'Har doim matn rejasini tuzing.',
    words: ['всегда', 'составляйте', 'план', 'текста', 'составьте'],
    correct: 'Всегда составляйте план текста.',
  },
  {
    type: 'sentence',
    prompt: 'Keyingi darsga matn rejasini tuzing.',
    words: ['к', 'следующему', 'уроку', 'составьте', 'план', 'текста', 'составляйте'],
    correct: 'К следующему уроку составьте план текста.',
  },
  {
    type: 'sentence',
    prompt: 'Har doim beshta gap yozing.',
    words: ['всегда', 'пишите', 'пять', 'предложений', 'напишите'],
    correct: 'Всегда пишите пять предложений.',
  },
  {
    type: 'sentence',
    prompt: 'Keyingi darsga beshta gap yozing.',
    words: ['к', 'следующему', 'уроку', 'напишите', 'пять', 'предложений', 'пишите'],
    correct: 'К следующему уроку напишите пять предложений.',
  },
  {
    type: 'sentence',
    prompt: "Har doim o‘qituvchining savollariga javob bering.",
    words: ['всегда', 'отвечайте', 'на', 'вопросы', 'преподавателя', 'ответьте'],
    correct: 'Всегда отвечайте на вопросы преподавателя.',
  },
  {
    type: 'sentence',
    prompt: 'Keyingi darsga savollarga javob bering.',
    words: ['к', 'следующему', 'уроку', 'ответьте', 'на', 'вопросы', 'отвечайте'],
    correct: 'К следующему уроку ответьте на вопросы.',
  },
];

export default function LessonEighteenTaskTwoPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-18" lessonPath="/lesson-18" taskNumber={2} />;
}
