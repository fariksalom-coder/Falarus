import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'sentence',
    prompt: 'Мы — библиотека',
    words: ['мы', 'он', 'в', 'библиотеке', 'школа', 'парке'],
    correct: 'Мы в библиотеке.',
  },
  {
    type: 'sentence',
    prompt: 'Он — магазин',
    words: ['он', 'она', 'в', 'магазине', 'парк', 'библиотеке'],
    correct: 'Он в магазине.',
  },
  {
    type: 'sentence',
    prompt: 'Она — комната',
    words: ['она', 'они', 'в', 'комнате', 'театр', 'школе'],
    correct: 'Она в комнате.',
  },
  {
    type: 'sentence',
    prompt: 'Они — буфет',
    words: ['они', 'он', 'в', 'буфете', 'магазин', 'парк'],
    correct: 'Они в буфете.',
  },
  {
    type: 'sentence',
    prompt: 'Мы — школа',
    words: ['мы', 'она', 'в', 'школе', 'парк', 'библиотеке'],
    correct: 'Мы в школе.',
  },
  {
    type: 'sentence',
    prompt: 'Он — институт',
    words: ['он', 'они', 'в', 'институте', 'магазин', 'театр'],
    correct: 'Он в институте.',
  },
  {
    type: 'sentence',
    prompt: 'Они — парк',
    words: ['они', 'мы', 'в', 'парке', 'школа', 'буфете'],
    correct: 'Они в парке.',
  },
  {
    type: 'sentence',
    prompt: 'Мы — театр',
    words: ['мы', 'он', 'в', 'театре', 'магазин', 'школа'],
    correct: 'Мы в театре.',
  },
  {
    type: 'sentence',
    prompt: 'Она — поликлиника',
    words: ['она', 'они', 'в', 'поликлинике', 'парк', 'библиотеке'],
    correct: 'Она в поликлинике.',
  },
  {
    type: 'sentence',
    prompt: 'Он — кабинет врача',
    words: ['он', 'мы', 'в', 'кабинете врача', 'школа', 'магазин'],
    correct: 'Он в кабинете врача.',
  },
];

export default function LessonTwentyTwoTaskFivePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-22" />;
}
