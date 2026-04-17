export type VocabularyTextWord = {
  key: string;
  translationUz: string;
  audioRu?: string;
};

export type VocabularyText = {
  id: string;
  title: string;
  level: 'A1' | 'A2' | 'B1';
  description: string;
  contentRu: string;
  dictionary: VocabularyTextWord[];
};

const PRITCHA_CONTENT = `Притча о том, как обстоятельства меняют людей

Однажды к отцу пришла дочь, молодая женщина, и с грустью сказала:
— Папа, я так устала от всего, у меня постоянные трудности на работе и в личной жизни, уже просто нет сил... Как справляться со всем этим?

Отец отвечает:
— Давай я тебе покажу.

Он ставит на плиту 3 кастрюли с водой и приносит морковь, яйцо и кофе. Опускает каждый ингредиент в отдельную кастрюлю. Через несколько минут выключает плиту и спрашивает дочь:
— Что стало с ними?

— Ну, морковь и яйцо сварились, а кофе растворился, — отвечает девушка.

— Правильно, — отвечает отец, — но если мы посмотрим глубже, то окажется что морковь, которая была твердой, после кипятка стала мягкой и податливой. Яйцо, которое раньше было хрупким и жидким, стало твердым. Внешне они остались такими же, но внутренне изменились под воздействием одинаковой враждебной среды — кипятка.

То же происходит и с людьми — сильные внешне люди могут расклеиться и стать слабаками там, где хрупкие и нежные лишь затвердеют и окрепнут...

— А как же кофе? — удивленно спросила дочь.

— О, кофе — это самое интересное. Он полностью растворился в агрессивной среде и изменил ее — превратил кипяток в чудесный ароматный напиток. Есть люди, которых не могут изменить обстоятельства — они сами изменяют их и превращают в нечто новое, извлекая для себя пользу и знания из ситуации. Кем стать в трудной ситуации — выбор каждого.`;

