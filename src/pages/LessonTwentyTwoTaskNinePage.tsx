import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'matching',
    prompt: 'Найдите правильную пару.',
    pairs: [
      { left: 'Сейчас я учусь в … в …', right: 'Петербурге, университете' },
      { left: 'Мой отец работает в … в …', right: 'Москве, посольстве' },
      { left: 'Эти девушки работают в … на …', right: 'аптеке, улице Мира' },
      { left: 'Мои книги и тетради лежат в … и на …', right: 'портфеле, столе' },
      { left: 'В субботу мы были в … на …', right: 'клубе, дискотеке' },
      { left: 'Недавно наша группа была в … на …', right: 'музее, выставке' },
      { left: 'Саша сейчас в … на …', right: 'школе, уроке' },
      { left: 'Мои родители живут на … в …', right: 'севере, деревне' },
      { left: 'Раньше Ахмед работал на … в …', right: 'родине, банке' },
    ],
  },
];

export default function LessonTwentyTwoTaskNinePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-22" lessonPath="/lesson-22" taskNumber={9} />;
}
