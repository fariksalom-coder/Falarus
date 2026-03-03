import LessonFourteenTaskRunner, { type Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Я часто ______ над его шутками.', options: ['смеёшься', 'смеюсь', 'смеётся', 'смеются'], correct: 'смеюсь' },
  { type: 'choice', prompt: 'Почему ты не ______?', options: ['смеюсь', 'смеётся', 'смеёшься', 'смеёмся'], correct: 'смеёшься' },
  { type: 'choice', prompt: 'Мы громко ______ на концерте.', options: ['смеются', 'смеёмся', 'смеётся', 'смеёшься'], correct: 'смеёмся' },
  { type: 'choice', prompt: 'Она всегда ______ над этим фильмом.', options: ['смеюсь', 'смеются', 'смеётся', 'смеёшься'], correct: 'смеётся' },
  { type: 'choice', prompt: 'Дети ______ во дворе.', options: ['смеётся', 'смеёшься', 'смеются', 'смеюсь'], correct: 'смеются' },
  {
    type: 'matching',
    prompt: 'Juftini toping (смеяться)',
    pairs: [
      { left: 'Я не ______ над людьми.', right: 'смеюсь' },
      { left: 'Ты часто ______ над его словами?', right: 'смеёшься' },
      { left: 'Он ______ без причины.', right: 'смеётся' },
      { left: 'Мы ______ вместе.', right: 'смеёмся' },
      { left: 'Они ______ над шуткой.', right: 'смеются' },
    ],
  },
  { type: 'sentence', prompt: 'Tarjima qiling: Men uning hazillaridan kulaman.', words: ['я', 'смеюсь', 'над', 'его', 'шутками', 'смеёшься', 'мы'], correct: 'я смеюсь над его шутками' },
  { type: 'sentence', prompt: 'Tarjima qiling: U hozir mendan kulmayapti.', words: ['он', 'сейчас', 'не', 'смеётся', 'надо', 'мной', 'смеются'], correct: 'он сейчас не смеётся надо мной' },
  { type: 'sentence', prompt: 'Tarjima qiling: Biz doim birga kulamiz.', words: ['мы', 'всегда', 'смеёмся', 'вместе', 'смеются', 'ты'], correct: 'мы всегда смеёмся вместе' },
  { type: 'sentence', prompt: 'Tarjima qiling: Sen nega mendan kulyapsan?', words: ['ты', 'почему', 'смеёшься', 'над', 'мной', 'смеюсь'], correct: 'почему ты смеёшься над мной?' },
  { type: 'sentence', prompt: 'Tarjima qiling: Ular film ustidan kulishdi.', words: ['они', 'смеются', 'над', 'фильмом', 'смеётся', 'мы'], correct: 'они смеются над фильмом' },
];

export default function LessonFourteenTaskTenPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} />;
}
