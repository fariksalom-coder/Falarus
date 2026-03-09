import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Обычно профессор … лекцию в 2 часа.', options: ['заканчивает', 'закончил', 'заканчивать'], correct: 'заканчивает' },
  { type: 'choice', prompt: 'Профессор неожиданно … лекцию и вышел из аудитории.', options: ['закончил', 'заканчивает', 'заканчивать'], correct: 'закончил' },
  { type: 'choice', prompt: 'Всё, пора … урок.', options: ['закончить', 'заканчивать', 'закончит'], correct: 'закончить' },
  { type: 'choice', prompt: 'Мой друг всегда … мне интересные письма.', options: ['пишет', 'написал', 'писать'], correct: 'пишет' },
  { type: 'choice', prompt: 'А. П. Чехов … пьесу «Чайка».', options: ['написал', 'пишет', 'писать'], correct: 'написал' },
  { type: 'choice', prompt: 'В субботу мой друг … музыкальный центр.', options: ['покупает', 'купил', 'купить'], correct: 'купил' },
  { type: 'choice', prompt: 'Мои подруги всегда … вкусный торт.', options: ['покупают', 'купили', 'покупают'], correct: 'покупают' },
  { type: 'choice', prompt: 'Я хочу … новый компьютер.', options: ['покупать', 'купить', 'купил'], correct: 'купить' },
  { type: 'choice', prompt: 'Она редко … мне, что надо делать.', options: ['посоветует', 'советует', 'посоветовала'], correct: 'советует' },
  { type: 'choice', prompt: 'Наконец моя сестра … интересную работу в фирме.', options: ['будет получать', 'получила', 'получала'], correct: 'получила' },
  { type: 'choice', prompt: 'Партнёры ещё … условия контракта.', options: ['обсуждают', 'обсудили', 'обсуждали'], correct: 'обсуждают' },
  { type: 'choice', prompt: 'Я не могу вспомнить, где мы … с вами.', options: ['познакомимся', 'познакомились', 'будем знакомиться'], correct: 'познакомились' },
  { type: 'choice', prompt: 'Обычно мы … в парке и идём гулять.', options: ['встречались', 'встречаемся', 'встретимся'], correct: 'встречаемся' },
  { type: 'choice', prompt: 'Когда она … русский язык, она начнёт учить немецкий.', options: ['будет учить', 'выучит', 'выучила'], correct: 'выучит' },
  { type: 'choice', prompt: 'Мы сидели в парке и неожиданно … странный звук.', options: ['слышали', 'услышим', 'услышали'], correct: 'услышали' },
  { type: 'choice', prompt: '— Уроки ещё … ? — Да.', options: ['начались', 'продолжаются', 'начинались'], correct: 'продолжаются' },
  { type: 'choice', prompt: 'Здравствуй, Юля! Куда ты … ?', options: ['идёт', 'идёшь', 'идут'], correct: 'идёшь' },
  { type: 'choice', prompt: 'Сейчас студенты … в университет.', options: ['идёт', 'идёшь', 'идут'], correct: 'идут' },
  { type: 'choice', prompt: 'Мы … в парк.', options: ['идём', 'идут', 'идёшь'], correct: 'идём' },
  { type: 'choice', prompt: 'Ты … с нами или нет?', options: ['идёшь', 'идёте', 'идём'], correct: 'идёшь' },
];

export default function LessonTwentyTaskFourPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-20" />;
}
