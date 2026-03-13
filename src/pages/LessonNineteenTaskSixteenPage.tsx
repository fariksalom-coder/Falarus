import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Преподаватель и студенты в аудитории. … занятие по фонетике.', options: ['идёт', 'ходит'], correct: 'идёт' },
  { type: 'choice', prompt: 'На улице … дождь.', options: ['идёт', 'ходит'], correct: 'идёт' },
  { type: 'choice', prompt: 'Время … быстро.', options: ['идёт', 'ходит'], correct: 'идёт' },
  { type: 'choice', prompt: 'В кинотеатрах сейчас … новый фильм.', options: ['идёт', 'ходит'], correct: 'идёт' },
  { type: 'choice', prompt: '— Тише! … экзамен.', options: ['идёт', 'ходит'], correct: 'идёт' },
  { type: 'choice', prompt: '— По телевизору в 19:00 … новости.', options: ['идут', 'ходят'], correct: 'идут' },
  { type: 'choice', prompt: '— Смотри! … наш автобус.', options: ['идёт', 'ходит'], correct: 'идёт' },
  { type: 'choice', prompt: 'Это платье ей очень …', options: ['идёт', 'ходит'], correct: 'идёт' },
  { type: 'choice', prompt: 'Он всегда … в джинсах.', options: ['идёт', 'ходит'], correct: 'ходит' },
  { type: 'choice', prompt: '— Где вы были вчера? — Вчера мы … на выставку.', options: ['ходили', 'были'], correct: 'ходили' },
  { type: 'choice', prompt: '— А вы когда ходили на выставку? — Мы … на выставке в субботу.', options: ['ходили', 'были'], correct: 'были' },
  { type: 'choice', prompt: '— Где ты был в субботу? — В субботу я … в театр.', options: ['ходил', 'был'], correct: 'ходил' },
  { type: 'choice', prompt: '— Юля, где ты была в зимние каникулы? — В зимние каникулы я … в Москву.', options: ['ездила', 'была'], correct: 'ездила' },
  { type: 'choice', prompt: '— А когда вы ездили в Москву? — Мы … в Москве в прошлом году.', options: ['ездили', 'были'], correct: 'были' },
  { type: 'choice', prompt: '— Мария, почему сегодня ты не была в университете? — Я … в больницу.', options: ['ходила', 'была'], correct: 'ходила' },
  { type: 'choice', prompt: '— Куда они ходили в воскресенье? — Они … в зоопарке.', options: ['ходили', 'были'], correct: 'были' },
  { type: 'choice', prompt: '— Почему ты не был на экскурсии? — Я … в гости.', options: ['ходил', 'был'], correct: 'ходил' },
  { type: 'choice', prompt: '— Когда вы были в магазине? — Мы … в магазин утром.', options: ['ходили', 'были'], correct: 'ходили' },
  { type: 'choice', prompt: '— Куда они ходили вчера? — Они … на стадионе.', options: ['ходили', 'были'], correct: 'были' },
];

export default function LessonNineteenTaskSixteenPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-19" lessonPath="/lesson-19" taskNumber={16} />;
}
