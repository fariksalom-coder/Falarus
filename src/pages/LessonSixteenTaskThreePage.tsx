import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'sentence',
    prompt: "Men ertaga rus tilini o‘qiyman.",
    words: ['я', 'буду', 'читать', 'русский', 'язык', 'завтра'],
    correct: 'Я буду читать русский язык завтра.',
  },
  {
    type: 'sentence',
    prompt: 'U ertaga ishlaydi.',
    words: ['он', 'будет', 'работать', 'завтра'],
    correct: 'Он будет работать завтра.',
  },
  {
    type: 'sentence',
    prompt: 'Biz parkda sayr qilamiz.',
    words: ['мы', 'будем', 'гулять', 'в', 'парке'],
    correct: 'Мы будем гулять в парке.',
  },
  {
    type: 'sentence',
    prompt: 'Ular ertaga raqsga tushadi.',
    words: ['они', 'будут', 'танцевать', 'завтра'],
    correct: 'Они будут танцевать завтра.',
  },
  {
    type: 'sentence',
    prompt: 'Sen rus tilida gapirasan.',
    words: ['ты', 'будешь', 'говорить', 'по-русски'],
    correct: 'Ты будешь говорить по-русски.',
  },
];

export default function LessonSixteenTaskThreePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-16" lessonPath="/lesson-16" taskNumber={3} />;
}
