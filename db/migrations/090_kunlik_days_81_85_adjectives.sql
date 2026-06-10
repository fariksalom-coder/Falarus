-- Kunlik kun 81–85: прилагательные (род, множественное число, И.п./В.п.).

DELETE FROM public.daily_practice_prompts WHERE day_number >= 81 AND day_number <= 85;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number >= 81 AND day_number <= 85
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number >= 81 AND day_number <= 85;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number >= 81 AND day_number <= 85;

DELETE FROM public.daily_vocab_words WHERE day_number >= 81 AND day_number <= 85;

DELETE FROM public.daily_grammar_matches WHERE day_number >= 81 AND day_number <= 85;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number >= 81 AND day_number <= 85;
DELETE FROM public.daily_grammar_mcqs WHERE day_number >= 81 AND day_number <= 85;
DELETE FROM public.daily_grammar_topics WHERE day_number >= 81 AND day_number <= 85;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  81,
  'Прилагательные: мужской род',
  $theory$
**Прилагательное** ot bilan **род**, **число**, **падеж** bo‘yicha mos keladi. Hozir **именительный падеж** (Кто? Что?).

**Мужской род:** *-ый, -ий, -ой* — *новый дом*, *синий карандаш*, *большой город*.

**Tartib:** odatda sifat **otdan oldin** keladi: *красивый город*.

**Diqqat:** keyingi kunlarda ayol va o‘rta rod ham qo‘shiladi.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (81, 'rule', 0, '«Yangi uy» rus tilida?', 'новая дом', 'новый дом', 'новое дом', 'новые дом', 1),
  (81, 'rule', 1, '«Katta shahar» – qaysi variant?', 'большая город', 'большое город', 'большой город', 'большие город', 2),
  (81, 'rule', 2, 'Qaysi gapda to‘g‘ri? (Yaxshi do‘st)', 'хорошая друг', 'хороший друг', 'хорошее друг', 'хорошие друг', 1),
  (81, 'rule', 3, '«Rus tili» – qaysi variant?', 'русский язык', 'русская язык', 'русское язык', 'русские язык', 0),
  (81, 'rule', 4, 'Qaysi sifat erkak rodga mos? (карандаш)', 'красная', 'красный', 'красное', 'красные', 1),
  (81, 'rule', 5, '«Eski uy» – qaysi variant?', 'старая дом', 'старый дом', 'старое дом', 'старые дом', 1),
  (81, 'rule', 6, 'Qaysi gapda «новый» to‘g‘ri ishlatilgan?', 'новый ученик', 'новый ученица', 'новое ученик', 'новые ученик', 0),
  (81, 'rule', 7, '«Kichik bola» – qaysi variant?', 'маленькая ребёнок', 'маленький ребёнок', 'маленькое ребёнок', 'маленькие ребёнок', 1),
  (81, 'rule', 8, 'Qaysi gapda «интересный» to‘g‘ri? (qiziqarli film)', 'интересная фильм', 'интересный фильм', 'интересное фильм', 'интересные фильм', 1),
  (81, 'rule', 9, '«Это мой дом» — sifat tartibi to‘g‘ri?', 'красивый мой дом', 'моя красивый дом', 'мой красивый дом', 'моё красивый дом', 2);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (81, 0, 0, 'yangi uy', 'новый дом'),
  (81, 0, 1, 'katta shahar', 'большой город'),
  (81, 0, 2, 'ko''k qalam', 'синий карандаш'),
  (81, 0, 3, 'yaxshi do''st', 'хороший друг'),
  (81, 0, 4, 'eski shahar', 'старый город'),
  (81, 0, 5, 'kichik bola', 'маленький ребёнок'),
  (81, 0, 6, 'qiziqarli film', 'интересный фильм'),
  (81, 0, 7, 'rus tili', 'русский язык'),
  (81, 0, 8, 'oq varaq (oq qog''oz)', 'белый лист'),
  (81, 0, 9, 'yoqimli hid', 'приятный запах');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (81, 0, 'uz', '(это, новый, дом)', ARRAY['Это', 'новый', 'дом.', 'новая'], 'Это новый дом.'),
  (81, 1, 'uz', '(мой, лучший, друг, живёт, в, Москва)', ARRAY['Мой', 'лучший', 'друг', 'живёт', 'в', 'Москве.', 'Москва'], 'Мой лучший друг живёт в Москве.'),
  (81, 2, 'uz', '(большой, город, нравится, мне)', ARRAY['Большой', 'город', 'нравится', 'мне.'], 'Большой город нравится мне.'),
  (81, 3, 'uz', '(русский, язык, трудный, но, интересный)', ARRAY['Русский', 'язык', 'трудный,', 'но', 'интересный.'], 'Русский язык трудный, но интересный.'),
  (81, 4, 'uz', '(на, стол, лежит, синий, карандаш)', ARRAY['На', 'столе', 'лежит', 'синий', 'карандаш.'], 'На столе лежит синий карандаш.'),
  (81, 5, 'uz', '(хороший, человек, всегда, поможет)', ARRAY['Хороший', 'человек', 'всегда', 'поможет.'], 'Хороший человек всегда поможет.'),
  (81, 6, 'uz', '(маленький, ребёнок, спит, в, кроватка)', ARRAY['Маленький', 'ребёнок', 'спит', 'в', 'кроватке.'], 'Маленький ребёнок спит в кроватке.'),
  (81, 7, 'uz', '(это, мой, старый, друг, из, школа)', ARRAY['Это', 'мой', 'старый', 'друг', 'из', 'школы.'], 'Это мой старый друг из школы.'),
  (81, 8, 'uz', '(какой, фильм, ты, смотрел, вчера)', ARRAY['Какой', 'фильм', 'ты', 'смотрел', 'вчера?'], 'Какой фильм ты смотрел вчера?'),
  (81, 9, 'uz', '(интересный, рассказ, я, прочитал, за, час)', ARRAY['Интересный', 'рассказ', 'я', 'прочитал', 'за', 'час.'], 'Интересный рассказ я прочитал за час.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (81, 0, 'Yangi', 'Новый'),
  (81, 1, 'Katta', 'Большой'),
  (81, 2, 'Kichik', 'Маленький'),
  (81, 3, 'Eski', 'Старый'),
  (81, 4, 'Yaxshi', 'Хороший'),
  (81, 5, 'Qiziqarli', 'Интересный'),
  (81, 6, 'Rus', 'Русский'),
  (81, 7, 'Ko''k (rang)', 'Синий'),
  (81, 8, 'Oq', 'Белый'),
  (81, 9, 'Qora', 'Чёрный'),
  (81, 10, 'Qizil', 'Красный'),
  (81, 11, 'Sariq', 'Жёлтый'),
  (81, 12, 'Yashil', 'Зелёный'),
  (81, 13, 'To''q', 'Тёмный'),
  (81, 14, 'Och', 'Светлый');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  81,
  'Мой дом',
  $body$
У меня есть большой светлый дом. Он находится в новом районе нашего города.

Перед домом растёт красивый старый дуб. Рядом с домом есть маленький сквер.

В моей комнате стоит письменный стол. Это очень удобный стол: на нём лежат тетради и любимые книги.

На стене висит интересный календарь с яркими фотографиями.

Мой друг подарил мне красивый аквариум с золотыми рыбками. По вечерам я люблю смотреть на них и отдыхать после школы.

Мой папа — высокий и сильный человек. Он всегда носит строгий костюм и много работает.

Моя мама — добрая и заботливая женщина. Она готовит вкусный обед и помогает мне с уроками.

Я очень люблю своих родителей и свой дом: здесь тепло, светло и спокойно.
$body$,
  'kunlik-oqish-81'
);

-- ========== Kun 82 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  82,
  'Прилагательные: женский род',
  $theory$
**Женский род:** *-ая, -яя* (+ qoida *г, к, х…*: *хорошая песня*).

**Savol:** *какая?*

