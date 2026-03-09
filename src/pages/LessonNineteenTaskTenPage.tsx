import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'sentence',
    prompt: "Kecha biz uyimiz yonidagi parkga bordik.",
    words: ['вчера', 'мы', 'ходили', 'в', 'парк', 'рядом', 'с', 'нашим', 'домом', 'ехали', 'идём'],
    correct: 'Вчера мы ходили в парк рядом с нашим домом.',
  },
  {
    type: 'sentence',
    prompt: "Biz parkga borganimizda quyosh porlab turardi.",
    words: ['когда', 'мы', 'шли', 'в', 'парк', 'светило', 'солнце', 'ходили', 'идём'],
    correct: 'Когда мы шли в парк, светило солнце.',
  },
  {
    type: 'sentence',
    prompt: "Kecha u dorixonaga bordi.",
    words: ['вчера', 'она', 'ходила', 'в', 'аптеку', 'шла', 'идёт'],
    correct: 'Вчера она ходила в аптеку.',
  },
  {
    type: 'sentence',
    prompt: "U dorixonaga ketayotganda kioskdan gazeta sotib oldi.",
    words: ['когда', 'она', 'шла', 'в', 'аптеку', 'купила', 'в', 'киоске', 'газету', 'ходила'],
    correct: 'Когда она шла в аптеку, купила в киоске газету.',
  },
  {
    type: 'sentence',
    prompt: "Talabalar oshxonaga bordi va baland gaplashdi.",
    words: ['студенты', 'ходили', 'в', 'столовую', 'и', 'громко', 'разговаривали', 'шли'],
    correct: 'Студенты ходили в столовую и громко разговаривали.',
  },
  {
    type: 'sentence',
    prompt: "Bugun ertalab men oshxonaga emas, kafega bordim.",
    words: ['сегодня', 'утром', 'я', 'ходил', 'не', 'в', 'столовую', 'а', 'в', 'кафе', 'шёл'],
    correct: 'Сегодня утром я ходил не в столовую, а в кафе.',
  },
  {
    type: 'sentence',
    prompt: "Kecha men uyga ketayotganimda allaqachon qorong'i edi.",
    words: ['вчера', 'когда', 'я', 'шёл', 'домой', 'было', 'уже', 'темно', 'ходил'],
    correct: 'Вчера, когда я шёл домой, было уже темно.',
  },
  {
    type: 'sentence',
    prompt: "Sen ertalab stadionga bording.",
    words: ['ты', 'утром', 'ходил', 'на', 'стадион', 'шёл'],
    correct: 'Ты утром ходил на стадион.',
  },
  {
    type: 'sentence',
    prompt: "Sen stadionga ketayotganingda ko'chada yomg'ir yog'ayotgan edi.",
    words: ['когда', 'ты', 'шёл', 'на', 'стадион', 'на', 'улице', 'был', 'дождь', 'ходил'],
    correct: 'Когда ты шёл на стадион, на улице был дождь.',
  },
  {
    type: 'sentence',
    prompt: "Kecha biz shahar tashqarisiga bordik.",
    words: ['вчера', 'мы', 'ездили', 'за', 'город', 'ехали', 'идём'],
    correct: 'Вчера мы ездили за город.',
  },
  {
    type: 'sentence',
    prompt: "Biz u yerga avtobusda bordik.",
    words: ['мы', 'ехали', 'туда', 'на', 'автобусе', 'ездили'],
    correct: 'Мы ехали туда на автобусе.',
  },
  {
    type: 'sentence',
    prompt: "Orqaga mashinada qaytdik.",
    words: ['обратно', 'ехали', 'на', 'машине', 'ездили'],
    correct: 'Обратно ехали на машине.',
  },
  {
    type: 'sentence',
    prompt: "Kecha u dugonasining oldiga boshqa shaharga bordi.",
    words: ['вчера', 'она', 'ездила', 'к', 'подруге', 'в', 'другой', 'город', 'ехала'],
    correct: 'Вчера она ездила к подруге в другой город.',
  },
  {
    type: 'sentence',
    prompt: "U elektrichkada ketayotganda kitob o'qidi.",
    words: ['она', 'ехала', 'на', 'электричке', 'и', 'читала', 'книгу', 'ездила'],
    correct: 'Она ехала на электричке и читала книгу.',
  },
  {
    type: 'sentence',
    prompt: "O'tgan oy talabalar Moskvaga bordi.",
    words: ['в', 'прошлом', 'месяце', 'студенты', 'ездили', 'в', 'Москву', 'ехали'],
    correct: 'В прошлом месяце студенты ездили в Москву.',
  },
  {
    type: 'sentence',
    prompt: "Ular u yerga ketayotganda poyezdda Permdan kelgan talabalar bilan tanishdi.",
    words: ['когда', 'они', 'ехали', 'туда', 'они', 'познакомились', 'в', 'поезде', 'со', 'студентами', 'из', 'Перми'],
    correct: 'Когда они ехали туда, они познакомились в поезде со студентами из Перми.',
  },
  {
    type: 'sentence',
    prompt: "Yakshanba kuni biz teatrga bordik.",
    words: ['в', 'воскресенье', 'мы', 'ходили', 'в', 'театр', 'шли'],
    correct: 'В воскресенье мы ходили в театр.',
  },
  {
    type: 'sentence',
    prompt: "U yerga biz taksida bordik.",
    words: ['туда', 'мы', 'ехали', 'на', 'такси', 'ездили'],
    correct: 'Туда мы ехали на такси.',
  },
  {
    type: 'sentence',
    prompt: "Orqaga biz avtobusda qaytdik.",
    words: ['обратно', 'мы', 'ехали', 'на', 'автобусе', 'ездили'],
    correct: 'Обратно мы ехали на автобусе.',
  },
  {
    type: 'sentence',
    prompt: "Men avtobusda universitetga ketayotganimda telefonimni yo'qotdim.",
    words: ['я', 'потерял', 'телефон', 'когда', 'ехал', 'в', 'университет', 'на', 'автобусе'],
    correct: 'Я потерял телефон, когда ехал в университет на автобусе.',
  },
  {
    type: 'sentence',
    prompt: "Chelyabinskdan Yekaterinburggacha biz besh soat yo'lda bo'ldik.",
    words: ['от', 'Челябинска', 'до', 'Екатеринбурга', 'мы', 'ехали', 'пять', 'часов', 'ездили'],
    correct: 'От Челябинска до Екатеринбурга мы ехали пять часов.',
  },
  {
    type: 'sentence',
    prompt: "U kechikayotgan edi, shuning uchun ishga juda tez ketdi.",
    words: ['он', 'опаздывал', 'поэтому', 'ехал', 'на', 'работу', 'очень', 'быстро', 'ездил'],
    correct: 'Он опаздывал, поэтому ехал на работу очень быстро.',
  },
];

export default function LessonNineteenTaskTenPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-19" />;
}
