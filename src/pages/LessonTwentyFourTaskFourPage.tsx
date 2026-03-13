import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'sentence',
    prompt: "Bu qiz musiqa maktabida o'qiydi.",
    words: ['эта', 'девочка', 'учится', 'в', 'музыкальной', 'школе', 'живёт'],
    correct: 'Эта девочка учится в музыкальной школе.',
  },
  {
    type: 'sentence',
    prompt: "Mening do'stim tibbiyot institutida o'qiydi.",
    words: ['мой', 'друг', 'учится', 'в', 'медицинском', 'институте', 'работает'],
    correct: 'Мой друг учится в медицинском институте.',
  },
  {
    type: 'sentence',
    prompt: "Kecha biz qiziqarli ekskursiyada bo'ldik.",
    words: ['вчера', 'мы', 'были', 'на', 'интересной', 'экскурсии', 'гуляли'],
    correct: 'Вчера мы были на интересной экскурсии.',
  },
  {
    type: 'sentence',
    prompt: 'Bu juda qiziqarli kitob.',
    words: ['это', 'очень', 'интересная', 'книга', 'новая'],
    correct: 'Это очень интересная книга.',
  },
  {
    type: 'sentence',
    prompt: 'Bu katta va qiyin nazorat ishi.',
    words: ['это', 'большая', 'и', 'трудная', 'контрольная', 'работа', 'новая'],
    correct: 'Это большая и трудная контрольная работа.',
  },
  {
    type: 'sentence',
    prompt: "Menda nazorat ishida xatolar yo'q.",
    words: ['у', 'меня', 'нет', 'ошибок', 'в', 'контрольной', 'работе', 'сегодня'],
    correct: 'У меня нет ошибок в контрольной работе.',
  },
  {
    type: 'sentence',
    prompt: "Bizning ko'chamizda musiqa maktabi bor.",
    words: ['на', 'нашей', 'улице', 'находится', 'музыкальная', 'школа', 'стоит'],
    correct: 'На нашей улице находится музыкальная школа.',
  },
  {
    type: 'sentence',
    prompt: "Mening ota-onam katta shaharda yashashni xohlamaydi.",
    words: ['мои', 'родители', 'не', 'хотят', 'жить', 'в', 'большом', 'городе', 'работают'],
    correct: 'Мои родители не хотят жить в большом городе.',
  },
  {
    type: 'sentence',
    prompt: "Hozir mening ota-onam kichik qishloqda yashaydi.",
    words: ['сейчас', 'мои', 'родители', 'живут', 'в', 'небольшой', 'деревне', 'работают'],
    correct: 'Сейчас мои родители живут в небольшой деревне.',
  },
  {
    type: 'sentence',
    prompt: "Biz har bir darsda va har bir ma'ruzada yangi so'zlarni o'rganamiz.",
    words: ['мы', 'узнаём', 'новые', 'слова', 'на', 'каждом', 'занятии', 'и', 'на', 'каждой', 'лекции', 'читаем'],
    correct: 'Мы узнаём новые слова на каждом занятии и на каждой лекции.',
  },
  {
    type: 'sentence',
    prompt: "Dorixona qo'shni uyda joylashgan.",
    words: ['аптека', 'находится', 'в', 'соседнем', 'доме', 'работает'],
    correct: 'Аптека находится в соседнем доме.',
  },
  {
    type: 'sentence',
    prompt: "Mening do'stim kasal. U oxirgi darsda bo'lmadi.",
    words: ['мой', 'друг', 'болен', 'он', 'не', 'был', 'на', 'последнем', 'занятии', 'учится'],
    correct: 'Мой друг болен. Он не был на последнем занятии.',
  },
  {
    type: 'sentence',
    prompt: "Bizning auditoriyamiz uchinchi qavatda joylashgan.",
    words: ['наша', 'аудитория', 'находится', 'на', 'третьем', 'этаже', 'учится'],
    correct: 'Наша аудитория находится на третьем этаже.',
  },
  {
    type: 'sentence',
    prompt: "Bizning oila qulay va yaxshi kvartirada yashaydi.",
    words: ['наша', 'семья', 'живёт', 'в', 'удобной', 'хорошей', 'квартире', 'работает'],
    correct: 'Наша семья живёт в удобной хорошей квартире.',
  },
  {
    type: 'sentence',
    prompt: "Hozir sovuq. Siz qishki palto va qishki shapka kiyishingiz kerak.",
    words: ['сейчас', 'холодно', 'вам', 'нужно', 'ходить', 'в', 'зимнем', 'пальто', 'и', 'в', 'зимней', 'шапке', 'гулять'],
    correct: 'Сейчас холодно. Вам нужно ходить в зимнем пальто и в зимней шапке.',
  },
  {
    type: 'sentence',
    prompt: 'Bu xitoylik talabalar uchinchi guruhda o‘qiydi.',
    words: ['эти', 'китайские', 'студентки', 'учатся', 'в', 'третьей', 'группе', 'живут'],
    correct: 'Эти китайские студентки учатся в третьей группе.',
  },
  {
    type: 'sentence',
    prompt: "Anna qo'shni xonada yashaydi.",
    words: ['анна', 'живёт', 'в', 'соседней', 'комнате', 'работает'],
    correct: 'Анна живёт в соседней комнате.',
  },
  {
    type: 'sentence',
    prompt: 'Bu mashq oxirgi sahifada joylashgan.',
    words: ['это', 'упражнение', 'находится', 'на', 'последней', 'странице', 'лежит'],
    correct: 'Это упражнение находится на последней странице.',
  },
];

export default function LessonTwentyFourTaskFourPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-24" lessonPath="/lesson-24" taskNumber={4} />;
}
