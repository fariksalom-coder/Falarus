import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'choice',
    prompt: 'Именительный падеж отвечает на какие вопросы?',
    options: ['кого? что?', 'кто? что?', 'кому? чему?'],
    correct: 'кто? что?',
  },
  { type: 'choice', prompt: 'кто?', options: ['kimni?', 'kimga?', 'kim?'], correct: 'kim?' },
  { type: 'choice', prompt: 'что?', options: ['nima?', 'nimani?', 'nimaga?'], correct: 'nima?' },
  {
    type: 'choice',
    prompt: 'Родительный падеж отвечает на какие вопросы?',
    options: ['кого? чего?', 'кто? что?', 'кому? чему?'],
    correct: 'кого? чего?',
  },
  { type: 'choice', prompt: 'кого?', options: ['kimni?', 'kimga?', 'kim?'], correct: 'kimni?' },
  { type: 'choice', prompt: 'чего?', options: ['nima?', 'nimaning?', 'nimaga?'], correct: 'nimaning?' },
  {
    type: 'choice',
    prompt: 'Дательный падеж отвечает на какие вопросы?',
    options: ['кому? чему?', 'кого? чего?', 'кем? чем?'],
    correct: 'кому? чему?',
  },
  { type: 'choice', prompt: 'кому?', options: ['kim?', 'kimga?', 'kimni?'], correct: 'kimga?' },
  { type: 'choice', prompt: 'чему?', options: ['nimani?', 'nimaga?', 'nima?'], correct: 'nimaga?' },
  {
    type: 'choice',
    prompt: 'Винительный падеж отвечает на какие вопросы?',
    options: ['кого? что?', 'кому? чему?', 'кем? чем?'],
    correct: 'кого? что?',
  },
  { type: 'choice', prompt: 'кого?', options: ['kimni?', 'kim?', 'kimga?'], correct: 'kimni?' },
  { type: 'choice', prompt: 'что?', options: ['nimani?', 'nima?', 'nimaga?'], correct: 'nimani?' },
  {
    type: 'choice',
    prompt: 'Творительный падеж отвечает на какие вопросы?',
    options: ['кем? чем?', 'кого? чего?', 'кому? чему?'],
    correct: 'кем? чем?',
  },
  { type: 'choice', prompt: 'кем?', options: ['kim bilan?', 'kimni?', 'kimga?'], correct: 'kim bilan?' },
  { type: 'choice', prompt: 'чем?', options: ['nima bilan?', 'nimani?', 'nimaga?'], correct: 'nima bilan?' },
  {
    type: 'choice',
    prompt: 'Предложный падеж отвечает на какие вопросы?',
    options: ['о ком? о чём?', 'кем? чем?', 'кого? что?'],
    correct: 'о ком? о чём?',
  },
  { type: 'choice', prompt: 'о ком?', options: ['kim haqida?', 'kimga?', 'kimni?'], correct: 'kim haqida?' },
  { type: 'choice', prompt: 'о чём?', options: ['nima haqida?', 'nimani?', 'nimaga?'], correct: 'nima haqida?' },
];

export default function LessonTwentyOneTaskOnePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-21" />;
}
