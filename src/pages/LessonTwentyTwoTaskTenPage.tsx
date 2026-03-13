import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'sentence',
    prompt: 'Boris Kiyevda yashaydi.',
    words: ['Борис', 'живёт', 'работает', 'в', 'Киеве', 'Москве', 'учится'],
    correct: 'Борис живёт в Киеве.',
  },
  {
    type: 'sentence',
    prompt: 'U zavodda ishlaydi.',
    words: ['он', 'работает', 'живёт', 'на', 'заводе', 'школе', 'учится'],
    correct: 'Он работает на заводе.',
  },
  {
    type: 'sentence',
    prompt: 'Uning ota-onasi Xarkovda yashaydi.',
    words: ['его', 'родители', 'живут', 'в', 'Харькове', 'Киеве', 'работают'],
    correct: 'Его родители живут в Харькове.',
  },
  {
    type: 'sentence',
    prompt: 'Ular maktabda ishlaydi.',
    words: ['они', 'работают', 'живут', 'в', 'школе', 'университете', 'учатся'],
    correct: 'Они работают в школе.',
  },
  {
    type: 'sentence',
    prompt: 'Mening akam Odessada yashaydi.',
    words: ['мой', 'брат', 'живёт', 'в', 'Одессе', 'Киеве', 'работает'],
    correct: 'Мой брат живёт в Одессе.',
  },
  {
    type: 'sentence',
    prompt: 'U poliklinikada ishlaydi.',
    words: ['он', 'работает', 'живёт', 'в', 'поликлинике', 'больнице', 'учится'],
    correct: 'Он работает в поликлинике.',
  },
  {
    type: 'sentence',
    prompt: 'Mening singlim institutda o‘qiydi.',
    words: ['моя', 'сестра', 'учится', 'живёт', 'в', 'институте', 'школе'],
    correct: 'Моя сестра учится в институте.',
  },
  {
    type: 'sentence',
    prompt: 'Men universitetda o‘qiyman.',
    words: ['я', 'учусь', 'работаю', 'в', 'университете', 'школе', 'живу'],
    correct: 'Я учусь в университете.',
  },
  {
    type: 'sentence',
    prompt: 'Men yotoqxonada yashayman.',
    words: ['я', 'живу', 'учусь', 'в', 'общежитии', 'доме', 'школе'],
    correct: 'Я живу в общежитии.',
  },
  {
    type: 'sentence',
    prompt: 'Kecha biz muzeyda bo‘ldik.',
    words: ['мы', 'были', 'живём', 'в', 'музее', 'театре', 'учимся'],
    correct: 'Мы были в музее.',
  },
];

export default function LessonTwentyTwoTaskTenPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-22" lessonPath="/lesson-22" taskNumber={10} />;
}
