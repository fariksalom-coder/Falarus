import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'В субботу дети гуляли в ...', options: ['лес', 'лесу', 'леса'], correct: 'лесу' },
  { type: 'choice', prompt: 'Туристы отдыхали на ...', options: ['берег', 'берегу', 'берега'], correct: 'берегу' },
  { type: 'choice', prompt: 'Моя зимняя одежда висит в ...', options: ['шкаф', 'шкафу', 'шкафа'], correct: 'шкафу' },
  { type: 'choice', prompt: 'Чемодан стоит на ...', options: ['шкаф', 'шкафу', 'шкафа'], correct: 'шкафу' },
  { type: 'choice', prompt: 'Наш кот спит в ...', options: ['угол', 'углу', 'угла'], correct: 'углу' },
  { type: 'choice', prompt: 'Наш кот спит на ...', options: ['пол', 'полу', 'пола'], correct: 'полу' },
  { type: 'choice', prompt: 'Мой компьютер стоит на ...', options: ['стол', 'столе', 'стола'], correct: 'столе' },
  { type: 'choice', prompt: 'Мой компьютер стоит в ...', options: ['угол', 'углу', 'угла'], correct: 'углу' },
  { type: 'choice', prompt: 'Мои родители часто отдыхают в ...', options: ['сад', 'саду', 'сада'], correct: 'саду' },
  { type: 'choice', prompt: 'Я встретил друга в ...', options: ['аэропорт', 'аэропорту', 'аэропорта'], correct: 'аэропорту' },
  { type: 'choice', prompt: 'Эти студенты приехали в Россию в этом ...', options: ['год', 'году', 'года'], correct: 'году' },
  {
    type: 'sentence',
    prompt: "Shanba kuni bolalar o'rmonda sayr qilishdi.",
    words: ['в', 'субботу', 'дети', 'гуляли', 'в', 'лесу', 'играли', 'вчера'],
    correct: 'В субботу дети гуляли в лесу.',
  },
  {
    type: 'sentence',
    prompt: "Sayyohlar sohilda dam olishdi.",
    words: ['туристы', 'отдыхали', 'на', 'берегу', 'жили', 'вчера'],
    correct: 'Туристы отдыхали на берегу.',
  },
  {
    type: 'sentence',
    prompt: "Mening qishki kiyimlarim shkafda osilib turibdi.",
    words: ['моя', 'зимняя', 'одежда', 'висит', 'в', 'шкафу', 'лежит'],
    correct: 'Моя зимняя одежда висит в шкафу.',
  },
  {
    type: 'sentence',
    prompt: "Chamodon shkaf ustida turibdi.",
    words: ['чемодан', 'стоит', 'на', 'шкафу', 'лежит', 'большой'],
    correct: 'Чемодан стоит на шкафу.',
  },
  {
    type: 'sentence',
    prompt: "Bizning mushugimiz burchakda uxlayapti.",
    words: ['наш', 'кот', 'спит', 'в', 'углу', 'играет'],
    correct: 'Наш кот спит в углу.',
  },
  {
    type: 'sentence',
    prompt: "Bizning mushugimiz polda uxlayapti.",
    words: ['наш', 'кот', 'спит', 'на', 'полу', 'играет'],
    correct: 'Наш кот спит на полу.',
  },
  {
    type: 'sentence',
    prompt: "Mening kompyuterim stol ustida turibdi.",
    words: ['мой', 'компьютер', 'стоит', 'на', 'столе', 'лежит'],
    correct: 'Мой компьютер стоит на столе.',
  },
  {
    type: 'sentence',
    prompt: "Mening kompyuterim burchakda turibdi.",
    words: ['мой', 'компьютер', 'стоит', 'в', 'углу', 'лежит'],
    correct: 'Мой компьютер стоит в углу.',
  },
  {
    type: 'sentence',
    prompt: "Mening ota-onam ko'pincha bog'da dam olishadi.",
    words: ['мои', 'родители', 'часто', 'отдыхают', 'в', 'саду', 'работают'],
    correct: 'Мои родители часто отдыхают в саду.',
  },
  {
    type: 'sentence',
    prompt: "Men do'stimni aeroportda uchratdim.",
    words: ['я', 'встретил', 'друга', 'в', 'аэропорту', 'видел'],
    correct: 'Я встретил друга в аэропорту.',
  },
  {
    type: 'sentence',
    prompt: "Bu talabalar Rossiyaga shu yili kelishdi.",
    words: ['эти', 'студенты', 'приехали', 'в', 'Россию', 'в', 'этом', 'году', 'живут'],
    correct: 'Эти студенты приехали в Россию в этом году.',
  },
];

export default function LessonTwentyTwoTaskTwelvePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-22" lessonPath="/lesson-22" taskNumber={12} />;
}
