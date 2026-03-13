import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Родители всегда хотят … правду.', options: ['знать', 'знают', 'узнают'], correct: 'знать' },
  { type: 'choice', prompt: 'Когда мы ждём подругу, мы … музыку.', options: ['будем слушать', 'слушаем', 'послушаем'], correct: 'слушаем' },
  { type: 'choice', prompt: 'В ресторане друзья обедали и … .', options: ['поговорили', 'разговаривали', 'рассказывали'], correct: 'разговаривали' },
  { type: 'choice', prompt: 'Когда я получу деньги, я … дорогую вазу.', options: ['покупаю', 'куплю', 'купил'], correct: 'куплю' },
  { type: 'choice', prompt: 'Когда я перевёл текст, я … .', options: ['буду уставать', 'устаю', 'устал'], correct: 'устал' },
  { type: 'choice', prompt: 'Вечером мама будет пить сок и … телевизор.', options: ['смотреть', 'посмотреть', 'смотрит'], correct: 'смотреть' },
  { type: 'choice', prompt: 'Когда я буду рисовать, я … музыку.', options: ['послушаю', 'слушаю', 'буду слушать'], correct: 'буду слушать' },
  { type: 'choice', prompt: 'Когда мы переводили текст, неожиданно … Антон.', options: ['звонит', 'звонил', 'позвонил'], correct: 'позвонил' },
  { type: 'choice', prompt: 'Обычно они часто … занятия, когда учились в университете.', options: ['пропускали', 'пропустили', 'будут пропускать'], correct: 'пропускали' },
  { type: 'choice', prompt: 'Я долго … стихотворение и наконец … его.', options: ['учил / выучил', 'научил / выучил', 'учил / научил'], correct: 'учил / выучил' },
  { type: 'choice', prompt: 'Кто тебя … говорить по-китайски?', options: ['научил', 'учил', 'выучил'], correct: 'учил' },
  { type: 'choice', prompt: 'Где ты раньше … ?', options: ['учился', 'учил', 'научился'], correct: 'учился' },
  { type: 'choice', prompt: 'Мы уже … много новых слов.', options: ['научились', 'выучили', 'учились'], correct: 'выучили' },
  { type: 'choice', prompt: 'Где они так хорошо … играть в футбол?', options: ['научились', 'учились', 'выучили'], correct: 'научились' },
  { type: 'choice', prompt: 'Друзья быстро … готовить русские блины.', options: ['научились', 'выучили', 'учились'], correct: 'научились' },
  { type: 'choice', prompt: 'Наконец ты … говорить по-русски.', options: ['начал', 'начинает', 'начинаешь'], correct: 'начал' },
  { type: 'choice', prompt: 'Ребёнок первый раз … слово «мама».', options: ['начинает', 'начал говорить', 'сказал'], correct: 'сказал' },
  { type: 'choice', prompt: 'Магазин … работать в 10 часов.', options: ['начал', 'начинает', 'начал работать'], correct: 'начал работать' },
  { type: 'choice', prompt: 'Мой брат … новый бизнес.', options: ['начал', 'начинает', 'начал работать'], correct: 'начал' },
  { type: 'choice', prompt: 'Докладчик … час назад.', options: ['начал', 'начинает', 'начал выступление'], correct: 'начал' },
];

export default function LessonTwentyTaskThreePage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-20" lessonPath="/lesson-20" taskNumber={3} />;
}
