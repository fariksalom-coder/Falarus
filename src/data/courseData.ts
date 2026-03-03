export const courseData = [
  {
    level: 'A0',
    modules: [
      {
        name: 'Alfavit va tovushlar',
        lessons: [
          {
            title: 'Rus alifbosi va talaffuz',
            content_uz: 'Rus tili alifbosi 33 ta harfdan iborat. Ulardan 10 tasi unli, 21 tasi undosh va 2 tasi belgi (ь, ъ). Har bir harfning o‘ziga xos talaffuzi bor.',
            content_ru: 'А, Б, В, Г, Д, Е, Ё, Ж, З, И, Й, К, Л, М, Н, О, П, Р, С, Т, У, Ф, Х, Ц, Ч, Ш, Щ, Ъ, Ы, Ь, Э, Ю, Я.',
            exercises: [
              {
                type: 'choice',
                question_uz: 'Rus alifbosida nechta harf bor?',
                options: ['30', '33', '26'],
                correct_answer: '33'
              },
              {
                type: 'reorder',
                question_uz: 'Harflarni alifbo tartibida joylashtiring: B, A, V',
                options: ['А', 'Б', 'В'],
                correct_answer: 'А, Б, В'
              }
            ]
          }
        ]
      },
      {
        name: 'Birinchi so‘zlar',
        lessons: [
          {
            title: 'Salomlashish va tanishuv',
            content_uz: 'Salomlashish uchun eng ko‘p ishlatiladigan so‘zlar: "Привет" (yaqinlar uchun) va "Здравствуйте" (rasmiy). Tanishishda "Как тебя зовут?" (Isming nima?) deb so‘raladi.',
            content_ru: 'Привет! Меня зовут Антон. А тебя?',
            exercises: [
              {
                type: 'choice',
                question_uz: '"Salom" (rasmiy) qaysi biri?',
                options: ['Привет', 'Здравствуйте', 'Пока'],
                correct_answer: 'Здравствуйте'
              },
              {
                type: 'fill',
                question_uz: 'Bo‘sh joyni to‘ldiring: Как ... зовут?',
                options: ['тебя', 'меня', 'его'],
                correct_answer: 'тебя'
              }
            ]
          }
        ]
      },
      {
        name: 'Kishilik olmoshlari',
        lessons: [
          {
            title: 'Men, Sen, U...',
            content_uz: 'Rus tilida kishilik olmoshlari: Я (Men), Ты (Sen), Он (U - o‘g‘il), Она (U - qiz), Оно (U - o‘rta), Мы (Biz), Вы (Siz), Они (Ular).',
            content_ru: 'Я, Ты, Он, Она, Оно, Мы, Вы, Они.',
            exercises: [
              {
                type: 'choice',
                question_uz: '"Biz" so‘zining ruscha tarjimasi nima?',
                options: ['Я', 'Мы', 'Вы'],
                correct_answer: 'Мы'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    level: 'A1',
    modules: [
      {
        name: 'Ot jinslari',
        lessons: [
          {
            title: 'Muzskoy, Jenskiy va Sredniy rod',
            content_uz: 'Rus tilida otlar uchta jinsga bo‘linadi: Muzskoy (erkak), Jenskiy (ayol) va Sredniy (o‘rta). Muzskoy odatda undosh bilan, Jenskiy "а" yoki "я" bilan, Sredniy esa "о" yoki "е" bilan tugaydi.',
            content_ru: 'Дом (м.р.), Мама (ж.р.), Окно (ср.р.)',
            exercises: [
              {
                type: 'choice',
                question_uz: '"Книга" so‘zi qaysi jinsga tegishli?',
                options: ['Muzskoy', 'Jenskiy', 'Sredniy'],
                correct_answer: 'Jenskiy'
              }
            ]
          }
        ]
      },
      {
        name: 'Birlik va ko‘plik',
        lessons: [
          {
            title: 'Ko‘plik shaklini yasash',
            content_uz: 'Otlar ko‘plikda odatda "-ы" yoki "-и" qo‘shimchalarini oladi. Masalan: Стол -> Столы, Книга -> Книги.',
            content_ru: 'Один стол - dva stola - mnogo stolov.',
            exercises: [
              {
                type: 'choice',
                question_uz: '"Мама" so‘zining ko‘plik shakli nima?',
                options: ['Мамы', 'Мами', 'Мамо'],
                correct_answer: 'Мамы'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    level: 'A2',
    modules: [
      {
        name: 'O‘tgan zamon',
        lessons: [
          {
            title: 'Fe’llarning o‘tgan zamon shakli',
            content_uz: 'O‘tgan zamonni yasash uchun fe’lning infinitiv shaklidagi "-ть" qo‘shimchasi o‘rniga jinsga qarab "-л", "-ла", "-ло" yoki "-li" qo‘shiladi.',
            content_ru: 'Я читал (м.р.), Я читала (ж.р.), Мы читали (мн.ч.)',
            exercises: [
              {
                type: 'fill',
                question_uz: 'Ayol kishi uchun "o‘qidi" so‘zini yozing: Она чита...',
                options: ['л', 'ла', 'ли'],
                correct_answer: 'ла'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    level: 'B1',
    modules: [
      {
        name: 'Fe’l turi',
        lessons: [
          {
            title: 'Nisbiy va tugallangan fe’llar',
            content_uz: 'Rus tilida fe’llar ikki turga bo‘linadi: Nesovershennyy (davomli) va Sovershennyy (tugallangan). Masalan: Читать (o‘qimoq) - Прочитать (o‘qib bo‘lmoq).',
            content_ru: 'Я читал книгу 2 часа. Я прочитал книгу за 2 часа.',
            exercises: [
              {
                type: 'choice',
                question_uz: 'Qaysi fe’l tugallangan harakatni bildiradi?',
                options: ['Писать', 'Написать'],
                correct_answer: 'Написать'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    level: 'B2',
    modules: [
      {
        name: 'Nutq uslublari',
        lessons: [
          {
            title: 'Rasmiy va norasmiy nutq',
            content_uz: 'B2 darajasida siz turli vaziyatlarda nutq uslubini o‘zgartira olishingiz kerak. Rasmiy hujjatlar va do‘stona suhbatlar o‘rtasidagi farqni o‘rganamiz.',
            content_ru: 'Уважаемые коллеги! Привет, ребята!',
            exercises: [
              {
                type: 'choice',
                question_uz: 'Qaysi ibora rasmiy hisoblanadi?',
                options: ['Как дела?', 'Позвольте поприветствовать вас'],
                correct_answer: 'Позвольте поприветствовать вас'
              }
            ]
          }
        ]
      }
    ]
  }
];
