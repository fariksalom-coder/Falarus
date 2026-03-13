import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Мой брат – студент медицинского университета. Сейчас он … на занятия.', options: ['ходит', 'идёт'], correct: 'идёт' },
  { type: 'choice', prompt: 'Брат каждый день … на занятия.', options: ['ходит', 'идёт'], correct: 'ходит' },
  { type: 'choice', prompt: 'Моя сестра работает на ювелирной фабрике. Сейчас она … на работу.', options: ['ездит', 'едет'], correct: 'едет' },
  { type: 'choice', prompt: 'Когда самолёт … на Москву?', options: ['летает', 'летит'], correct: 'летит' },
  { type: 'choice', prompt: 'Каждый день самолёты … из Екатеринбурга в Челябинск.', options: ['летают', 'летят'], correct: 'летают' },
  { type: 'choice', prompt: 'Спортсмен … к берегу.', options: ['плавает', 'плывёт'], correct: 'плывёт' },
  { type: 'choice', prompt: 'По субботам мы … в бассейне.', options: ['плаваем', 'плывём'], correct: 'плаваем' },
  { type: 'choice', prompt: 'Сегодня 1 сентября. Дети … в школу.', options: ['ходят', 'идут'], correct: 'идут' },
  { type: 'choice', prompt: 'Мы с друзьями в свободное время часто … гулять в парк.', options: ['ходим', 'идём'], correct: 'ходим' },
  { type: 'choice', prompt: '— Куда ты спешишь? — Я … в театр.', options: ['иду', 'хожу'], correct: 'иду' },
  { type: 'choice', prompt: '— Вы часто бываете в театре? — Да, мы часто … в театр.', options: ['идём', 'ходим'], correct: 'ходим' },
  { type: 'choice', prompt: '— Мы иногда бываем на стадионе. А ты? — Я тоже иногда … на стадион.', options: ['иду', 'хожу'], correct: 'хожу' },
  { type: 'choice', prompt: '— Вы часто бываете в музеях? — Да, иногда мы … в музеи.', options: ['идём', 'ходим'], correct: 'ходим' },
  { type: 'choice', prompt: '— Куда спешат студенты? — Они … в университет.', options: ['идут', 'ходят'], correct: 'идут' },
  { type: 'choice', prompt: '— Привет! Куда ты спешишь? — Я … в гости.', options: ['иду', 'хожу'], correct: 'иду' },
  { type: 'choice', prompt: '— Твои друзья часто занимаются в библиотеке? — Да, они … туда каждый вечер.', options: ['идут', 'ходят'], correct: 'ходят' },
  { type: 'choice', prompt: '— Он часто бывает у тебя в гостях? — Да, он … ко мне по субботам.', options: ['идёт', 'ходит'], correct: 'ходит' },
];

export default function LessonNineteenTaskFifteenPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-19" lessonPath="/lesson-19" taskNumber={15} />;
}