**Diqqat:** *большой / большая / большое* — ot rodiga qarab.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (82, 'rule', 0, '«Yangi kitob» – qaysi variant?', 'новый книга', 'новая книга', 'новое книга', 'новые книга', 1),
  (82, 'rule', 1, '«Katta maydon» – qaysi variant?', 'большой площадь', 'большая площадь', 'большое площадь', 'большие площадь', 1),
  (82, 'rule', 2, 'Qaysi gapda to‘g‘ri? (Chiroyli qiz)', 'красивый девушка', 'красивая девушка', 'красивое девушка', 'красивые девушка', 1),
  (82, 'rule', 3, '«Qizil ruchka»', 'красный ручка', 'красная ручка', 'красное ручка', 'красные ручка', 1),
  (82, 'rule', 4, 'Qaysi gapda to‘g‘ri? (ko‘cha – улица)', 'красивое улица', 'красивый улица', 'красивые улица', 'красивая улица', 3),
  (82, 'rule', 5, '«Yaxshi qo‘shiq» – qaysi variant?', 'хороший песня', 'хорошая песня', 'хорошее песня', 'хорошие песня', 1),
  (82, 'rule', 6, 'Qaysi gapda «старая» to‘g‘ri?', 'старая дом', 'старая книга', 'старый книга', 'старое книга', 1),
  (82, 'rule', 7, '«Rus adabiyoti» – qaysi variant?', 'русский литература', 'русская литература', 'русское литература', 'русские литература', 1),
  (82, 'rule', 8, 'Qaysi gapda «интересная» to‘g‘ri? (gazeta)', 'интересный газета', 'интересная газета', 'интересное газета', 'интересные газета', 1),
  (82, 'rule', 9, '«Ko‘k ruchka» – qaysi variant?', 'синий ручка', 'синяя ручка', 'синее ручка', 'синие ручка', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (82, 0, 0, 'yangi kitob', 'новая книга'),
  (82, 0, 1, 'katta maydon', 'большая площадь'),
  (82, 0, 2, 'chiroyli qiz', 'красивая девушка'),
  (82, 0, 3, 'yaxshi qo''shiq', 'хорошая песня'),
  (82, 0, 4, 'rus adabiyoti', 'русская литература'),
  (82, 0, 5, 'ko''k ruchka', 'синяя ручка'),
  (82, 0, 6, 'qizil atirgul', 'красная роза'),
  (82, 0, 7, 'eski ko''cha', 'старая улица'),
  (82, 0, 8, 'issiq suv', 'горячая вода'),
  (82, 0, 9, 'qisqa masofa', 'короткая дистанция');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (82, 0, 'uz', '(это, интересная, книга, о, история)', ARRAY['Это', 'интересная', 'книга', 'об', 'истории.'], 'Это интересная книга об истории.'),
  (82, 1, 'uz', '(на, улица, стоит, красивая, девушка)', ARRAY['На', 'улице', 'стоит', 'красивая', 'девушка.'], 'На улице стоит красивая девушка.'),
  (82, 2, 'uz', '(моя, бабушка, испекла, вкусный, пирог)', ARRAY['Моя', 'бабушка', 'испекла', 'вкусный', 'пирог.'], 'Моя бабушка испекла вкусный пирог.'),
  (82, 3, 'uz', '(какая, сегодня, погода)', ARRAY['Какая', 'сегодня', 'погода?'], 'Какая сегодня погода?'),
  (82, 4, 'uz', '(в, нашей, школе, учится, талантливая, девочка)', ARRAY['В', 'нашей', 'школе', 'учится', 'талантливая', 'девочка.'], 'В нашей школе учится талантливая девочка.'),
  (82, 5, 'uz', '(у, меня, есть, новая, сумка)', ARRAY['У', 'меня', 'есть', 'новая', 'сумка.'], 'У меня есть новая сумка.'),
  (82, 6, 'uz', '(эта, задача, очень, трудная)', ARRAY['Эта', 'задача', 'очень', 'трудная.'], 'Эта задача очень трудная.'),
  (82, 7, 'uz', '(вчера, мы, слушали, хорошую, музыка)', ARRAY['Вчера', 'мы', 'слушали', 'хорошую', 'музыку.'], 'Вчера мы слушали хорошую музыку.'),
  (82, 8, 'uz', '(в, комнате, висит, красивая, картина)', ARRAY['В', 'комнате', 'висит', 'красивая', 'картина.'], 'В комнате висит красивая картина.'),
  (82, 9, 'uz', '(у, неё, красивая, улыбка)', ARRAY['У', 'неё', 'красивая', 'улыбка.'], 'У неё красивая улыбка.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (82, 0, 'Yangi (ayol)', 'Новая'),
  (82, 1, 'Katta (ayol)', 'Большая'),
  (82, 2, 'Kichik (ayol)', 'Маленькая'),
  (82, 3, 'Eski (ayol)', 'Старая'),
  (82, 4, 'Yaxshi (ayol)', 'Хорошая'),
  (82, 5, 'Qiziqarli (ayol)', 'Интересная'),
  (82, 6, 'Chiroyli (ayol)', 'Красивая'),
  (82, 7, 'Ko''k (ayol)', 'Синяя'),
  (82, 8, 'Qizil (ayol)', 'Красная'),
  (82, 9, 'Oq (ayol)', 'Белая'),
  (82, 10, 'Qora (ayol)', 'Чёрная'),
  (82, 11, 'Toza', 'Чистая'),
  (82, 12, 'Issiq', 'Тёплая'),
  (82, 13, 'Sovuq', 'Холодная'),
  (82, 14, 'Qisqa', 'Короткая');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  82,
  'Моя школа',
  $body$
Моя школа — это большое светлое здание. Оно расположено недалеко от центра города.

В нашей школе есть современная библиотека. Там можно взять интересную книгу и почитать в тишине.

На первом этаже находится большая столовая. Там всегда вкусная еда и чистые столы.

Моя любимая учительница — Анна Петровна. Она очень добрая и умная. Я люблю её уроки и её спокойный голос.

В нашем классе учится новая девочка из Франции. Её зовут Софи. Она очень приветливая и общительная.

Все ребята в классе рады новой подруге и помогают ей учить русский язык.

После уроков мы часто гуляем во дворе и разговариваем о музыке и фильмах.
$body$,
  'kunlik-oqish-82'
);

-- ========== Kun 83 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  83,
  'Прилагательные: средний род',
  $theory$
**Средний род:** *-ое, -ее* — *новое окно*, *синее море*.

**Savol:** *какое?*

**Muhim:** *большое здание*, *хорошее место*.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (83, 'rule', 0, '«Yangi deraza» – qaysi variant?', 'новый окно', 'новая окно', 'новое окно', 'новые окно', 2),
  (83, 'rule', 1, '«Katta bino» – qaysi variant?', 'большой здание', 'большая здание', 'большое здание', 'большие здание', 2),
  (83, 'rule', 2, 'Qaysi gapda to‘g‘ri? (платье)', 'красивый платье', 'красивая платье', 'красивое платье', 'красивые платье', 2),
  (83, 'rule', 3, '«Qiziqarli xat» – qaysi variant?', 'интересный письмо', 'интересная письмо', 'интересное письмо', 'интересные письмо', 2),
  (83, 'rule', 4, 'Qaysi gapda to‘g‘ri? (чудо)', 'настоящее чудо', 'настоящая чудо', 'настоящий чудо', 'настоящие чудо', 0),
  (83, 'rule', 5, '«Ko‘k dengiz» – qaysi variant?', 'синий море', 'синяя море', 'синее море', 'синие море', 2),
  (83, 'rule', 6, 'Qaysi gapda «интересное» to‘g‘ri?', 'интересное задание', 'интересное задача', 'интересное книга', 'интересное фильм', 0),
  (83, 'rule', 7, '«Yaxshi joy» – qaysi variant?', 'хороший место', 'хорошая место', 'хорошее место', 'хорошие место', 2),
  (83, 'rule', 8, 'Qaysi gapda «новое» to‘g‘ri?', 'новое событие', 'новое газета', 'новое дом', 'новое девушка', 0),
  (83, 'rule', 9, '«Har kunlik mashg‘ulot»', 'ежедневный занятие', 'ежедневная занятие', 'ежедневное занятие', 'ежедневные занятие', 2);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (83, 0, 0, 'yangi deraza', 'новое окно'),
  (83, 0, 1, 'katta bino', 'большое здание'),
  (83, 0, 2, 'chiroyli ko''ylak', 'красивое платье'),
  (83, 0, 3, 'qiziqarli xat', 'интересное письмо'),
  (83, 0, 4, 'yaxshi joy', 'хорошее место'),
  (83, 0, 5, 'rus so‘zi', 'русское слово'),
  (83, 0, 6, 'ko''k dengiz', 'синее море'),
  (83, 0, 7, 'toza dala', 'чистое поле'),
  (83, 0, 8, 'issiq sut', 'тёплое молоко'),
  (83, 0, 9, 'sovuq ertalab', 'холодное утро');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (83, 0, 'uz', '(это, новое, платье, очень, красивое)', ARRAY['Это', 'новое', 'платье', 'очень', 'красивое.'], 'Это новое платье очень красивое.'),
  (83, 1, 'uz', '(в, небо, плывут, белые, облака)', ARRAY['В', 'небе', 'плывут', 'белые', 'облака.'], 'В небе плывут белые облака.'),
  (83, 2, 'uz', '(это, задание, слишком, трудное)', ARRAY['Это', 'задание', 'слишком', 'трудное.'], 'Это задание слишком трудное.'),
  (83, 3, 'uz', '(летом, море, тёплое, и, ласковое)', ARRAY['Летом', 'море', 'тёплое', 'и', 'ласковое.'], 'Летом море тёплое и ласковое.'),
  (83, 4, 'uz', '(на, полке, лежит, чьё-то, письмо)', ARRAY['На', 'полке', 'лежит', 'чьё-то', 'письмо.'], 'На полке лежит чьё-то письмо.'),
  (83, 5, 'uz', '(наше, утро, началось, с, зарядки)', ARRAY['Наше', 'утро', 'началось', 'с', 'зарядки.'], 'Наше утро началось с зарядки.'),
  (83, 6, 'uz', '(я, люблю, холодное, молоко)', ARRAY['Я', 'люблю', 'холодное', 'молоко.'], 'Я люблю холодное молоко.'),
  (83, 7, 'uz', '(это, известное, здание, находится, в, центре)', ARRAY['Это', 'известное', 'здание', 'находится', 'в', 'центре.'], 'Это известное здание находится в центре.'),
  (83, 8, 'uz', '(круглое, зеркало, висит, над, камином)', ARRAY['Круглое', 'зеркало', 'висит', 'над', 'камином.'], 'Круглое зеркало висит над камином.'),
  (83, 9, 'uz', '(дальнее, путешествие, утомило, нас)', ARRAY['Дальнее', 'путешествие', 'утомило', 'нас.'], 'Дальнее путешествие утомило нас.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (83, 0, 'Yangi (o‘rta)', 'Новое'),
  (83, 1, 'Katta (o‘rta)', 'Большое'),
  (83, 2, 'Kichik (o‘rta)', 'Маленькое'),
  (83, 3, 'Chiroyli (o‘rta)', 'Красивое'),
  (83, 4, 'Qiziqarli (o‘rta)', 'Интересное'),
  (83, 5, 'Yaxshi (o‘rta)', 'Хорошее'),
  (83, 6, 'Toza (o‘rta)', 'Чистое'),
  (83, 7, 'Issiq (o‘rta)', 'Тёплое'),
  (83, 8, 'Sovuq (o‘rta)', 'Холодное'),
  (83, 9, 'Mazali (o‘rta)', 'Вкусное'),
  (83, 10, 'Xushbo‘y', 'Ароматное'),
  (83, 11, 'Tinch', 'Тихое'),
  (83, 12, 'Qulay', 'Уютное'),
  (83, 13, 'Muhim', 'Важное'),
  (83, 14, 'Kechki', 'Вечернее');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  83,
  'Моё любимое место',
  $body$
Моё любимое место — это маленькое уютное кафе неподалёку от дома.

Оно находится в старом центре города. Окна кафе выходят на тихую улочку.

Внутри всегда чисто и светло. Я заказываю там ароматный кофе и вкусное пирожное.

Это маленькое счастье — просто посидеть с чашкой кофе и посмотреть на людей.

Летом я люблю сидеть на открытой веранде. Столики сделаны из настоящего дерева.

Каждое воскресенье я прихожу сюда с хорошим настроением и читаю книгу или готовлюсь к понедельнику.

Это место дарит мне спокойствие и радость.
$body$,
  'kunlik-oqish-83'
);

-- ========== Kun 84 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  84,
  'Прилагательные: множественное число',
  $theory$
**Множественное число:** *-ые / -ие* (sifat) + ot **ko‘plikda**.

**Qoida:** *-ый/-ой/-ая/-ое* → ko‘plik *-ые*; *-ий/-яя/-ее* → *-ие*.

**Misol:** *новые дома*, *новые книги*, *интересные места*.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (84, 'rule', 0, '«Yangi uylar» – qaysi variant?', 'новый дома', 'новая дома', 'новое дома', 'новые дома', 3),
  (84, 'rule', 1, '«Katta shaharlar» – qaysi variant?', 'большой города', 'большая города', 'большое города', 'большие города', 3),
  (84, 'rule', 2, 'Qaysi gapda to‘g‘ri? (Yaxshi do‘stlar)', 'хороший друзья', 'хорошая друзья', 'хорошее друзья', 'хорошие друзья', 3),
  (84, 'rule', 3, '«Chiroyli qizlar» – qaysi variant?', 'красивый девушки', 'красивая девушки', 'красивое девушки', 'красивые девушки', 3),
  (84, 'rule', 4, '«Ko‘k qalamlar» – qaysi variant?', 'синий карандаши', 'синяя карандаши', 'синее карандаши', 'синие карандаши', 3),
  (84, 'rule', 5, 'Qaysi gapda «новые» to‘g‘ri?', 'новые ученики', 'новый ученики', 'новая ученики', 'новое ученики', 0),
  (84, 'rule', 6, '«Kichik uylar» – qaysi variant?', 'маленький дома', 'маленькая дома', 'маленькое дома', 'маленькие дома', 3),
  (84, 'rule', 7, 'Qaysi gapda «интересные» to‘g‘ri?', 'интересные книги', 'интересный книги', 'интересная книги', 'интересное книги', 0),
  (84, 'rule', 8, '«Eski binolar» – qaysi variant?', 'старый здания', 'старая здания', 'старое здания', 'старые здания', 3),
  (84, 'rule', 9, 'Qaysi gapda «большие» to‘g‘ri?', 'большие города', 'большой города', 'большая города', 'большое города', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (84, 0, 0, 'yangi uylar', 'новые дома'),
  (84, 0, 1, 'katta shaharlar', 'большие города'),
  (84, 0, 2, 'chiroyli gullar', 'красивые цветы'),
  (84, 0, 3, 'qiziqarli kitoblar', 'интересные книги'),
  (84, 0, 4, 'eski maktablar', 'старые школы'),
  (84, 0, 5, 'rus odamlari', 'русские люди'),
  (84, 0, 6, 'baland binolar', 'высокие здания'),
  (84, 0, 7, 'yaxshi talabalar', 'хорошие студенты'),
  (84, 0, 8, 'issiq kunlar', 'тёплые дни'),
  (84, 0, 9, 'sovuq kechalar', 'холодные ночи');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (84, 0, 'uz', '(на, улице, стоят, высокие, здания)', ARRAY['На', 'улице', 'стоят', 'высокие', 'здания.'], 'На улице стоят высокие здания.'),
  (84, 1, 'uz', '(в, библиотеке, есть, интересные, книги)', ARRAY['В', 'библиотеке', 'есть', 'интересные', 'книги.'], 'В библиотеке есть интересные книги.'),
  (84, 2, 'uz', '(мы, купили, красивые, цветы, для, мамы)', ARRAY['Мы', 'купили', 'красивые', 'цветы', 'для', 'мамы.'], 'Мы купили красивые цветы для мамы.'),
  (84, 3, 'uz', '(в, нашем, городе, много, новых, школ)', ARRAY['В', 'нашем', 'городе', 'много', 'новых', 'школ.'], 'В нашем городе много новых школ.'),
  (84, 4, 'uz', '(эти, старые, часы, принадлежали, моему, дедушке)', ARRAY['Эти', 'старые', 'часы', 'принадлежали', 'моему', 'дедушке.'], 'Эти старые часы принадлежали моему дедушке.'),
  (84, 5, 'uz', '(русские, люди, гостеприимные, и, добрые)', ARRAY['Русские', 'люди', 'гостеприимные', 'и', 'добрые.'], 'Русские люди гостеприимные и добрые.'),
  (84, 6, 'uz', '(в, зоопарке, мы, видели, забавных, обезьян)', ARRAY['В', 'зоопарке', 'мы', 'видели', 'забавных', 'обезьян.'], 'В зоопарке мы видели забавных обезьян.'),
  (84, 7, 'uz', '(хорошие, новости, всегда, радуют)', ARRAY['Хорошие', 'новости', 'всегда', 'радуют.'], 'Хорошие новости всегда радуют.'),
  (84, 8, 'uz', '(длинные, волосы, украшают, девушек)', ARRAY['Длинные', 'волосы', 'украшают', 'девушек.'], 'Длинные волосы украшают девушек.'),
  (84, 9, 'uz', '(тёплые, дни, скоро, закончатся)', ARRAY['Тёплые', 'дни', 'скоро', 'закончатся.'], 'Тёплые дни скоро закончатся.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (84, 0, 'Yangi (ko‘p)', 'Новые'),
  (84, 1, 'Katta (ko‘p)', 'Большие'),
  (84, 2, 'Kichik (ko‘p)', 'Маленькие'),
  (84, 3, 'Eski (ko‘p)', 'Старые'),
  (84, 4, 'Yaxshi (ko‘p)', 'Хорошие'),
  (84, 5, 'Qiziqarli (ko‘p)', 'Интересные'),
  (84, 6, 'Chiroyli (ko‘p)', 'Красивые'),
  (84, 7, 'Ko''k (ko''p)', 'Синие'),
  (84, 8, 'Qizil (ko‘p)', 'Красные'),
  (84, 9, 'Oq (ko‘p)', 'Белые'),
  (84, 10, 'Qora (ko‘p)', 'Чёрные'),
  (84, 11, 'Baland', 'Высокие'),
  (84, 12, 'Past', 'Низкие'),
  (84, 13, 'Toza (ko‘p)', 'Чистые'),
  (84, 14, 'Uzoq', 'Дальние');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  84,
  'Мои соседи',
  $body$
У меня есть хорошие соседи. Они живут в большой светлой квартире на втором этаже.

Мои соседи — отзывчивые и весёлые люди. Их дети — маленькие шалуны, которые любят играть в мяч.

Каждое утро я слышу их громкие голоса и весёлый смех в подъезде.

По выходным мы иногда собираемся вместе и обсуждаем последние новости.

Женщины пьют ароматный чай с вкусными пирогами, а мужчины играют в шахматы.

Я люблю своих соседей за их открытость и доброту. Хорошие отношения с соседями — это важная часть жизни в большом городе.
$body$,
  'kunlik-oqish-84'
);

-- ========== Kun 85 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  85,
  'Прилагательные: И.п. и В.п.',
  $theory$
**Именительный падеж** — *кто? что?* **Винительный падеж** — *кого? что?*

**Неодушевлённое:** odatda erkak va o‘rta rodda **В.п. = И.п.** (*вижу новый дом*, *вижу новое окно*). Ayol rodda *-ую/-юю* (*вижу новую книгу*).

**Одушевлённое:** erkak *В.п.* ko‘pincha **родительный** shakliga yaqin (*вижу хорошего друга*).

**Ko‘plik одуш.:** *хороших студентов*.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (85, 'rule', 0, '«Men yangi uy sotib oldim» (uy – неодуш.)', 'Я купил новый дом.', 'Я купил нового дома.', 'Я купил новому дому.', 'Я купил новым домом.', 0),
  (85, 'rule', 1, '«Men eski do‘stimni ko‘rdim» (do‘st – одуш.)', 'Я видел старый друг.', 'Я видел старого друга.', 'Я видел старому другу.', 'Я видел старым другом.', 1),
  (85, 'rule', 2, '«Men yangi kitobni o‘qiyapman»', 'Я читаю новый книга.', 'Я читаю новую книгу.', 'Я читаю новое книгу.', 'Я читаю новым книгу.', 1),
  (85, 'rule', 3, '«U kichik itni sevadi» (собака – жен. одуш.)', 'Он любит маленький собака.', 'Он любит маленького собаку.', 'Он любит маленькую собаку.', 'Он любит маленьким собаком.', 2),
  (85, 'rule', 4, '«Biz yaxshi talabalarni ko‘rdik»', 'Мы видели хорошие студенты.', 'Мы видели хороших студентов.', 'Мы видели хорошим студентам.', 'Мы видели хорошими студентами.', 1),
  (85, 'rule', 5, '«Ona chiroyli gulni oldi» (цветок – неодуш., муж.)', 'Мама взяла красивый цветок.', 'Мама взяла красивого цветка.', 'Мама взяла красивому цветку.', 'Мама взяла красивым цветком.', 0),
  (85, 'rule', 6, 'Qaysi gapda ayol rod, В.п. to‘g‘ri?', 'Я вижу красивую картину.', 'Я вижу красивая картину.', 'Я вижу красивое картину.', 'Я вижу красивым картину.', 0),
  (85, 'rule', 7, '«Siz yangi mashinani ko‘rdingizmi?»', 'Вы видели новая машина?', 'Вы видели новую машину?', 'Вы видели новое машину?', 'Вы видели новым машину?', 1),
  (85, 'rule', 8, '«U eski o‘qituvchisini uchratdi»', 'Он встретил свой старый учитель.', 'Он встретил своего старого учителя.', 'Он встретил своему старому учителю.', 'Он встретил своим старым учителем.', 1),
  (85, 'rule', 9, '«Biz yangi kompyuter sotib oldik»', 'Мы купили новый компьютер.', 'Мы купили нового компьютера.', 'Мы купили новому компьютеру.', 'Мы купили новым компьютером.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (85, 0, 0, 'Men yangi uyni ko‘rdim.', 'Я вижу новый дом.'),
  (85, 0, 1, 'U yangi kitobni o‘qiyapti.', 'Он читает новую книгу.'),
  (85, 0, 2, 'Biz katta stadionni ko‘rdik.', 'Мы видим большой стадион.'),
  (85, 0, 3, 'Ular chiroyli ko‘ylakni sotib olishdi.', 'Они купили красивое платье.'),
  (85, 0, 4, 'U eski do‘stini kutib oldi.', 'Она встречает старого друга.'),
  (85, 0, 5, 'Siz yangi o‘qituvchingizni yaxshi ko‘rasizmi?', 'Вы любите своего нового учителя?'),
  (85, 0, 6, 'Men o‘zimning chiroyli onamni sevaman.', 'Я люблю свою красивую маму.'),
  (85, 0, 7, 'U o‘zining kichik singlisini kutyapti.', 'Он ждёт свою младшую сестру.'),
  (85, 0, 8, 'Men go‘zal manzarani ko‘rdim.', 'Я вижу красивый пейзаж.'),
  (85, 0, 9, 'U mazali ovqatni pishirdi.', 'Он приготовил вкусную еду.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (85, 0, 'uz', '(я, люблю, свой, маленький, сестра)', ARRAY['Я', 'люблю', 'свою', 'маленькую', 'сестру.'], 'Я люблю свою маленькую сестру.'),
  (85, 1, 'uz', '(мы, купили, новый, компьютер, вчера)', ARRAY['Мы', 'купили', 'новый', 'компьютер', 'вчера.'], 'Мы купили новый компьютер вчера.'),
  (85, 2, 'uz', '(она, видит, высокий, здание, из, окно)', ARRAY['Она', 'видит', 'высокое', 'здание', 'из', 'окна.'], 'Она видит высокое здание из окна.'),
  (85, 3, 'uz', '(ты, знаешь, тот, высокий, мужчина)', ARRAY['Ты', 'знаешь', 'того', 'высокого', 'мужчину?'], 'Ты знаешь того высокого мужчину?'),
  (85, 4, 'uz', '(дети, нашли, интересный, книга, в, библиотека)', ARRAY['Дети', 'нашли', 'интересную', 'книгу', 'в', 'библиотеке.'], 'Дети нашли интересную книгу в библиотеке.'),
  (85, 5, 'uz', '(вчера, я, встретил, свой, старый, учитель)', ARRAY['Вчера', 'я', 'встретил', 'своего', 'старого', 'учителя.'], 'Вчера я встретил своего старого учителя.'),
  (85, 6, 'uz', '(бабушка, испекла, вкусный, пирог)', ARRAY['Бабушка', 'испекла', 'вкусный', 'пирог.'], 'Бабушка испекла вкусный пирог.'),
  (85, 7, 'uz', '(мы, ждём, хороший, новости)', ARRAY['Мы', 'ждём', 'хорошие', 'новости.'], 'Мы ждём хорошие новости.'),
  (85, 8, 'uz', '(почему, ты, не, позвал, свой, лучший, друг)', ARRAY['Почему', 'ты', 'не', 'позвал', 'своего', 'лучшего', 'друга?'], 'Почему ты не позвал своего лучшего друга?'),
  (85, 9, 'uz', '(он, надел, новый, костюм, на, праздник)', ARRAY['Он', 'надел', 'новый', 'костюм', 'на', 'праздник.'], 'Он надел новый костюм на праздник.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (85, 0, 'Ajoyib', 'прекрасный'),
  (85, 1, 'Yumshoq', 'мягкий'),
  (85, 2, 'Mily (yoqimli)', 'милый'),
  (85, 3, 'Issiq / iliq', 'тёплый'),
  (85, 4, 'Shirin', 'сладкий'),
  (85, 5, 'Kuchli', 'сильный'),
  (85, 6, 'Sog‘lom', 'здоровый'),
  (85, 7, 'Katta (ayol) И.п.', 'большая'),
  (85, 8, 'Kichik (ayol) И.п.', 'маленькая'),
  (85, 9, 'Yangi (ayol) И.п.', 'новая'),
  (85, 10, 'Eski (ayol) И.п.', 'старая'),
  (85, 11, 'Chiroyli (ayol) И.п.', 'красивая'),
  (85, 12, 'Qiziqarli (ayol) И.п.', 'интересная'),
  (85, 13, 'Yaxshi (ayol) И.п.', 'хорошая'),
  (85, 14, 'Toza (ayol) И.п.', 'чистая');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  85,
  'Подарок',
  $body$
Вчера у меня был день рождения.

Мои друзья подарили мне много прекрасных подарков. Я получил интересную книгу и новый телефон.

Мой лучший друг Антон подарил мне большого плюшевого мишку. Я очень люблю этого милого зверя.

Моя сестра сделала своими руками красивую открытку. На ней она написала тёплые слова.

Мы с родителями испекли большой вкусный торт. На торте было написано: «С днём рождения!»

Вечером мы смотрели старый семейный альбом и вспоминали счастливые моменты.

Я никогда не забуду этот день: он был светлым, весёлым и очень уютным.
$body$,
  'kunlik-oqish-85'
);


INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-81', 'аквариум', 'аквариум', 'Akvarium', NULL),
  ('kunlik-oqish-81', 'большой', 'большой', 'katta', NULL),
  ('kunlik-oqish-81', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-81', 'вечерам', 'вечерам', 'Kechalar', NULL),
  ('kunlik-oqish-81', 'висит', 'висит', 'Osilgan', NULL),
  ('kunlik-oqish-81', 'вкусный', 'вкусный', 'ta’mli', NULL),
  ('kunlik-oqish-81', 'всегда', 'всегда', 'Har doim', NULL),
  ('kunlik-oqish-81', 'высокий', 'высокий', 'Baland (erkak)', NULL),
  ('kunlik-oqish-81', 'города', 'города', 'Shahar (род)', NULL),
  ('kunlik-oqish-81', 'готовит', 'готовит', 'Pishiradi', NULL),
  ('kunlik-oqish-81', 'добрая', 'добрая', 'Mehribon (ayol)', NULL),
  ('kunlik-oqish-81', 'дом', 'дом', 'uy', NULL),
  ('kunlik-oqish-81', 'домом', 'домом', 'uy bilan', NULL),
  ('kunlik-oqish-81', 'друг', 'друг', 'Do‘st', NULL),
  ('kunlik-oqish-81', 'дуб', 'дуб', 'Dub', NULL),
  ('kunlik-oqish-81', 'есть', 'есть', 'Yemoq (inf)', NULL),
  ('kunlik-oqish-81', 'женщина', 'женщина', 'Ayol', NULL),
  ('kunlik-oqish-81', 'заботливая', 'заботливая', 'G‘amxo‘r', NULL),
  ('kunlik-oqish-81', 'здесь', 'здесь', 'Bu yerda', NULL),
  ('kunlik-oqish-81', 'золотыми', 'золотыми', 'Oltin …', NULL),
  ('kunlik-oqish-81', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-81', 'интересный', 'интересный', 'qiziqarli', NULL),
  ('kunlik-oqish-81', 'календарь', 'календарь', 'Kalendar', NULL),
  ('kunlik-oqish-81', 'книги', 'книги', 'Kitoblar', NULL),
  ('kunlik-oqish-81', 'комнате', 'комнате', 'Xonada', NULL),
  ('kunlik-oqish-81', 'костюм', 'костюм', 'Kostyum', NULL),
  ('kunlik-oqish-81', 'красивый', 'красивый', 'chiroyli', NULL),
  ('kunlik-oqish-81', 'лежат', 'лежат', 'Yotibdi (ko‘plik)', NULL),
  ('kunlik-oqish-81', 'любимые', 'любимые', 'Sevimli', NULL),
  ('kunlik-oqish-81', 'люблю', 'люблю', 'Yaxshi ko‘raman', NULL),
  ('kunlik-oqish-81', 'маленький', 'маленький', 'Kichik (erkak)', NULL),
  ('kunlik-oqish-81', 'мама', 'мама', 'Ona', NULL),
  ('kunlik-oqish-81', 'меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-81', 'мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-81', 'много', 'много', 'Ko‘p', NULL),
  ('kunlik-oqish-81', 'моей', 'моей', 'Mening …-ga', NULL),
  ('kunlik-oqish-81', 'Мой', 'мой', 'Mening', NULL),
  ('kunlik-oqish-81', 'Моя', 'моя', 'Mening (ayol otl.)', NULL),
  ('kunlik-oqish-81', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-81', 'находится', 'находится', 'Joylashgan', NULL),
  ('kunlik-oqish-81', 'нашего', 'нашего', 'Bizning (род)', NULL),
  ('kunlik-oqish-81', 'нём', 'нем', 'Unda (prep + u)', NULL),
  ('kunlik-oqish-81', 'них', 'них', 'Ular (род.)', NULL),
  ('kunlik-oqish-81', 'новом', 'новом', 'Yangi (предл.)', NULL),
  ('kunlik-oqish-81', 'носит', 'носит', 'Ko‘taradi / oladi', NULL),
  ('kunlik-oqish-81', 'обед', 'обед', 'Tushlik', NULL),
  ('kunlik-oqish-81', 'Он', 'он', 'U (erkak)', NULL),
  ('kunlik-oqish-81', 'Она', 'она', 'U (ayol)', NULL),
  ('kunlik-oqish-81', 'отдыхать', 'отдыхать', 'Dam olmoq', NULL),
  ('kunlik-oqish-81', 'очень', 'очень', 'Juda', NULL),
  ('kunlik-oqish-81', 'папа', 'папа', 'Ota', NULL),
  ('kunlik-oqish-81', 'Перед', 'перед', 'Oldin', NULL),
  ('kunlik-oqish-81', 'письменный', 'письменный', 'Yozuv …', NULL),
  ('kunlik-oqish-81', 'По', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-81', 'подарил', 'подарил', 'Sovg‘a qildi', NULL),
  ('kunlik-oqish-81', 'помогает', 'помогает', 'Yordam beradi', NULL),
  ('kunlik-oqish-81', 'после', 'после', '…dan keyin', NULL),
  ('kunlik-oqish-81', 'работает', 'работает', 'Ishlaydi', NULL),
  ('kunlik-oqish-81', 'районе', 'районе', 'Tumanda', NULL),
  ('kunlik-oqish-81', 'растёт', 'растет', 'O‘sadi', NULL),
  ('kunlik-oqish-81', 'родителей', 'родителей', 'ota-onalari', NULL),
  ('kunlik-oqish-81', 'рыбками', 'рыбками', 'Baliqchalalar bilan', NULL),
  ('kunlik-oqish-81', 'Рядом', 'рядом', 'Yon-atrofda', NULL),
  ('kunlik-oqish-81', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-81', 'светло', 'светло', 'Yorug‘', NULL),
  ('kunlik-oqish-81', 'светлый', 'светлый', 'Yorug‘ (erkak)', NULL),
  ('kunlik-oqish-81', 'своих', 'своих', 'O‘zingning', NULL),
  ('kunlik-oqish-81', 'свой', 'свой', 'O‘zing', NULL),
  ('kunlik-oqish-81', 'сильный', 'сильный', 'kuchli', NULL),
  ('kunlik-oqish-81', 'сквер', 'сквер', 'Skver', NULL),
  ('kunlik-oqish-81', 'смотреть', 'смотреть', 'Qaramoq', NULL),
  ('kunlik-oqish-81', 'спокойно', 'спокойно', 'Xotirjam', NULL),
  ('kunlik-oqish-81', 'старый', 'старый', 'eski', NULL),
  ('kunlik-oqish-81', 'стене', 'стене', 'Devorda', NULL),
  ('kunlik-oqish-81', 'стоит', 'стоит', 'Turibdi', NULL),
  ('kunlik-oqish-81', 'стол', 'стол', 'Stol', NULL),
  ('kunlik-oqish-81', 'строгий', 'строгий', 'Qat’iy', NULL),
  ('kunlik-oqish-81', 'тепло', 'тепло', 'Iliqlik', NULL),
  ('kunlik-oqish-81', 'тетради', 'тетради', 'Daftarlar', NULL),
  ('kunlik-oqish-81', 'У', 'у', '…da bor', NULL),
  ('kunlik-oqish-81', 'удобный', 'удобный', 'Qulay', NULL),
  ('kunlik-oqish-81', 'уроками', 'уроками', 'Darslar bilan', NULL),
  ('kunlik-oqish-81', 'фотографиями', 'фотографиями', 'Suratlar bilan', NULL),
  ('kunlik-oqish-81', 'человек', 'человек', 'Inson', NULL),
  ('kunlik-oqish-81', 'школы', 'школы', 'Maktab', NULL),
  ('kunlik-oqish-81', 'Это', 'это', 'Bu', NULL),
  ('kunlik-oqish-81', 'я', 'я', 'Men', NULL),
  ('kunlik-oqish-81', 'яркими', 'яркими', 'Yorqin … bilan', NULL),
  ('kunlik-oqish-82', 'Анна', 'анна', 'Anna', NULL),
  ('kunlik-oqish-82', 'библиотека', 'библиотека', 'Kutubxona', NULL),
  ('kunlik-oqish-82', 'большая', 'большая', 'Katta', NULL),
  ('kunlik-oqish-82', 'большое', 'большое', 'katta', NULL),
  ('kunlik-oqish-82', 'В', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-82', 'взять', 'взять', 'Olmoq', NULL),
  ('kunlik-oqish-82', 'вкусная', 'вкусная', 'Mazali (ayol)', NULL),
  ('kunlik-oqish-82', 'во', 'во', '…da (vo frisbi)', NULL),
  ('kunlik-oqish-82', 'Все', 'все', 'Hammasi', NULL),
  ('kunlik-oqish-82', 'всегда', 'всегда', 'Har doim', NULL),
  ('kunlik-oqish-82', 'голос', 'голос', 'ovoz', NULL),
  ('kunlik-oqish-82', 'города', 'города', 'Shahar (род)', NULL),
  ('kunlik-oqish-82', 'гуляем', 'гуляем', 'sayr qilamiz', NULL),
  ('kunlik-oqish-82', 'дворе', 'дворе', 'Hovlida', NULL),
  ('kunlik-oqish-82', 'девочка', 'девочка', 'Qiz bola', NULL),
  ('kunlik-oqish-82', 'добрая', 'добрая', 'Mehribon (ayol)', NULL),
  ('kunlik-oqish-82', 'еда', 'еда', 'Ovqat', NULL),
  ('kunlik-oqish-82', 'её', 'ее', 'Uni', NULL),
  ('kunlik-oqish-82', 'ей', 'ей', 'Unga (ayol)', NULL),
  ('kunlik-oqish-82', 'есть', 'есть', 'Yemoq (inf)', NULL),
  ('kunlik-oqish-82', 'здание', 'здание', 'Bino', NULL),
  ('kunlik-oqish-82', 'зовут', 'зовут', 'Chaqirishadi', NULL),
  ('kunlik-oqish-82', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-82', 'из', 'из', '…dan', NULL),
  ('kunlik-oqish-82', 'интересную', 'интересную', 'Qiziqarli (-ую)', NULL),
  ('kunlik-oqish-82', 'классе', 'классе', 'Sinfda', NULL),
  ('kunlik-oqish-82', 'книгу', 'книгу', 'Kitobni', NULL),
  ('kunlik-oqish-82', 'любимая', 'любимая', 'Sevimli (ayol)', NULL),
  ('kunlik-oqish-82', 'люблю', 'люблю', 'Yaxshi ko‘raman', NULL),
  ('kunlik-oqish-82', 'можно', 'можно', 'Mumkin', NULL),
  ('kunlik-oqish-82', 'Моя', 'моя', 'Mening (ayol otl.)', NULL),
  ('kunlik-oqish-82', 'музыке', 'музыке', 'Musiqa …da', NULL),
  ('kunlik-oqish-82', 'мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-82', 'На', 'на', '…da', NULL),
  ('kunlik-oqish-82', 'находится', 'находится', 'Joylashgan', NULL),
  ('kunlik-oqish-82', 'нашей', 'нашей', 'Bizning (род.)', NULL),
  ('kunlik-oqish-82', 'нашем', 'нашем', 'Bizning (predlog bilan)', NULL),
  ('kunlik-oqish-82', 'недалеко', 'недалеко', 'Uzoq emas', NULL),
  ('kunlik-oqish-82', 'новая', 'новая', 'Yangi (ayol)', NULL),
  ('kunlik-oqish-82', 'новой', 'новой', 'yangi', NULL),
  ('kunlik-oqish-82', 'о', 'о', '…haqida', NULL),
  ('kunlik-oqish-82', 'общительная', 'общительная', 'Ochiq', NULL),
  ('kunlik-oqish-82', 'Она', 'она', 'U (ayol)', NULL),
  ('kunlik-oqish-82', 'Оно', 'оно', 'U (o‘rta)', NULL),
  ('kunlik-oqish-82', 'от', 'от', '…dan', NULL),
  ('kunlik-oqish-82', 'очень', 'очень', 'Juda', NULL),
  ('kunlik-oqish-82', 'первом', 'первом', 'Birinchi …da', NULL),
  ('kunlik-oqish-82', 'Петровна', 'петровна', 'Petrovna', NULL),
  ('kunlik-oqish-82', 'подруге', 'подруге', 'Qiz do‘stga', NULL),
  ('kunlik-oqish-82', 'помогают', 'помогают', 'yordam berishadi', NULL),
  ('kunlik-oqish-82', 'После', 'после', '…dan keyin', NULL),
  ('kunlik-oqish-82', 'почитать', 'почитать', 'O‘qimoq', NULL),
  ('kunlik-oqish-82', 'приветливая', 'приветливая', 'Xushmuomala', NULL),
  ('kunlik-oqish-82', 'рады', 'рады', 'Xursand', NULL),
  ('kunlik-oqish-82', 'разговариваем', 'разговариваем', 'Gaplashamiz', NULL),
  ('kunlik-oqish-82', 'расположено', 'расположено', 'Joylashgan', NULL),
  ('kunlik-oqish-82', 'ребята', 'ребята', 'Bolalar', NULL),
  ('kunlik-oqish-82', 'русский', 'русский', 'Rus', NULL),
  ('kunlik-oqish-82', 'светлое', 'светлое', 'Yorug‘ (o‘rta)', NULL),
  ('kunlik-oqish-82', 'современная', 'современная', 'Zamonaviy', NULL),
  ('kunlik-oqish-82', 'Софи', 'софи', 'Sofi', NULL),
  ('kunlik-oqish-82', 'спокойный', 'спокойный', 'Xotirjam', NULL),
  ('kunlik-oqish-82', 'столовая', 'столовая', 'Oshxona', NULL),
  ('kunlik-oqish-82', 'столы', 'столы', 'Stollar', NULL),
  ('kunlik-oqish-82', 'Там', 'там', 'U yerda', NULL),
  ('kunlik-oqish-82', 'тишине', 'тишине', 'Jimjitlikda', NULL),
  ('kunlik-oqish-82', 'умная', 'умная', 'Aqlli (ayol)', NULL),
  ('kunlik-oqish-82', 'уроки', 'уроки', 'Darslar', NULL),
  ('kunlik-oqish-82', 'уроков', 'уроков', 'Darslar (dan)', NULL),
  ('kunlik-oqish-82', 'учительница', 'учительница', 'O‘qituvchi (ayol)', NULL),
  ('kunlik-oqish-82', 'учится', 'учится', 'o‘qiydi', NULL),
  ('kunlik-oqish-82', 'учить', 'учить', 'O‘rgatmoq', NULL),
  ('kunlik-oqish-82', 'фильмах', 'фильмах', 'Filmlar …da', NULL),
  ('kunlik-oqish-82', 'Франции', 'франции', 'Fransiya …dan', NULL),
  ('kunlik-oqish-82', 'центра', 'центра', 'Markazidan', NULL),
  ('kunlik-oqish-82', 'часто', 'часто', 'Tez-tez', NULL),
  ('kunlik-oqish-82', 'чистые', 'чистые', 'Toza (ko‘plik)', NULL),
  ('kunlik-oqish-82', 'школа', 'школа', 'Maktab', NULL),
  ('kunlik-oqish-82', 'школе', 'школе', 'Maktabda', NULL),
  ('kunlik-oqish-82', 'этаже', 'этаже', 'Qavatda', NULL),
  ('kunlik-oqish-82', 'это', 'это', 'Bu', NULL),
  ('kunlik-oqish-82', 'Я', 'я', 'Men', NULL),
  ('kunlik-oqish-82', 'язык', 'язык', 'Til', NULL),
  ('kunlik-oqish-83', 'ароматный', 'ароматный', 'Xushbo‘y', NULL),
  ('kunlik-oqish-83', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-83', 'веранде', 'веранде', 'Verandada', NULL),
  ('kunlik-oqish-83', 'вкусное', 'вкусное', 'Mazali (o‘rta)', NULL),
  ('kunlik-oqish-83', 'Внутри', 'внутри', 'Ichkarida', NULL),
  ('kunlik-oqish-83', 'воскресенье', 'воскресенье', 'Yakshanba', NULL),
  ('kunlik-oqish-83', 'всегда', 'всегда', 'Har doim', NULL),
  ('kunlik-oqish-83', 'выходят', 'выходят', 'Qaraydi', NULL),
  ('kunlik-oqish-83', 'города', 'города', 'Shahar (род)', NULL),
  ('kunlik-oqish-83', 'готовлюсь', 'готовлюсь', 'Tayyorlanaman', NULL),
  ('kunlik-oqish-83', 'дарит', 'дарит', 'Bag‘ishlaydi', NULL),
  ('kunlik-oqish-83', 'дерева', 'дерева', 'Yog‘ochdan', NULL),
  ('kunlik-oqish-83', 'дома', 'дома', 'Uyda', NULL),
  ('kunlik-oqish-83', 'заказываю', 'заказываю', 'Buyurtma qilaman', NULL),
  ('kunlik-oqish-83', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-83', 'из', 'из', '…dan', NULL),
  ('kunlik-oqish-83', 'или', 'или', 'Yoki', NULL),
  ('kunlik-oqish-83', 'к', 'к', '…ga / …tomon', NULL),
  ('kunlik-oqish-83', 'Каждое', 'каждое', 'Har bir', NULL),
  ('kunlik-oqish-83', 'кафе', 'кафе', 'Kafe', NULL),
  ('kunlik-oqish-83', 'книгу', 'книгу', 'Kitobni', NULL),
  ('kunlik-oqish-83', 'кофе', 'кофе', 'Qahva', NULL),
  ('kunlik-oqish-83', 'Летом', 'летом', 'Yozda', NULL),
  ('kunlik-oqish-83', 'любимое', 'любимое', 'Sevimli', NULL),
  ('kunlik-oqish-83', 'люблю', 'люблю', 'Yaxshi ko‘raman', NULL),
  ('kunlik-oqish-83', 'людей', 'людей', 'Odamlar (род.)', NULL),
  ('kunlik-oqish-83', 'маленькое', 'маленькое', 'Kichik (o‘rta)', NULL),
  ('kunlik-oqish-83', 'место', 'место', 'joy', NULL),
  ('kunlik-oqish-83', 'мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-83', 'Моё', 'мое', 'Mening (o‘rta otl.)', NULL),
  ('kunlik-oqish-83', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-83', 'настоящего', 'настоящего', 'Haqiqiy …', NULL),
  ('kunlik-oqish-83', 'настроением', 'настроением', 'Kayfiyat bilan', NULL),
  ('kunlik-oqish-83', 'находится', 'находится', 'Joylashgan', NULL),
  ('kunlik-oqish-83', 'неподалёку', 'неподалеку', 'Yaqin joyda', NULL),
  ('kunlik-oqish-83', 'Окна', 'окна', 'Derazalar', NULL),
  ('kunlik-oqish-83', 'Оно', 'оно', 'U (o‘rta)', NULL),
  ('kunlik-oqish-83', 'от', 'от', '…dan', NULL),
  ('kunlik-oqish-83', 'открытой', 'открытой', 'Ochiq (-ой)', NULL),
  ('kunlik-oqish-83', 'пирожное', 'пирожное', 'shirin pishiriq', NULL),
  ('kunlik-oqish-83', 'понедельнику', 'понедельнику', 'Dushanbaga', NULL),
  ('kunlik-oqish-83', 'посидеть', 'посидеть', 'O‘tirib turmoq', NULL),
  ('kunlik-oqish-83', 'посмотреть', 'посмотреть', 'Ko‘rishni', NULL),
  ('kunlik-oqish-83', 'прихожу', 'прихожу', 'Kelaman', NULL),
  ('kunlik-oqish-83', 'просто', 'просто', 'Oddiy', NULL),
  ('kunlik-oqish-83', 'радость', 'радость', 'Shodlik', NULL),
  ('kunlik-oqish-83', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-83', 'светло', 'светло', 'Yorug‘', NULL),
  ('kunlik-oqish-83', 'сделаны', 'сделаны', 'Qilingan', NULL),
  ('kunlik-oqish-83', 'сидеть', 'сидеть', 'O‘tirmoq', NULL),
  ('kunlik-oqish-83', 'спокойствие', 'спокойствие', 'Tinchlik', NULL),
  ('kunlik-oqish-83', 'старом', 'старом', 'Eski (-ом)', NULL),
  ('kunlik-oqish-83', 'Столики', 'столики', 'Kichik stollar', NULL),
  ('kunlik-oqish-83', 'счастье', 'счастье', 'Baxt', NULL),
  ('kunlik-oqish-83', 'сюда', 'сюда', 'Bu yerga', NULL),
  ('kunlik-oqish-83', 'там', 'там', 'U yerda', NULL),
  ('kunlik-oqish-83', 'тихую', 'тихую', 'Tinch (-ую)', NULL),
  ('kunlik-oqish-83', 'улочку', 'улочку', 'Tor ko‘cha', NULL),
  ('kunlik-oqish-83', 'уютное', 'уютное', 'Qulay (o‘rta)', NULL),
  ('kunlik-oqish-83', 'хорошим', 'хорошим', 'Yaxshi (-им)', NULL),
  ('kunlik-oqish-83', 'центре', 'центре', 'Markazda', NULL),
  ('kunlik-oqish-83', 'чашкой', 'чашкой', 'Piyola bilan', NULL),
  ('kunlik-oqish-83', 'чисто', 'чисто', 'Toza', NULL),
  ('kunlik-oqish-83', 'читаю', 'читаю', 'O‘qiyman', NULL),
  ('kunlik-oqish-83', 'это', 'это', 'Bu', NULL),
  ('kunlik-oqish-83', 'Я', 'я', 'Men', NULL),
  ('kunlik-oqish-84', 'а', 'а', 'Va', NULL),
  ('kunlik-oqish-84', 'ароматный', 'ароматный', 'Xushbo‘y', NULL),
  ('kunlik-oqish-84', 'большой', 'большой', 'katta', NULL),
  ('kunlik-oqish-84', 'большом', 'большом', 'Katta (предл.)', NULL),
  ('kunlik-oqish-84', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-84', 'важная', 'важная', 'Muhim (ayol)', NULL),
  ('kunlik-oqish-84', 'весёлые', 'веселые', 'Quvnoq (ko‘plik)', NULL),
  ('kunlik-oqish-84', 'весёлый', 'веселый', 'Shod', NULL),
  ('kunlik-oqish-84', 'вкусными', 'вкусными', 'Mazali … bilan', NULL),
  ('kunlik-oqish-84', 'вместе', 'вместе', 'Birga', NULL),
  ('kunlik-oqish-84', 'втором', 'втором', 'Ikkinchi …da', NULL),
  ('kunlik-oqish-84', 'выходным', 'выходным', 'Dam olish kunlari', NULL),
  ('kunlik-oqish-84', 'голоса', 'голоса', 'Ovozlar', NULL),
  ('kunlik-oqish-84', 'городе', 'городе', 'Shaharda', NULL),
  ('kunlik-oqish-84', 'громкие', 'громкие', 'Baland (ko‘plik)', NULL),
  ('kunlik-oqish-84', 'дети', 'дети', 'Bolalar', NULL),
  ('kunlik-oqish-84', 'доброту', 'доброту', 'Mehribonlik', NULL),
  ('kunlik-oqish-84', 'есть', 'есть', 'Yemoq (inf)', NULL),
  ('kunlik-oqish-84', 'Женщины', 'женщины', 'Ayollar', NULL),
  ('kunlik-oqish-84', 'живут', 'живут', 'Yashaydi (ular)', NULL),
  ('kunlik-oqish-84', 'жизни', 'жизни', 'Hayot …', NULL),
  ('kunlik-oqish-84', 'за', 'за', '…uchun', NULL),
  ('kunlik-oqish-84', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-84', 'играть', 'играть', 'O‘ynamoq', NULL),
  ('kunlik-oqish-84', 'играют', 'играют', 'O‘ynaydi', NULL),
  ('kunlik-oqish-84', 'иногда', 'иногда', 'Ba’zida', NULL),
  ('kunlik-oqish-84', 'Их', 'их', 'Ularga', NULL),
  ('kunlik-oqish-84', 'Каждое', 'каждое', 'Har bir', NULL),
  ('kunlik-oqish-84', 'квартире', 'квартире', 'Kvartirada', NULL),
  ('kunlik-oqish-84', 'которые', 'которые', '…deb', NULL),
  ('kunlik-oqish-84', 'люблю', 'люблю', 'Yaxshi ko‘raman', NULL),
  ('kunlik-oqish-84', 'любят', 'любят', 'sevishadi', NULL),
  ('kunlik-oqish-84', 'люди', 'люди', 'Odamlar', NULL),
  ('kunlik-oqish-84', 'маленькие', 'маленькие', 'Kichik', NULL),
  ('kunlik-oqish-84', 'меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-84', 'Мои', 'мои', 'Mening (ko‘plik)', NULL),
  ('kunlik-oqish-84', 'мужчины', 'мужчины', 'Erkaklar', NULL),
  ('kunlik-oqish-84', 'мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-84', 'мяч', 'мяч', 'To‘p', NULL),
  ('kunlik-oqish-84', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-84', 'новости', 'новости', 'Yangiliklar', NULL),
  ('kunlik-oqish-84', 'обсуждаем', 'обсуждаем', 'Muhokama qilyapmiz', NULL),
  ('kunlik-oqish-84', 'Они', 'они', 'Ular', NULL),
  ('kunlik-oqish-84', 'отзывчивые', 'отзывчивые', 'Hamdard', NULL),
  ('kunlik-oqish-84', 'открытость', 'открытость', 'Ochiqlik', NULL),
  ('kunlik-oqish-84', 'отношения', 'отношения', 'Munosabatlar', NULL),
  ('kunlik-oqish-84', 'пирогами', 'пирогами', 'Piroglar bilan', NULL),
  ('kunlik-oqish-84', 'По', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-84', 'подъезде', 'подъезде', 'Podyezdda', NULL),
  ('kunlik-oqish-84', 'последние', 'последние', 'So‘nggi', NULL),
  ('kunlik-oqish-84', 'пьют', 'пьют', 'Ichadi', NULL),
  ('kunlik-oqish-84', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-84', 'светлой', 'светлой', 'Yorug‘ (-ой)', NULL),
  ('kunlik-oqish-84', 'своих', 'своих', 'O‘zingning', NULL),
  ('kunlik-oqish-84', 'слышу', 'слышу', 'Eshitaman', NULL),
  ('kunlik-oqish-84', 'смех', 'смех', 'kulgu', NULL),
  ('kunlik-oqish-84', 'собираемся', 'собираемся', 'Oilaga shoshilmayapmiz (reja)', NULL),
  ('kunlik-oqish-84', 'соседей', 'соседей', 'Qo‘shnilar…', NULL),
  ('kunlik-oqish-84', 'соседи', 'соседи', 'Qo‘shnilar', NULL),
  ('kunlik-oqish-84', 'соседями', 'соседями', 'Qo‘shnilar bilan', NULL),
  ('kunlik-oqish-84', 'У', 'у', '…da bor', NULL),
  ('kunlik-oqish-84', 'утро', 'утро', 'Ertalab', NULL),
  ('kunlik-oqish-84', 'хорошие', 'хорошие', 'Yaxshi', NULL),
  ('kunlik-oqish-84', 'чай', 'чай', 'Choy', NULL),
  ('kunlik-oqish-84', 'часть', 'часть', 'Qism', NULL),
  ('kunlik-oqish-84', 'шалуны', 'шалуны', 'Sho‘xlar', NULL),
  ('kunlik-oqish-84', 'шахматы', 'шахматы', 'Shaxmat', NULL),
  ('kunlik-oqish-84', 'этаже', 'этаже', 'Qavatda', NULL),
  ('kunlik-oqish-84', 'это', 'это', 'Bu', NULL),
  ('kunlik-oqish-84', 'я', 'я', 'Men', NULL),
  ('kunlik-oqish-85', 'альбом', 'альбом', 'Albom', NULL),
  ('kunlik-oqish-85', 'Антон', 'антон', 'Anton', NULL),
  ('kunlik-oqish-85', 'большого', 'большого', 'Katta (род. одуш.)', NULL),
  ('kunlik-oqish-85', 'большой', 'большой', 'katta', NULL),
  ('kunlik-oqish-85', 'был', 'был', 'Bo‘lgan edi', NULL),
  ('kunlik-oqish-85', 'было', 'было', 'Bo‘ldi', NULL),
  ('kunlik-oqish-85', 'весёлым', 'веселым', 'Quvnoq (твор.)', NULL),
  ('kunlik-oqish-85', 'Вечером', 'вечером', 'Kechqurun', NULL),
  ('kunlik-oqish-85', 'вкусный', 'вкусный', 'ta’mli', NULL),
  ('kunlik-oqish-85', 'вспоминали', 'вспоминали', 'Esladik', NULL),
  ('kunlik-oqish-85', 'Вчера', 'вчера', 'Kecha', NULL),
  ('kunlik-oqish-85', 'день', 'день', 'Kun', NULL),
  ('kunlik-oqish-85', 'днём', 'днем', 'Kunduzi', NULL),
  ('kunlik-oqish-85', 'друг', 'друг', 'Do‘st', NULL),
  ('kunlik-oqish-85', 'друзья', 'друзья', 'Do‘stlar', NULL),
  ('kunlik-oqish-85', 'забуду', 'забуду', 'Unutmayman', NULL),
  ('kunlik-oqish-85', 'зверя', 'зверя', 'Jonivarni', NULL),
  ('kunlik-oqish-85', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-85', 'интересную', 'интересную', 'Qiziqarli (-ую)', NULL),
  ('kunlik-oqish-85', 'испекли', 'испекли', 'Pishirdik', NULL),
  ('kunlik-oqish-85', 'книгу', 'книгу', 'Kitobni', NULL),
  ('kunlik-oqish-85', 'красивую', 'красивую', 'Chiroyli', NULL),
  ('kunlik-oqish-85', 'лучший', 'лучший', 'Eng yaxshi', NULL),
  ('kunlik-oqish-85', 'люблю', 'люблю', 'Yaxshi ko‘raman', NULL),
  ('kunlik-oqish-85', 'меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-85', 'милого', 'милого', 'Aziz (-ого)', NULL),
  ('kunlik-oqish-85', 'мишку', 'мишку', 'Ayiqcha', NULL),
  ('kunlik-oqish-85', 'мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-85', 'много', 'много', 'Ko‘p', NULL),
  ('kunlik-oqish-85', 'Мои', 'мои', 'Mening (ko‘plik)', NULL),
  ('kunlik-oqish-85', 'Мой', 'мой', 'Mening', NULL),
  ('kunlik-oqish-85', 'моменты', 'моменты', 'Lahzalar', NULL),
  ('kunlik-oqish-85', 'Моя', 'моя', 'Mening (ayol otl.)', NULL),
  ('kunlik-oqish-85', 'Мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-85', 'На', 'на', '…da', NULL),
  ('kunlik-oqish-85', 'написала', 'написала', 'Yozgan', NULL),
  ('kunlik-oqish-85', 'написано', 'написано', 'Yozilgan', NULL),
  ('kunlik-oqish-85', 'не', 'не', 'Emas', NULL),
  ('kunlik-oqish-85', 'ней', 'ней', 'Unda', NULL),
  ('kunlik-oqish-85', 'никогда', 'никогда', 'Hech qachon', NULL),
  ('kunlik-oqish-85', 'новый', 'новый', 'Yangi', NULL),
  ('kunlik-oqish-85', 'он', 'он', 'U (erkak)', NULL),
  ('kunlik-oqish-85', 'она', 'она', 'U (ayol)', NULL),
  ('kunlik-oqish-85', 'открытку', 'открытку', 'Tabriknoma', NULL),
  ('kunlik-oqish-85', 'очень', 'очень', 'Juda', NULL),
  ('kunlik-oqish-85', 'плюшевого', 'плюшевого', 'Yumshoq (plyush)', NULL),
  ('kunlik-oqish-85', 'подарил', 'подарил', 'Sovg‘a qildi', NULL),
  ('kunlik-oqish-85', 'подарили', 'подарили', 'Sovg‘a qilishdi', NULL),
  ('kunlik-oqish-85', 'подарков', 'подарков', 'Sovg‘alar', NULL),
  ('kunlik-oqish-85', 'получил', 'получил', 'Oldim', NULL),
  ('kunlik-oqish-85', 'прекрасных', 'прекрасных', 'Ajoyib', NULL),
  ('kunlik-oqish-85', 'родителями', 'родителями', 'Ota-onam bilan', NULL),
  ('kunlik-oqish-85', 'рождения', 'рождения', 'Tug‘ilgan kun', NULL),
  ('kunlik-oqish-85', 'руками', 'руками', 'Qo‘llar bilan', NULL),
  ('kunlik-oqish-85', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-85', 'светлым', 'светлым', 'Yorug‘ (-ым)', NULL),
  ('kunlik-oqish-85', 'своими', 'своими', 'o‘zlari bilan', NULL),
  ('kunlik-oqish-85', 'сделала', 'сделала', 'Qilgan', NULL),
  ('kunlik-oqish-85', 'семейный', 'семейный', 'Oilaviy', NULL),
  ('kunlik-oqish-85', 'сестра', 'сестра', 'Opa / singil', NULL),
  ('kunlik-oqish-85', 'слова', 'слова', 'so‘zlar', NULL),
  ('kunlik-oqish-85', 'смотрели', 'смотрели', 'qarashdi', NULL),
  ('kunlik-oqish-85', 'старый', 'старый', 'eski', NULL),
  ('kunlik-oqish-85', 'счастливые', 'счастливые', 'Baxtli', NULL),
  ('kunlik-oqish-85', 'телефон', 'телефон', 'Telefon', NULL),
  ('kunlik-oqish-85', 'тёплые', 'теплые', 'iliq', NULL),
  ('kunlik-oqish-85', 'торт', 'торт', 'Tort', NULL),
  ('kunlik-oqish-85', 'торте', 'торте', 'Tort ustida', NULL),
  ('kunlik-oqish-85', 'у', 'у', '…da bor', NULL),
  ('kunlik-oqish-85', 'уютным', 'уютным', 'Qulay (-ым)', NULL),
  ('kunlik-oqish-85', 'этого', 'этого', 'Shundan', NULL),
  ('kunlik-oqish-85', 'этот', 'этот', 'Bu', NULL),
  ('kunlik-oqish-85', 'Я', 'я', 'Men', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (81, 0, 'Sizning uyingiz kattami?', 'Ваш дом большой?'),
  (81, 1, 'Mening uyim kichik, lekin qulay.', 'Мой дом маленький, но уютный.'),
  (81, 2, 'Sizning sevimli rangingiz qaysi? – Moviy.', 'Какой ваш любимый цвет? – Синий.'),
  (81, 3, 'U yangi mashina sotib oldi.', 'Он купил новую машину.'),
  (81, 4, 'Yaxshi do''st – eng katta boylik.', 'Хороший друг – самое большое богатство.'),
  (81, 5, 'Qaysi tilni o''rganayapsiz? – Rus tilini.', 'Какой язык вы учите? – Русский язык.'),
  (81, 6, 'Uzoq yo''l charchatadi.', 'Долгая дорога утомляет.'),
  (81, 7, 'Kechki ovqat mazali edi.', 'Ужин был вкусным.'),
  (81, 8, 'Yozgi ta''til tez o''tib ketdi.', 'Летний отпуск прошёл быстро.'),
  (81, 9, 'Kechagi kino juda qiziqarli edi.', 'Вчерашний фильм был очень интересным.'),
  (82, 0, 'Sizning maktabingiz qanday?', 'Какая ваша школа?'),
  (82, 1, 'Mening maktabim katta va zamonaviy.', 'Моя школа большая и современная.'),
  (82, 2, 'Sizning eng sevimli faningiz qaysi?', 'Какой ваш самый любимый предмет?'),
  (82, 3, 'Bizning kutubxonamizda juda ko‘p qiziqarli kitoblar bor.', 'В нашей библиотеке очень много интересных книг.'),
  (82, 4, 'U chiroyli va aqlli qiz.', 'Она красивая и умная девушка.'),
  (82, 5, 'Kecha mazali kechki ovqat tayyorladim.', 'Вчера я приготовил вкусный ужин.'),
  (82, 6, 'Qanday go‘zal manzara!', 'Какой красивый пейзаж!'),
  (82, 7, 'Bu qiyin savol.', 'Это трудный вопрос.'),
  (82, 8, 'Uning tabassumi juda yoqimli.', 'Её улыбка очень приятная.'),
  (82, 9, 'Ertangi sinov ishiga tayyormisiz?', 'Вы готовы к завтрашней контрольной работе?'),
  (83, 0, 'Sizning eng sevimli joyingiz qayerda?', 'Где ваше самое любимое место?'),
  (83, 1, 'Mening sevimli joyim – bu kichik qulay kafe.', 'Моё любимое место – это маленькое уютное кафе.'),
  (83, 2, 'Uyingizda qanday qulay burchak bor?', 'Какой уютный уголок есть в вашем доме?'),
  (83, 3, 'Bugun havo juda chiroyli.', 'Сегодня очень красивое небо.'),
  (83, 4, 'Ertalabki vaqt – eng yaxshi vaqt.', 'Утреннее время – лучшее время.'),
  (83, 5, 'Bu muhim voqea abadiy esimda qoladi.', 'Это важное событие останется в памяти навсегда.'),
  (83, 6, 'Uning so‘zi juda to‘g‘ri edi.', 'Его слово было очень правильным.'),
  (83, 7, 'Sizning fikringiz qiziq, lekin men boshqacha o‘ylayman.', 'Ваше мнение интересное, но я думаю иначе.'),
  (83, 8, 'Qishki quyosh yozgi quyosh kabi yorqin emas.', 'Зимнее солнце не такое яркое, как летнее.'),
  (83, 9, 'Kechki osmon yulduzlarga to‘la.', 'Вечернее небо полно звёзд.'),
  (84, 0, 'Qo‘shnilaringiz yaxshimi?', 'Ваши соседи хорошие?'),
  (84, 1, 'Ular juda mehribon va ochiq odamlar.', 'Они очень добрые и открытые люди.'),
  (84, 2, 'Bolalaringiz qanday? – Ular kichkina sho‘xlar.', 'Какие ваши дети? – Они маленькие шалуны.'),
  (84, 3, 'Biz tez-tez birga bo‘lib, so‘nggi yangiliklarni muhokama qilamiz.', 'Мы часто собираемся вместе и обсуждаем последние новости.'),
  (84, 4, 'Sizning sevimli faoliyatingiz qanday?', 'Какие ваши любимые занятия?'),
  (84, 5, 'Yoz oylari juda issiq o‘tadi.', 'Летние месяцы проходят очень жарко.'),
  (84, 6, 'Uzoq masofalar yaqinlashganda erta tongda yo‘lga chiqish yaxshiroq.', 'Дальние расстояния лучше преодолевать ранним утром.'),
  (84, 7, 'Ko‘p yillar oldin bu joyda kuchli zilzila bo‘lgan.', 'Много лет назад здесь было сильное землетрясение.'),
  (84, 8, 'Yaxshi munosabatlar uzoq yillar davom etadi.', 'Хорошие отношения длятся долгие годы.'),
  (84, 9, 'Uning ko‘zlari juda chiroyli – katta va yashil.', 'Её глаза очень красивые – большие и зелёные.'),
  (85, 0, 'Sizning tug‘ilgan kuningiz qachon?', 'Когда у вас день рождения?'),
  (85, 1, 'Do‘stlaringiz sizga qanday sovg‘alar berishdi?', 'Какие подарки подарили вам ваши друзья?'),
  (85, 2, 'U menga qiziqarli kitob va yangi telefon sovg‘a qildi.', 'Он подарил мне интересную книгу и новый телефон.'),
  (85, 3, 'U o‘z qo‘llari bilan chiroyli tabriknoma yasagan.', 'Она сделала красивую открытку своими руками.'),
  (85, 4, 'Kecha biz katta, mazali tort pishirdik.', 'Вчера мы испекли большой вкусный торт.'),
  (85, 5, 'Eski suratlarga qarab, baxtli damlarni esladik.', 'Глядя на старые фотографии, мы вспоминали счастливые моменты.'),
  (85, 6, 'U bu yoqimli sovg‘ani juda qadrlaydi.', 'Он очень ценит этот милый подарок.'),
  (85, 7, 'Bugun o‘qituvchi qiyin masalani tushuntirdi.', 'Сегодня учитель объяснил трудную задачу.'),
  (85, 8, 'Siz yangi mashinani ko‘rdingizmi?', 'Вы видели новую машину?'),
  (85, 9, 'Ertaga men o‘zimning eng yaxshi do‘stimga tashrif buyuraman.', 'Завтра я навещу моего самого лучшего друга.');
