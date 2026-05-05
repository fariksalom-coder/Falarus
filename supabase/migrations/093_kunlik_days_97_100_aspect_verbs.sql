-- Kunlik kun 97–100: виды глагола – сложные случаи, закрепление, контроль.

DELETE FROM public.daily_practice_prompts WHERE day_number >= 97 AND day_number <= 100;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number >= 97 AND day_number <= 100
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number >= 97 AND day_number <= 100;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number >= 97 AND day_number <= 100;

DELETE FROM public.daily_vocab_words WHERE day_number >= 97 AND day_number <= 100;

DELETE FROM public.daily_grammar_matches WHERE day_number >= 97 AND day_number <= 100;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number >= 97 AND day_number <= 100;
DELETE FROM public.daily_grammar_mcqs WHERE day_number >= 97 AND day_number <= 100;
DELETE FROM public.daily_grammar_topics WHERE day_number >= 97 AND day_number <= 100;

INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  97,
  'НСВ/СВ: отрицание и модальные слова',
  $theory$
**Inkor (o‘tgan):** *не читал* (umuman) · *не прочитал* (tugatmagan).

**Kelasi:** *не буду делать* (jarayonni rad) · *не сделаю* (qat’iy).

**Modal:** *нужно делать* / *нужно сделать* · *нельзя курить* / *нельзя опоздать*.

