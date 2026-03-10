import LessonFourteenTaskRunner, { Task } from './LessonFourteenTaskRunner';

const TASKS: Task[] = [
  {
    type: 'sentence',
    prompt: "Mening dugonam yotoqxonada, 404-xonada yashaydi.",
    words: ['моя', 'подруга', 'живёт', 'в', 'общежитии', 'в', 'комнате', '404', 'учится'],
    correct: 'Моя подруга живёт в общежитии в комнате 404.',
  },
  {
    type: 'sentence',
    prompt: "Uning xonasi to'rtinchi qavatda joylashgan.",
    words: ['её', 'комната', 'находится', 'на', 'четвёртом', 'этаже', 'живёт'],
    correct: 'Её комната находится на четвёртом этаже.',
  },
  {
    type: 'sentence',
    prompt: 'Xonada keng deraza bor.',
    words: ['в', 'комнате', 'есть', 'широкое', 'окно', 'стоит'],
    correct: 'В комнате есть широкое окно.',
  },
  {
    type: 'sentence',
    prompt: "Deraza ustida chiroyli vaza va gullar turibdi.",
    words: ['красивая', 'ваза', 'и', 'цветы', 'стоят', 'на', 'окне', 'лежат'],
    correct: 'Красивая ваза и цветы стоят на окне.',
  },
  {
    type: 'sentence',
    prompt: "Chap tomonda burchakda kitob javoni turibdi.",
    words: ['слева', 'в', 'углу', 'стоит', 'книжная', 'полка', 'лежит'],
    correct: 'Слева в углу стоит книжная полка.',
  },
  {
    type: 'sentence',
    prompt: "Kitoblar va darsliklar javonda turibdi.",
    words: ['книги', 'и', 'учебники', 'стоят', 'на', 'полке', 'лежат'],
    correct: 'Книги и учебники стоят на полке.',
  },
  {
    type: 'sentence',
    prompt: "Kiyimlar shkafda turadi va osilib turadi.",
    words: ['одежда', 'лежит', 'и', 'висит', 'в', 'шкафу', 'стоит'],
    correct: 'Одежда лежит и висит в шкафу.',
  },
  {
    type: 'sentence',
    prompt: "Chiroyli yopqich karavot ustida yotibdi.",
    words: ['красивое', 'покрывало', 'лежит', 'на', 'кровати', 'стоит'],
    correct: 'Красивое покрывало лежит на кровати.',
  },
  {
    type: 'sentence',
    prompt: "Kichik gilam polda yotibdi.",
    words: ['небольшой', 'ковёр', 'лежит', 'на', 'полу', 'стоит'],
    correct: 'Небольшой ковёр лежит на полу.',
  },
  {
    type: 'sentence',
    prompt: "Stol ustida stol chirog'i va oila rasmi turibdi.",
    words: ['настольная', 'лампа', 'и', 'фотография', 'семьи', 'стоят', 'на', 'столе', 'лежат'],
    correct: 'Настольная лампа и фотография семьи стоят на столе.',
  },
  {
    type: 'sentence',
    prompt: "Daftarlar stol tortmasida yotibdi.",
    words: ['тетради', 'лежат', 'в', 'ящике', 'стола', 'стоят'],
    correct: 'Тетради лежат в ящике стола.',
  },
  {
    type: 'sentence',
    prompt: "Kichik rasm va chiroyli kalendar devorda osilib turibdi.",
    words: ['небольшая', 'картина', 'и', 'красивый', 'календарь', 'висят', 'на', 'стене', 'стоят'],
    correct: 'Небольшая картина и красивый календарь висят на стене.',
  },
  {
    type: 'sentence',
    prompt: "Men ko'pincha dugonamning xonasida bo'laman.",
    words: ['я', 'часто', 'бываю', 'в', 'комнате', 'подруги', 'живу'],
    correct: 'Я часто бываю в комнате подруги.',
  },
  {
    type: 'sentence',
    prompt: "Bu yerda biz shug'ullanamiz, dam olamiz va televizor ko'ramiz.",
    words: ['здесь', 'мы', 'занимаемся', 'отдыхаем', 'и', 'смотрим', 'телевизор', 'читаем'],
    correct: 'Здесь мы занимаемся, отдыхаем и смотрим телевизор.',
  },
];

export default function LessonTwentyThreeTaskTwoPage() {
  return <LessonFourteenTaskRunner tasks={TASKS} backPath="/lesson-23" />;
}