export const VOCABULARY_TEXTS: VocabularyText[] = [
  {
    id: 'pritcha-obstoyatelstva',
    title: 'Притча про обстоятельства',
    level: 'B1',
    description: 'Qiyin vaziyatlar odamni qanday o‘zgartirishi haqida matn.',
    contentRu: PRITCHA_CONTENT,
    dictionary: [
      // Verbs
      { key: 'быть', translationUz: "bo'lmoq" },
      { key: 'прийти', translationUz: 'kelmoq' },
      { key: 'пришла', translationUz: 'kelmoq' },
      { key: 'сказать', translationUz: 'aytmoq' },
      { key: 'сказала', translationUz: 'aytmoq' },
      { key: 'устать', translationUz: 'charchamoq' },
      { key: 'устала', translationUz: 'charchamoq' },
      { key: 'иметь', translationUz: "ega bo'lmoq" },
      { key: 'справляться', translationUz: 'uddalamoq' },
      { key: 'отвечать', translationUz: 'javob bermoq' },
      { key: 'отвечает', translationUz: 'javob bermoq' },
      { key: 'показать', translationUz: "ko'rsatmoq" },
      { key: 'покажу', translationUz: "ko'rsatmoq" },
      { key: 'ставить', translationUz: "qo'ymoq" },
      { key: 'ставит', translationUz: "qo'ymoq" },
      { key: 'приносить', translationUz: 'olib kelmoq' },
      { key: 'опускать', translationUz: 'tushirmoq' },
      { key: 'опускает', translationUz: 'tushirmoq' },
      { key: 'выключать', translationUz: "o'chirmoq" },
      { key: 'выключает', translationUz: "o'chirmoq" },
      { key: 'спрашивать', translationUz: "so'ramoq" },
      { key: 'спрашивает', translationUz: "so'ramoq" },
      { key: 'спросила', translationUz: "so'ramoq" },
      { key: 'стать', translationUz: "bo'lib qolmoq" },
      { key: 'стало', translationUz: "bo'lib qolmoq" },
      { key: 'свариться', translationUz: 'pishmoq' },
      { key: 'сварились', translationUz: 'pishmoq' },
      { key: 'раствориться', translationUz: 'erimoq' },
      { key: 'растворился', translationUz: 'erimoq' },
      { key: 'посмотреть', translationUz: 'qaramoq' },
      { key: 'посмотрим', translationUz: 'qaramoq' },
      { key: 'оказаться', translationUz: "ma'lum bo'lmoq" },
      { key: 'окажется', translationUz: "ma'lum bo'lmoq" },
      { key: 'остаться', translationUz: 'qolmoq' },
      { key: 'остались', translationUz: 'qolmoq' },
      { key: 'измениться', translationUz: "o'zgaramoq" },
      { key: 'изменились', translationUz: "o'zgaramoq" },
      { key: 'происходить', translationUz: "sodir bo'lmoq" },
      { key: 'происходит', translationUz: "sodir bo'lmoq" },
      { key: 'мочь', translationUz: 'qila olmoq' },
      { key: 'могут', translationUz: 'qila olmoq' },
      { key: 'расклеиться', translationUz: 'sinmoq (ruhiy jihatdan)' },
      { key: 'затвердеть', translationUz: 'qattiqlashmoq' },
      { key: 'затвердеют', translationUz: 'qattiqlashmoq' },
      { key: 'окрепнуть', translationUz: 'mustahkamlanmoq' },
      { key: 'окрепнут', translationUz: 'mustahkamlanmoq' },
      { key: 'удивиться', translationUz: "hayron bo'lmoq" },
      { key: 'удивленно', translationUz: "hayron bo'lib" },
      { key: 'превратить', translationUz: 'aylantirmoq' },
      { key: 'превратил', translationUz: 'aylantirmoq' },
      { key: 'превращают', translationUz: 'aylantirmoq' },
      { key: 'извлекать', translationUz: 'ajratib olmoq' },
      { key: 'извлекая', translationUz: 'ajratib olib' },
      // Nouns
      { key: 'притча', translationUz: 'hikoya' },
      { key: 'обстоятельства', translationUz: 'holatlar' },
      { key: 'обстоятельство', translationUz: 'holat' },
      { key: 'человек', translationUz: 'inson' },
      { key: 'людей', translationUz: 'odamlar' },
      { key: 'отец', translationUz: 'ota' },
      { key: 'дочь', translationUz: 'qiz' },
      { key: 'женщина', translationUz: 'ayol' },
      { key: 'грустью', translationUz: "qayg'u bilan" },
      { key: 'папа', translationUz: 'dada' },
      { key: 'трудности', translationUz: 'qiyinchiliklar' },
      { key: 'работе', translationUz: 'ishda' },
      { key: 'жизни', translationUz: 'hayotda' },
      { key: 'сил', translationUz: 'kuch' },
      { key: 'плита', translationUz: 'plita' },
      { key: 'плиту', translationUz: 'plita' },
      { key: 'кастрюли', translationUz: 'qozonlar' },
      { key: 'кастрюлю', translationUz: 'qozon' },
      { key: 'вода', translationUz: 'suv' },
      { key: 'водой', translationUz: 'suv bilan' },
      { key: 'морковь', translationUz: 'sabzi' },
      { key: 'яйцо', translationUz: 'tuxum' },
      { key: 'кофе', translationUz: 'qahva' },
      { key: 'ингредиент', translationUz: 'mahsulot' },
      { key: 'минут', translationUz: 'daqiqa' },
      { key: 'девушка', translationUz: 'qiz' },
      { key: 'кипяток', translationUz: 'qaynoq suv' },
      { key: 'среды', translationUz: 'muhit' },
      { key: 'среде', translationUz: 'muhitda' },
      { key: 'воздействием', translationUz: "ta'sir ostida" },
      { key: 'люди', translationUz: 'odamlar' },
      { key: 'слабаками', translationUz: 'zaif odamlar' },
      { key: 'ситуации', translationUz: 'vaziyat' },
      { key: 'выбор', translationUz: 'tanlov' },
      { key: 'напиток', translationUz: 'ichimlik' },
      { key: 'знания', translationUz: 'bilimlar' },
      { key: 'пользу', translationUz: 'foyda' },
      // Adjectives
      { key: 'молодая', translationUz: 'yosh' },
      { key: 'постоянные', translationUz: 'doimiy' },
      { key: 'личной', translationUz: 'shaxsiy' },
      { key: 'отдельную', translationUz: 'alohida' },
      { key: 'твердой', translationUz: 'qattiq' },
      { key: 'мягкой', translationUz: 'yumshoq' },
      { key: 'податливой', translationUz: 'moslashuvchan' },
      { key: 'хрупким', translationUz: "mo'rt" },
      { key: 'жидким', translationUz: 'suyuq' },
      { key: 'одинаковой', translationUz: 'bir xil' },
      { key: 'враждебной', translationUz: 'salbiy' },
      { key: 'сильные', translationUz: 'kuchli' },
      { key: 'нежные', translationUz: 'nozik' },
      { key: 'агрессивной', translationUz: 'agressiv' },
      { key: 'ароматный', translationUz: "xushbo'y" },
      { key: 'чудесный', translationUz: 'ajoyib' },
      { key: 'трудной', translationUz: 'qiyin' },
    ],
  },
];