**Успеть / удалось / устал ждать** — СВ va НСВ.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (97, 'rule', 0, '«Я … эту книгу» (hech qachon o‘qimaganman)', 'не прочитал', 'не читал', 'не дочитал', 'не зачитывал', 1),
  (97, 'rule', 1, '«Я … эту книгу» (o‘qiyotgan edim, lekin tugatmadim)', 'не читал', 'не прочитал', 'не зачитал', 'не перечитал', 1),
  (97, 'rule', 2, 'Qaysi gapda umuman harakat yo‘q?', 'Я не купил хлеб.', 'Я не покупал хлеб.', 'Я не буду покупать хлеб.', 'Я не покупаю хлеб.', 1),
  (97, 'rule', 3, 'Harakat boshlangan, natija yo‘q', 'Я не звонил маме.', 'Я не позвонил маме.', 'Я не буду звонить маме.', 'Я не звоню маме.', 1),
  (97, 'rule', 4, '«Он не … на работу вчера»', 'был', 'пришёл', 'ходил', 'ехал', 1),
  (97, 'rule', 5, 'Kelasi zamonda jarayonni rad etish', 'Я не сделаю этого.', 'Я не буду это делать.', 'Я не делаю этого.', 'Я не делал этого.', 1),
  (97, 'rule', 6, '«Нельзя … здесь» (umuman)', 'курить', 'закурить', 'покурить', 'выкурить', 0),
  (97, 'rule', 7, '«Вы должны … упражнение сегодня» (natija)', 'делать', 'сделать', 'выделывать', 'делывать', 1),
  (97, 'rule', 8, '«Я … ждать и ушёл»', 'устал ждать', 'устал подождать', 'устал дожидаться', 'устал подождав', 0),
  (97, 'rule', 9, '«Мне … решить эту задачу»', 'удалось', 'удавалось', 'удаётся', 'удастся', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (97, 0, 0, 'Men hech qachon bu kitobni o‘qimaganman.', 'Я не читал эту книгу.'),
  (97, 0, 1, 'Men bu kitobni tugata olmadim.', 'Я не прочитал эту книгу.'),
  (97, 0, 2, 'Men buni qilishni xohlamayman.', 'Я не буду это делать.'),
  (97, 0, 3, 'Men buni tugatmayman (qat’iy).', 'Я не сделаю этого.'),
  (97, 0, 4, 'Men buni qilmayman (bosh tortaman).', 'Не буду этим заниматься.'),
  (97, 0, 5, 'Buni bugun tugatishim kerak.', 'Мне нужно сделать это сегодня.'),
  (97, 0, 6, 'Chekish taqiqlangan.', 'Нельзя курить.'),
  (97, 0, 7, 'Kutishdan charchadim.', 'Я устал ждать.'),
  (97, 0, 8, 'Men matnni tarjima qilishga muyassar bo‘ldim.', 'Мне удалось перевести текст.'),
  (97, 0, 9, 'Men hamma ishni ulgurdim.', 'Я успел сделать всё.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (97, 0, 'uz', '(я, никогда, не, быть, в, Париже)', ARRAY['Я', 'никогда', 'не', 'был', 'в', 'Париже.'], 'Я никогда не был в Париже.'),
  (97, 1, 'uz', '(он, не, прочитать, эта, книга, потому, что, не, было, времени)', ARRAY['Он', 'не', 'прочитал', 'эту', 'книгу,', 'потому', 'что', 'не', 'было', 'времени.'], 'Он не прочитал эту книгу, потому что не было времени.'),
  (97, 2, 'uz', '(мы, не, успеть, купить, подарок, магазин, закрылся)', ARRAY['Мы', 'не', 'успели', 'купить', 'подарок,', 'магазин', 'закрылся.'], 'Мы не успели купить подарок, магазин закрылся.'),
  (97, 3, 'uz', '(ты, должен, сделать, это, задание, сегодня)', ARRAY['Ты', 'должен', 'сделать', 'это', 'задание', 'сегодня.'], 'Ты должен сделать это задание сегодня.'),
  (97, 4, 'uz', '(нельзя, переходить, улицу, на, красный, свет)', ARRAY['Нельзя', 'переходить', 'улицу', 'на', 'красный', 'свет.'], 'Нельзя переходить улицу на красный свет.'),
  (97, 5, 'uz', '(я, устал, ждать, и, пошёл, домой)', ARRAY['Я', 'устал', 'ждать', 'и', 'пошёл', 'домой.'], 'Я устал ждать и пошёл домой.'),
  (97, 6, 'uz', '(ему, удалось, выиграть, соревнование)', ARRAY['Ему', 'удалось', 'выиграть', 'соревнование.'], 'Ему удалось выиграть соревнование.'),
  (97, 7, 'uz', '(я, не, буду, это, делать, ни, когда)', ARRAY['Я', 'никогда', 'не', 'буду', 'это', 'делать.'], 'Я никогда не буду это делать.'),
  (97, 8, 'uz', '(вы, не, забыть, позвонить, мне)', ARRAY['Вы', 'не', 'забыли', 'позвонить', 'мне?'], 'Вы не забыли позвонить мне?'),
  (97, 9, 'uz', '(мы, не, мочь, открыть, дверь, потому, что, ключ, сломался)', ARRAY['Мы', 'не', 'смогли', 'открыть', 'дверь,', 'потому', 'что', 'ключ', 'сломался.'], 'Мы не смогли открыть дверь, потому что ключ сломался.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (97, 0, 'Kechikmoq (poyezdga)', 'Опоздать'),
  (97, 1, 'Yig‘ilmoq', 'Собираться'),
  (97, 2, 'Ulgurmoq', 'Успеть'),
  (97, 3, 'Ketmoq (poyezd)', 'Уйти'),
  (97, 4, 'Achinarli', 'Обидно'),
  (97, 5, 'Erta', 'Раньше'),
  (97, 6, 'Xulosa', 'Вывод'),
  (97, 7, 'Kechiktirmoq', 'Откладывать'),
  (97, 8, 'Vaqtida', 'Вовремя'),
  (97, 9, 'So‘zida turmoq', 'Сдержать слово'),
  (97, 10, 'Va’da', 'Обещание'),
  (97, 11, 'Sabab', 'Причина'),
  (97, 12, 'O‘rganmoq', 'Научиться'),
  (97, 13, 'Poyezd', 'Поезд'),
  (97, 14, 'Vokzal', 'Вокзал');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  97,
  'Опоздание',
  $body$
Вчера я опоздал на поезд.

Я долго собирался и не успел на вокзал.

Когда я пришёл, поезд уже ушёл.

Я никогда не опаздывал на поезд раньше.

Мне было очень обидно.

Я решил больше не опаздывать.

Сегодня я встал на час раньше и успел на утренний поезд.

Я сделал вывод: не нужно откладывать дела на потом.

Нужно всё делать вовремя.

Теперь я всегда успеваю на поезд и никогда не опаздываю.
$body$,
  'kunlik-oqish-97'
);

-- ========== Kun 98 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  98,
  'НСВ и СВ в текстах и диалогах',
  $theory$
**Takror:** НСВ — jarayon · СВ — natija · dialog · kelasi · modal · inkor.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (98, 'rule', 0, '«– … ты … вчера? – Я … книгу»', 'Что – делал – читал', 'Что – сделал – читал', 'Что – делал – прочитал', 'Что делал вчера – читал', 0),
  (98, 'rule', 1, '«Ты … задание? – Да, я … утром»', 'делал – делал', 'сделал – делал', 'сделал – сделал', 'делал – сделал', 2),
  (98, 'rule', 2, 'Savol jarayonga qaratilgan', 'Что ты сделал вчера?', 'Что ты делал вчера?', 'Что ты будешь делать завтра?', 'Что ты делаешь?', 1),
  (98, 'rule', 3, '«Ты уже … маме? – Нет, ещё …»', 'позвонил – не звонил', 'звонил – не звонил', 'позвонил – не позвонил', 'звонил – не позвонил', 0),
  (98, 'rule', 4, '«Что ты … завтра вечером? – Я … телевизор»', 'будешь делать – буду смотреть', 'сделаешь – посмотрю', 'будешь делать – посмотрю', 'будешь смотреть – посмотрю', 0),
  (98, 'rule', 5, '«Когда ты … письмо? – Я … вчера»', 'писал – писал', 'написал – написал', 'писал – написал', 'написал – писал', 1),
  (98, 'rule', 6, 'Tavsiya + НСВ', 'Нужно сделать это упражнение.', 'Нужно делать зарядку каждый день.', 'Нужно переделать эту работу.', 'Нужно сделать зарядку каждый день.', 1),
  (98, 'rule', 7, '«Почему ты …? – Потому что я … уроки»', 'гуляешь – сделал', 'гулял – делал', 'гуляешь – делал', 'гулял – сделал', 0),
  (98, 'rule', 8, '«Не» + НСВ — umuman', 'Я не сделал это задание.', 'Я не делал это задание.', 'Я не буду делать это задание.', 'Я не делаю это задание.', 1),
  (98, 'rule', 9, '«Ты … фильм? – Да, я … вчера вечером»', 'смотрел – смотрел', 'посмотрел – смотрел', 'посмотрел – посмотрел', 'смотрел – посмотрел', 2);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (98, 0, 0, 'Что ты делал вчера?', 'Я читал журнал.'),
  (98, 0, 1, 'Ты сделал домашнее задание?', 'Да, я сделал всё утром.'),
  (98, 0, 2, 'Ты звонил маме вчера?', 'Нет, я не звонил.'),
  (98, 0, 3, 'Ты позвонил маме вчера?', 'Нет, я не позвонил.'),
  (98, 0, 4, 'Что ты будешь делать завтра?', 'Я буду работать весь день.'),
  (98, 0, 5, 'Когда ты купил этот телефон?', 'Я купил его месяц назад.'),
  (98, 0, 6, 'Ты когда-нибудь был в Москве?', 'Да, я был там в прошлом году.'),
  (98, 0, 7, 'Почему ты не сделал уроки?', 'Потому что я болел.'),
  (98, 0, 8, 'Ты уже поужинал?', 'Нет, ещё не ужинал.'),
  (98, 0, 9, 'Что ты сделал сегодня?', 'Я сделаю это вечером.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (98, 0, 'uz', '(что, ты, делать, вчера, – я, смотреть, фильм)', ARRAY['Что', 'ты', 'делал', 'вчера?', '–', 'Я', 'смотрел', 'фильм.'], 'Что ты делал вчера? – Я смотрел фильм.'),
  (98, 1, 'uz', '(вы, уже, пообедать, или, ещё, нет)', ARRAY['Вы', 'уже', 'пообедали', 'или', 'ещё', 'нет?'], 'Вы уже пообедали или ещё нет?'),
  (98, 2, 'uz', '(я, долго, искать, ключи, и, наконец, найти)', ARRAY['Я', 'долго', 'искал', 'ключи', 'и', 'наконец', 'нашёл.'], 'Я долго искал ключи и наконец нашёл.'),
  (98, 3, 'uz', '(когда, ты, купить, этот, компьютер)', ARRAY['Когда', 'ты', 'купил', 'этот', 'компьютер?'], 'Когда ты купил этот компьютер?'),
  (98, 4, 'uz', '(мы, весь, день, готовиться, к, экзамену, но, не, успеть)', ARRAY['Мы', 'весь', 'день', 'готовились', 'к', 'экзамену,', 'но', 'не', 'успели.'], 'Мы весь день готовились к экзамену, но не успели.'),
  (98, 5, 'uz', '(почему, ты, не, прийти, на, собрание)', ARRAY['Почему', 'ты', 'не', 'пришёл', 'на', 'собрание?'], 'Почему ты не пришёл на собрание?'),
  (98, 6, 'uz', '(я, никогда, не, есть, морепродукты)', ARRAY['Я', 'никогда', 'не', 'ел', 'морепродукты.'], 'Я никогда не ел морепродукты.'),
  (98, 7, 'uz', '(что, вы, делать, завтра, утром)', ARRAY['Что', 'вы', 'будете', 'делать', 'завтра', 'утром?'], 'Что вы будете делать завтра утром?'),
  (98, 8, 'uz', '(не, забыть, купить, хлеб, по, дороге, домой)', ARRAY['Не', 'забудь', 'купить', 'хлеб', 'по', 'дороге', 'домой.'], 'Не забудь купить хлеб по дороге домой.'),
  (98, 9, 'uz', '(я, уже, сделать, все, дела, и, могу, отдыхать)', ARRAY['Я', 'уже', 'сделал', 'все', 'дела', 'и', 'могу', 'отдыхать.'], 'Я уже сделал все дела и могу отдыхать.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (98, 0, 'Ta’til', 'Отпуск'),
  (98, 1, 'Chet elga', 'За границу'),
  (98, 2, 'Mahalliy', 'Местный'),
  (98, 3, 'Taom', 'Блюдо'),
  (98, 4, 'Kolizey', 'Колизей'),
  (98, 5, 'Tashrif buyurmoq', 'Посетить'),
  (98, 6, 'Samolyot', 'Самолёт'),
  (98, 7, 'Poyezd', 'Поезд'),
  (98, 8, 'Uchmoq', 'Лететь'),
  (98, 9, 'Qaytmoq', 'Вернуться'),
  (98, 10, 'Umuman', 'В целом'),
  (98, 11, 'Surat', 'Фотография'),
  (98, 12, 'Italyancha', 'Итальянский'),
  (98, 13, 'Qachondir', 'Когда-нибудь'),
  (98, 14, 'Unutilmas', 'Незабываемо');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  98,
  'Разговор о путешествии',
  $body$
– Привет, Анна! Что ты делала в отпуске?

– Привет, Саша! Я ездила в Италию.

Это была моя первая поездка за границу.

– Как здорово! Что ты там делала?

– Я много гуляла по городам, смотрела достопримечательности и пробовала местную кухню.

– Ты была в Риме?

– Да, я была в Риме и видела Колизей.

Ещё я посетила Ватикан.

– А ты летала на самолёте или ехала на поезде?

– Я полетела туда на самолёте, а вернулась на поезде.

– Как тебе поездка в целом?

– Мне очень понравилось!

Я сделала много фотографий и даже выучила несколько итальянских слов.

– Ты молодец! Я тоже хочу поехать в Италию когда-нибудь.

– Обязательно поезжай! Это незабываемо.
$body$,
  'kunlik-oqish-98'
);

-- ========== Kun 99 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  99,
  'Повторение: виды глагола (91–98)',
  $theory$
**Yakun:** НСВ/СВ jadval · inkor · modal · juft fe’llar.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (99, 'rule', 0, '«Что ты … вечером? – Я … книгу»', 'делал – читал', 'сделал – читал', 'делал – прочитал', 'делал – почитал', 0),
  (99, 'rule', 1, '«Я … задание и пошёл гулять»', 'делал', 'сделал', 'делывал', 'делаю', 1),
  (99, 'rule', 2, 'Natija', 'Я писал письмо весь вечер.', 'Я написал письмо.', 'Я писал письмо, когда ты пришёл.', 'Я пишу письмо.', 1),
  (99, 'rule', 3, 'Jarayon', 'Мы купили машину.', 'Мы покупали машину два часа.', 'Мы купим машину.', 'Мы покупаем машину.', 1),
  (99, 'rule', 4, '«Завтра я … всю работу … свободен»', 'буду делать', 'сделаю', 'делаю', 'сделал', 1),
  (99, 'rule', 5, '«Я … книгу» (hech qachon)', 'не прочитал', 'не читал', 'не дочитал', 'не перечитал', 1),
  (99, 'rule', 6, '«Я … книгу» (tugatmagan)', 'не читал', 'не прочитал', 'не зачитал', 'не читаю', 1),
  (99, 'rule', 7, 'Inkor + НСВ', 'Я не сделал уроки.', 'Я не делал уроки.', 'Я не буду делать уроки.', 'Я не делаю уроки.', 1),
  (99, 'rule', 8, '«Нельзя … здесь» (umuman)', 'курить', 'закурить', 'покурить', 'дышать', 0),
  (99, 'rule', 9, '«Нужно … задание сегодня»', 'делать', 'сделать', 'выделывать', 'делаться', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (99, 0, 0, 'Men kitob o‘qiyotgan edim.', 'Я читал книгу.'),
  (99, 0, 1, 'Men kitobni tugatdim.', 'Я прочитал книгу.'),
  (99, 0, 2, 'Men hech qachon kitob o‘qimaganman.', 'Я не читал книгу.'),
  (99, 0, 3, 'Men kitobni tugata olmadim.', 'Я не прочитал книгу.'),
  (99, 0, 4, 'Men kitob o‘qishni yaxshi ko‘raman.', 'Я люблю читать книги.'),
  (99, 0, 5, 'Men kitob o‘qimoqchiman (bir marta).', 'Я хочу прочитать книгу.'),
  (99, 0, 6, 'Men kitob o‘qiyman (kelasi, jarayon).', 'Я буду читать книгу.'),
  (99, 0, 7, 'Siz kitobni o‘qidingizmi? (natija)', 'Ты прочитал книгу?'),
  (99, 0, 8, 'Kitobni o‘qing! (jarayon)', 'Читайте книгу!'),
  (99, 0, 9, 'Kitobni o‘qing! (natija)', 'Прочитайте книгу!');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (99, 0, 'uz', '(вчера, я, весь, вечер, читать, книга)', ARRAY['Вчера', 'я', 'весь', 'вечер', 'читал', 'книгу.'], 'Вчера я весь вечер читал книгу.'),
  (99, 1, 'uz', '(он, наконец, прочитать, эта, книга, и, вернуть, в, библиотека)', ARRAY['Он', 'наконец', 'прочитал', 'эту', 'книгу', 'и', 'вернул', 'её', 'в', 'библиотеку.'], 'Он наконец прочитал эту книгу и вернул её в библиотеку.'),
  (99, 2, 'uz', '(мы, долго, обсуждать, план, но, не, принять, решение)', ARRAY['Мы', 'долго', 'обсуждали', 'план,', 'но', 'не', 'приняли', 'решение.'], 'Мы долго обсуждали план, но не приняли решение.'),
  (99, 3, 'uz', '(ты, когда, написать, сочинение, покажи, мне)', ARRAY['Когда', 'напишешь', 'сочинение,', 'покажи', 'мне.'], 'Когда напишешь сочинение, покажи мне.'),
  (99, 4, 'uz', '(я, никогда, не, быть, за, границей)', ARRAY['Я', 'никогда', 'не', 'был', 'за', 'границей.'], 'Я никогда не был за границей.'),
  (99, 5, 'uz', '(не, трогать, мои, вещи, пожалуйста)', ARRAY['Не', 'трогайте', 'мои', 'вещи,', 'пожалуйста.'], 'Не трогайте мои вещи, пожалуйста.'),
  (99, 6, 'uz', '(мы, встретиться, вчера, и, поговорить, о, работе)', ARRAY['Мы', 'встретились', 'вчера', 'и', 'поговорили', 'о', 'работе.'], 'Мы встретились вчера и поговорили о работе.'),
  (99, 7, 'uz', '(что, вы, делать, завтра, вечером)', ARRAY['Что', 'вы', 'будете', 'делать', 'завтра', 'вечером?'], 'Что вы будете делать завтра вечером?'),
  (99, 8, 'uz', '(она, успеть, купить, всё, что, нужно)', ARRAY['Она', 'успела', 'купить', 'всё,', 'что', 'нужно.'], 'Она успела купить всё, что нужно.'),
  (99, 9, 'uz', '(мне, удалось, решить, эта, проблема)', ARRAY['Мне', 'удалось', 'решить', 'эту', 'проблему.'], 'Мне удалось решить эту проблему.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (99, 0, 'Muvaffaqiyatli', 'Успешный'),
  (99, 1, 'Ayniqsa', 'Особенно'),
  (99, 2, 'Loyiha', 'Проект'),
  (99, 3, 'Yechim', 'Решение'),
  (99, 4, 'Taslim bo‘lmoq', 'Сдаваться'),
  (99, 5, 'Oxiriga yetkazmoq', 'Довести до конца'),
  (99, 6, 'Tabriklamoq', 'Поздравить'),
  (99, 7, 'Ta’sirlangan', 'Тронут'),
  (99, 8, 'Rejalashtirilgan', 'Запланированный'),
  (99, 9, 'Bog‘liq bo‘lmoq', 'Зависеть'),
  (99, 10, 'Samarali', 'Продуктивный'),
  (99, 11, 'Maqsad', 'Цель'),
  (99, 12, 'Erishmoq', 'Достигать'),
  (99, 13, 'Qiyinchilik', 'Трудность'),
  (99, 14, 'Yengmoq', 'Преодолевать');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  99,
  'Успешный день',
  $body$
Вчера был очень успешный день.

Утром я проснулся в 6 часов, сделал зарядку и позавтракал.

Я всегда делаю зарядку по утрам, но вчера я сделал это особенно хорошо.

Потом я пошёл на работу.

Я долго думал над проектом, но наконец нашёл решение.

Я очень рад, что не сдался и довёл дело до конца.

Вечером я встретился с другом и поздравил его с днём рождения.

Он был очень тронут моим подарком.

Домой я вернулся поздно, но успел сделать все запланированные дела.

Я понял, что успех зависит от меня самого.
$body$,
  'kunlik-oqish-99'
);

-- ========== Kun 100 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  100,
  'Контрольный тест: виды глагола',
  $theory$
**Kontrol:** 91–99 bo‘yicha НСВ/СВ · inkor · modal · buyruq · успеть/удалось.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (100, 'rule', 0, '«Что ты … вчера? – Я … телевизор»', 'делал – смотрел', 'сделал – смотрел', 'делал – посмотрел', 'сделал – посмотрел', 0),
  (100, 'rule', 1, '«Я … задание и пошёл гулять»', 'делал', 'сделал', 'делывал', 'делываю', 1),
  (100, 'rule', 2, 'Natija', 'Я читал книгу два часа.', 'Я прочитал книгу.', 'Я читал книгу, когда ты пришёл.', 'Я читаю книгу.', 1),
  (100, 'rule', 3, 'Jarayon', 'Мы купили машину вчера.', 'Мы покупали машину два часа.', 'Мы купим машину завтра.', 'Мы купим машину.', 1),
  (100, 'rule', 4, '«Завтра я … весь день»', 'буду работать', 'поработаю', 'работаю', 'работал', 0),
  (100, 'rule', 5, '«Я … книгу» (hech qachon)', 'не прочитал', 'не читал', 'не дочитал', 'не зачитывал', 1),
  (100, 'rule', 6, '«Я … книгу» (tugatmagan)', 'не читал', 'не прочитал', 'не зачитал', 'не читаю', 1),
  (100, 'rule', 7, 'Inkor + НСВ — umuman', 'Я не сделал уроки.', 'Я не делал уроки.', 'Я не буду делать уроки.', 'Я не делаю уроки.', 1),
  (100, 'rule', 8, '«Нельзя … здесь» (umuman)', 'курить', 'закурить', 'покурить', 'куриться', 0),
  (100, 'rule', 9, '«Нужно … упражнение сегодня»', 'делать', 'сделать', 'выделывать', 'делывать', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (100, 0, 0, 'Men uy vazifasini qilyotgan edim.', 'Я делал уроки.'),
  (100, 0, 1, 'Men uy vazifasini tugatdim.', 'Я сделал уроки.'),
  (100, 0, 2, 'Men hech qachon uy vazifasini qilmaganman.', 'Я не делал уроки.'),
  (100, 0, 3, 'Men uy vazifasini tugata olmadim.', 'Я не сделал уроки.'),
  (100, 0, 4, 'Men uy vazifasini qilishni yaxshi ko‘raman.', 'Я люблю делать уроки.'),
  (100, 0, 5, 'Men uy vazifasini qilmoqchiman (natija).', 'Я хочу сделать уроки.'),
  (100, 0, 6, 'Ertaga men uy vazifasini qilaman (jarayon).', 'Я буду делать уроки завтра.'),
  (100, 0, 7, 'Ertaga men uy vazifasini tugataman.', 'Я сделаю уроки завтра.'),
  (100, 0, 8, 'Uy vazifasini qiling! (jarayon)', 'Делайте уроки!'),
  (100, 0, 9, 'Uy vazifasini qiling! (natija)', 'Сделайте уроки!');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (100, 0, 'uz', '(вчера, я, весь, день, читать, журнал)', ARRAY['Вчера', 'я', 'весь', 'день', 'читал', 'журнал.'], 'Вчера я весь день читал журнал.'),
  (100, 1, 'uz', '(она, наконец, написать, сочинение, и, сдать)', ARRAY['Она', 'наконец', 'написала', 'сочинение', 'и', 'сдала.'], 'Она наконец написала сочинение и сдала.'),
  (100, 2, 'uz', '(мы, долго, спорить, но, не, прийти, к, согласию)', ARRAY['Мы', 'долго', 'спорили,', 'но', 'не', 'пришли', 'к', 'согласию.'], 'Мы долго спорили, но не пришли к согласию.'),
  (100, 3, 'uz', '(ты, когда, купить, новый, телефон)', ARRAY['Когда', 'ты', 'купишь', 'новый', 'телефон?'], 'Когда ты купишь новый телефон?'),
  (100, 4, 'uz', '(я, никогда, не, есть, это, блюдо)', ARRAY['Я', 'никогда', 'не', 'ел', 'это', 'блюдо.'], 'Я никогда не ел это блюдо.'),
  (100, 5, 'uz', '(не, забыть, выключить, свет, уходя)', ARRAY['Не', 'забудь', 'выключить', 'свет,', 'уходя.'], 'Не забудь выключить свет, уходя.'),
  (100, 6, 'uz', '(мы, встретиться, вчера, и, обсудить, планы)', ARRAY['Мы', 'встретились', 'вчера', 'и', 'обсудили', 'планы.'], 'Мы встретились вчера и обсудили планы.'),
  (100, 7, 'uz', '(что, вы, делать, завтра, утром)', ARRAY['Что', 'вы', 'будете', 'делать', 'завтра', 'утром?'], 'Что вы будете делать завтра утром?'),
  (100, 8, 'uz', '(он, успеть, купить, билеты, на, поезд)', ARRAY['Он', 'успел', 'купить', 'билеты', 'на', 'поезд.'], 'Он успел купить билеты на поезд.'),
  (100, 9, 'uz', '(мне, удалось, решить, эта, задача)', ARRAY['Мне', 'удалось', 'решить', 'эту', 'задачу.'], 'Мне удалось решить эту задачу.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (100, 0, 'Kelajak', 'Будущее'),
  (100, 1, 'Muvaffaqiyatli odam', 'Успешный'),
  (100, 2, 'Yaratmoq', 'Создать'),
  (100, 3, 'O‘z ustida ishlamoq', 'Работать над собой'),
  (100, 4, 'Taslim bo‘lmoq', 'Сдаваться'),
  (100, 5, 'Erishmoq', 'Достичь'),
  (100, 6, 'Maqsad', 'Цель'),
  (100, 7, 'Sayohat qilmoq', 'Путешествовать'),
  (100, 8, 'Madaniyat', 'Культура'),
  (100, 9, 'Tanishmoq', 'Познакомиться'),
  (100, 10, 'Orzu', 'Мечта'),
  (100, 11, 'Amalga oshmoq', 'Сбыться'),
  (100, 12, 'Harakat qilmoq', 'Стараться'),
  (100, 13, 'Ishonmoq', 'Верить'),
  (100, 14, 'Orqaga qaramoq', 'Оглядываться назад');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  100,
  'Мои планы на будущее',
  $body$
Я часто думаю о своём будущем.

Мои планы — это стать успешным человеком.

Я хочу закончить университет, найти хорошую работу и создать семью.

Для этого я много работаю над собой.

Каждый день я учу новые слова и повторяю грамматику.

Я никогда не сдаюсь, даже когда бывает трудно.

Я уверен, что смогу достичь своих целей.

В будущем я планирую путешествовать по всему миру, узнавать новые культуры и знакомиться с интересными людьми.

Я знаю, что мои мечты сбудутся, если я буду стараться и верить в себя.
$body$,
  'kunlik-oqish-100'
);


INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-97', 'больше', 'больше', 'Ko‘proq', NULL),
  ('kunlik-oqish-97', 'было', 'было', 'Bo‘ldi', NULL),
  ('kunlik-oqish-97', 'вовремя', 'вовремя', 'Vaqtida', NULL),
  ('kunlik-oqish-97', 'вокзал', 'вокзал', 'Vokzal', NULL),
  ('kunlik-oqish-97', 'всё', 'все', 'Hammasi', NULL),
  ('kunlik-oqish-97', 'всегда', 'всегда', 'Har doim', NULL),
  ('kunlik-oqish-97', 'встал', 'встал', 'Turdi', NULL),
  ('kunlik-oqish-97', 'Вчера', 'вчера', 'Kecha', NULL),
  ('kunlik-oqish-97', 'вывод', 'вывод', 'Xulosa', NULL),
  ('kunlik-oqish-97', 'дела', 'дела', 'Ishlar', NULL),
  ('kunlik-oqish-97', 'делать', 'делать', 'Qilmoq', NULL),
  ('kunlik-oqish-97', 'долго', 'долго', 'Uzoq', NULL),
  ('kunlik-oqish-97', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-97', 'Когда', 'когда', 'Qachon', NULL),
  ('kunlik-oqish-97', 'Мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-97', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-97', 'не', 'не', 'Emas', NULL),
  ('kunlik-oqish-97', 'никогда', 'никогда', 'Hech qachon', NULL),
  ('kunlik-oqish-97', 'нужно', 'нужно', 'Kerak', NULL),
  ('kunlik-oqish-97', 'обидно', 'обидно', 'Achinarli', NULL),
  ('kunlik-oqish-97', 'опаздывал', 'опаздывал', 'Kechikmagan edi', NULL),
  ('kunlik-oqish-97', 'опаздывать', 'опаздывать', 'Kechikmoq', NULL),
  ('kunlik-oqish-97', 'опаздываю', 'опаздываю', 'Kechikmayman', NULL),
  ('kunlik-oqish-97', 'опоздал', 'опоздал', 'Kechikdim', NULL),
  ('kunlik-oqish-97', 'откладывать', 'откладывать', 'Kechiktirmoq', NULL),
  ('kunlik-oqish-97', 'очень', 'очень', 'Juda', NULL),
  ('kunlik-oqish-97', 'поезд', 'поезд', 'Poyezd', NULL),
  ('kunlik-oqish-97', 'потом', 'потом', 'Keyin', NULL),
  ('kunlik-oqish-97', 'пришёл', 'пришел', 'Keldi', NULL),
  ('kunlik-oqish-97', 'раньше', 'раньше', 'Oldinroq', NULL),
  ('kunlik-oqish-97', 'решил', 'решил', 'Qaror qildi', NULL),
  ('kunlik-oqish-97', 'сделал', 'сделал', 'Qildi', NULL),
  ('kunlik-oqish-97', 'Сегодня', 'сегодня', 'Bugun', NULL),
  ('kunlik-oqish-97', 'собирался', 'собирался', 'Yig‘ilgan edi', NULL),
  ('kunlik-oqish-97', 'Теперь', 'теперь', 'Endi', NULL),
  ('kunlik-oqish-97', 'уже', 'уже', 'Allaqachon', NULL),
  ('kunlik-oqish-97', 'успеваю', 'успеваю', 'Ulguraman', NULL),
  ('kunlik-oqish-97', 'успел', 'успел', 'Ulgurdi', NULL),
  ('kunlik-oqish-97', 'утренний', 'утренний', 'Ertalabgi (-ний)', NULL),
  ('kunlik-oqish-97', 'ушёл', 'ушел', 'Ketgan edi', NULL),
  ('kunlik-oqish-97', 'час', 'час', 'Soat', NULL),
  ('kunlik-oqish-97', 'я', 'я', 'Men', NULL),
  ('kunlik-oqish-98', 'А', 'а', 'Ammo / esa', NULL),
  ('kunlik-oqish-98', 'Анна', 'анна', 'Anna', NULL),
  ('kunlik-oqish-98', 'была', 'была', 'Edi', NULL),
  ('kunlik-oqish-98', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-98', 'Ватикан', 'ватикан', 'Vatikanga', NULL),
  ('kunlik-oqish-98', 'вернулась', 'вернулась', 'Qaytdi (ayol)', NULL),
  ('kunlik-oqish-98', 'видела', 'видела', 'Ko‘rgan edi', NULL),
  ('kunlik-oqish-98', 'выучила', 'выучила', 'O‘rgandi (ayol)', NULL),
  ('kunlik-oqish-98', 'городам', 'городам', 'Shaharlarga (-ам)', NULL),
  ('kunlik-oqish-98', 'границу', 'границу', 'Chet elga (-цу)', NULL),
  ('kunlik-oqish-98', 'гуляла', 'гуляла', 'Sayr qilgan edi', NULL),
  ('kunlik-oqish-98', 'Да', 'да', 'Ha', NULL),
  ('kunlik-oqish-98', 'даже', 'даже', 'Hatto', NULL),
  ('kunlik-oqish-98', 'делала', 'делала', 'Qilgan edi', NULL),
  ('kunlik-oqish-98', 'достопримечательности', 'достопримечательности', 'Diqqatga sazovor joylar', NULL),
  ('kunlik-oqish-98', 'ездила', 'ездила', 'Borgan edi (ayol)', NULL),
  ('kunlik-oqish-98', 'ехала', 'ехала', 'Ketgan edi (transport)', NULL),
  ('kunlik-oqish-98', 'Ещё', 'еще', 'Yana', NULL),
  ('kunlik-oqish-98', 'за', 'за', '…uchun', NULL),
  ('kunlik-oqish-98', 'здорово', 'здорово', 'Ajoyib', NULL),
  ('kunlik-oqish-98', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-98', 'или', 'или', 'Yoki', NULL),
  ('kunlik-oqish-98', 'Италию', 'италию', 'Italiyaga', NULL),
  ('kunlik-oqish-98', 'итальянских', 'итальянских', 'Italyancha (-их)', NULL),
  ('kunlik-oqish-98', 'Как', 'как', 'Qanday', NULL),
  ('kunlik-oqish-98', 'когда', 'когда', 'Qachon', NULL),
  ('kunlik-oqish-98', 'Колизей', 'колизей', 'Kolizey', NULL),
  ('kunlik-oqish-98', 'кухню', 'кухню', 'Oshxonaga', NULL),
  ('kunlik-oqish-98', 'летала', 'летала', 'Uchgan edi (ayol, takror)', NULL),
  ('kunlik-oqish-98', 'местную', 'местную', 'Mahalliy (-ую)', NULL),
  ('kunlik-oqish-98', 'Мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-98', 'много', 'много', 'Ko‘p', NULL),
  ('kunlik-oqish-98', 'молодец', 'молодец', 'Yaxshi qilgan', NULL),
  ('kunlik-oqish-98', 'моя', 'моя', 'Mening (ayol otl.)', NULL),
  ('kunlik-oqish-98', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-98', 'незабываемо', 'незабываемо', 'Unutilmas', NULL),
  ('kunlik-oqish-98', 'несколько', 'несколько', 'Bir necha', NULL),
  ('kunlik-oqish-98', 'нибудь', 'нибудь', '-нибудь', NULL),
  ('kunlik-oqish-98', 'Обязательно', 'обязательно', 'Albatta', NULL),
  ('kunlik-oqish-98', 'отпуске', 'отпуске', 'Ta’tilda (-е)', NULL),
  ('kunlik-oqish-98', 'очень', 'очень', 'Juda', NULL),
  ('kunlik-oqish-98', 'первая', 'первая', 'Birinchi (ж.)', NULL),
  ('kunlik-oqish-98', 'по', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-98', 'поезде', 'поезде', 'Poyezdda', NULL),
  ('kunlik-oqish-98', 'поездка', 'поездка', 'Sayohat', NULL),
  ('kunlik-oqish-98', 'поезжай', 'поезжай', 'Bor (buyruq)', NULL),
  ('kunlik-oqish-98', 'поехать', 'поехать', 'Bormoq', NULL),
  ('kunlik-oqish-98', 'полетела', 'полетела', 'Uchdi (bir tomonga)', NULL),
  ('kunlik-oqish-98', 'понравилось', 'понравилось', 'Yoqqan', NULL),
  ('kunlik-oqish-98', 'посетила', 'посетила', 'Tashrif buyurdi', NULL),
  ('kunlik-oqish-98', 'Привет', 'привет', 'Salom', NULL),
  ('kunlik-oqish-98', 'пробовала', 'пробовала', 'Sinab ko‘rgan edi', NULL),
  ('kunlik-oqish-98', 'Риме', 'риме', 'Rimda (-е)', NULL),
  ('kunlik-oqish-98', 'самолёте', 'самолете', 'samolyotda', NULL),
  ('kunlik-oqish-98', 'Саша', 'саша', 'Sasha', NULL),
  ('kunlik-oqish-98', 'сделала', 'сделала', 'Qilgan', NULL),
  ('kunlik-oqish-98', 'слов', 'слов', 'so‘zlar', NULL),
  ('kunlik-oqish-98', 'смотрела', 'смотрела', 'Tomosha qilgan edi', NULL),
  ('kunlik-oqish-98', 'там', 'там', 'U yerda', NULL),
  ('kunlik-oqish-98', 'тебе', 'тебе', 'Senga', NULL),
  ('kunlik-oqish-98', 'тоже', 'тоже', 'Ham', NULL),
  ('kunlik-oqish-98', 'туда', 'туда', 'u yerga', NULL),
  ('kunlik-oqish-98', 'ты', 'ты', 'Sen', NULL),
  ('kunlik-oqish-98', 'фотографий', 'фотографий', 'Suratlar (-ий)', NULL),
  ('kunlik-oqish-98', 'хочу', 'хочу', 'Xohlayman', NULL),
  ('kunlik-oqish-98', 'целом', 'целом', 'Umuman (-ом)', NULL),
  ('kunlik-oqish-98', 'Что', 'что', 'Nima', NULL),
  ('kunlik-oqish-98', 'Это', 'это', 'Bu', NULL),
  ('kunlik-oqish-98', 'Я', 'я', 'Men', NULL),
  ('kunlik-oqish-99', 'был', 'был', 'Bo‘lgan edi', NULL),
  ('kunlik-oqish-99', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-99', 'вернулся', 'вернулся', 'Qaytdi', NULL),
  ('kunlik-oqish-99', 'Вечером', 'вечером', 'Kechqurun', NULL),
  ('kunlik-oqish-99', 'все', 'все', 'Hammasi', NULL),
  ('kunlik-oqish-99', 'всегда', 'всегда', 'Har doim', NULL),
  ('kunlik-oqish-99', 'встретился', 'встретился', 'Uchrashdim', NULL),
  ('kunlik-oqish-99', 'Вчера', 'вчера', 'Kecha', NULL),
  ('kunlik-oqish-99', 'дела', 'дела', 'Ishlar', NULL),
  ('kunlik-oqish-99', 'делаю', 'делаю', 'qilaman', NULL),
  ('kunlik-oqish-99', 'дело', 'дело', 'Ish', NULL),
  ('kunlik-oqish-99', 'день', 'день', 'Kun', NULL),
  ('kunlik-oqish-99', 'днём', 'днем', 'Kunduzi', NULL),
  ('kunlik-oqish-99', 'до', 'до', '…gacha', NULL),
  ('kunlik-oqish-99', 'довёл', 'довел', 'Yetkazdi', NULL),
  ('kunlik-oqish-99', 'долго', 'долго', 'Uzoq', NULL),
  ('kunlik-oqish-99', 'Домой', 'домой', 'Uyga', NULL),
  ('kunlik-oqish-99', 'другом', 'другом', 'Do‘st bilan', NULL),
  ('kunlik-oqish-99', 'думал', 'думал', 'o‘yladi', NULL),
  ('kunlik-oqish-99', 'его', 'его', 'Uni', NULL),
  ('kunlik-oqish-99', 'зависит', 'зависит', 'Bog‘liq', NULL),
  ('kunlik-oqish-99', 'запланированные', 'запланированные', 'Rejalashtirilgan (-ые)', NULL),
  ('kunlik-oqish-99', 'зарядку', 'зарядку', 'Zaryadka', NULL),
  ('kunlik-oqish-99', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-99', 'конца', 'конца', 'Oxiriga (-ца)', NULL),
  ('kunlik-oqish-99', 'меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-99', 'моим', 'моим', 'Mening …-ga', NULL),
  ('kunlik-oqish-99', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-99', 'над', 'над', 'Ustida', NULL),
  ('kunlik-oqish-99', 'наконец', 'наконец', 'Nihoyat', NULL),
  ('kunlik-oqish-99', 'нашёл', 'нашел', 'Topgan', NULL),
  ('kunlik-oqish-99', 'не', 'не', 'Emas', NULL),
  ('kunlik-oqish-99', 'но', 'но', 'Lekin', NULL),
  ('kunlik-oqish-99', 'Он', 'он', 'U (erkak)', NULL),
  ('kunlik-oqish-99', 'особенно', 'особенно', 'Ayniqsa', NULL),
  ('kunlik-oqish-99', 'от', 'от', '…dan', NULL),
  ('kunlik-oqish-99', 'очень', 'очень', 'Juda', NULL),
  ('kunlik-oqish-99', 'по', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-99', 'подарком', 'подарком', 'Sovg‘adan (-ом)', NULL),
  ('kunlik-oqish-99', 'позавтракал', 'позавтракал', 'Nonushta qildi', NULL),
  ('kunlik-oqish-99', 'поздно', 'поздно', 'Kech', NULL),
  ('kunlik-oqish-99', 'поздравил', 'поздравил', 'Tabrikladi', NULL),
  ('kunlik-oqish-99', 'понял', 'понял', 'Tushundim', NULL),
  ('kunlik-oqish-99', 'Потом', 'потом', 'Keyin', NULL),
  ('kunlik-oqish-99', 'пошёл', 'пошел', 'Ketdi (boshlanish, СВ)', NULL),
  ('kunlik-oqish-99', 'проектом', 'проектом', 'Loyiha ustida (-ом)', NULL),
  ('kunlik-oqish-99', 'проснулся', 'проснулся', 'Uyg‘ondi', NULL),
  ('kunlik-oqish-99', 'работу', 'работу', 'Ishni', NULL),
  ('kunlik-oqish-99', 'рад', 'рад', 'Xursand', NULL),
  ('kunlik-oqish-99', 'решение', 'решение', 'Yechim', NULL),
  ('kunlik-oqish-99', 'рождения', 'рождения', 'Tug‘ilgan kun', NULL),
  ('kunlik-oqish-99', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-99', 'самого', 'самого', 'Eng yaqin', NULL),
  ('kunlik-oqish-99', 'сдался', 'сдался', 'Taslim bo‘ldi', NULL),
  ('kunlik-oqish-99', 'сделал', 'сделал', 'Qildi', NULL),
  ('kunlik-oqish-99', 'сделать', 'сделать', 'Qilmoq', NULL),
  ('kunlik-oqish-99', 'тронут', 'тронут', 'Ta’sirlangan', NULL),
  ('kunlik-oqish-99', 'успел', 'успел', 'Ulgurdi', NULL),
  ('kunlik-oqish-99', 'успех', 'успех', 'Muvaffaqiyat', NULL),
  ('kunlik-oqish-99', 'успешный', 'успешный', 'Muvaffaqiyatli', NULL),
  ('kunlik-oqish-99', 'утрам', 'утрам', 'Ertalablar', NULL),
  ('kunlik-oqish-99', 'Утром', 'утром', 'Ertalab', NULL),
  ('kunlik-oqish-99', 'хорошо', 'хорошо', 'Yaxshi', NULL),
  ('kunlik-oqish-99', 'часов', 'часов', 'Soat', NULL),
  ('kunlik-oqish-99', 'что', 'что', 'Nima', NULL),
  ('kunlik-oqish-99', 'это', 'это', 'Bu', NULL),
  ('kunlik-oqish-99', 'я', 'я', 'Men', NULL),
  ('kunlik-oqish-100', 'буду', 'буду', 'Bo‘laman', NULL),
  ('kunlik-oqish-100', 'будущем', 'будущем', 'Kelajakda', NULL),
  ('kunlik-oqish-100', 'бывает', 'бывает', 'Bo‘ladi', NULL),
  ('kunlik-oqish-100', 'В', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-100', 'верить', 'верить', 'Ishonmoq', NULL),
  ('kunlik-oqish-100', 'всему', 'всему', 'Butun … (-ему)', NULL),
  ('kunlik-oqish-100', 'грамматику', 'грамматику', 'Grammatika', NULL),
  ('kunlik-oqish-100', 'даже', 'даже', 'Hatto', NULL),
  ('kunlik-oqish-100', 'день', 'день', 'Kun', NULL),
  ('kunlik-oqish-100', 'Для', 'для', 'uchun', NULL),
  ('kunlik-oqish-100', 'достичь', 'достичь', 'Erishmoq', NULL),
  ('kunlik-oqish-100', 'думаю', 'думаю', 'O‘ylayman', NULL),
  ('kunlik-oqish-100', 'если', 'если', 'Agar', NULL),
  ('kunlik-oqish-100', 'закончить', 'закончить', 'Tugatmoq', NULL),
  ('kunlik-oqish-100', 'знакомиться', 'знакомиться', 'Tanishmoq', NULL),
  ('kunlik-oqish-100', 'знаю', 'знаю', 'Bilaman', NULL),
  ('kunlik-oqish-100', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-100', 'интересными', 'интересными', 'Qiziqarli (-ыми)', NULL),
  ('kunlik-oqish-100', 'Каждый', 'каждый', 'Har bir', NULL),
  ('kunlik-oqish-100', 'когда', 'когда', 'Qachon', NULL),
  ('kunlik-oqish-100', 'культуры', 'культуры', 'Madaniyatlar (-ы)', NULL),
  ('kunlik-oqish-100', 'людьми', 'людьми', 'Odamlar bilan', NULL),
  ('kunlik-oqish-100', 'мечты', 'мечты', 'Orzular (-ы)', NULL),
  ('kunlik-oqish-100', 'миру', 'миру', 'Dunyoga (-му)', NULL),
  ('kunlik-oqish-100', 'много', 'много', 'Ko‘p', NULL),
  ('kunlik-oqish-100', 'Мои', 'мои', 'Mening (ko‘plik)', NULL),
  ('kunlik-oqish-100', 'над', 'над', 'Ustida', NULL),
  ('kunlik-oqish-100', 'найти', 'найти', 'Topmoq', NULL),
  ('kunlik-oqish-100', 'не', 'не', 'Emas', NULL),
  ('kunlik-oqish-100', 'никогда', 'никогда', 'Hech qachon', NULL),
  ('kunlik-oqish-100', 'новые', 'новые', 'Yangi', NULL),
  ('kunlik-oqish-100', 'о', 'о', '…haqida', NULL),
  ('kunlik-oqish-100', 'планирую', 'планирую', 'Rejalashtiraman', NULL),
  ('kunlik-oqish-100', 'планы', 'планы', 'Rejalar', NULL),
  ('kunlik-oqish-100', 'по', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-100', 'повторяю', 'повторяю', 'Takrorlayman', NULL),
  ('kunlik-oqish-100', 'путешествовать', 'путешествовать', 'Sayohat qilmoq', NULL),
  ('kunlik-oqish-100', 'работаю', 'работаю', 'Ishlayman', NULL),
  ('kunlik-oqish-100', 'работу', 'работу', 'Ishni', NULL),
  ('kunlik-oqish-100', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-100', 'сбудутся', 'сбудутся', 'Amalga oshadi', NULL),
  ('kunlik-oqish-100', 'своём', 'своем', 'o‘zining', NULL),
  ('kunlik-oqish-100', 'своих', 'своих', 'O‘zingning', NULL),
  ('kunlik-oqish-100', 'сдаюсь', 'сдаюсь', 'Taslim bo‘lmayman', NULL),
  ('kunlik-oqish-100', 'себя', 'себя', 'O‘zingni', NULL),
  ('kunlik-oqish-100', 'семью', 'семью', 'Oilani (-ю)', NULL),
  ('kunlik-oqish-100', 'слова', 'слова', 'so‘zlar', NULL),
  ('kunlik-oqish-100', 'смогу', 'смогу', 'Olaman (имкон)', NULL),
  ('kunlik-oqish-100', 'собой', 'собой', 'O‘zing bilan', NULL),
  ('kunlik-oqish-100', 'создать', 'создать', 'Yaratmoq', NULL),
  ('kunlik-oqish-100', 'стараться', 'стараться', 'Harakat qilmoq', NULL),
  ('kunlik-oqish-100', 'стать', 'стать', 'Bo‘lish', NULL),
  ('kunlik-oqish-100', 'трудно', 'трудно', 'Qiyin', NULL),
  ('kunlik-oqish-100', 'уверен', 'уверен', 'Ishonaman', NULL),
  ('kunlik-oqish-100', 'узнавать', 'узнавать', 'Tanimoq', NULL),
  ('kunlik-oqish-100', 'университет', 'университет', 'Universitet', NULL),
  ('kunlik-oqish-100', 'успешным', 'успешным', 'Muvaffaqiyatli (-ым)', NULL),
  ('kunlik-oqish-100', 'учу', 'учу', 'o‘rganaman', NULL),
  ('kunlik-oqish-100', 'хорошую', 'хорошую', 'Yaxshi (-ую)', NULL),
  ('kunlik-oqish-100', 'хочу', 'хочу', 'Xohlayman', NULL),
  ('kunlik-oqish-100', 'целей', 'целей', 'Maqsadlar (-ей)', NULL),
  ('kunlik-oqish-100', 'часто', 'часто', 'Tez-tez', NULL),
  ('kunlik-oqish-100', 'человеком', 'человеком', 'Odam (-ом)', NULL),
  ('kunlik-oqish-100', 'что', 'что', 'Nima', NULL),
  ('kunlik-oqish-100', 'это', 'это', 'Bu', NULL),
  ('kunlik-oqish-100', 'этого', 'этого', 'Shundan', NULL),
  ('kunlik-oqish-100', 'Я', 'я', 'Men', NULL);


INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (97, 0, 'Siz hech qachon poyezdga kechikib ko‘rganmisiz?', 'Вы когда-нибудь опаздывали на поезд?'),
  (97, 1, 'Kecha men vokzalga ulgurmadim va poyezd ketib qoldi.', 'Вчера я не успел на вокзал, и поезд ушёл.'),
  (97, 2, 'U hech qachon kechikmaydi.', 'Он никогда не опаздывает.'),
  (97, 3, 'Nega siz ishga kechikdingiz?', 'Почему вы опоздали на работу?'),
  (97, 4, 'Men erta turdim va hamma narsani ulgurdim.', 'Я встал рано и всё успел.'),
  (97, 5, 'Ishlarni keyinga qoldirmang, hozir bajaring.', 'Не откладывайте дела на потом, делайте сейчас.'),
  (97, 6, 'U so‘zida tura olmadi va va’dasini bajarmadi.', 'Он не сдержал слово и не выполнил обещание.'),
  (97, 7, 'Biz uchrashuvga kechikdik, chunki taksini uzoq kutdik.', 'Мы опоздали на встречу, потому что долго ждали такси.'),
  (97, 8, 'Sizningcha, kechikishning sababi nima?', 'Как вы думаете, в чём причина опоздания?'),
  (97, 9, 'Vaqtida kelishni o‘rganish muhim.', 'Важно научиться приходить вовремя.'),
  (98, 0, 'Ta’tilda qayerda bo‘ldingiz?', 'Где вы были в отпуске?'),
  (98, 1, 'Men Italiyaga bordim va Rimni ko‘rdim.', 'Я ездил в Италию и видел Рим.'),
  (98, 2, 'Siz mahalliy taomlarni tatib ko‘rdingizmi?', 'Вы пробовали местные блюда?'),
  (98, 3, 'U Kolizeyni tomosha qilgan.', 'Он смотрел Колизей.'),
  (98, 4, 'Siz u yerga samolyotda uchdingizmi yoki poyezdda ketdingizmi?', 'Вы летели туда самолётом или ехали на поезде?'),
  (98, 5, 'Men u yerga samolyotda uchib, poyezdda qaytdim.', 'Я полетел туда самолётом и вернулся на поезде.'),
  (98, 6, 'Sizga sayohat yoqdimi?', 'Вам понравилось путешествие?'),
  (98, 7, 'Men juda ko‘p suratlar qildim.', 'Я сделал много фотографий.'),
  (98, 8, 'U bir necha italyancha so‘zlarni o‘rgandi.', 'Он выучил несколько итальянских слов.'),
  (98, 9, 'Siz ham qachondir u yerga borishni xohlaysizmi?', 'Вы тоже хотите поехать туда когда-нибудь?'),
  (99, 0, 'Sizning eng muvaffaqiyatli kuningiz qanday edi?', 'Каким был ваш самый успешный день?'),
  (99, 1, 'Men ertalab turdim va mashq qildim.', 'Я встал утром и сделал зарядку.'),
  (99, 2, 'U loyiha ustida uzoq ishladi va yechim topdi.', 'Он долго работал над проектом и нашёл решение.'),
  (99, 3, 'Siz hech qachon taslim bo‘lmang!', 'Никогда не сдавайтесь!'),
  (99, 4, 'U ishni oxiriga yetkazdi.', 'Он довёл дело до конца.'),
  (99, 5, 'Kecha do‘stimning tug‘ilgan kuni edi.', 'Вчера был день рождения моего друга.'),
  (99, 6, 'Men uni tabrikladim va sovg‘a berdim.', 'Я поздравил его и подарил подарок.'),
  (99, 7, 'Siz hamma rejalashtirilgan ishlarni bajardingizmi?', 'Вы выполнили все запланированные дела?'),
  (99, 8, 'Muvaffaqiyat sizga bog‘liq.', 'Успех зависит от вас.'),
  (99, 9, 'Bugun juda samarali kun bo‘ldi.', 'Сегодня был очень продуктивный день.'),
  (100, 0, 'Sizning kelajakdagi rejalaringiz qanday?', 'Какие у вас планы на будущее?'),
  (100, 1, 'Men universitetni tugatmoqchiman va yaxshi ish topmoqchiman.', 'Я хочу закончить университет и найти хорошую работу.'),
  (100, 2, 'U har kuni yangi so‘zlar o‘rganadi.', 'Он каждый день учит новые слова.'),
  (100, 3, 'Siz hech qachon taslim bo‘lmang.', 'Никогда не сдавайтесь.'),
  (100, 4, 'U o‘z maqsadlariga erishdi.', 'Он достиг своих целей.'),
  (100, 5, 'Siz butun dunyo bo‘ylab sayohat qilishni xohlaysizmi?', 'Вы хотите путешествовать по всему миру?'),
  (100, 6, 'U yangi madaniyatlar bilan tanishdi.', 'Он познакомился с новыми культурами.'),
  (100, 7, 'Sizning orzularingiz amalga oshadimi?', 'Сбудутся ли ваши мечты?'),
  (100, 8, 'Agar siz harakat qilsangiz, muvaffaqiyatga erishasiz.', 'Если вы будете стараться, вы достигнете успеха.'),
  (100, 9, 'O‘zingizga ishoning va hech qachon orqaga qaramang.', 'Верьте в себя и никогда не оглядывайтесь назад.');
