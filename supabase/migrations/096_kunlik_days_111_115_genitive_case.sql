-- Kunlik kun 111–115: родительный падеж — asoslar, у есть/нет, miqdor, predloglar, takror.

DELETE FROM public.daily_practice_prompts WHERE day_number >= 111 AND day_number <= 115;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number >= 111 AND day_number <= 115
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number >= 111 AND day_number <= 115;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number >= 111 AND day_number <= 115;

DELETE FROM public.daily_vocab_words WHERE day_number >= 111 AND day_number <= 115;

DELETE FROM public.daily_grammar_matches WHERE day_number >= 111 AND day_number <= 115;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number >= 111 AND day_number <= 115;
DELETE FROM public.daily_grammar_mcqs WHERE day_number >= 111 AND day_number <= 115;
DELETE FROM public.daily_grammar_topics WHERE day_number >= 111 AND day_number <= 115;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  111,
  'Родительный падеж — основы',
  $theory$
**Р.п.** — *кого? чего?* · egalik · yo‘qlik (*нет* + Р.п.) · miqdor · predloglar: *у, из, от, для, без, после*.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (111, 'rule', 0, '«Akamning do‘sti»', 'друг брата', 'друга брата', 'другу брата', 'другом брата', 0),
  (111, 'rule', 1, '«Menda kitob yo‘q»', 'У меня нет книга.', 'У меня нет книги.', 'У меня нет книгу.', 'У меня нет книгой.', 1),
  (111, 'rule', 2, 'Egalik: «o‘qituvchi topogi»', 'мяч учителя', 'мячу учителя', 'мячом учителя', 'мяч учитель', 0),
  (111, 'rule', 3, '«Deraza oldida stul»', 'У окна стоит стул.', 'У окну стоит стул.', 'У окном стоит стул.', 'У окнами стоит стул.', 0),
  (111, 'rule', 4, '«Uyidan chiqib ketdi»', 'Он вышел из дома.', 'Он вышел от дома.', 'Он вышел с дома.', 'Он вышел у дома.', 0),
  (111, 'rule', 5, '«Shakarsiz choy»', 'Чай без сахар.', 'Чай без сахара.', 'Чай без сахару.', 'Чай без сахарами.', 1),
  (111, 'rule', 6, '«Ishdan keyin»', 'после работы', 'после работой', 'после работе', 'после работу', 0),
  (111, 'rule', 7, '«Akada mashina bor»', 'У брата есть машина.', 'У брату есть машина.', 'У братом есть машина.', 'У брата есть машину.', 0),
  (111, 'rule', 8, '«Uyidan bekatgacha»', 'от дома до станции', 'из дома до станции', 'с дома до станции', 'от дома из станции', 0),
  (111, 'rule', 9, '«Onam uchun sovg‘a»', 'Подарок для мамы.', 'Подарок для маме.', 'Подарок для маму.', 'Подарок для мамой.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (111, 0, 0, 'Akamning kitobi', 'книга брата'),
  (111, 0, 1, 'Stakan suv', 'стакан воды'),
  (111, 0, 2, 'Shakar siz choy', 'чай без сахара'),
  (111, 0, 3, 'Onam uchun sovg‘a', 'подарок для мамы'),
  (111, 0, 4, 'Deraza/stol yonida', 'у окна'),
  (111, 0, 5, 'Sumkadan', 'из сумки'),
  (111, 0, 6, 'Uyidan markazgacha yo‘l', 'от дома до станции'),
  (111, 0, 7, 'Do‘stning mashinasi', 'машина друга'),
  (111, 0, 8, 'Xonada stol yo‘q', 'в комнате нет стола'),
  (111, 0, 9, 'Do‘kondan keyin', 'после магазина');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (111, 0, 'uz', '(это, книга, мой, брат)', ARRAY['Это', 'книга', 'моего', 'брата.'], 'Это книга моего брата.'),
  (111, 1, 'uz', '(у, я, нет, время)', ARRAY['У', 'меня', 'нет', 'времени.'], 'У меня нет времени.'),
  (111, 2, 'uz', '(мы, выйти, из, автобус)', ARRAY['Мы', 'вышли', 'из', 'автобуса.'], 'Мы вышли из автобуса.'),
  (111, 3, 'uz', '(поезд, отправляться, в, 5, часов, после, обед)', ARRAY['Поезд', 'отправляется', 'в', '5', 'часов', 'после', 'обеда.'], 'Поезд отправляется в 5 часов после обеда.'),
  (111, 4, 'uz', '(она, купить, кольцо, без, камень)', ARRAY['Она', 'купила', 'кольцо', 'без', 'камня.'], 'Она купила кольцо без камня.'),
  (111, 5, 'uz', '(мы, ждать, автобус, около, станция)', ARRAY['Мы', 'ждали', 'автобус', 'около', 'станции.'], 'Мы ждали автобус около станции.'),
  (111, 6, 'uz', '(у, мой, сестра, есть, красивая, кукла)', ARRAY['У', 'моей', 'сестры', 'есть', 'красивая', 'кукла.'], 'У моей сестры есть красивая кукла.'),
  (111, 7, 'uz', '(подарок, для, папа, лежит, на, стол)', ARRAY['Подарок', 'для', 'папы', 'лежит', 'на', 'столе.'], 'Подарок для папы лежит на столе.'),
  (111, 8, 'uz', '(это, платье, моя, мама)', ARRAY['Это', 'платье', 'моей', 'мамы.'], 'Это платье моей мамы.'),
  (111, 9, 'uz', '(после, работа, я, пойду, в, спортзал)', ARRAY['После', 'работы', 'я', 'пойду', 'в', 'спортзал.'], 'После работы я пойду в спортзал.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (111, 0, 'Tarjima', 'Перевод'),
  (111, 1, 'Garaj', 'Гараж'),
  (111, 2, 'Mashina haydamoq', 'Водить машину'),
  (111, 3, 'Atirgul', 'Роза'),
  (111, 4, 'Vaza', 'Ваза'),
  (111, 5, 'Tarixiy', 'Исторический'),
  (111, 6, 'Bo‘sh', 'Пустой'),
  (111, 7, 'Divan', 'Диван'),
  (111, 8, 'Kreslo', 'Кресло'),
  (111, 9, 'Shisha', 'Стекло'),
  (111, 10, 'Roman', 'Роман'),
  (111, 11, 'Bobo', 'Дедушка'),
  (111, 12, 'Buvi', 'Бабушка'),
  (111, 13, 'Holat', 'Состояние'),
  (111, 14, 'Mulk', 'Имущество');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  111,
  'Моя семья и вещи',
  $body$
В нашей семье много разных вещей.

У меня есть отдельная комната.

У моего брата тоже есть своя комната, но она меньше моей.

В комнате брата много книг и журналов.

У него нет телевизора, но есть компьютер.

В гостиной стоит большой диван для гостей.

Рядом с ним стоит стол из стекла.

На столе всегда стоит ваза с цветами от мамы.

Моя мама очень любит розы.

Папа любит читать после работы.

У него много детективов и исторических романов.

Без этих вещей наш дом был бы пустым.
$body$,
  'kunlik-oqish-111'
);

-- ========== Kun 112 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  112,
  'У меня есть / у меня нет',
  $theory$
**У + Р.п. + есть / нет** · *не было / не будет* dan keyin Р.п. · *меня → у меня*.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (112, 'rule', 0, '«Menda ruchka yo‘q»', 'У меня нет ручка.', 'У меня нет ручки.', 'У меня нет ручку.', 'У меня нет ручкой.', 1),
  (112, 'rule', 1, '«Unda yangi telefon bor»', 'У него есть новый телефон.', 'У него есть нового телефона.', 'У него есть новым телефоном.', 'У него есть новые телефона.', 0),
  (112, 'rule', 2, '«Не было» + Р.п.', 'У меня не было времени.', 'У меня не было время.', 'У меня не было временем.', 'У меня не было временами.', 0),
  (112, 'rule', 3, '«Senda kitob bormi?»', 'У тебя есть книга?', 'У тебя нет книги?', 'У тебя есть книгу?', 'У тебя есть книги?', 0),
  (112, 'rule', 4, '«Не будет проблем»', 'У него не будет проблем.', 'У него не будет проблемы.', 'У него не будет проблему.', 'У него не будет проблемам.', 0),
  (112, 'rule', 5, '«У нас … собака»', 'есть', 'нет', 'будет', 'была', 0),
  (112, 'rule', 6, '«У … есть время?» (siz)', 'вас', 'вам', 'вами', 'всех', 0),
  (112, 'rule', 7, '«У неё … детей»', 'двое', 'два', 'двоих', 'двумя', 0),
  (112, 'rule', 8, '«У него нет денег»', 'У него нет денег.', 'У него нет деньги.', 'У него нет деньгам.', 'У него нет деньгами.', 0),
  (112, 'rule', 9, '«Kecha yomg‘ir bo‘lmadi»', 'Вчера у него не было дождя.', 'Вчера у него не было дождь.', 'Вчера у него не было дождём.', 'Вчера у него не было дождю.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (112, 0, 0, 'Menda pul bor', 'У меня есть деньги.'),
  (112, 0, 1, 'Unda vaqt yo‘q', 'У него нет времени.'),
  (112, 0, 2, 'Senda reja bormi?', 'У тебя есть план?'),
  (112, 0, 3, 'Ularda mashina yo‘q', 'У них нет машины.'),
  (112, 0, 4, 'Unda chiqish yo‘li yo‘q', 'У него нет выхода.'),
  (112, 0, 5, 'Uning akasi yo‘q', 'У неё нет брата.'),
  (112, 0, 6, 'Bizda g‘oya bor edi', 'У нас была идея.'),
  (112, 0, 7, 'Ertaga menda imtihon bo‘ladi', 'Завтра у меня будет экзамен.'),
  (112, 0, 8, 'Sizda yangilik bormi?', 'У вас есть новость?'),
  (112, 0, 9, 'Kecha menda vaqt yo‘q edi', 'Вчера у меня не было времени.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (112, 0, 'uz', '(у, я, есть, новый, книга)', ARRAY['У', 'меня', 'есть', 'новая', 'книга.'], 'У меня есть новая книга.'),
  (112, 1, 'uz', '(у, она, нет, свободный, время)', ARRAY['У', 'неё', 'нет', 'свободного', 'времени.'], 'У неё нет свободного времени.'),
  (112, 2, 'uz', '(у, него, было, много, друзья, в, детство)', ARRAY['У', 'него', 'было', 'много', 'друзей', 'в', 'детстве.'], 'У него было много друзей в детстве.'),
  (112, 3, 'uz', '(у, вас, будет, завтра, экзамен)', ARRAY['У', 'вас', 'завтра', 'будет', 'экзамен?'], 'У вас завтра будет экзамен?'),
  (112, 4, 'uz', '(у, они, нет, деньги, на, билет)', ARRAY['У', 'них', 'нет', 'денег', 'на', 'билет.'], 'У них нет денег на билет.'),
  (112, 5, 'uz', '(у, мы, была, интересная, идея)', ARRAY['У', 'нас', 'была', 'интересная', 'идея.'], 'У нас была интересная идея.'),
  (112, 6, 'uz', '(сколько, у, ты, деньги, сейчас)', ARRAY['Сколько', 'у', 'тебя', 'сейчас', 'денег?'], 'Сколько у тебя сейчас денег?'),
  (112, 7, 'uz', '(у, мой, брат, нет, выход, из, ситуация)', ARRAY['У', 'моего', 'брата', 'нет', 'выхода', 'из', 'ситуации.'], 'У моего брата нет выхода из ситуации.'),
  (112, 8, 'uz', '(у, я, никогда, не, быть, такая, возможность)', ARRAY['У', 'меня', 'никогда', 'не', 'было', 'такой', 'возможности.'], 'У меня никогда не было такой возможности.'),
  (112, 9, 'uz', '(у, него, будет, завтра, новая, машина)', ARRAY['У', 'него', 'завтра', 'будет', 'новая', 'машина.'], 'У него завтра будет новая машина.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (112, 0, 'Imkoniyat', 'Возможность'),
  (112, 1, 'Nashr', 'Издание'),
  (112, 2, 'Bilet', 'Билет'),
  (112, 3, 'Orzu', 'Мечта'),
  (112, 4, 'Havas qilmoq', 'Завидовать'),
  (112, 5, 'Tushkunlikka tushmoq', 'Унывать'),
  (112, 6, 'Sog‘liq', 'Здоровье'),
  (112, 7, 'Yetarlicha', 'Достаточно'),
  (112, 8, 'Mushuk', 'Кошка'),
  (112, 9, 'Garaj', 'Гараж'),
  (112, 10, 'Sayohat qilmoq', 'Путешествовать'),
  (112, 11, 'Istak', 'Желание'),
  (112, 12, 'Maqsad', 'Цель'),
  (112, 13, 'Reja', 'План'),
  (112, 14, 'Yangi nashr', 'Новое издание');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  112,
  'Что у меня есть, а чего нет',
  $body$
У меня есть много планов на этот год.

У меня есть хорошая работа, но у меня мало свободного времени.

У меня есть две собаки, но у меня нет кошки.

У меня есть машина, но у меня нет гаража.

У меня есть желание путешествовать, но у меня нет достаточно денег.

Моя мечта — купить новый дом.

У моего друга уже есть свой дом, и я ему завидую.

Но я не унываю.

Я знаю, что у меня всё будет хорошо.

Главное, у меня есть здоровье, семья и друзья.

А это самое главное.
$body$,
  'kunlik-oqish-112'
);

-- ========== Kun 113 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  113,
  'Числительные и количество',
  $theory$
**много / мало / стакан** + Р.п. · 2–4 + Р.п. ед. · 5+ + Р.п. мн.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (113, 'rule', 0, '«Ko‘p kitoblar»', 'много книги', 'много книг', 'много книгу', 'много книге', 1),
  (113, 'rule', 1, '«Bir stakan suv»', 'стакан воды', 'стакан вода', 'стакан воду', 'стакан водам', 0),
  (113, 'rule', 2, '«Ikki stol»', 'два стола', 'два столы', 'два столов', 'два столом', 0),
  (113, 'rule', 3, '«Besh stol»', 'пять столов', 'пять стола', 'пять столы', 'пять столам', 0),
  (113, 'rule', 4, '«Bir necha talaba»', 'несколько студентов', 'несколько студенты', 'несколько студентам', 'несколько студента', 0),
  (113, 'rule', 5, '«Biroz shakar»', 'немного сахара', 'немного сахар', 'немного сахару', 'немного сахаром', 0),
  (113, 'rule', 6, '«Kilogram go‘sht»', 'килограмм мяса', 'килограмм мясо', 'килограмм мясу', 'килограмм мясом', 0),
  (113, 'rule', 7, '«Qancha vaqt bor?»', 'Сколько у тебя времени?', 'Сколько у тебя время?', 'Сколько у тебя времён?', 'Сколько у тебя временами?', 0),
  (113, 'rule', 8, '«Ko‘p do‘stlar topdi»', 'Он нашёл много друзей.', 'Он нашёл много друга.', 'Он нашёл много друзьям.', 'Он нашёл много друг.', 0),
  (113, 'rule', 9, '«Bitta piyola choy»', 'чашка чая', 'чашка чай', 'чашка чаю', 'чашка чаем', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (113, 0, 0, 'Ko‘p kitob', 'много книг'),
  (113, 0, 1, 'Oz pul', 'мало денег'),
  (113, 0, 2, 'Bitta stakan suv', 'стакан воды'),
  (113, 0, 3, 'Bir necha odam', 'несколько человек'),
  (113, 0, 4, 'Ikki deraza', 'два окна'),
  (113, 0, 5, 'Besh stol', 'пять столов'),
  (113, 0, 6, 'Kilogram shakar', 'килограмм сахара'),
  (113, 0, 7, 'Litr sut', 'литр молока'),
  (113, 0, 8, 'Piyola choy', 'чашка чая'),
  (113, 0, 9, 'Bo‘lak non', 'кусок хлеба');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (113, 0, 'uz', '(в, библиотека, много, интересные, книги)', ARRAY['В', 'библиотеке', 'много', 'интересных', 'книг.'], 'В библиотеке много интересных книг.'),
  (113, 1, 'uz', '(у, он, мало, свободные, деньги)', ARRAY['У', 'него', 'мало', 'свободных', 'денег.'], 'У него мало свободных денег.'),
  (113, 2, 'uz', '(она, купить, два, билет, в, кино)', ARRAY['Она', 'купила', 'два', 'билета', 'в', 'кино.'], 'Она купила два билета в кино.'),
  (113, 3, 'uz', '(на, стол, стоять, стакан, вода)', ARRAY['На', 'столе', 'стоит', 'стакан', 'воды.'], 'На столе стоит стакан воды.'),
  (113, 4, 'uz', '(мы, встретить, несколько, знакомые, лица)', ARRAY['Мы', 'встретили', 'несколько', 'знакомых', 'лиц.'], 'Мы встретили несколько знакомых лиц.'),
  (113, 5, 'uz', '(бабушка, испечь, пять, пирог)', ARRAY['Бабушка', 'испекла', 'пять', 'пирогов.'], 'Бабушка испекла пять пирогов.'),
  (113, 6, 'uz', '(у, меня, нет, достаточно, терпение)', ARRAY['У', 'меня', 'нет', 'достаточного', 'терпения.'], 'У меня нет достаточного терпения.'),
  (113, 7, 'uz', '(я, добавить, немного, сахар, в, кофе)', ARRAY['Я', 'добавлю', 'немного', 'сахара', 'в', 'кофе.'], 'Я добавлю немного сахара в кофе.'),
  (113, 8, 'uz', '(в, холодильник, есть, литр, молоко, и, кусок, сыр)', ARRAY['В', 'холодильнике', 'есть', 'литр', 'молока', 'и', 'кусок', 'сыра.'], 'В холодильнике есть литр молока и кусок сыра.'),
  (113, 9, 'uz', '(сколько, у, ты, родные, брат)', ARRAY['Сколько', 'у', 'тебя', 'родных', 'братьев?'], 'Сколько у тебя родных братьев?');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (113, 0, 'Mahsulot', 'Продукт'),
  (113, 1, 'Xarid', 'Покупка'),
  (113, 2, 'Savat', 'Корзина'),
  (113, 3, 'Qadoq', 'Упаковка'),
  (113, 4, 'Kungaboqar yog‘i', 'Подсолнечное масло'),
  (113, 5, 'Pishloq', 'Сыр'),
  (113, 6, 'Qatiq', 'Сметана'),
  (113, 7, 'Tuxum', 'Яйцо'),
  (113, 8, 'Bodring', 'Огурец'),
  (113, 9, 'Pomidor', 'Помидор'),
  (113, 10, 'Kartoshka', 'Картошка'),
  (113, 11, 'Muzlatgich', 'Холодильник'),
  (113, 12, 'Tovuq go‘shti', 'Куриное мясо'),
  (113, 13, 'Butilka', 'Бутылка'),
  (113, 14, 'Paket', 'Пакет');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  113,
  'Покупки в супермаркете',
  $body$
Вчера я ходил в супермаркет.

Мне нужно было купить много продуктов.

Я взял корзину и пошёл по отделам.

Сначала я купил три килограмма картошки, два огурца и пять помидоров.

Потом я взял одну упаковку яиц и одну бутылку подсолнечного масла.

В молочном отделе я выбрал два пакета молока и одну сметану.

Также я вспомнил, что нужно немного сыра, пачку чая и батон хлеба.

У кассы я посчитал: всего шестнадцать наименований товаров.

Покупка вышла довольно дешёвой.

Дома я разложил все продукты по местам.

Теперь у меня полный холодильник еды.
$body$,
  'kunlik-oqish-113'
);

-- ========== Kun 114 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  114,
  'Предлоги с родительным падежом',
  $theory$
**из / от / без / для / кроме / около / после / вместо / вокруг** + Р.п.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (114, 'rule', 0, '«U uyidan chiqdi»', 'Он вышел из дома.', 'Он вышел от дома.', 'Он вышел с дома.', 'Он вышел у дома.', 0),
  (114, 'rule', 1, '«Akamdan xat»', 'Письмо от брата.', 'Письмо из брата.', 'Письмо с брата.', 'Письмо для брата.', 0),
  (114, 'rule', 2, '«Shakarsiz qahva»', 'Кофе без сахара.', 'Кофе без сахар.', 'Кофе без сахару.', 'Кофе без сахарами.', 0),
  (114, 'rule', 3, '«Uy atrofida bog‘»', 'Сад вокруг дома.', 'Сад около дома.', 'Сад около домом.', 'Сад у дома.', 0),
  (114, 'rule', 4, '«Hammadan tashqari men»', 'Все, кроме меня.', 'Все, кроме мне.', 'Все, кроме мной.', 'Все, кроме меня есть.', 0),
  (114, 'rule', 5, '«Choy o‘rniga suv»', 'Вместо чая вода.', 'Вместо чаю вода.', 'Вместо чай вода.', 'Вместо чая водой.', 0),
  (114, 'rule', 6, '«Stol yog‘ochdan»', 'Стол из дерева.', 'Стол от дерева.', 'Стол с дерева.', 'Стол для дерева.', 0),
  (114, 'rule', 7, '«Ishdan keyin»', 'после работы', 'после работой', 'после работе', 'после работу', 0),
  (114, 'rule', 8, '«Uy yonida mashina»', 'Машина около дома.', 'Машина от дома.', 'Машина из дома.', 'Машина для дома.', 0),
  (114, 'rule', 9, '«Derazadan uzoqlashdim»', 'Я отошёл от двери.', 'Я отошёл из двери.', 'Я отошёл с двери.', 'Я отошёл у двери.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (114, 0, 0, 'Uydan chiqmoq', 'выйти из дома'),
  (114, 0, 1, 'Daraxtdan tushmoq', 'слезть с дерева'),
  (114, 0, 2, 'Akamdan xat', 'письмо от брата'),
  (114, 0, 3, 'Shakarsiz qahva', 'кофе без сахара'),
  (114, 0, 4, 'Uy atrofida bog‘', 'сад вокруг дома'),
  (114, 0, 5, 'Otanga sovg‘a', 'подарок для папы'),
  (114, 0, 6, 'Hammasidan tashqari siz', 'все, кроме вас'),
  (114, 0, 7, 'Choy o‘rniga suv', 'вместо чая'),
  (114, 0, 8, 'Ishdan keyin', 'после работы'),
  (114, 0, 9, 'Uy yonida magazin', 'магазин около дома');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (114, 0, 'uz', '(она, достать, телефон, из, сумка)', ARRAY['Она', 'достала', 'телефон', 'из', 'сумки.'], 'Она достала телефон из сумки.'),
  (114, 1, 'uz', '(я, получить, подарок, от, подруга)', ARRAY['Я', 'получил', 'подарок', 'от', 'подруги.'], 'Я получил подарок от подруги.'),
  (114, 2, 'uz', '(чай, без, сахар, полезный, для, фигура)', ARRAY['Чай', 'без', 'сахара', 'полезен', 'для', 'фигуры.'], 'Чай без сахара полезен для фигуры.'),
  (114, 3, 'uz', '(все, кроме, он, прийти, на, собрание)', ARRAY['Все,', 'кроме', 'него,', 'пришли', 'на', 'собрание.'], 'Все, кроме него, пришли на собрание.'),
  (114, 4, 'uz', '(после, фильм, мы, пойти, в, кафе)', ARRAY['После', 'фильма', 'мы', 'пошли', 'в', 'кафе.'], 'После фильма мы пошли в кафе.'),
  (114, 5, 'uz', '(машина, стоять, около, подъезд)', ARRAY['Машина', 'стояла', 'около', 'подъезда.'], 'Машина стояла около подъезда.'),
  (114, 6, 'uz', '(он, отойти, от, окно, и, закрыть, оно)', ARRAY['Он', 'отошёл', 'от', 'окна', 'и', 'закрыл', 'его.'], 'Он отошёл от окна и закрыл его.'),
  (114, 7, 'uz', '(этот, стол, сделать, из, стекло)', ARRAY['Этот', 'стол', 'сделан', 'из', 'стекла.'], 'Этот стол сделан из стекла.'),
  (114, 8, 'uz', '(я, взять, зонт, вместо, куртка)', ARRAY['Я', 'взял', 'зонт', 'вместо', 'куртки.'], 'Я взял зонт вместо куртки.'),
  (114, 9, 'uz', '(вокруг, наш, дом, расти, деревья)', ARRAY['Вокруг', 'нашего', 'дома', 'растут', 'деревья.'], 'Вокруг нашего дома растут деревья.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (114, 0, 'Qaytmoq', 'Возвращаться'),
  (114, 1, 'Avtobusdan tushmoq', 'Выходить из автобуса'),
  (114, 2, 'Manzara', 'Вид'),
  (114, 3, 'Beton', 'Бетон'),
  (114, 4, 'Bekat', 'Остановка'),
  (114, 5, 'Ofis', 'Офис'),
  (114, 6, 'Piyoda', 'Пешком'),
  (114, 7, 'Yarim soat', 'Полчаса'),
  (114, 8, 'Kundalik', 'Ежедневный'),
  (114, 9, 'Kartochka', 'Карта'),
  (114, 10, 'Kassa', 'Касса'),
  (114, 11, 'Pul yechmoq', 'Снимать деньги'),
  (114, 12, 'Foydalanmoq', 'Пользоваться'),
  (114, 13, 'Rozetka', 'Розетка'),
  (114, 14, 'Taxminan', 'Около');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  114,
  'Из дома в офис',
  $body$
Каждое утро я выхожу из дома ровно в 8 часов.

Около моего дома есть остановка автобуса.

Я сажусь на автобус и еду до центра.

Из окна автобуса я вижу красивый вид на реку.

После получаса езды я выхожу из автобуса и иду пешком до офиса.

Офис находится на пятом этаже большого здания из стекла и бетона.

В офисе у меня есть свой стол и стул.

Кроме меня, в отделе работают ещё четыре человека.

После работы я часто захожу в кафе для встречи с друзьями.

Это моё ежедневное настроение.
$body$,
  'kunlik-oqish-114'
);

-- ========== Kun 115 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  115,
  'Родительный падеж — закрепление',
  $theory$
**Takror Р.п.** — mansublik · *нет* · miqdor · predloglar · dialog/matn.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (115, 'rule', 0, '«У тебя есть …?» (bir aka)', 'братья', 'братьев', 'брат', 'брату', 2),
  (115, 'rule', 1, '«У меня нет …» (singil)', 'сестра', 'сестры', 'сестру', 'сестрой', 1),
  (115, 'rule', 2, '«Сколько … ты купил?» (kitob)', 'книгу', 'книг', 'книга', 'книге', 1),
  (115, 'rule', 3, '«Подарок …» (qiz do‘st)', 'от подруги', 'из подруги', 'с подруги', 'для подруги', 0),
  (115, 'rule', 4, '«В библиотеке много …»', 'студенты', 'студентов', 'студентам', 'студента', 1),
  (115, 'rule', 5, '«После … я пойду домой»', 'занятия', 'занятий', 'занятие', 'занятием', 0),
  (115, 'rule', 6, '«Все, … ты, пришли»', 'кроме тебя', 'кроме ты', 'кроме тобой', 'кроме тебе', 0),
  (115, 'rule', 7, '«Чай … сахара»', 'без', 'безо', 'без сахара', 'без сахар', 2),
  (115, 'rule', 8, '«Она достала книгу … сумки»', 'из', 'от', 'с', 'у', 0),
  (115, 'rule', 9, '«Я вернулся … командировки»', 'из командировки', 'с командировки', 'от командировки', 'для командировки', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (115, 0, 0, 'Uyimiz yonida', 'около нашего дома'),
  (115, 0, 1, 'Mendan tashqari hamma', 'все, кроме тебя'),
  (115, 0, 2, 'Sensiz', 'без тебя'),
  (115, 0, 3, 'Sen uchun', 'для тебя'),
  (115, 0, 4, 'Ishdan keyin', 'после работы'),
  (115, 0, 5, 'Universitetdan', 'из универа'),
  (115, 0, 6, 'Boshliqdan', 'от начальника'),
  (115, 0, 7, 'Bir piyola choy', 'стакан чая'),
  (115, 0, 8, 'Ko‘p odamlar', 'много людей'),
  (115, 0, 9, 'Vaqt kam', 'мало времени');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (115, 0, 'uz', '(у, я, нет, ни, один, свободный, минута)', ARRAY['У', 'меня', 'нет', 'ни', 'одной', 'свободной', 'минуты.'], 'У меня нет ни одной свободной минуты.'),
  (115, 1, 'uz', '(мы, купить, три, килограмм, яблоко)', ARRAY['Мы', 'купили', 'три', 'килограмма', 'яблок.'], 'Мы купили три килограмма яблок.'),
  (115, 2, 'uz', '(она, выйти, из, комната, и, закрыть, дверь)', ARRAY['Она', 'вышла', 'из', 'комнаты', 'и', 'закрыла', 'дверь.'], 'Она вышла из комнаты и закрыла дверь.'),
  (115, 3, 'uz', '(после, обед, мы, пойти, гулять, в, парк)', ARRAY['После', 'обеда', 'мы', 'пойдём', 'гулять', 'в', 'парк.'], 'После обеда мы пойдём гулять в парк.'),
  (115, 4, 'uz', '(я, получить, посылка, от, сестра)', ARRAY['Я', 'получил', 'посылку', 'от', 'сестры.'], 'Я получил посылку от сестры.'),
  (115, 5, 'uz', '(кроме, она, никто, не, прийти, на, экзамен)', ARRAY['Кроме', 'неё,', 'никто', 'не', 'пришёл', 'на', 'экзамен.'], 'Кроме неё, никто не пришёл на экзамен.'),
  (115, 6, 'uz', '(на, стол, стоять, букет, из, роза)', ARRAY['На', 'столе', 'стоит', 'букет', 'из', 'роз.'], 'На столе стоит букет из роз.'),
  (115, 7, 'uz', '(дети, играть, вокруг, ёлка)', ARRAY['Дети', 'играли', 'вокруг', 'ёлки.'], 'Дети играли вокруг ёлки.'),
  (115, 8, 'uz', '(у, он, много, долг)', ARRAY['У', 'него', 'много', 'долгов.'], 'У него много долгов.'),
  (115, 9, 'uz', '(сколько, у, вы, остаться, деньги)', ARRAY['Сколько', 'у', 'вас', 'осталось', 'денег?'], 'Сколько у вас осталось денег?');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (115, 0, 'Vino', 'Вино'),
  (115, 1, 'Konfet', 'Конфета'),
  (115, 2, 'Quti', 'Коробка'),
  (115, 3, 'Shokolad', 'Шоколад'),
  (115, 4, 'Yegulik', 'Еда'),
  (115, 5, 'Ichimlik', 'Напиток'),
  (115, 6, 'Shubha', 'Сомнение'),
  (115, 7, 'Xotira', 'Воспоминание'),
  (115, 8, 'Bayram', 'Праздник'),
  (115, 9, 'Taklif qilmoq', 'Приглашать'),
  (115, 10, 'Tug‘ilgan kun', 'День рождения'),
  (115, 11, 'Mehmon', 'Гость'),
  (115, 12, 'Yig‘ilmoq', 'Собираться'),
  (115, 13, 'O‘tmoq (kecha)', 'Удаться'),
  (115, 14, 'Yarim tun', 'Полночь');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  115,
  'День рождения друга',
  $body$
У моего друга Антона вчера был день рождения.

Я купил для него подарок — бутылку хорошего вина и коробку конфет.

Кроме меня пришли многие его друзья из университета и с работы.

Мы все собрались у него дома.

На столе было много еды и напитков.

Его мама испекла большой тёмный торт.

После ужина мы пили чай с тортом и разговаривали о разных вещах.

Без сомнения, этот вечер удался.

Я вернулся домой около полуночи.

У меня осталось много приятных воспоминаний об этом дне.
$body$,
  'kunlik-oqish-115'
);


INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-111', 'Без', 'без', '…siz', NULL),
  ('kunlik-oqish-111', 'большой', 'большой', 'katta', NULL),
  ('kunlik-oqish-111', 'брата', 'брата', 'Akani', NULL),
  ('kunlik-oqish-111', 'бы', 'бы', 'Hatto', NULL),
  ('kunlik-oqish-111', 'был', 'был', 'Bo‘lgan edi', NULL),
  ('kunlik-oqish-111', 'В', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-111', 'ваза', 'ваза', 'Vaza', NULL),
  ('kunlik-oqish-111', 'вещей', 'вещей', 'Narsalar', NULL),
  ('kunlik-oqish-111', 'всегда', 'всегда', 'Har doim', NULL),
  ('kunlik-oqish-111', 'гостей', 'гостей', 'Mehmonlarni', NULL),
  ('kunlik-oqish-111', 'гостиной', 'гостиной', 'Mehmonxonada (-ой)', NULL),
  ('kunlik-oqish-111', 'детективов', 'детективов', 'Detektivlar (-род.)', NULL),
  ('kunlik-oqish-111', 'диван', 'диван', 'Divan', NULL),
  ('kunlik-oqish-111', 'для', 'для', 'uchun', NULL),
  ('kunlik-oqish-111', 'дом', 'дом', 'uy', NULL),
  ('kunlik-oqish-111', 'есть', 'есть', 'Yemoq (inf)', NULL),
  ('kunlik-oqish-111', 'журналов', 'журналов', 'Jurnallar (род. мн.)', NULL),
  ('kunlik-oqish-111', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-111', 'из', 'из', '…dan', NULL),
  ('kunlik-oqish-111', 'исторических', 'исторических', 'Tarixiy (-их)', NULL),
  ('kunlik-oqish-111', 'книг', 'книг', 'Kitoblar', NULL),
  ('kunlik-oqish-111', 'комната', 'комната', 'Xona', NULL),
  ('kunlik-oqish-111', 'комнате', 'комнате', 'Xonada', NULL),
  ('kunlik-oqish-111', 'компьютер', 'компьютер', 'Kompyuter', NULL),
  ('kunlik-oqish-111', 'любит', 'любит', 'Yaxshi ko‘radi', NULL),
  ('kunlik-oqish-111', 'мама', 'мама', 'Ona', NULL),
  ('kunlik-oqish-111', 'мамы', 'мамы', 'Onasi (-ы)', NULL),
  ('kunlik-oqish-111', 'меньше', 'меньше', 'Kamroq', NULL),
  ('kunlik-oqish-111', 'меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-111', 'много', 'много', 'Ko‘p', NULL),
  ('kunlik-oqish-111', 'моего', 'моего', 'Mening (rod.)', NULL),
  ('kunlik-oqish-111', 'моей', 'моей', 'Mening …-ga', NULL),
  ('kunlik-oqish-111', 'Моя', 'моя', 'Mening (ayol otl.)', NULL),
  ('kunlik-oqish-111', 'На', 'на', '…da', NULL),
  ('kunlik-oqish-111', 'наш', 'наш', 'Bizning', NULL),
  ('kunlik-oqish-111', 'нашей', 'нашей', 'Bizning (род.)', NULL),
  ('kunlik-oqish-111', 'него', 'него', 'U (род)', NULL),
  ('kunlik-oqish-111', 'нет', 'нет', 'Yo‘q', NULL),
  ('kunlik-oqish-111', 'ним', 'ним', 'U bilan', NULL),
  ('kunlik-oqish-111', 'но', 'но', 'Lekin', NULL),
  ('kunlik-oqish-111', 'она', 'она', 'U (ayol)', NULL),
  ('kunlik-oqish-111', 'от', 'от', '…dan', NULL),
  ('kunlik-oqish-111', 'отдельная', 'отдельная', 'Alohida (-ая)', NULL),
  ('kunlik-oqish-111', 'очень', 'очень', 'Juda', NULL),
  ('kunlik-oqish-111', 'Папа', 'папа', 'Ota', NULL),
  ('kunlik-oqish-111', 'после', 'после', '…dan keyin', NULL),
  ('kunlik-oqish-111', 'пустым', 'пустым', 'Bo‘sh (-ым)', NULL),
  ('kunlik-oqish-111', 'работы', 'работы', 'Ishdan', NULL),
  ('kunlik-oqish-111', 'разных', 'разных', 'Har xil (род.)', NULL),
  ('kunlik-oqish-111', 'розы', 'розы', 'Atirgullar (-ы)', NULL),
  ('kunlik-oqish-111', 'романов', 'романов', 'Romanlar (-род.)', NULL),
  ('kunlik-oqish-111', 'Рядом', 'рядом', 'Yon-atrofda', NULL),
  ('kunlik-oqish-111', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-111', 'своя', 'своя', 'o‘zining', NULL),
  ('kunlik-oqish-111', 'семье', 'семье', 'Oilada', NULL),
  ('kunlik-oqish-111', 'стекла', 'стекла', 'Shisha (-а род.)', NULL),
  ('kunlik-oqish-111', 'стоит', 'стоит', 'Turibdi', NULL),
  ('kunlik-oqish-111', 'стол', 'стол', 'Stol', NULL),
  ('kunlik-oqish-111', 'столе', 'столе', 'Stolda', NULL),
  ('kunlik-oqish-111', 'телевизора', 'телевизора', 'Televizor (-а)', NULL),
  ('kunlik-oqish-111', 'тоже', 'тоже', 'Ham', NULL),
  ('kunlik-oqish-111', 'У', 'у', '…da bor', NULL),
  ('kunlik-oqish-111', 'цветами', 'цветами', 'Gullar bilan (-ами)', NULL),
  ('kunlik-oqish-111', 'читать', 'читать', 'O‘qimoq', NULL),
  ('kunlik-oqish-111', 'этих', 'этих', 'Bu … (gen pl)', NULL),
  ('kunlik-oqish-112', 'А', 'а', 'Ammo / esa', NULL),
  ('kunlik-oqish-112', 'будет', 'будет', 'Bo‘ladi', NULL),
  ('kunlik-oqish-112', 'времени', 'времени', 'Vaqt (род.)', NULL),
  ('kunlik-oqish-112', 'всё', 'все', 'Hammasi', NULL),
  ('kunlik-oqish-112', 'гаража', 'гаража', 'Garaj (-а)', NULL),
  ('kunlik-oqish-112', 'Главное', 'главное', 'Eng muhimi', NULL),
  ('kunlik-oqish-112', 'год', 'год', 'Yil', NULL),
  ('kunlik-oqish-112', 'две', 'две', 'Ikki', NULL),
  ('kunlik-oqish-112', 'денег', 'денег', 'Pul (род.)', NULL),
  ('kunlik-oqish-112', 'дом', 'дом', 'uy', NULL),
  ('kunlik-oqish-112', 'достаточно', 'достаточно', 'Yetarli', NULL),
  ('kunlik-oqish-112', 'друга', 'друга', 'Do‘st (род.; 2 uchun)', NULL),
  ('kunlik-oqish-112', 'друзья', 'друзья', 'Do‘stlar', NULL),
  ('kunlik-oqish-112', 'ему', 'ему', 'Unga (erkak)', NULL),
  ('kunlik-oqish-112', 'есть', 'есть', 'Yemoq (inf)', NULL),
  ('kunlik-oqish-112', 'желание', 'желание', 'Xohish', NULL),
  ('kunlik-oqish-112', 'завидую', 'завидую', 'Havas qilaman', NULL),
  ('kunlik-oqish-112', 'здоровье', 'здоровье', 'Sog‘liq', NULL),
  ('kunlik-oqish-112', 'знаю', 'знаю', 'Bilaman', NULL),
  ('kunlik-oqish-112', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-112', 'кошки', 'кошки', 'Mushuk (-и род.)', NULL),
  ('kunlik-oqish-112', 'купить', 'купить', 'Sotib olish', NULL),
  ('kunlik-oqish-112', 'мало', 'мало', 'Oz', NULL),
  ('kunlik-oqish-112', 'машина', 'машина', 'Mashina', NULL),
  ('kunlik-oqish-112', 'меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-112', 'мечта', 'мечта', 'Orzu (-а)', NULL),
  ('kunlik-oqish-112', 'много', 'много', 'Ko‘p', NULL),
  ('kunlik-oqish-112', 'моего', 'моего', 'Mening (rod.)', NULL),
  ('kunlik-oqish-112', 'Моя', 'моя', 'Mening (ayol otl.)', NULL),
  ('kunlik-oqish-112', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-112', 'не', 'не', 'Emas', NULL),
  ('kunlik-oqish-112', 'нет', 'нет', 'Yo‘q', NULL),
  ('kunlik-oqish-112', 'но', 'но', 'Lekin', NULL),
  ('kunlik-oqish-112', 'новый', 'новый', 'Yangi', NULL),
  ('kunlik-oqish-112', 'планов', 'планов', 'Rejalar (-ов)', NULL),
  ('kunlik-oqish-112', 'путешествовать', 'путешествовать', 'Sayohat qilmoq', NULL),
  ('kunlik-oqish-112', 'работа', 'работа', 'Ish', NULL),
  ('kunlik-oqish-112', 'самое', 'самое', 'Eng (-ое)', NULL),
  ('kunlik-oqish-112', 'свободного', 'свободного', 'Bo‘sh (-ого)', NULL),
  ('kunlik-oqish-112', 'свой', 'свой', 'O‘zing', NULL),
  ('kunlik-oqish-112', 'семья', 'семья', 'Oila', NULL),
  ('kunlik-oqish-112', 'собаки', 'собаки', 'It (-и род.)', NULL),
  ('kunlik-oqish-112', 'У', 'у', '…da bor', NULL),
  ('kunlik-oqish-112', 'уже', 'уже', 'Allaqachon', NULL),
  ('kunlik-oqish-112', 'унываю', 'унываю', 'Tushkunlikka tushaman', NULL),
  ('kunlik-oqish-112', 'хорошая', 'хорошая', 'Yaxshi', NULL),
  ('kunlik-oqish-112', 'хорошо', 'хорошо', 'Yaxshi', NULL),
  ('kunlik-oqish-112', 'что', 'что', 'Nima', NULL),
  ('kunlik-oqish-112', 'это', 'это', 'Bu', NULL),
  ('kunlik-oqish-112', 'этот', 'этот', 'Bu', NULL),
  ('kunlik-oqish-112', 'я', 'я', 'Men', NULL),
  ('kunlik-oqish-113', 'батон', 'батон', 'Uzun baton non', NULL),
  ('kunlik-oqish-113', 'бутылку', 'бутылку', 'Butilkani (-у)', NULL),
  ('kunlik-oqish-113', 'было', 'было', 'Bo‘ldi', NULL),
  ('kunlik-oqish-113', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-113', 'взял', 'взял', 'Oldi', NULL),
  ('kunlik-oqish-113', 'все', 'все', 'Hammasi', NULL),
  ('kunlik-oqish-113', 'всего', 'всего', 'Jami / eng', NULL),
  ('kunlik-oqish-113', 'вспомнил', 'вспомнил', 'Esladi', NULL),
  ('kunlik-oqish-113', 'Вчера', 'вчера', 'Kecha', NULL),
  ('kunlik-oqish-113', 'выбрал', 'выбрал', 'Tanladi', NULL),
  ('kunlik-oqish-113', 'вышла', 'вышла', 'Chiqdi (turmushga)', NULL),
  ('kunlik-oqish-113', 'два', 'два', 'Ikki', NULL),
  ('kunlik-oqish-113', 'дешёвой', 'дешевой', 'Arzon (-ой)', NULL),
  ('kunlik-oqish-113', 'довольно', 'довольно', 'Ancha', NULL),
  ('kunlik-oqish-113', 'Дома', 'дома', 'Uyda', NULL),
  ('kunlik-oqish-113', 'еды', 'еды', 'Ovqat (-ы род.)', NULL),
  ('kunlik-oqish-113', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-113', 'картошки', 'картошки', 'Kartoshka (род.)', NULL),
  ('kunlik-oqish-113', 'кассы', 'кассы', 'Kassa', NULL),
  ('kunlik-oqish-113', 'килограмма', 'килограмма', 'Kilogramm (род.)', NULL),
  ('kunlik-oqish-113', 'корзину', 'корзину', 'Savatni', NULL),
  ('kunlik-oqish-113', 'купил', 'купил', 'Sotib oldim', NULL),
  ('kunlik-oqish-113', 'купить', 'купить', 'Sotib olish', NULL),
  ('kunlik-oqish-113', 'масла', 'масла', 'Yog‘ (-а род.)', NULL),
  ('kunlik-oqish-113', 'меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-113', 'местам', 'местам', 'Joylarga (-ам)', NULL),
  ('kunlik-oqish-113', 'Мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-113', 'много', 'много', 'Ko‘p', NULL),
  ('kunlik-oqish-113', 'молока', 'молока', 'Sut (-а род.)', NULL),
  ('kunlik-oqish-113', 'молочном', 'молочном', 'Sut bo‘limida (-ом)', NULL),
  ('kunlik-oqish-113', 'наименований', 'наименований', 'Nomdagi pozitsiyalar (-ий)', NULL),
  ('kunlik-oqish-113', 'немного', 'немного', 'Biroz', NULL),
  ('kunlik-oqish-113', 'нужно', 'нужно', 'Kerak', NULL),
  ('kunlik-oqish-113', 'огурца', 'огурца', 'Bodring (-а)', NULL),
  ('kunlik-oqish-113', 'одну', 'одну', 'Bittasini (-ну)', NULL),
  ('kunlik-oqish-113', 'отделам', 'отделам', 'Bo‘limlar bo‘ylab (-ам)', NULL),
  ('kunlik-oqish-113', 'отделе', 'отделе', 'Bo‘limda (-е)', NULL),
  ('kunlik-oqish-113', 'пакета', 'пакета', 'Paket (-а род.)', NULL),
  ('kunlik-oqish-113', 'пачку', 'пачку', 'Pachkani (-у)', NULL),
  ('kunlik-oqish-113', 'по', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-113', 'подсолнечного', 'подсолнечного', 'Kungaboqar yog‘idan (-ого)', NULL),
  ('kunlik-oqish-113', 'Покупка', 'покупка', 'Xarid', NULL),
  ('kunlik-oqish-113', 'полный', 'полный', 'To‘la (-ый)', NULL),
  ('kunlik-oqish-113', 'помидоров', 'помидоров', 'Pomidorlar (-ов)', NULL),
  ('kunlik-oqish-113', 'посчитал', 'посчитал', 'Sanadi', NULL),
  ('kunlik-oqish-113', 'Потом', 'потом', 'Keyin', NULL),
  ('kunlik-oqish-113', 'пошёл', 'пошел', 'Ketdi (boshlanish, СВ)', NULL),
  ('kunlik-oqish-113', 'продуктов', 'продуктов', 'Mahsulotlar (род.)', NULL),
  ('kunlik-oqish-113', 'продукты', 'продукты', 'Mahsulotlar', NULL),
  ('kunlik-oqish-113', 'пять', 'пять', 'Besh', NULL),
  ('kunlik-oqish-113', 'разложил', 'разложил', 'Joylashtirdi', NULL),
  ('kunlik-oqish-113', 'сметану', 'сметану', 'Qatiqni (-у)', NULL),
  ('kunlik-oqish-113', 'Сначала', 'сначала', 'Avval', NULL),
  ('kunlik-oqish-113', 'супермаркет', 'супермаркет', 'Supermarket', NULL),
  ('kunlik-oqish-113', 'сыра', 'сыра', 'Pishloq (-а род.)', NULL),
  ('kunlik-oqish-113', 'Также', 'также', 'shuningdek', NULL),
  ('kunlik-oqish-113', 'Теперь', 'теперь', 'Endi', NULL),
  ('kunlik-oqish-113', 'товаров', 'товаров', 'Mahsulotlar (-ов)', NULL),
  ('kunlik-oqish-113', 'три', 'три', 'Uch', NULL),
  ('kunlik-oqish-113', 'У', 'у', '…da bor', NULL),
  ('kunlik-oqish-113', 'упаковку', 'упаковку', 'Qadoqni (-у)', NULL),
  ('kunlik-oqish-113', 'хлеба', 'хлеба', 'Non (-а род.)', NULL),
  ('kunlik-oqish-113', 'ходил', 'ходил', 'Borgan edi (bir marta)', NULL),
  ('kunlik-oqish-113', 'холодильник', 'холодильник', 'Muzlatgich', NULL),
  ('kunlik-oqish-113', 'чая', 'чая', 'Choy (-я род.)', NULL),
  ('kunlik-oqish-113', 'что', 'что', 'Nima', NULL),
  ('kunlik-oqish-113', 'шестнадцать', 'шестнадцать', 'O‘n olti', NULL),
  ('kunlik-oqish-113', 'я', 'я', 'Men', NULL),
  ('kunlik-oqish-113', 'яиц', 'яиц', 'Tuxumlar (-иц род.)', NULL),
  ('kunlik-oqish-114', 'автобус', 'автобус', 'Avtobus', NULL),
  ('kunlik-oqish-114', 'автобуса', 'автобуса', 'Avtobus', NULL),
  ('kunlik-oqish-114', 'бетона', 'бетона', 'Beton (-а род.)', NULL),
  ('kunlik-oqish-114', 'большого', 'большого', 'Katta (род. одуш.)', NULL),
  ('kunlik-oqish-114', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-114', 'вид', 'вид', 'Manzara / ko‘rinish', NULL),
  ('kunlik-oqish-114', 'вижу', 'вижу', 'ko‘raman', NULL),
  ('kunlik-oqish-114', 'встречи', 'встречи', 'Uchrashuvlar', NULL),
  ('kunlik-oqish-114', 'выхожу', 'выхожу', 'Chiqaman', NULL),
  ('kunlik-oqish-114', 'для', 'для', 'uchun', NULL),
  ('kunlik-oqish-114', 'до', 'до', '…gacha', NULL),
  ('kunlik-oqish-114', 'дома', 'дома', 'Uyda', NULL),
  ('kunlik-oqish-114', 'друзьями', 'друзьями', 'Do‘stlar bilan', NULL),
  ('kunlik-oqish-114', 'еду', 'еду', 'Ovqat', NULL),
  ('kunlik-oqish-114', 'ежедневное', 'ежедневное', 'Kundalik (-ое)', NULL),
  ('kunlik-oqish-114', 'езды', 'езды', 'Sayohat (-ы род.)', NULL),
  ('kunlik-oqish-114', 'есть', 'есть', 'Yemoq (inf)', NULL),
  ('kunlik-oqish-114', 'ещё', 'еще', 'Yana', NULL),
  ('kunlik-oqish-114', 'захожу', 'захожу', 'Kiraman', NULL),
  ('kunlik-oqish-114', 'здания', 'здания', 'Binolar', NULL),
  ('kunlik-oqish-114', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-114', 'иду', 'иду', 'Ketyapman', NULL),
  ('kunlik-oqish-114', 'из', 'из', '…dan', NULL),
  ('kunlik-oqish-114', 'Каждое', 'каждое', 'Har bir', NULL),
  ('kunlik-oqish-114', 'кафе', 'кафе', 'Kafe', NULL),
  ('kunlik-oqish-114', 'красивый', 'красивый', 'chiroyli', NULL),
  ('kunlik-oqish-114', 'Кроме', 'кроме', 'Bundan tashqari', NULL),
  ('kunlik-oqish-114', 'меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-114', 'моё', 'мое', 'Mening (o‘rta otl.)', NULL),
  ('kunlik-oqish-114', 'моего', 'моего', 'Mening (rod.)', NULL),
  ('kunlik-oqish-114', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-114', 'настроение', 'настроение', 'kayfiyat', NULL),
  ('kunlik-oqish-114', 'находится', 'находится', 'Joylashgan', NULL),
  ('kunlik-oqish-114', 'окна', 'окна', 'Derazalar', NULL),
  ('kunlik-oqish-114', 'Около', 'около', 'Taxminan', NULL),
  ('kunlik-oqish-114', 'остановка', 'остановка', 'Bekat', NULL),
  ('kunlik-oqish-114', 'отделе', 'отделе', 'Bo‘limda (-е)', NULL),
  ('kunlik-oqish-114', 'Офис', 'офис', 'Ofis', NULL),
  ('kunlik-oqish-114', 'офиса', 'офиса', 'Ofis (-а род.)', NULL),
  ('kunlik-oqish-114', 'офисе', 'офисе', 'Ofisda', NULL),
  ('kunlik-oqish-114', 'пешком', 'пешком', 'Piyoda', NULL),
  ('kunlik-oqish-114', 'получаса', 'получаса', 'Yarim soat (-а род.)', NULL),
  ('kunlik-oqish-114', 'После', 'после', '…dan keyin', NULL),
  ('kunlik-oqish-114', 'пятом', 'пятом', 'Beshinchi (-ом)', NULL),
  ('kunlik-oqish-114', 'работают', 'работают', 'ishlashadi', NULL),
  ('kunlik-oqish-114', 'работы', 'работы', 'Ishdan', NULL),
  ('kunlik-oqish-114', 'реку', 'реку', 'Daryoga (-у)', NULL),
  ('kunlik-oqish-114', 'ровно', 'ровно', 'Aniq', NULL),
  ('kunlik-oqish-114', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-114', 'сажусь', 'сажусь', 'Minaman', NULL),
  ('kunlik-oqish-114', 'свой', 'свой', 'O‘zing', NULL),
  ('kunlik-oqish-114', 'стекла', 'стекла', 'Shisha (-а род.)', NULL),
  ('kunlik-oqish-114', 'стол', 'стол', 'Stol', NULL),
  ('kunlik-oqish-114', 'стул', 'стул', 'Stul', NULL),
  ('kunlik-oqish-114', 'у', 'у', '…da bor', NULL),
  ('kunlik-oqish-114', 'утро', 'утро', 'Ertalab', NULL),
  ('kunlik-oqish-114', 'центра', 'центра', 'Markazidan', NULL),
  ('kunlik-oqish-114', 'часов', 'часов', 'Soat', NULL),
  ('kunlik-oqish-114', 'часто', 'часто', 'Tez-tez', NULL),
  ('kunlik-oqish-114', 'человека', 'человека', 'Odamni', NULL),
  ('kunlik-oqish-114', 'четыре', 'четыре', 'To‘rt', NULL),
  ('kunlik-oqish-114', 'этаже', 'этаже', 'Qavatda', NULL),
  ('kunlik-oqish-114', 'Это', 'это', 'Bu', NULL),
  ('kunlik-oqish-114', 'я', 'я', 'Men', NULL),
  ('kunlik-oqish-115', 'Антона', 'антона', 'Antonning', NULL),
  ('kunlik-oqish-115', 'Без', 'без', '…siz', NULL),
  ('kunlik-oqish-115', 'большой', 'большой', 'katta', NULL),
  ('kunlik-oqish-115', 'бутылку', 'бутылку', 'Butilkani (-у)', NULL),
  ('kunlik-oqish-115', 'был', 'был', 'Bo‘lgan edi', NULL),
  ('kunlik-oqish-115', 'было', 'было', 'Bo‘ldi', NULL),
  ('kunlik-oqish-115', 'вернулся', 'вернулся', 'Qaytdi', NULL),
  ('kunlik-oqish-115', 'вечер', 'вечер', 'Kech', NULL),
  ('kunlik-oqish-115', 'вещах', 'вещах', 'Narsalar haqida', NULL),
  ('kunlik-oqish-115', 'вина', 'вина', 'Vino (-а род.)', NULL),
  ('kunlik-oqish-115', 'воспоминаний', 'воспоминаний', 'Xotiralar (-ий род.)', NULL),
  ('kunlik-oqish-115', 'все', 'все', 'Hammasi', NULL),
  ('kunlik-oqish-115', 'вчера', 'вчера', 'Kecha', NULL),
  ('kunlik-oqish-115', 'день', 'день', 'Kun', NULL),
  ('kunlik-oqish-115', 'для', 'для', 'uchun', NULL),
  ('kunlik-oqish-115', 'дне', 'дне', 'Kunda (-е род.)', NULL),
  ('kunlik-oqish-115', 'дома', 'дома', 'Uyda', NULL),
  ('kunlik-oqish-115', 'домой', 'домой', 'Uyga', NULL),
  ('kunlik-oqish-115', 'друга', 'друга', 'Do‘st (род.; 2 uchun)', NULL),
  ('kunlik-oqish-115', 'друзья', 'друзья', 'Do‘stlar', NULL),
  ('kunlik-oqish-115', 'его', 'его', 'Uni', NULL),
  ('kunlik-oqish-115', 'еды', 'еды', 'Ovqat (-ы род.)', NULL),
  ('kunlik-oqish-115', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-115', 'из', 'из', '…dan', NULL),
  ('kunlik-oqish-115', 'испекла', 'испекла', 'Pishirdi (ayol)', NULL),
  ('kunlik-oqish-115', 'конфет', 'конфет', 'Konfetlar (-ет род.)', NULL),
  ('kunlik-oqish-115', 'коробку', 'коробку', 'Qutini', NULL),
  ('kunlik-oqish-115', 'Кроме', 'кроме', 'Bundan tashqari', NULL),
  ('kunlik-oqish-115', 'купил', 'купил', 'Sotib oldim', NULL),
  ('kunlik-oqish-115', 'мама', 'мама', 'Ona', NULL),
  ('kunlik-oqish-115', 'меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-115', 'многие', 'многие', 'ko‘pchilik', NULL),
  ('kunlik-oqish-115', 'много', 'много', 'Ko‘p', NULL),
  ('kunlik-oqish-115', 'моего', 'моего', 'Mening (rod.)', NULL),
  ('kunlik-oqish-115', 'Мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-115', 'На', 'на', '…da', NULL),
  ('kunlik-oqish-115', 'напитков', 'напитков', 'Ichimliklar (-ов)', NULL),
  ('kunlik-oqish-115', 'него', 'него', 'U (род)', NULL),
  ('kunlik-oqish-115', 'о', 'о', '…haqida', NULL),
  ('kunlik-oqish-115', 'об', 'об', '…haqida', NULL),
  ('kunlik-oqish-115', 'около', 'около', 'Taxminan', NULL),
  ('kunlik-oqish-115', 'осталось', 'осталось', 'Qoldi', NULL),
  ('kunlik-oqish-115', 'пили', 'пили', 'Ichdilar', NULL),
  ('kunlik-oqish-115', 'подарок', 'подарок', 'Sovg‘a', NULL),
  ('kunlik-oqish-115', 'полуночи', 'полуночи', 'Yarim tun', NULL),
  ('kunlik-oqish-115', 'После', 'после', '…dan keyin', NULL),
  ('kunlik-oqish-115', 'пришли', 'пришли', 'Kelishdi', NULL),
  ('kunlik-oqish-115', 'приятных', 'приятных', 'Yoqimli (-ых)', NULL),
  ('kunlik-oqish-115', 'работы', 'работы', 'Ishdan', NULL),
  ('kunlik-oqish-115', 'разговаривали', 'разговаривали', 'Gaplashdik', NULL),
  ('kunlik-oqish-115', 'разных', 'разных', 'Har xil (род.)', NULL),
  ('kunlik-oqish-115', 'рождения', 'рождения', 'Tug‘ilgan kun', NULL),
  ('kunlik-oqish-115', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-115', 'собрались', 'собрались', 'Yig‘ildilar', NULL),
  ('kunlik-oqish-115', 'сомнения', 'сомнения', 'Shubha (-ия род.)', NULL),
  ('kunlik-oqish-115', 'столе', 'столе', 'Stolda', NULL),
  ('kunlik-oqish-115', 'тёмный', 'темный', 'To‘q rang (-ый)', NULL),
  ('kunlik-oqish-115', 'торт', 'торт', 'Tort', NULL),
  ('kunlik-oqish-115', 'тортом', 'тортом', 'Tort bilan (-ом)', NULL),
  ('kunlik-oqish-115', 'У', 'у', '…da bor', NULL),
  ('kunlik-oqish-115', 'удался', 'удался', 'Muvaffaqiyatli bo‘ldi', NULL),
  ('kunlik-oqish-115', 'ужина', 'ужина', 'Kechki ovqatdan (-на)', NULL),
  ('kunlik-oqish-115', 'университета', 'университета', 'Universitet …', NULL),
  ('kunlik-oqish-115', 'хорошего', 'хорошего', 'yaxshi', NULL),
  ('kunlik-oqish-115', 'чай', 'чай', 'Choy', NULL),
  ('kunlik-oqish-115', 'этом', 'этом', 'Bu (joyda)', NULL),
  ('kunlik-oqish-115', 'этот', 'этот', 'Bu', NULL),
  ('kunlik-oqish-115', 'Я', 'я', 'Men', NULL);


INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (111, 0, 'Sizning ota-onangizning uyi qayerda?', 'Где дом ваших родителей?'),
  (111, 1, 'Mening xonam akamning xonasidan kattaroq.', 'Моя комната больше комнаты брата.'),
  (111, 2, 'Stolda onamning gullari turibdi.', 'На столе стоят цветы моей мамы.'),
  (111, 3, 'Sizda bu kitobning tarjimasi bormi?', 'У вас есть перевод этой книги?'),
  (111, 4, 'Iltimos, menga stakan suv bering.', 'Дайте мне, пожалуйста, стакан воды.'),
  (111, 5, 'Kutubxonada tarixiy kitoblar ko‘p.', 'В библиотеке много исторических книг.'),
  (111, 6, 'Kechqurun ishdan keyin nima qilasiz?', 'Что вы делаете вечером после работы?'),
  (111, 7, 'U do‘kondan shakarsiz choy sotib oldi.', 'Она купила в магазине чай без сахара.'),
  (111, 8, 'Mehmonxonada divan yo‘q, lekin kreslo bor.', 'В гостиной нет дивана, но есть кресло.'),
  (111, 9, 'Dadam mashinasini garajdan haydab chiqdi.', 'Папа вывел свою машину из гаража.'),
  (112, 0, 'Sizda uy hayvoni bormi? – Ha, itim bor.', 'У вас есть домашнее животное? – Да, у меня есть собака.'),
  (112, 1, 'Unda bo‘sh vaqt kam, chunki u ko‘p ishlaydi.', 'У него мало свободного времени, потому что он много работает.'),
  (112, 2, 'Sayohat qilish istagi kuchli, lekin pul yo‘q.', 'Желание путешествовать есть, но денег нет.'),
  (112, 3, 'Sizda qanday rejalar bor?', 'Какие у вас планы?'),
  (112, 4, 'Menda bu kitobning yangi nashri yo‘q.', 'У меня нет нового издания этой книги.'),
  (112, 5, 'Kecha menda yaxshi imkoniyat bor edi.', 'Вчера у меня была хорошая возможность.'),
  (112, 6, 'Sizda chipta uchun pul bormi?', 'У вас есть деньги на билет?'),
  (112, 7, 'Uning bolalari ko‘p, lekin vaqti kam.', 'У него много детей, но мало времени.'),
  (112, 8, 'Bizda shu hafta imtihon bo‘ladi.', 'У нас на этой неделе будет экзамен.'),
  (112, 9, 'Menda hech qanday muammo yo‘q.', 'У меня нет никаких проблем.'),
  (113, 0, 'Siz do‘kondan nimalar sotib oldingiz?', 'Что вы купили в магазине?'),
  (113, 1, 'Menga bir stakan suv va ikki bo‘lak non bering.', 'Дайте мне стакан воды и два куска хлеба.'),
  (113, 2, 'Qancha pul kerak? – Taxminan besh ming so‘m.', 'Сколько нужно денег? – Примерно пять тысяч сум.'),
  (113, 3, 'Savatda uchta olma va bir dasta sabzi bor.', 'В корзине три яблока и один пучок моркови.'),
  (113, 4, 'Sizda qancha aka-uka yoki opa-singil bor?', 'Сколько у вас братьев и сестёр?'),
  (113, 5, 'Bu tort uchun menga ozgina shakar va to‘rtta tuxum kerak.', 'Для этого торта мне нужно чуть-чуть сахара и четыре яйца.'),
  (113, 6, 'Oilamizda besh kishi: ota-onam va uchta bola.', 'В нашей семье пять человек: родители и трое детей.'),
  (113, 7, 'Rozetkada elektr yo‘q.', 'В розетке нет электричества.'),
  (113, 8, 'Choyga sut qo‘shasizmi? – Ha, biroz sut va qand.', 'Добавите в чай молоко? – Да, немного молока и сахара.'),
  (113, 9, 'Do‘konda sut mahsulotlari ko‘p edi.', 'В магазине было много молочных продуктов.'),
  (114, 0, 'Siz uydan soat nechada chiqasiz?', 'Во сколько вы выходите из дома?'),
  (114, 1, 'Ofisingiz qaysi ko‘chada joylashgan?', 'На какой улице находится ваш офис?'),
  (114, 2, 'Derazadan qanday manzara ko‘rinadi?', 'Какой вид виден из окна?'),
  (114, 3, 'Ishdan keyin nima qilasiz?', 'Что вы делаете после работы?'),
  (114, 4, 'Men avtobusdan markazda tushaman.', 'Я выхожу из автобуса в центре.'),
  (114, 5, 'Stolingiz shishadanmi yoki yog‘ochdanmi?', 'Ваш стол из стекла или из дерева?'),
  (114, 6, 'Bizning bo‘limda mendan tashqari yana uch kishi ishlaydi.', 'В нашем отделе, кроме меня, работают ещё три человека.'),
  (114, 7, 'Kechqurun do‘stlar bilan uchrashish uchun kafega boramiz.', 'Вечером мы пойдём в кафе для встречи с друзьями.'),
  (114, 8, 'U naqd pulni kassadan emas, kartadan olgan.', 'Она получила деньги не из кассы, а с карты.'),
  (114, 9, 'Men taxminan soat 9 da uyga qaytaman.', 'Я возвращаюсь домой около 9 часов.'),
  (115, 0, 'Sizning do‘stingizning tug‘ilgan kuni qachon?', 'Когда день рождения вашего друга?'),
  (115, 1, 'Men unga bir butilka vino va bir quti konfet sovg‘a qildim.', 'Я подарил ему бутылку вина и коробку конфет.'),
  (115, 2, 'Sizdan tashqari yana kim keldi?', 'Кто пришёл кроме вас?'),
  (115, 3, 'Uning uyida ko‘p mehmonlar yig‘ilgan edi.', 'У него дома собралось много гостей.'),
  (115, 4, 'Tug‘ilgan kun tortini kim pishirdi?', 'Кто испёк торт на день рождения?'),
  (115, 5, 'Kechki ovqatdan keyin choy ichdik.', 'После ужина мы пили чай.'),
  (115, 6, 'Bu kecha hech qanday shubhasiz ajoyib o‘tdi.', 'Этот вечер, без сомнения, прошёл отлично.'),
  (115, 7, 'Uyga yarim tunda qaytdingizmi?', 'Вы вернулись домой около полуночи?'),
  (115, 8, 'Menda bu bayram haqida yoqimli xotiralar qoldi.', 'У меня остались приятные воспоминания об этом празднике.'),
  (115, 9, 'Sizning tug‘ilgan kuningizga kimni taklif qilasiz?', 'Кого вы пригласите на свой день рождения?');
