import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'sentence',
    prompt: 'Har kuni ertalab men universitetga boraman.',
    words: ['каждое', 'утро', 'я', 'хожу', 'в', 'университет', 'иду', 'ходил'],
    correct: 'Каждое утро я хожу в университет.',
  },
  {
    type: 'sentence',
    prompt: 'Hozir men pochtaga ketyapman.',
    words: ['сейчас', 'я', 'иду', 'на', 'почту', 'хожу', 'ходил'],
    correct: 'Сейчас я иду на почту.',
  },
  {
    type: 'sentence',
    prompt: "Har kuni mening dugonam bozorga boradi.",
    words: ['каждый', 'день', 'моя', 'подруга', 'ходит', 'на', 'рынок', 'идёт', 'ходила'],
    correct: 'Каждый день моя подруга ходит на рынок.',
  },
  {
    type: 'sentence',
    prompt: 'Hozir u supermarketga ketyapti.',
    words: ['сейчас', 'она', 'идёт', 'в', 'супермаркет', 'ходит', 'ходила'],
    correct: 'Сейчас она идёт в супермаркет.',
  },
  {
    type: 'sentence',
    prompt: "Har kuni kechqurun mening do‘stlarim basseynga boradi.",
    words: ['каждый', 'вечер', 'мои', 'друзья', 'ходят', 'в', 'бассейн', 'идут', 'ходили'],
    correct: 'Каждый вечер мои друзья ходят в бассейн.',
  },
  {
    type: 'sentence',
    prompt: 'Bugun ular stadionga ketyapti.',
    words: ['сегодня', 'они', 'идут', 'на', 'стадион', 'ходят', 'ходили'],
    correct: 'Сегодня они идут на стадион.',
  },
  {
    type: 'sentence',
    prompt: 'Har dushanba kuni biz kutubxonaga boramiz.',
    words: ['каждый', 'понедельник', 'мы', 'ходим', 'в', 'библиотеку', 'идём', 'ходили'],
    correct: 'Каждый понедельник мы ходим в библиотеку.',
  },
  {
    type: 'sentence',
    prompt: "Hozir biz do‘konga ketyapmiz.",
    words: ['сейчас', 'мы', 'идём', 'в', 'магазин', 'ходим', 'ходили'],
    correct: 'Сейчас мы идём в магазин.',
  },
  {
    type: 'sentence',
    prompt: 'Bilaman, sen har shanba basseynga borasan.',
    words: ['я', 'знаю', 'что', 'ты', 'каждую', 'субботу', 'ходишь', 'в', 'бассейн', 'идёшь'],
    correct: 'Я знаю, что ты каждую субботу ходишь в бассейн.',
  },
  {
    type: 'sentence',
    prompt: 'Hozir sen ham basseynga ketyapsan.',
    words: ['сейчас', 'ты', 'идёшь', 'в', 'бассейн', 'ходишь', 'ходил'],
    correct: 'Сейчас ты идёшь в бассейн.',
  },
  {
    type: 'sentence',
    prompt: "Mening do‘stim ko‘pincha boshqa shaharlarga boradi.",
    words: ['мой', 'друг', 'часто', 'ездит', 'в', 'другие', 'города', 'едет', 'ездил'],
    correct: 'Мой друг часто ездит в другие города.',
  },
  {
    type: 'sentence',
    prompt: 'Hozir u Tyumenga ketyapti.',
    words: ['сейчас', 'он', 'едет', 'в', 'Тюмень', 'ездит', 'ездил'],
    correct: 'Сейчас он едет в Тюмень.',
  },
  {
    type: 'sentence',
    prompt: "Mening ota-onam ko‘pincha Parijga boradi.",
    words: ['мои', 'родители', 'часто', 'ездят', 'в', 'Париж', 'едут', 'ездили'],
    correct: 'Мои родители часто ездят в Париж.',
  },
  {
    type: 'sentence',
    prompt: 'Hozir ular ham Parijga ketyapti.',
    words: ['сейчас', 'они', 'едут', 'в', 'Париж', 'ездят', 'ездили'],
    correct: 'Сейчас они едут в Париж.',
  },
  {
    type: 'sentence',
    prompt: 'Odatda men ishga mashinada boraman.',
    words: ['обычно', 'я', 'езжу', 'на', 'работу', 'на', 'машине', 'еду', 'ездил'],
    correct: 'Обычно я езжу на работу на машине.',
  },
  {
    type: 'sentence',
    prompt: 'Hozir men avtobusda ketyapman.',
    words: ['сейчас', 'я', 'еду', 'на', 'автобусе', 'езжу', 'ездил'],
    correct: 'Сейчас я еду на автобусе.',
  },
  {
    type: 'sentence',
    prompt: 'Yozda biz har doim janubga dengizga boramiz.',
    words: ['летом', 'мы', 'всегда', 'ездим', 'на', 'юг', 'к', 'морю', 'едем', 'ездили'],
    correct: 'Летом мы всегда ездим на юг к морю.',
  },
  {
    type: 'sentence',
    prompt: 'Hozir biz turbazaga ketyapmiz.',
    words: ['сейчас', 'мы', 'едем', 'на', 'турбазу', 'ездим', 'ездили'],
    correct: 'Сейчас мы едем на турбазу.',
  },
];

export default function LessonNineteenTaskSixPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-19" />;
}
