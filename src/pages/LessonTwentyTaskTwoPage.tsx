import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Скоро у меня … машина.', options: ['был', 'будет', 'буду'], correct: 'будет' },
  { type: 'choice', prompt: 'Завтра мои друзья … здесь.', options: ['буду', 'будет', 'будут'], correct: 'будут' },
  { type: 'choice', prompt: 'На прошлой неделе он … в театре.', options: ['был', 'будет', 'буду'], correct: 'был' },
  { type: 'choice', prompt: 'Я думаю, что в 10 часов она … в офисе.', options: ['была', 'будет', 'будет'], correct: 'будет' },
  { type: 'choice', prompt: 'Вчера … замечательный день.', options: ['был', 'будет', 'были'], correct: 'был' },
  { type: 'choice', prompt: 'Завтра … холодная погода.', options: ['будет', 'был', 'будут'], correct: 'будет' },
  { type: 'choice', prompt: 'Сейчас мы занимаемся, потом мы … отдыхать.', options: ['будешь', 'буду', 'будем'], correct: 'будем' },
  { type: 'choice', prompt: 'Когда ты придёшь, я … нас фотографировать.', options: ['будет', 'буду', 'будешь'], correct: 'буду' },
  { type: 'choice', prompt: 'Я … ждать тебя в 12 часов.', options: ['будете', 'буду', 'будет'], correct: 'буду' },
  { type: 'choice', prompt: 'Они не … покупать новую квартиру.', options: ['будут', 'будет', 'будете'], correct: 'будут' },
  { type: 'choice', prompt: 'Сейчас отец работает, потом … отдыхать.', options: ['будет', 'будут', 'буду'], correct: 'будет' },
  { type: 'choice', prompt: 'Где вы … жить после окончания университета?', options: ['будет', 'будете', 'будут'], correct: 'будете' },
  { type: 'choice', prompt: 'Когда будет тренировка?', options: ['будет', 'будут', 'были'], correct: 'будет' },
  { type: 'choice', prompt: '— Вы уже … работать на компьютере? — Нет, но скоро …', options: ['учились / научусь', 'научились / научусь', 'учились / учился'], correct: 'учились / научусь' },
  { type: 'choice', prompt: '— Они уже … домашнее задание? — Нет, но скоро …', options: ['будут делать / делают', 'сделали / будут делать', 'делают / сделали'], correct: 'сделали / будут делать' },
  { type: 'choice', prompt: 'Завтра вы обязательно … все документы.', options: ['будете получать', 'получите', 'получаете'], correct: 'получите' },
  { type: 'choice', prompt: 'В следующем году мы … новый магазин.', options: ['откроем', 'открыли', 'открывали'], correct: 'откроем' },
  { type: 'choice', prompt: '— Сегодня я не смогу прийти. — А когда ты … ?', options: ['сможешь', 'сможете', 'смогу'], correct: 'сможешь' },
  { type: 'choice', prompt: 'Я знаю, что завтра друзья … меня.', options: ['поздравили', 'поздравляли', 'поздравят'], correct: 'поздравят' },
  { type: 'choice', prompt: 'Я хочу хорошо знать русский язык. Я должна много …', options: ['позаниматься', 'заниматься', 'занимаюсь'], correct: 'заниматься' },
];

export default function LessonTwentyTaskTwoPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-20" />;
}
