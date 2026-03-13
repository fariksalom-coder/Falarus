import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Сейчас мы ______ в парке.', options: ['гуляем', 'погуляем'], correct: 'гуляем' },
  { type: 'choice', prompt: 'Вечером мы ______ в парке.', options: ['гуляем', 'погуляем'], correct: 'погуляем' },
  { type: 'choice', prompt: 'Каждый день он ______ вечером.', options: ['гуляет', 'погуляет'], correct: 'гуляет' },
  { type: 'choice', prompt: 'После работы он ______ немного.', options: ['гуляет', 'погуляет'], correct: 'погуляет' },
  { type: 'choice', prompt: 'Сейчас дети ______ во дворе.', options: ['гуляют', 'погуляют'], correct: 'гуляют' },
  { type: 'choice', prompt: 'Потом дети ______ в парке.', options: ['гуляют', 'погуляют'], correct: 'погуляют' },
  { type: 'choice', prompt: 'Сейчас я ______ по городу.', options: ['гуляю', 'погуляю'], correct: 'гуляю' },
  { type: 'choice', prompt: 'Через час я ______ по городу.', options: ['гуляю', 'погуляю'], correct: 'погуляю' },
  { type: 'choice', prompt: 'Сейчас мы ______ около дома.', options: ['гуляем', 'погуляем'], correct: 'гуляем' },
  { type: 'choice', prompt: 'Вечером мы ______ немного.', options: ['гуляем', 'погуляем'], correct: 'погуляем' },

  {
    type: 'sentence',
    prompt: 'Biz hozir parkda sayr qilyapmiz.',
    words: ['мы', 'гуляем', 'в', 'парке', 'сейчас', 'погуляем'],
    correct: 'Мы сейчас гуляем в парке.',
  },
  {
    type: 'sentence',
    prompt: 'Biz kechqurun parkda sayr qilamiz.',
    words: ['мы', 'погуляем', 'в', 'парке', 'вечером', 'гуляем'],
    correct: 'Мы вечером погуляем в парке.',
  },
  {
    type: 'sentence',
    prompt: "U hozir ko‘chada sayr qilyapti.",
    words: ['он', 'гуляет', 'на', 'улице', 'сейчас', 'погуляет'],
    correct: 'Он сейчас гуляет на улице.',
  },
  {
    type: 'sentence',
    prompt: 'U keyin parkda sayr qiladi.',
    words: ['он', 'погуляет', 'в', 'парке', 'потом', 'гуляет'],
    correct: 'Он потом погуляет в парке.',
  },
  {
    type: 'sentence',
    prompt: 'Bolalar hozir hovlida sayr qilyapti.',
    words: ['дети', 'гуляют', 'во', 'дворе', 'сейчас', 'погуляют'],
    correct: 'Дети сейчас гуляют во дворе.',
  },
  {
    type: 'sentence',
    prompt: 'Bolalar keyin parkda sayr qiladi.',
    words: ['дети', 'погуляют', 'в', 'парке', 'потом', 'гуляют'],
    correct: 'Дети потом погуляют в парке.',
  },
  {
    type: 'sentence',
    prompt: "Men hozir shahar bo‘ylab sayr qilyapman.",
    words: ['я', 'гуляю', 'по', 'городу', 'сейчас', 'погуляю'],
    correct: 'Я сейчас гуляю по городу.',
  },
  {
    type: 'sentence',
    prompt: 'Men keyin shahar bo‘ylab sayr qilaman.',
    words: ['я', 'погуляю', 'по', 'городу', 'потом', 'гуляю'],
    correct: 'Я потом погуляю по городу.',
  },
  {
    type: 'sentence',
    prompt: 'Biz hozir uy yonida sayr qilyapmiz.',
    words: ['мы', 'гуляем', 'около', 'дома', 'сейчас', 'погуляем'],
    correct: 'Мы сейчас гуляем около дома.',
  },
  {
    type: 'sentence',
    prompt: 'Biz keyin biroz sayr qilamiz.',
    words: ['мы', 'погуляем', 'немного', 'потом', 'гуляем'],
    correct: 'Мы потом немного погуляем.',
  },
];

export default function LessonSeventeenTaskFivePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-17" lessonPath="/lesson-17" taskNumber={5} />;
}
