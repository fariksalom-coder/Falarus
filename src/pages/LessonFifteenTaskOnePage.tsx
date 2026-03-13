import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'matching',
    prompt: 'играть',
    pairs: [
      { left: 'он', right: 'играл' },
      { left: 'она', right: 'играла' },
      { left: 'они', right: 'играли' },
    ],
  },
  {
    type: 'matching',
    prompt: 'вспоминать',
    pairs: [
      { left: 'он', right: 'вспоминал' },
      { left: 'она', right: 'вспоминала' },
      { left: 'они', right: 'вспоминали' },
    ],
  },
  {
    type: 'matching',
    prompt: 'рассказывать',
    pairs: [
      { left: 'он', right: 'рассказывал' },
      { left: 'она', right: 'рассказывала' },
      { left: 'они', right: 'рассказывали' },
    ],
  },
  {
    type: 'matching',
    prompt: 'любить',
    pairs: [
      { left: 'он', right: 'любил' },
      { left: 'она', right: 'любила' },
      { left: 'они', right: 'любили' },
    ],
  },
  {
    type: 'matching',
    prompt: 'сказать',
    pairs: [
      { left: 'он', right: 'сказал' },
      { left: 'она', right: 'сказала' },
      { left: 'они', right: 'сказали' },
    ],
  },
  {
    type: 'matching',
    prompt: 'жить',
    pairs: [
      { left: 'он', right: 'жил' },
      { left: 'она', right: 'жила' },
      { left: 'они', right: 'жили' },
    ],
  },
  {
    type: 'matching',
    prompt: 'участвовать',
    pairs: [
      { left: 'он', right: 'участвовал' },
      { left: 'она', right: 'участвовала' },
      { left: 'они', right: 'участвовали' },
    ],
  },
  {
    type: 'matching',
    prompt: 'покупать',
    pairs: [
      { left: 'он', right: 'покупал' },
      { left: 'она', right: 'покупала' },
      { left: 'они', right: 'покупали' },
    ],
  },
  {
    type: 'matching',
    prompt: 'купить',
    pairs: [
      { left: 'он', right: 'купил' },
      { left: 'она', right: 'купила' },
      { left: 'они', right: 'купили' },
    ],
  },
  {
    type: 'matching',
    prompt: 'быть',
    pairs: [
      { left: 'он', right: 'был' },
      { left: 'она', right: 'была' },
      { left: 'они', right: 'были' },
    ],
  },
  {
    type: 'matching',
    prompt: 'хотеть',
    pairs: [
      { left: 'он', right: 'хотел' },
      { left: 'она', right: 'хотела' },
      { left: 'они', right: 'хотели' },
    ],
  },
  {
    type: 'matching',
    prompt: 'учиться',
    pairs: [
      { left: 'он', right: 'учился' },
      { left: 'она', right: 'училась' },
      { left: 'они', right: 'учились' },
    ],
  },
  {
    type: 'matching',
    prompt: 'смеяться',
    pairs: [
      { left: 'он', right: 'смеялся' },
      { left: 'она', right: 'смеялась' },
      { left: 'они', right: 'смеялись' },
    ],
  },
  {
    type: 'matching',
    prompt: 'переводить',
    pairs: [
      { left: 'он', right: 'переводил' },
      { left: 'она', right: 'переводила' },
      { left: 'они', right: 'переводили' },
    ],
  },
  {
    type: 'matching',
    prompt: 'понимать',
    pairs: [
      { left: 'он', right: 'понимал' },
      { left: 'она', right: 'понимала' },
      { left: 'они', right: 'понимали' },
    ],
  },
  {
    type: 'matching',
    prompt: 'помнить',
    pairs: [
      { left: 'он', right: 'помнил' },
      { left: 'она', right: 'помнила' },
      { left: 'они', right: 'помнили' },
    ],
  },
];

export default function LessonFifteenTaskOnePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-15" lessonPath="/lesson-15" taskNumber={2} />;
}
