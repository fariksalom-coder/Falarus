import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'choice',
    prompt: 'Я писал письмо, а …',
    options: ['моя сестра прочитала книгу', 'моя сестра читала книгу'],
    correct: 'моя сестра читала книгу',
  },
  {
    type: 'choice',
    prompt: 'Мы читали текст и …',
    options: ['посмотрели новые слова в словаре', 'смотрели новые слова в словаре'],
    correct: 'смотрели новые слова в словаре',
  },
  {
    type: 'choice',
    prompt: 'Друзья сделали домашнее задание и …',
    options: ['начинали смотреть телевизор', 'начали смотреть телевизор'],
    correct: 'начали смотреть телевизор',
  },
  {
    type: 'choice',
    prompt: 'Она прочитала рассказ и …',
    options: ['писала письмо другу', 'написала письмо другу'],
    correct: 'написала письмо другу',
  },
  {
    type: 'choice',
    prompt: 'Преподаватель … , а студенты внимательно слушали.',
    options: ['объяснил грамматику', 'объяснял грамматику'],
    correct: 'объяснял грамматику',
  },
  {
    type: 'choice',
    prompt: 'Они перевели текст и …',
    options: ['начинали играть в шахматы', 'начали играть в шахматы'],
    correct: 'начали играть в шахматы',
  },
  {
    type: 'choice',
    prompt: 'Мой друг купил два билета и …',
    options: ['приглашал меня в театр', 'пригласил меня в театр'],
    correct: 'пригласил меня в театр',
  },
  {
    type: 'choice',
    prompt: 'Я встретил Таню и …',
    options: ['рассказывал ей об экскурсии', 'рассказал ей об этом'],
    correct: 'рассказал ей об этом',
  },

  {
    type: 'sentence',
    prompt: "Men xat yozayotgan edim, singlim esa kitob o‘qiyotgan edi.",
    words: ['я', 'писал', 'письмо', 'а', 'моя', 'сестра', 'читала', 'книгу', 'прочитала'],
    correct: 'Я писал письмо, а моя сестра читала книгу.',
  },
  {
    type: 'sentence',
    prompt: "Biz matn o‘qidik va lug‘atdan yangi so‘zlarni ko‘rdik.",
    words: ['мы', 'читали', 'текст', 'и', 'смотрели', 'новые', 'слова', 'в', 'словаре', 'посмотрели'],
    correct: 'Мы читали текст и смотрели новые слова в словаре.',
  },
  {
    type: 'sentence',
    prompt: "Do‘stlar uy vazifasini qildi va televizor ko‘ra boshladi.",
    words: ['друзья', 'сделали', 'домашнее', 'задание', 'и', 'начали', 'смотреть', 'телевизор', 'начинали'],
    correct: 'Друзья сделали домашнее задание и начали смотреть телевизор.',
  },
  {
    type: 'sentence',
    prompt: "U hikoyani o‘qib tugatdi va do‘stiga xat yozdi.",
    words: ['она', 'прочитала', 'рассказ', 'и', 'написала', 'письмо', 'другу', 'писала'],
    correct: 'Она прочитала рассказ и написала письмо другу.',
  },
  {
    type: 'sentence',
    prompt: "O‘qituvchi grammatikani tushuntirayotgan edi, talabalar esa diqqat bilan tinglayotgan edi.",
    words: ['преподаватель', 'объяснял', 'грамматику', 'а', 'студенты', 'внимательно', 'слушали', 'объяснил'],
    correct: 'Преподаватель объяснял грамматику, а студенты внимательно слушали.',
  },
  {
    type: 'sentence',
    prompt: "Ular matnni tarjima qildi va shaxmat o‘ynay boshladi.",
    words: ['они', 'перевели', 'текст', 'и', 'начали', 'играть', 'в', 'шахматы', 'начинали'],
    correct: 'Они перевели текст и начали играть в шахматы.',
  },
  {
    type: 'sentence',
    prompt: "Do‘stim ikkita chipta sotib oldi va meni teatrga taklif qildi.",
    words: ['мой', 'друг', 'купил', 'два', 'билета', 'и', 'пригласил', 'меня', 'в', 'театр', 'приглашал'],
    correct: 'Мой друг купил два билета и пригласил меня в театр.',
  },
  {
    type: 'sentence',
    prompt: "Men Tanyani uchratdim va unga ekskursiya haqida aytdim.",
    words: ['я', 'встретил', 'Таню', 'и', 'рассказал', 'ей', 'об', 'экскурсии', 'рассказывал'],
    correct: 'Я встретил Таню и рассказал ей об экскурсии.',
  },
];

export default function LessonSeventeenTaskNinePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-17" lessonPath="/lesson-17" taskNumber={9} />;
}
