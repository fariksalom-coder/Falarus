import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'matching',
    prompt: 'мочь',
    pairs: [
      { left: 'он', right: 'мог' },
      { left: 'она', right: 'могла' },
      { left: 'они', right: 'могли' },
    ],
  },
  {
    type: 'choice',
    prompt: 'Вчера дедушка ______ поднять тяжёлую коробку.',
    options: ['мог', 'могла', 'могли'],
    correct: 'мог',
  },
  {
    type: 'choice',
    prompt: 'Мария ______ решить эту задачу.',
    options: ['мог', 'могла', 'могли'],
    correct: 'могла',
  },
  {
    type: 'choice',
    prompt: 'Студенты ______ закончить работу вовремя.',
    options: ['мог', 'могла', 'могли'],
    correct: 'могли',
  },
  {
    type: 'choice',
    prompt: 'Мой брат ______ быстро найти дорогу.',
    options: ['мог', 'могла', 'могли'],
    correct: 'мог',
  },
  {
    type: 'choice',
    prompt: 'Моя сестра ______ открыть дверь.',
    options: ['мог', 'могла', 'могли'],
    correct: 'могла',
  },
  {
    type: 'sentence',
    prompt: "Kecha u og‘ir sumkani ko‘tara oldi.",
    words: ['он', 'вчера', 'мог', 'поднять', 'тяжёлую', 'сумку', 'быстро'],
    correct: 'Вчера он мог поднять тяжёлую сумку.',
  },
  {
    type: 'sentence',
    prompt: 'Kecha u mashinani hayday oldi.',
    words: ['она', 'вчера', 'могла', 'водить', 'машину', 'быстро', 'дом'],
    correct: 'Вчера она могла водить машину.',
  },
  {
    type: 'sentence',
    prompt: 'Talabalar vazifani tugata oldilar.',
    words: ['студенты', 'могли', 'закончить', 'задание', 'вчера', 'быстро'],
    correct: 'Студенты могли закончить задание.',
  },
  {
    type: 'sentence',
    prompt: 'Kecha u muammoni hal qila oldi.',
    words: ['он', 'мог', 'решить', 'проблему', 'вчера', 'быстро'],
    correct: 'Он мог решить проблему вчера.',
  },
  {
    type: 'sentence',
    prompt: 'Kecha u eshikni ocholadi.',
    words: ['она', 'могла', 'открыть', 'дверь', 'вчера', 'легко'],
    correct: 'Она могла открыть дверь вчера.',
  },

  {
    type: 'matching',
    prompt: 'нести',
    pairs: [
      { left: 'он', right: 'нёс' },
      { left: 'она', right: 'несла' },
      { left: 'они', right: 'несли' },
    ],
  },
  {
    type: 'choice',
    prompt: 'Вчера мальчик ______ тяжёлую сумку.',
    options: ['нёс', 'несла', 'несли'],
    correct: 'нёс',
  },
  {
    type: 'choice',
    prompt: 'Девушка ______ цветы домой.',
    options: ['нёс', 'несла', 'несли'],
    correct: 'несла',
  },
  {
    type: 'choice',
    prompt: 'Рабочие ______ большие коробки.',
    options: ['нёс', 'несла', 'несли'],
    correct: 'несли',
  },
  {
    type: 'choice',
    prompt: 'Мой брат ______ пакет из магазина.',
    options: ['нёс', 'несла', 'несли'],
    correct: 'нёс',
  },
  {
    type: 'choice',
    prompt: 'Мама ______ продукты домой.',
    options: ['нёс', 'несла', 'несли'],
    correct: 'несла',
  },
  {
    type: 'sentence',
    prompt: "Kecha u og‘ir sumkani olib kelayotgan edi.",
    words: ['он', 'нёс', 'тяжёлую', 'сумку', 'вчера', 'домой'],
    correct: 'Он нёс тяжёлую сумку домой.',
  },
  {
    type: 'sentence',
    prompt: 'U gullarni uyga olib ketdi.',
    words: ['она', 'несла', 'цветы', 'домой', 'вчера', 'быстро'],
    correct: 'Она несла цветы домой.',
  },
  {
    type: 'sentence',
    prompt: 'Ishchilar katta qutilarni olib ketishdi.',
    words: ['рабочие', 'несли', 'большие', 'коробки', 'вчера', 'склад'],
    correct: 'Рабочие несли большие коробки.',
  },
  {
    type: 'sentence',
    prompt: 'U paketni do‘kondan olib ketdi.',
    words: ['он', 'нёс', 'пакет', 'из', 'магазина', 'вчера'],
    correct: 'Он нёс пакет из магазина.',
  },
  {
    type: 'sentence',
    prompt: 'U kitoblarni maktabga olib ketdi.',
    words: ['она', 'несла', 'книги', 'в', 'школу', 'вчера'],
    correct: 'Она несла книги в школу.',
  },

  {
    type: 'matching',
    prompt: 'везти',
    pairs: [
      { left: 'он', right: 'вёз' },
      { left: 'она', right: 'везла' },
      { left: 'они', right: 'везли' },
    ],
  },
  {
    type: 'choice',
    prompt: 'Вчера водитель ______ пассажиров в аэропорт.',
    options: ['вёз', 'везла', 'везли'],
    correct: 'вёз',
  },
  {
    type: 'choice',
    prompt: 'Мама ______ детей в школу.',
    options: ['вёз', 'везла', 'везли'],
    correct: 'везла',
  },
  {
    type: 'choice',
    prompt: 'Рабочие ______ мебель в новый дом.',
    options: ['вёз', 'везла', 'везли'],
    correct: 'везли',
  },
  {
    type: 'choice',
    prompt: 'Таксист ______ туристов в гостиницу.',
    options: ['вёз', 'везла', 'везли'],
    correct: 'вёз',
  },
  {
    type: 'choice',
    prompt: 'Девушка ______ чемодан на тележке.',
    options: ['вёз', 'везла', 'везли'],
    correct: 'везла',
  },
  {
    type: 'sentence',
    prompt: "Kecha haydovchi yo‘lovchilarni aeroportga olib bordi.",
    words: ['он', 'вёз', 'пассажиров', 'в', 'аэропорт', 'вчера'],
    correct: 'Он вёз пассажиров в аэропорт.',
  },
  {
    type: 'sentence',
    prompt: 'U bolalarni maktabga olib bordi.',
    words: ['она', 'везла', 'детей', 'в', 'школу', 'вчера'],
    correct: 'Она везла детей в школу.',
  },
  {
    type: 'sentence',
    prompt: 'Ishchilar mebellarni yangi uyga olib borishdi.',
    words: ['рабочие', 'везли', 'мебель', 'в', 'новый', 'дом'],
    correct: 'Рабочие везли мебель в новый дом.',
  },
  {
    type: 'sentence',
    prompt: 'U sayyohlarni mehmonxonaga olib bordi.',
    words: ['он', 'вёз', 'туристов', 'в', 'гостиницу', 'вчера'],
    correct: 'Он вёз туристов в гостиницу.',
  },
  {
    type: 'sentence',
    prompt: 'U chamadonni aravachada olib bordi.',
    words: ['она', 'везла', 'чемодан', 'на', 'тележке', 'вчера'],
    correct: 'Она везла чемодан на тележке.',
  },
];

export default function LessonFifteenTaskFivePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-15" lessonPath="/lesson-15" taskNumber={6} />;
}
