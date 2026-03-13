import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Почему вы не … ?', options: ['отдыхают', 'отдыхаете', 'отдыхает'], correct: 'отдыхаете' },
  { type: 'choice', prompt: 'Где они … ?', options: ['отдыхаете', 'отдыхают', 'отдыхает'], correct: 'отдыхают' },
  { type: 'choice', prompt: 'Ты всегда … на море?', options: ['отдыхают', 'отдыхает', 'отдыхаешь'], correct: 'отдыхаешь' },
  { type: 'choice', prompt: 'Когда твой друг … ?', options: ['отдыхаешь', 'отдыхает', 'отдыхаете'], correct: 'отдыхает' },
  { type: 'choice', prompt: 'Преподаватели …, а студенты … .', options: ['учатся / учатся', 'учат / учатся', 'учатся / учат'], correct: 'учатся / учатся' },
  { type: 'choice', prompt: 'Ты хорошо водишь машину. Где ты … ?', options: ['учатся', 'учат', 'учился'], correct: 'учился' },
  { type: 'choice', prompt: 'Юля хорошо танцует. Интересно, кто … её так хорошо танцевать.', options: ['учил', 'научил', 'научилась'], correct: 'научил' },
  { type: 'choice', prompt: 'Я забыла, как … этот фильм.', options: ['зовут', 'называется', 'называют'], correct: 'называется' },
  { type: 'choice', prompt: 'Как … вашего брата?', options: ['зовут', 'называется', 'называют'], correct: 'зовут' },
  { type: 'choice', prompt: 'Как … эта улица?', options: ['зовут', 'называется', 'называют'], correct: 'называется' },
  { type: 'choice', prompt: 'Сейчас я … в Екатеринбурге, а раньше … в Сеуле.', options: ['смотрит / слушала', 'живу / жил', 'учились / работаете'], correct: 'живу / жил' },
  { type: 'choice', prompt: 'Сестра … телевизор, а раньше … музыку.', options: ['смотрит / слушала', 'смотрит / слушает', 'смотрела / слушает'], correct: 'смотрит / слушала' },
  { type: 'choice', prompt: 'Днём мы … в парке, а сейчас … в кафе.', options: ['учились / работаете', 'гуляли / отдыхаем', 'гуляем / отдыхали'], correct: 'гуляли / отдыхаем' },
  { type: 'choice', prompt: 'Где вы раньше … ? А где вы сейчас … ?', options: ['гуляли / отдыхаете', 'работали / работаете', 'учились / учитесь'], correct: 'учились / учитесь' },
  { type: 'choice', prompt: 'Сестра долго разговаривала по телефону.', options: ['Что делает?', 'Что делала?', 'Что делали?'], correct: 'Что делала?' },
  { type: 'choice', prompt: 'Родители отдыхают на Кипре.', options: ['Что делает?', 'Что делают?', 'Что делали?'], correct: 'Что делают?' },
  { type: 'choice', prompt: 'Я смотрел этот фильм.', options: ['Что делали?', 'Что делал?', 'Что делает?'], correct: 'Что делал?' },
  { type: 'choice', prompt: 'Сестра учится в школе.', options: ['Что делает?', 'Что делала?', 'Что делают?'], correct: 'Что делает?' },
  { type: 'choice', prompt: 'Весь день мы гуляли в парке.', options: ['Что делали?', 'Что делают?', 'Что делал?'], correct: 'Что делали?' },
  { type: 'choice', prompt: 'Сейчас я в Челябинске, а завтра … в Екатеринбурге.', options: ['был', 'будет', 'буду'], correct: 'буду' },
];

export default function LessonTwentyTaskOnePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-20" lessonPath="/lesson-20" taskNumber={1} />;
}
