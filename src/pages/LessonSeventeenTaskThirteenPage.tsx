import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'choice',
    prompt: 'Завтра у нас контрольная работа. Я весь вечер …',
    options: ['буду выполнять задания', 'выполню задания'],
    correct: 'буду выполнять задания',
  },
  {
    type: 'choice',
    prompt: 'Я … домашнее задание и послушаю новый диск.',
    options: ['буду выполнять', 'выполню'],
    correct: 'выполню',
  },
  {
    type: 'choice',
    prompt: 'Мы … новый фильм и пойдем гулять.',
    options: ['будем смотреть', 'посмотрим'],
    correct: 'посмотрим',
  },
  {
    type: 'choice',
    prompt: 'Завтра я весь день … и учить новые слова.',
    options: ['буду переводить', 'переведу'],
    correct: 'буду переводить',
  },
  {
    type: 'choice',
    prompt: 'После того, как я … летом, я буду работать.',
    options: ['буду отдыхать', 'отдохну'],
    correct: 'отдохну',
  },
  {
    type: 'choice',
    prompt: 'Я … журнал и дам его тебе.',
    options: ['буду читать', 'прочту'],
    correct: 'прочту',
  },
  {
    type: 'choice',
    prompt: 'Всё лето я … на рынке.',
    options: ['буду работать', 'поработаю'],
    correct: 'буду работать',
  },
  {
    type: 'choice',
    prompt: 'Студенты … тест два часа.',
    options: ['будут писать', 'напишут'],
    correct: 'будут писать',
  },
  {
    type: 'choice',
    prompt: 'Сейчас я … новые слова и пойду обедать.',
    options: ['буду повторять', 'повторю'],
    correct: 'повторю',
  },
  {
    type: 'choice',
    prompt: 'Когда ты … новый компьютер, я буду помогать тебе выбрать хорошую модель.',
    options: ['будешь покупать', 'купишь'],
    correct: 'будешь покупать',
  },
  {
    type: 'choice',
    prompt: 'Когда ты … новый компьютер, мы придём к тебе в гости.',
    options: ['будешь покупать', 'купишь'],
    correct: 'купишь',
  },

  {
    type: 'sentence',
    prompt: 'Ertaga bizda nazorat ishi bor. Men butun kechani vazifalarni bajarib o‘tkazaman.',
    words: ['завтра', 'у', 'нас', 'контрольная', 'работа', 'я', 'буду', 'выполнять', 'задания', 'выполню'],
    correct: 'Завтра у нас контрольная работа. Я весь вечер буду выполнять задания.',
  },
  {
    type: 'sentence',
    prompt: 'Men uy vazifasini bajaraman va yangi diskni tinglayman.',
    words: ['я', 'выполню', 'домашнее', 'задание', 'и', 'послушаю', 'новый', 'диск', 'буду', 'выполнять'],
    correct: 'Я выполню домашнее задание и послушаю новый диск.',
  },
  {
    type: 'sentence',
    prompt: 'Biz yangi filmni ko‘ramiz va sayrga chiqamiz.',
    words: ['мы', 'посмотрим', 'новый', 'фильм', 'и', 'пойдём', 'гулять', 'будем', 'смотреть'],
    correct: 'Мы посмотрим новый фильм и пойдём гулять.',
  },
  {
    type: 'sentence',
    prompt: 'Ertaga men butun kun tarjima qilaman va yangi so‘zlarni o‘rganaman.',
    words: ['завтра', 'я', 'весь', 'день', 'буду', 'переводить', 'и', 'учить', 'новые', 'слова', 'переведу'],
    correct: 'Завтра я весь день буду переводить и учить новые слова.',
  },
  {
    type: 'sentence',
    prompt: 'Men yozda dam olganimdan keyin ishlayman.',
    words: ['после', 'того', 'как', 'я', 'отдохну', 'летом', 'я', 'буду', 'работать', 'буду', 'отдыхать'],
    correct: 'После того, как я отдохну летом, я буду работать.',
  },
  {
    type: 'sentence',
    prompt: 'Men jurnalni o‘qiyman va uni senga beraman.',
    words: ['я', 'прочту', 'журнал', 'и', 'дам', 'его', 'тебе', 'буду', 'читать'],
    correct: 'Я прочту журнал и дам его тебе.',
  },
  {
    type: 'sentence',
    prompt: 'Men butun yoz bo‘yi bozorda ishlayman.',
    words: ['всё', 'лето', 'я', 'буду', 'работать', 'на', 'рынке', 'поработаю'],
    correct: 'Всё лето я буду работать на рынке.',
  },
  {
    type: 'sentence',
    prompt: 'Talabalar testni ikki soat yozadi.',
    words: ['студенты', 'будут', 'писать', 'тест', 'два', 'часа', 'напишут'],
    correct: 'Студенты будут писать тест два часа.',
  },
  {
    type: 'sentence',
    prompt: 'Men hozir yangi so‘zlarni takrorlayman va tushlik qilaman.',
    words: ['сейчас', 'я', 'повторю', 'новые', 'слова', 'и', 'пойду', 'обедать', 'буду', 'повторять'],
    correct: 'Сейчас я повторю новые слова и пойду обедать.',
  },
  {
    type: 'sentence',
    prompt: 'Sen yangi kompyuter sotib olayotganingda, men yaxshi model tanlashga yordam beraman.',
    words: ['когда', 'ты', 'будешь', 'покупать', 'новый', 'компьютер', 'я', 'буду', 'помогать', 'тебе', 'выбрать', 'хорошую', 'модель', 'купишь'],
    correct: 'Когда ты будешь покупать новый компьютер, я буду помогать тебе выбрать хорошую модель.',
  },
  {
    type: 'sentence',
    prompt: 'Sen yangi kompyuter sotib olganingdan keyin, biz seni ko‘rgani kelamiz.',
    words: ['когда', 'ты', 'купишь', 'новый', 'компьютер', 'мы', 'придём', 'к', 'тебе', 'в', 'гости', 'будешь', 'покупать'],
    correct: 'Когда ты купишь новый компьютер, мы придём к тебе в гости.',
  },
];

export default function LessonSeventeenTaskThirteenPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-17" lessonPath="/lesson-17" taskNumber={13} />;
}
