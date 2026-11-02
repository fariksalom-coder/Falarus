export type VnzhListeningChoiceItem = {
  index: number;
  audioUrl: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type VnzhListeningFillBlankItem = {
  index: number;
  audioUrl: string;
  prompt: string;
  answer: string;
};

export type VnzhListeningTripleChoiceQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type VnzhListeningTripleChoiceItem = {
  index: number;
  audioUrl: string;
  questions: VnzhListeningTripleChoiceQuestion[];
};

function audioPath(folder: '5' | '6' | '7' | '8-10', index: number) {
  return `/courses/vnzh/source/${folder}/item-${String(index).padStart(2, '0')}.mp3`;
}

export const VNZH_LISTENING_TASK_FIVE: VnzhListeningChoiceItem[] = [
  { index: 1, audioUrl: audioPath('5', 1), prompt: 'Разговор происходит', options: ['в автосервисе', 'в кафе', 'в банке'], correctIndex: 0 },
  { index: 2, audioUrl: audioPath('5', 2), prompt: 'Разговор происходит', options: ['на вокзале', 'в супермаркете', 'в автобусе'], correctIndex: 2 },
  { index: 3, audioUrl: audioPath('5', 3), prompt: 'Разговор происходит', options: ['в банке', 'в кафе', 'в поликлинике'], correctIndex: 1 },
  { index: 4, audioUrl: audioPath('5', 4), prompt: 'Разговор происходит', options: ['в аэропорту', 'в магазине', 'в здании вокзала'], correctIndex: 2 },
  { index: 5, audioUrl: audioPath('5', 5), prompt: 'Разговор происходит', options: ['в продуктовом магазине', 'в автосервисе', 'в мастерской по ремонту одежды'], correctIndex: 2 },
  { index: 6, audioUrl: audioPath('5', 6), prompt: 'Разговор происходит', options: ['в магазине фруктов', 'в магазине цветов', 'в магазине чая'], correctIndex: 2 },
  { index: 7, audioUrl: audioPath('5', 7), prompt: 'Разговор происходит', options: ['в турагентстве', 'в магазине', 'на автовокзале'], correctIndex: 0 },
  { index: 8, audioUrl: audioPath('5', 8), prompt: 'Разговор происходит', options: ['в центре «Мои документы»', 'в банке', 'в отделе полиции'], correctIndex: 1 },
  { index: 9, audioUrl: audioPath('5', 9), prompt: 'Разговор происходит', options: ['на работе', 'в магазине', 'в фотоателье'], correctIndex: 2 },
  { index: 10, audioUrl: audioPath('5', 10), prompt: 'Разговор происходит', options: ['в продуктовом магазине', 'в отделении «Почта России»', 'при регистрации в аэропорту'], correctIndex: 1 },
  { index: 11, audioUrl: audioPath('5', 11), prompt: 'Разговор происходит', options: ['в кассе кинотеатра', 'в кассе магазина', 'в кассе вокзала'], correctIndex: 0 },
];

export const VNZH_LISTENING_TASK_SIX: VnzhListeningFillBlankItem[] = [
  { index: 1, audioUrl: audioPath('6', 1), prompt: 'Посетителю нужно заполнить ________________.', answer: 'анкету' },
  { index: 2, audioUrl: audioPath('6', 2), prompt: 'Это объявление Вы можете услышать в ___________.', answer: 'аэровокзале' },
  { index: 3, audioUrl: audioPath('6', 3), prompt: 'Рустам изучал русский язык в городе ________________.', answer: 'Бухара' },
  { index: 4, audioUrl: audioPath('6', 4), prompt: 'Поезд следует в ________________.', answer: 'Севастополь' },
  { index: 5, audioUrl: audioPath('6', 5), prompt: 'Наташа работает сейчас ____________.', answer: 'продавцом' },
  { index: 6, audioUrl: audioPath('6', 6), prompt: 'Раньше она работала в ресторане ___________.', answer: 'поваром' },
  { index: 7, audioUrl: audioPath('6', 7), prompt: 'Музей не работает в ____________.', answer: 'в понедельник' },
  { index: 8, audioUrl: audioPath('6', 8), prompt: 'Он хочет оформить в банке ____________.', answer: 'карту' },
  { index: 9, audioUrl: audioPath('6', 9), prompt: 'Друзья пригласили в субботу Михаила на ____________.', answer: 'в футбол' },
  { index: 10, audioUrl: audioPath('6', 10), prompt: 'Она хочет отправить посылку в _____________.', answer: 'в Тюмень' },
  { index: 11, audioUrl: audioPath('6', 11), prompt: 'Летом Вера отдыхала у бабушки в ____________.', answer: 'в деревне' },
];

export const VNZH_LISTENING_TASK_SEVEN: VnzhListeningChoiceItem[] = [
  { index: 1, audioUrl: audioPath('7', 1), prompt: 'Выберите правильный ответ', options: ['Поликлинике нужен врач-стоматолог.', 'Врач работает завтра с 8 часов утра.', 'Терапевт завтра не работает.'], correctIndex: 1 },
  { index: 2, audioUrl: audioPath('7', 2), prompt: 'Выберите правильный ответ', options: ['в декабре прошлого года', 'в следующем году', 'через месяц'], correctIndex: 0 },
  { index: 3, audioUrl: audioPath('7', 3), prompt: 'Выберите правильный ответ', options: ['Мои знакомые сняли квартиру в центре города.', 'Пока нет, сейчас это очень дорого.', 'Мы два года живём в этой квартире.'], correctIndex: 1 },
  { index: 4, audioUrl: audioPath('7', 4), prompt: 'Выберите правильный ответ', options: ['На табло в центре зала.', 'На платформе 4.', 'В кассе автовокзала.'], correctIndex: 0 },
  { index: 5, audioUrl: audioPath('7', 5), prompt: 'Выберите правильный ответ', options: ['В аптеке вы можете купить витамины.', 'Аптека находится за углом.', 'Я уже был в аптеке.'], correctIndex: 1 },
  { index: 6, audioUrl: audioPath('7', 6), prompt: 'Выберите правильный ответ', options: ['У вас есть с собой документы?', 'Вы хотите отправить письмо?', 'Вы будете менять все документы?'], correctIndex: 0 },
  { index: 7, audioUrl: audioPath('7', 7), prompt: 'Выберите правильный ответ', options: ['Для заказного письма нужна ещё марка.', 'Подойдите к окну номер пять.', 'Вы можете получить посылку здесь.'], correctIndex: 1 },
  { index: 8, audioUrl: audioPath('7', 8), prompt: 'Выберите правильный ответ', options: ['Вас тоже поздравляю с праздником!', 'Большое спасибо за поздравление.', 'Я передам ваши поздравления мужу.'], correctIndex: 1 },
  { index: 9, audioUrl: audioPath('7', 9), prompt: 'Выберите правильный ответ', options: ['С удовольствием! Я очень люблю музыку.', 'А тебе какая музыка нравится?', 'В детстве я занималась музыкой.'], correctIndex: 0 },
  { index: 10, audioUrl: audioPath('7', 10), prompt: 'Выберите правильный ответ', options: ['Нет, я не хочу сегодня в кино.', 'Да, обычно каждую субботу.', 'Мои друзья тоже любят кино.'], correctIndex: 1 },
  { index: 11, audioUrl: audioPath('7', 11), prompt: 'Выберите правильный ответ', options: ['Раньше я работала администратором в отеле.', 'С документами работать скучно.', 'Мне не нравится сейчас моя работа.'], correctIndex: 1 },
];

export const VNZH_LISTENING_TASK_EIGHT_TO_TEN: VnzhListeningTripleChoiceItem[] = [
  {
    index: 1,
    audioUrl: audioPath('8-10', 1),
    questions: [
      { prompt: 'Фестиваль «Московское лето. Цветочный джем» пройдёт', options: ['в конце июля – начале августа', 'в конце июня – начале июля', 'в августе'], correctIndex: 0 },
      { prompt: 'День мороженого пройдёт', options: ['30 июля', '21 июля', '22 июля'], correctIndex: 2 },
      { prompt: '24 июля в рамках фестиваля будет проходить день', options: ['тюльпанов', 'роз', 'гвоздик'], correctIndex: 1 },
    ],
  },
  {
    index: 2,
    audioUrl: audioPath('8-10', 2),
    questions: [
      { prompt: '«Сырные дни» начнутся в рамках фестиваля', options: ['«Золотая осень»', '«Московское лето»', '«Московская весна»'], correctIndex: 0 },
      { prompt: 'В Москву приедут производители', options: ['из многих стран мира', 'из многих стран Европы', 'из многих регионов России'], correctIndex: 2 },
      { prompt: 'Посетители выставки смогут попробовать', options: ['сырный торт', 'конфеты с сыром', 'сырные котлеты'], correctIndex: 1 },
    ],
  },
  {
    index: 3,
    audioUrl: audioPath('8-10', 3),
    questions: [
      { prompt: 'Город Архангельск знакомит нас', options: ['с культурой восточной Сибири', 'с настоящей северной культурой', 'с культурой современного города'], correctIndex: 1 },
      { prompt: 'Главная достопримечательность Архангельска –', options: ['старая крепость', 'красивый кремль', 'торговые дома'], correctIndex: 0 },
      { prompt: 'Рядом с Архангельском находится', options: ['известный природный заповедник', 'памятник архитектуры – Гостиный двор', 'зоопарк с животными из Красной книги'], correctIndex: 0 },
    ],
  },
  {
    index: 4,
    audioUrl: audioPath('8-10', 4),
    questions: [
      { prompt: 'В Казани День города празднуют', options: ['в апреле', 'в июне', 'в августе'], correctIndex: 2 },
      { prompt: 'Праздник обычно начинается', options: ['утром', 'днём', 'вечером'], correctIndex: 0 },
      { prompt: 'Конкурс частушек проходит в рамках фестиваля', options: ['«Мозаика культур»', '«Играй, гармонь!»', '«Лучшая частушка»'], correctIndex: 1 },
    ],
  },
  {
    index: 5,
    audioUrl: audioPath('8-10', 5),
    questions: [
      { prompt: 'Открытие торгового центра проходит', options: ['в установленные сроки', 'раньше срока', 'позже установленного срока'], correctIndex: 2 },
      { prompt: 'На территории торгового центра будет работать', options: ['двухуровневая парковка', 'прачечная', 'кинотеатр на три зрительных зала'], correctIndex: 0 },
      { prompt: 'В нижней части комплекса можно посетить', options: ['детскую игровую зону', 'фитнес-центр', 'студию маникюра'], correctIndex: 1 },
    ],
  },
  {
    index: 6,
    audioUrl: audioPath('8-10', 6),
    questions: [
      { prompt: 'Музей янтаря находится', options: ['в Москве', 'в Калининграде', 'в Петербурге'], correctIndex: 1 },
      { prompt: 'Большая часть коллекции музея янтаря – работы', options: ['известных старых мастеров', 'современных российских мастеров', 'европейских мастеров'], correctIndex: 1 },
      { prompt: 'В здании музея находится', options: ['библиотека', 'художественная школа', 'кафе «Янтарный дом»'], correctIndex: 0 },
    ],
  },
  {
    index: 7,
    audioUrl: audioPath('8-10', 7),
    questions: [
      { prompt: 'Северный Кавказ предлагает для туристов', options: ['все виды отдыха', 'только активный отдых', 'только отдых для пожилых людей'], correctIndex: 0 },
      { prompt: 'Больше всего туристов привлекает в этом месте', options: ['голубое море', 'красивая природа', 'зоопарк'], correctIndex: 1 },
      { prompt: 'Во время прогулок на экскурсиях в горы туристы могут увидеть', options: ['красивые дома отдыха', 'музеи под открытым небом', 'исторические музеи'], correctIndex: 1 },
    ],
  },
  {
    index: 8,
    audioUrl: audioPath('8-10', 8),
    questions: [
      { prompt: 'Праздник «Библионочь» проходит', options: ['во многих городах России', 'только в Москве и Петербурге', 'только в маленьких городах России'], correctIndex: 0 },
      { prompt: 'Во время праздника «Библионочь» можно', options: ['поучаствовать в спектакле', 'посетить экскурсию по библиотеке', 'поучаствовать в музыкальном конкурсе'], correctIndex: 1 },
      { prompt: 'Чтобы получить подарок на этом празднике, нужно', options: ['купить пять новых книг', 'посетить пять библиотек и записаться в них', 'взять в библиотеке пять книг'], correctIndex: 1 },
    ],
  },
  {
    index: 9,
    audioUrl: audioPath('8-10', 9),
    questions: [
      { prompt: 'Во время акции «Ночь в музее» в Москве все музеи работали', options: ['до двух часов ночи', 'до самого утра', 'до семи часов вечера'], correctIndex: 1 },
      { prompt: 'Во время праздника «Ночь в музее» билеты в музеи', options: ['всегда бесплатные для всех', 'продают со скидкой', 'продают как обычно'], correctIndex: 0 },
      { prompt: 'Во время этой акции в городе', options: ['ходили специальные автобусы', 'работало много такси', 'в метро люди ездили бесплатно'], correctIndex: 0 },
    ],
  },
  {
    index: 10,
    audioUrl: audioPath('8-10', 10),
    questions: [
      { prompt: 'Туристы ездят в Плёс, чтобы', options: ['познакомиться с обычной жизнью города', 'посмотреть современные здания', 'увидеть старые памятники архитектуры'], correctIndex: 0 },
      { prompt: 'За последнее время Плёс', options: ['практически не изменился', 'стал промышленным центром', 'превратился в большой город'], correctIndex: 0 },
      { prompt: 'Художник Левитан сделал Плёс известным, потому что', options: ['много рисовал эти красивые места', 'каждый год отдыхал в этом городе', 'открыл в городе картинную галерею'], correctIndex: 0 },
    ],
  },
  {
    index: 11,
    audioUrl: audioPath('8-10', 11),
    questions: [
      { prompt: 'Это объявление будет интересно для тех, кто ищет', options: ['постоянную работу', 'хорошую компанию по уборке', 'сотрудников для компании'], correctIndex: 1 },
      { prompt: 'Компания занимается', options: ['уборкой квартир', 'обучением сотрудников', 'уборкой офисов'], correctIndex: 0 },
      { prompt: 'Основное правило компании:', options: ['делать работу хорошо', 'увеличивать зарплаты', 'сохранить низкие цены'], correctIndex: 0 },
    ],
  },
];
