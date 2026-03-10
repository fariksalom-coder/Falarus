import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'choice',
    prompt: 'Иван Иванович врач. Он работает … .',
    options: ['в школе', 'в больнице', 'в театре'],
    correct: 'в больнице',
  },
  {
    type: 'choice',
    prompt: 'Анна Петровна преподаватель. Она работает … .',
    options: ['в университете', 'в магазине', 'на стадионе'],
    correct: 'в университете',
  },
  {
    type: 'choice',
    prompt: 'Андрей журналист. Он работает … .',
    options: ['в редакции', 'в аптеке', 'в банке'],
    correct: 'в редакции',
  },
  {
    type: 'choice',
    prompt: 'Борис и Сергей инженеры. Они работают … .',
    options: ['на заводе', 'в школе', 'в музее'],
    correct: 'на заводе',
  },
  {
    type: 'choice',
    prompt: 'Хуан читает. Он сейчас … .',
    options: ['в библиотеке', 'на стадионе', 'в автобусе'],
    correct: 'в библиотеке',
  },
  {
    type: 'choice',
    prompt: 'Самир смотрит балет. Он сейчас … .',
    options: ['в театре', 'в школе', 'в магазине'],
    correct: 'в театре',
  },
  {
    type: 'choice',
    prompt: 'Марта сейчас ужинает. Она … .',
    options: ['в ресторане', 'в музее', 'в университете'],
    correct: 'в ресторане',
  },
  {
    type: 'choice',
    prompt: 'Саша и Юра гуляют. Они сейчас … .',
    options: ['в парке', 'в магазине', 'в библиотеке'],
    correct: 'в парке',
  },
  {
    type: 'choice',
    prompt: 'Анвар делает домашнее задание. Он сейчас … .',
    options: ['в школе', 'дома', 'в кино'],
    correct: 'дома',
  },
  {
    type: 'choice',
    prompt: 'Анна любит смотреть фильмы. Она сейчас … .',
    options: ['в кинотеатре', 'в аптеке', 'в банке'],
    correct: 'в кинотеатре',
  },
];

export default function LessonTwentyTwoTaskThreePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-22" />;
}
