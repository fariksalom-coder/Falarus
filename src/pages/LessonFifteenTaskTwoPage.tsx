import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'sentence',
    prompt: "Qiz xatni o‘qidi.",
    words: ['девушка', 'читала', 'письмо', 'читал', 'письма'],
    correct: 'девушка читала письмо',
  },
  {
    type: 'sentence',
    prompt: 'Kutubxonada talabalar jurnal va gazetalar o‘qishdi.',
    words: ['в', 'библиотеке', 'студенты', 'читали', 'журналы', 'и', 'газеты', 'читает'],
    correct: 'в библиотеке студенты читали журналы и газеты',
  },
  {
    type: 'sentence',
    prompt: 'U tez va to‘g‘ri o‘qidi.',
    words: ['он', 'читал', 'быстро', 'и', 'правильно', 'читают'],
    correct: 'он читал быстро и правильно',
  },
  {
    type: 'sentence',
    prompt: 'Siz bugun matnni o‘qidingizmi?',
    words: ['вы', 'читали', 'сегодня', 'текст', 'читает'],
    correct: 'вы читали сегодня текст?',
  },
  {
    type: 'sentence',
    prompt: 'Akam gitara chalishni yaxshi bilardi.',
    words: ['мой', 'брат', 'хорошо', 'играл', 'на', 'гитаре', 'играла'],
    correct: 'мой брат хорошо играл на гитаре',
  },
  {
    type: 'sentence',
    prompt: 'Talabalar gitara chalib, qo‘shiq aytishdi.',
    words: ['студенты', 'играли', 'на', 'гитаре', 'и', 'пели', 'поёт'],
    correct: 'студенты играли на гитаре и пели',
  },
  {
    type: 'sentence',
    prompt: 'Maktabda futbol o‘ynardim.',
    words: ['в', 'школе', 'я', 'играл', 'в', 'футбол', 'играла'],
    correct: 'в школе я играл в футбол',
  },
  {
    type: 'sentence',
    prompt: 'Bu filmda taniqli aktyor o‘ynagan.',
    words: ['в', 'этом', 'фильме', 'играл', 'известный', 'актёр', 'играли'],
    correct: 'в этом фильме играл известный актёр',
  },
  {
    type: 'sentence',
    prompt: 'Ular sayr qilishni xohlashmasdi.',
    words: ['они', 'не', 'хотели', 'гулять', 'хотела'],
    correct: 'они не хотели гулять',
  },
  {
    type: 'sentence',
    prompt: 'Ilgari u do‘konda ishlamoqchi edi.',
    words: ['раньше', 'она', 'хотела', 'работать', 'в', 'магазине', 'хотели'],
    correct: 'раньше она хотела работать в магазине',
  },
  {
    type: 'sentence',
    prompt: 'Men juda charchadim va uxlamoqchi edim.',
    words: ['я', 'очень', 'устал', 'и', 'хотел', 'спать', 'хотела'],
    correct: 'я очень устал и хотел спать',
  },
  {
    type: 'sentence',
    prompt: 'Biz tushlik qilmoqchi bo‘lib, kafega bordik.',
    words: ['мы', 'хотели', 'пообедать', 'и', 'пошли', 'в', 'кафе', 'хотел'],
    correct: 'мы хотели пообедать и пошли в кафе',
  },
  {
    type: 'sentence',
    prompt: 'Dustim 2 yil Moskvada o‘qidi.',
    words: ['мой', 'друг', '2', 'года', 'учился', 'в', 'москве', 'учились'],
    correct: 'мой друг 2 года учился в москве',
  },
  {
    type: 'sentence',
    prompt: 'Ilgari qayerda o‘qigan eding?',
    words: ['где', 'ты', 'раньше', 'учился', 'училась'],
    correct: 'где ты раньше учился?',
  },
  {
    type: 'sentence',
    prompt: 'Biz bir maktabda o‘qiganmiz.',
    words: ['мы', 'учились', 'в', 'одной', 'школе', 'учился'],
    correct: 'мы учились в одной школе',
  },
  {
    type: 'sentence',
    prompt: 'U maktabda yaxshi o‘qidi.',
    words: ['она', 'хорошо', 'училась', 'в', 'школе', 'учился'],
    correct: 'она хорошо училась в школе',
  },
  {
    type: 'sentence',
    prompt: 'Ular tayyorlov fakultetida o‘qishardi.',
    words: ['они', 'учились', 'на', 'подготовительном', 'факультете', 'учился'],
    correct: 'они учились на подготовительном факультете',
  },
];

export default function LessonFifteenTaskTwoPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-15" />;
}
