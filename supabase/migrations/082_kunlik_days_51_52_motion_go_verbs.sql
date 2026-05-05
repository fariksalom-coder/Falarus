-- Kunlik kun 51–52: harakat glagollari — идти/ходить (piyoda), ехать/ездить (transport).

DELETE FROM public.daily_practice_prompts WHERE day_number >= 51 AND day_number <= 52;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number >= 51 AND day_number <= 52
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number >= 51 AND day_number <= 52;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number >= 51 AND day_number <= 52;

DELETE FROM public.daily_vocab_words WHERE day_number >= 51 AND day_number <= 52;

DELETE FROM public.daily_grammar_matches WHERE day_number >= 51 AND day_number <= 52;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number >= 51 AND day_number <= 52;
DELETE FROM public.daily_grammar_mcqs WHERE day_number >= 51 AND day_number <= 52;
DELETE FROM public.daily_grammar_topics WHERE day_number >= 51 AND day_number <= 52;

-- ========== Kun 51 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  51,
  'Harakat: идти / ходить (hozir va o‘tgan)',
  $theory$
**Идти** — bir yo‘nalishli, **hozirgi paytda**: *иду, идёшь, идёт, идём, идёте, идут*.

**Ходить** — ko‘p yo‘nalishli / **muntazam**: *хожу, ходишь, ходит…*

**O‘tgan zamon:** *шёл / шла / шло / шли* (jarayon, bir yo‘nalishda ketish) va *ходил / ходила…* (bir marta borish — natija).

**Savollar:** *Куда ты идёшь?* (hozir) → *Я иду…* · *Где ты был вчера?* → *Я ходил…*

**Ошибки:** *Ты ходишь сейчас домой?* ❌ → *Ты идёшь…*
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (51, 'rule', 0, '«Hozir men maktabga ketyapman»', 'Я хожу в школу сейчас.', 'Я иду в школу сейчас.', 'Я ходил в школу сейчас.', 'Я шёл в школу сейчас.', 1),
  (51, 'rule', 1, '«U har kuni kechqurun parkka boradi»', 'Он идёт в парк каждый вечер.', 'Он ходит в парк каждый вечер.', 'Он шёл в парк каждый вечер.', 'Он ходил в парк каждый вечер.', 1),
  (51, 'rule', 2, '«Kecha men teatrga bordim» (bir safar, o‘tgan)', 'Вчера я шёл в театр.', 'Вчера я ходил в театр.', 'Вчера я иду в театр.', 'Вчера я хожу в театр.', 1),
  (51, 'rule', 3, '«Kecha u uyga ketayotgan edi, men uni ko‘rdim»', 'Вчера он ходил домой, я его видел.', 'Вчера он шёл домой, я его видел.', 'Вчера он идёт домой, я его видел.', 'Вчера он ходит домой, я его видел.', 1),
  (51, 'rule', 4, '«Men ishga piyoda boraman» (muntazam)', 'Я иду на работу пешком.', 'Я хожу на работу пешком.', 'Я шёл на работу пешком.', 'Я ходил на работу пешком.', 1),
  (51, 'rule', 5, '«Kechqurun qayerga ketyapsiz?» (hozir)', 'Куда вы ходите вечером?', 'Куда вы идёте вечером?', 'Куда вы шли вечером?', 'Куда вы ходили вечером?', 1),
  (51, 'rule', 6, '«Biz hafta oxirida sayohatga bordik» (bir safar)', 'Мы шли в путешествие на выходных.', 'Мы ходили в путешествие на выходных.', 'Мы идём в путешествие на выходных.', 'Мы ходим в путешествие на выходных.', 1),
  (51, 'rule', 7, '«Ular hozir stadionga ketyapti»', 'Они идут на стадион сейчас.', 'Они ходят на стадион сейчас.', 'Они шли на стадион сейчас.', 'Они ходили на стадион сейчас.', 0),
  (51, 'rule', 8, '«идти» — 2-shaxs birlik (ты)', 'Ты идёшь на обед?', 'Ты ходишь на обед?', 'Ты шёл на обед?', 'Ты ходил на обед?', 0),
  (51, 'rule', 9, '«Men kecha butun yomg‘irda piyoda yo‘l bosdim…»', 'ходил', 'шёл', 'иду', 'хожу', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (51, 0, 0, 'Hozir men do‘konga ketyapman.', 'Сейчас я иду в магазин.'),
  (51, 0, 1, 'Men har shanba basseynga boraman.', 'Я хожу в бассейн по субботам.'),
  (51, 0, 2, 'Kecha men teatrga bordim.', 'Вчера я ходил в театр.'),
  (51, 0, 3, 'U har kuni ishga piyoda boradi.', 'Он ходит на работу пешком каждый день.'),
  (51, 0, 4, 'Kecha uyga ketayotganimda, do‘stimni uchratdim.', 'Когда я шёл домой вчера, я встретил друга.'),
  (51, 0, 5, 'Qayerga ketyapsan?', 'Куда ты идёшь?'),
  (51, 0, 6, 'Men uyga ketyapman.', 'Я иду домой.'),
  (51, 0, 7, 'Ular kecha kechqurun parkda sayr qilishdi.', 'Они гуляли в парке вчера вечером.'),
  (51, 0, 8, 'Biz har kuni maktabga boramiz.', 'Мы ходим в школу каждый день.'),
  (51, 0, 9, 'U tez-tez muzeyga boradi.', 'Он часто ходит в музей.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (51, 0, 'uz', '(сейчас, я, идти, в, аптека)', ARRAY['Сейчас', 'я', 'иду', 'в', 'аптеку.', 'хожу'], 'Сейчас я иду в аптеку.'),
  (51, 1, 'uz', '(каждый, день, мы, ходить, в, бассейн)', ARRAY['Каждый', 'день', 'мы', 'ходим', 'в', 'бассейн.', 'идём'], 'Каждый день мы ходим в бассейн.'),
  (51, 2, 'uz', '(вчера, он, ходить, на, стадион)', ARRAY['Вчера', 'он', 'ходил', 'на', 'стадион.', 'шёл'], 'Вчера он ходил на стадион.'),
  (51, 3, 'uz', '(когда, ты, идти, домой, вчера, я, видеть, тебя)', ARRAY['Когда', 'ты', 'шёл', 'домой', 'вчера,', 'я', 'видел', 'тебя.', 'ходил'], 'Когда ты шёл домой вчера, я видел тебя.'),
  (51, 4, 'uz', '(они, сейчас, идти, на, концерт)', ARRAY['Они', 'сейчас', 'идут', 'на', 'концерт.', 'ходят'], 'Они сейчас идут на концерт.'),
  (51, 5, 'uz', '(ты, часто, ходить, в, театр)', ARRAY['Ты', 'часто', 'ходишь', 'в', 'театр?', 'идёшь'], 'Ты часто ходишь в театр?'),
  (51, 6, 'uz', '(я, идти, на, работа, и, друг, идти, в, университет)', ARRAY['Я', 'иду', 'на', 'работу,', 'а', 'друг', 'идёт', 'в', 'университет.', 'хожу'], 'Я иду на работу, а друг идёт в университет.'),
  (51, 7, 'uz', '(дети, вчера, ходить, в, зоопарк)', ARRAY['Дети', 'вчера', 'ходили', 'в', 'зоопарк.', 'шли'], 'Дети вчера ходили в зоопарк.'),
  (51, 8, 'uz', '(куда, вы, идти, сейчас)', ARRAY['Куда', 'вы', 'идёте', 'сейчас?', 'ходите'], 'Куда вы идёте сейчас?'),
  (51, 9, 'uz', '(мы, редко, ходить, в, кино)', ARRAY['Мы', 'редко', 'ходим', 'в', 'кино.', 'идём'], 'Мы редко ходим в кино.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (51, 0, 'Ketyapman (bir yo‘nalish, hozir)', 'Иду'),
  (51, 1, 'Boraman (muntazam)', 'Хожу'),
  (51, 2, 'Ketayotgan edim (o‘tgan jarayon)', 'Шёл'),
  (51, 3, 'Bordim (bir marta, o‘tgan)', 'Ходил'),
  (51, 4, 'Sekin', 'Медленно'),
  (51, 5, 'Shoshilmoq', 'Спешить'),
  (51, 6, 'Piyoda', 'Пешком'),
  (51, 7, 'Kirmoq (do‘konga)', 'Зайти'),
  (51, 8, 'Ho‘l bo‘lmoq', 'Промокнуть'),
  (51, 9, 'Kech qolmoq', 'Опоздать'),
  (51, 10, 'Birdan', 'Вдруг'),
  (51, 11, 'Yomg‘ir', 'Дождь'),
  (51, 12, 'Kechki ovqat', 'Ужин'),
  (51, 13, 'Rozi bo‘lmoq (с кем-либо)', 'Согласиться'),
  (51, 14, 'Foydali', 'Полезно');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  51,
  'По дороге домой',
  $body$
Сегодня после работы я шёл домой медленно. Я не спешил и любовался небом: облака плыли высоко, а воздух был свежим после недавнего дождя. Погода была хорошая, и я решил пройтись пешком.

Обычно я хожу на автобусе — это быстрее, — но сегодня хотелось немного подумать и просто подышать. По дороге я встретил своего старого друга Антона. Он тоже шёл домой с пакетами из магазина.

Мы немного поговорили о работе и отпуске и пошли вместе до следующего перекрёстка. Антон сказал, что он часто ходит на работу пешком, потому что это полезно для здоровья. Я согласился с ним.

Когда мы расстались, я ещё десять минут шёл один. На улице было мало машин, и я слышал только свои шаги.

Когда я пришёл домой, мама спросила:
– Ты сегодня ходил в магазин?
– Нет, я шёл другой дорогой и не зашёл в магазин.
– Ничего, завтра сходишь.

Я улыбнулся, умылся и пошёл ужинать. Дома пахло супом, и на столе уже стояла тарелка — как всегда после долгого дня это было особенно приятно.

В прошлый раз после работы я ходил в аптеку и вернулся поздно, а сегодня хотел просто тишины. Иногда кажется, что весь город спешит: люди идут на работу или домой, машины снуют мимо, а ты идёшь медленно и смотришь по сторонам.

Я рассказал маме про встречу с Антоном, и мы посмеялись: два друга всегда находят друг друга на одной дороге.
$body$,
  'kunlik-oqish-51'
);

-- ========== Kun 52 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  52,
  'Harakat: ехать / ездить (transport)',
  $theory$
**Ехать** — transportda **hozir**, bir yo‘nalish: *еду, едешь, едет, едем, едете, едут*.

**Ездить** — **muntazam** yoki bir marta natija: *езжу, ездишь, ездит…*

**O‘tgan zamon:** *ехал* (bir yo‘nalishda ketayotgan jarayon) · *ездил* (borib kelganlik / bir marta).

**Savol:** *Куда ты едешь?* → *Я еду…* · *Как ты ездишь на работу?* → *Я езжу…*

**Ошибки:** *Он едет на работу каждый день* ❌ → *Он ездит…*
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (52, 'rule', 0, '«Hozir men Moskvaga poyezdda ketyapman»', 'Я езжу в Москву на поезде сейчас.', 'Я еду в Москву на поезде сейчас.', 'Я ехал в Москву на поезде сейчас.', 'Я ездил в Москву на поезде сейчас.', 1),
  (52, 'rule', 1, '«U har kuni ishga metroda boradi»', 'Он едет на работу на метро каждый день.', 'Он ездит на работу на метро каждый день.', 'Он ехал на работу на метро каждый день.', 'Он ездил на работу на метро каждый день.', 1),
  (52, 'rule', 2, '«O‘tgan yozda men Qrimni poyezdda bordim»', 'Прошлым летом я ехал в Крым на поезде.', 'Прошлым летом я ездил в Крым на поезде.', 'Прошлым летом я еду в Крым на поезде.', 'Прошлым летом я езжу в Крым на поезде.', 1),
  (52, 'rule', 3, '«Kecha men avtobusda ishga ketayotgan edim va tiqilinchda qoldim»', 'Вчера я ездил на работу на автобусе и попал в пробку.', 'Вчера я ехал на работу на автобусе и попал в пробку.', 'Вчера я еду на работу на автобусе и попадаю в пробку.', 'Вчера я езжу на работу на автобусе и попадаю в пробку.', 1),
  (52, 'rule', 4, '«Men har hafta chet elga boraman»', 'Я еду за границу каждую неделю.', 'Я езжу за границу каждую неделю.', 'Я ехал за границу каждую неделю.', 'Я ездил за границу каждую неделю.', 1),
  (52, 'rule', 5, '«Ular hozir taksi bilan aeroportga ketyapti»', 'Они едут в аэропорт на такси сейчас.', 'Они ездят в аэропорт на такси сейчас.', 'Они ехали в аэропорт на такси сейчас.', 'Они ездили в аэропорт на такси сейчас.', 0),
  (52, 'rule', 6, '«Biz o‘tgan yili avtobusda Qrimga bordik»', 'Мы в прошлом году ехали в Крым на автобусе.', 'Мы в прошлом году ездили в Крым на автобусе.', 'Мы в прошлом году едем в Крым на автобусе.', 'Мы в прошлом году ездим в Крым на автобусе.', 1),
  (52, 'rule', 7, '«U qanday transportda ishga boradi?» (odat)', 'Он ездит на работу', 'Он едет на работу', 'Он ехал на работу', 'Он ездил на работу', 0),
  (52, 'rule', 8, '«U ertaga komandirovkaga boradi» (kelasi)', 'Он едет в командировку завтра.', 'Он ездит в командировку завтра.', 'Он ехал в командировку завтра.', 'Он ездил в командировку завтра.', 0),
  (52, 'rule', 9, '«Men hech qachon chet elga transportda bormaganman»', 'не ехал за границу', 'не ездил за границу', 'не еду за границу', 'не езжу за границу', 1);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (52, 0, 0, 'Hozir men samolyotda Moskvaga ketyapman.', 'Я еду в Москву на самолёте сейчас.'),
  (52, 0, 1, 'Men har kuni ishga metroda boraman.', 'Я езжу на работу на метро каждый день.'),
  (52, 0, 2, 'Kecha biz poyezdda Sankt-Peterburgga bordik.', 'Вчера мы ездили в Питер на поезде.'),
  (52, 0, 3, 'Kecha biz Sankt-Peterburgga poyezdda 8 soat ketayotgan edik.', 'Вчера мы ехали в Питер на поезде 8 часов.'),
  (52, 0, 4, 'U bu yozda avtobusda Qrimga boradi.', 'Он поедет в Крым на автобусе этим летом.'),
  (52, 0, 5, 'Biz tez-tez shahar tashqarisiga boramiz.', 'Мы часто ездим за город.'),
  (52, 0, 6, 'U tez-tez komandirovkaga boradi.', 'Он часто ездит в командировки.'),
  (52, 0, 7, 'Siz qayerda dam olasiz? – Men Italiyaga boraman.', 'Где вы будете отдыхать? – Я поеду в Италию.'),
  (52, 0, 8, 'Bolalar, siz qayerga ketyapsiz? – Biz kafega ketyapmiz.', 'Дети, куда вы едете? – Мы едем в кафе.'),
  (52, 0, 9, 'U kecha kechqurun uyiga taksi bilan qaytdi.', 'Он вчера вечером ехал домой на такси.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (52, 0, 'uz', '(сейчас, мы, ехать, в, аэропорт)', ARRAY['Сейчас', 'мы', 'едем', 'в', 'аэропорт.', 'ездим'], 'Сейчас мы едем в аэропорт.'),
  (52, 1, 'uz', '(каждый, лето, они, ездить, на, море)', ARRAY['Каждое', 'лето', 'они', 'ездят', 'на', 'море.', 'едут'], 'Каждое лето они ездят на море.'),
  (52, 2, 'uz', '(вчера, я, ехать, на, работа, на, автобус, и, опоздать)', ARRAY['Вчера', 'я', 'ехал', 'на', 'работу', 'на', 'автобусе', 'и', 'опоздал.', 'ездил'], 'Вчера я ехал на работу на автобусе и опоздал.'),
  (52, 3, 'uz', '(ты, когда, в, последний, раз, ездить, в, Санкт-Петербург)', ARRAY['Когда', 'ты', 'в', 'последний', 'раз', 'ездил', 'в', 'Санкт-Петербург?', 'ехал'], 'Когда ты в последний раз ездил в Санкт-Петербург?'),
  (52, 4, 'uz', '(мы, сейчас, ехать, в, центр, на, машина)', ARRAY['Мы', 'сейчас', 'едем', 'в', 'центр', 'на', 'машине.', 'ездим'], 'Мы сейчас едем в центр на машине.'),
  (52, 5, 'uz', '(он, часто, ездить, в, командировки, в, Москва)', ARRAY['Он', 'часто', 'ездит', 'в', 'командировки', 'в', 'Москву.', 'едет'], 'Он часто ездит в командировки в Москву.'),
  (52, 6, 'uz', '(я, никогда, не, ездить, на, поезд)', ARRAY['Я', 'никогда', 'не', 'ездил', 'на', 'поезде.', 'ехал'], 'Я никогда не ездил на поезде.'),
  (52, 7, 'uz', '(куда, вы, ехать, завтра)', ARRAY['Куда', 'вы', 'едете', 'завтра?', 'ездите'], 'Куда вы едете завтра?'),
  (52, 8, 'uz', '(дети, уже, ехать, в, школу, на, автобус)', ARRAY['Дети', 'уже', 'едут', 'в', 'школу', 'на', 'автобусе.', 'ездят'], 'Дети уже едут в школу на автобусе.'),
  (52, 9, 'uz', '(мы, обычно, ездить, на, дачу, на, электричка)', ARRAY['Мы', 'обычно', 'ездим', 'на', 'дачу', 'на', 'электричке.', 'едем'], 'Мы обычно ездим на дачу на электричке.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (52, 0, 'Transportda ketyapman (hozir)', 'Еду'),
  (52, 1, 'Transportda boraman (muntazam)', 'Езжу'),
  (52, 2, 'Transportda ketayotgan edim (jarayon)', 'Ехал'),
  (52, 3, 'Transportda bordim (bir marta)', 'Ездил'),
  (52, 4, 'Poyezd', 'Поезд'),
  (52, 5, 'Samolyot', 'Самолёт'),
  (52, 6, 'Avtobus', 'Автобус'),
  (52, 7, 'Mashina', 'Машина'),
  (52, 8, 'Velosiped', 'Велосипед'),
  (52, 9, 'Metro', 'Метро'),
  (52, 10, 'Tezyurar', 'Скоростной'),
  (52, 11, 'Tushmoq (transportdan)', 'Выходить (из)'),
  (52, 12, 'O‘tirmoq (transportga)', 'Садиться (в)'),
  (52, 13, 'Tiqilinch', 'Пробка'),
  (52, 14, 'Haydamoq (mashina)', 'Вести (машину)');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  52,
  'Поездка в Санкт-Петербург',
  $body$
В прошлом месяце мы ездили в Санкт-Петербург на поезде: билеты мы купили заранее, а в вагоне было тихо и уютно. Мы ехали туда восемь часов, но время прошло незаметно.

По дороге мы смотрели в окно и любовались лесами и полями. Иногда проводник приносил чай, а мы болтали и смеялись.

Мой друг Антон тоже ехал с нами. Мы часто ездим в этот город, потому что любим его архитектуру и музеи. В этот раз мы ездили туда на выходные и хотели увидеть как можно больше.

Мы посмотрели Эрмитаж, гуляли по Невскому проспекту и ездили на экскурсию в Петродворец. Вечером город светился огнями, а по набережной шли туристы.

Обратно мы решили ехать на автобусе: хотелось сравнить дорогу. Автобус ехал медленнее и делал остановки в городах, но мы могли ещё раз посмотреть на поля и реки.

Моя бабушка часто ездит в Питер к родственникам на поезде. Она всегда говорит: «Поезд — самый удобный транспорт для путешествий». Я согласен с ней.

В следующий раз мы поедем в Москву на скоростном поезде и попробуем новый маршрут. Надеюсь, это будет интересно и спокойно.
$body$,
  'kunlik-oqish-52'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-51', 'а', 'а', 'Va', NULL),
  ('kunlik-oqish-51', 'автобусе', 'автобусе', 'Avtobusda', NULL),
  ('kunlik-oqish-51', 'Антон', 'антон', 'Anton', NULL),
  ('kunlik-oqish-51', 'Антона', 'антона', 'Antonning', NULL),
  ('kunlik-oqish-51', 'Антоном', 'антоном', 'Anton bilan', NULL),
  ('kunlik-oqish-51', 'аптеку', 'аптеку', 'Dorixonaga', NULL),
  ('kunlik-oqish-51', 'был', 'был', 'Bo‘lgan edi', NULL),
  ('kunlik-oqish-51', 'была', 'была', 'Edi (ayol)', NULL),
  ('kunlik-oqish-51', 'было', 'было', 'Bo‘ldi', NULL),
  ('kunlik-oqish-51', 'быстрее', 'быстрее', 'Tezroq', NULL),
  ('kunlik-oqish-51', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-51', 'вернулся', 'вернулся', 'Qaytdi', NULL),
  ('kunlik-oqish-51', 'весь', 'весь', 'Butun', NULL),
  ('kunlik-oqish-51', 'вместе', 'вместе', 'Birga', NULL),
  ('kunlik-oqish-51', 'воздух', 'воздух', 'Havo', NULL),
  ('kunlik-oqish-51', 'всегда', 'всегда', 'Har doim', NULL),
  ('kunlik-oqish-51', 'встретил', 'встретил', 'Uchrattim', NULL),
  ('kunlik-oqish-51', 'встречу', 'встречу', 'Uchrashuv', NULL),
  ('kunlik-oqish-51', 'высоко', 'высоко', 'Baland', NULL),
  ('kunlik-oqish-51', 'город', 'город', 'Shahar', NULL),
  ('kunlik-oqish-51', 'два', 'два', 'Ikki', NULL),
  ('kunlik-oqish-51', 'десять', 'десять', 'O‘n', NULL),
  ('kunlik-oqish-51', 'для', 'для', 'uchun', NULL),
  ('kunlik-oqish-51', 'дня', 'дня', 'kun', NULL),
  ('kunlik-oqish-51', 'до', 'до', '…gacha', NULL),
  ('kunlik-oqish-51', 'дождя', 'дождя', 'Yomg‘ir (rod.)', NULL),
  ('kunlik-oqish-51', 'долгого', 'долгого', 'Uzoq (rod.)', NULL),
  ('kunlik-oqish-51', 'Дома', 'дома', 'Uyda', NULL),
  ('kunlik-oqish-51', 'домой', 'домой', 'Uyga', NULL),
  ('kunlik-oqish-51', 'дороге', 'дороге', 'yo‘lda', NULL),
  ('kunlik-oqish-51', 'дорогой', 'дорогой', 'Aziz', NULL),
  ('kunlik-oqish-51', 'друг', 'друг', 'Do‘st', NULL),
  ('kunlik-oqish-51', 'друга', 'друга', 'Do‘st (род.; 2 uchun)', NULL),
  ('kunlik-oqish-51', 'другой', 'другой', 'Boshqa', NULL),
  ('kunlik-oqish-51', 'ещё', 'еще', 'Yana', NULL),
  ('kunlik-oqish-51', 'завтра', 'завтра', 'Ertaga', NULL),
  ('kunlik-oqish-51', 'зашёл', 'зашел', 'Kirdi', NULL),
  ('kunlik-oqish-51', 'здоровья', 'здоровья', 'Sog‘liq', NULL),
  ('kunlik-oqish-51', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-51', 'идёшь', 'идешь', 'Ketyapsan', NULL),
  ('kunlik-oqish-51', 'идут', 'идут', 'Ketyapti', NULL),
  ('kunlik-oqish-51', 'из', 'из', '…dan', NULL),
  ('kunlik-oqish-51', 'или', 'или', 'Yoki', NULL),
  ('kunlik-oqish-51', 'Иногда', 'иногда', 'Ba’zida', NULL),
  ('kunlik-oqish-51', 'кажется', 'кажется', 'Tuyiladi', NULL),
  ('kunlik-oqish-51', 'как', 'как', 'Qanday', NULL),
  ('kunlik-oqish-51', 'Когда', 'когда', 'Qachon', NULL),
  ('kunlik-oqish-51', 'любовался', 'любовался', 'Zavqlangan edi', NULL),
  ('kunlik-oqish-51', 'люди', 'люди', 'Odamlar', NULL),
  ('kunlik-oqish-51', 'магазин', 'магазин', 'Do‘kon', NULL),
  ('kunlik-oqish-51', 'магазина', 'магазина', 'Do‘kon (rod.)', NULL),
  ('kunlik-oqish-51', 'мало', 'мало', 'Oz', NULL),
  ('kunlik-oqish-51', 'мама', 'мама', 'Ona', NULL),
  ('kunlik-oqish-51', 'маме', 'маме', 'Onamga', NULL),
  ('kunlik-oqish-51', 'машин', 'машин', 'Mashinalar (kam)', NULL),
  ('kunlik-oqish-51', 'машины', 'машины', 'mashina', NULL),
  ('kunlik-oqish-51', 'медленно', 'медленно', 'Sekin', NULL),
  ('kunlik-oqish-51', 'мимо', 'мимо', 'Yonidan', NULL),
  ('kunlik-oqish-51', 'минут', 'минут', 'Daqiqa', NULL),
  ('kunlik-oqish-51', 'Мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-51', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-51', 'находят', 'находят', 'Topadi', NULL),
  ('kunlik-oqish-51', 'не', 'не', 'Emas', NULL),
  ('kunlik-oqish-51', 'небом', 'небом', 'Osmon (tvor.)', NULL),
  ('kunlik-oqish-51', 'недавнего', 'недавнего', 'Yaqinda bo‘lgan', NULL),
  ('kunlik-oqish-51', 'немного', 'немного', 'Ozgina', NULL),
  ('kunlik-oqish-51', 'Нет', 'нет', 'Yo‘q', NULL),
  ('kunlik-oqish-51', 'ним', 'ним', 'U bilan', NULL),
  ('kunlik-oqish-51', 'Ничего', 'ничего', 'Hech narsa', NULL),
  ('kunlik-oqish-51', 'но', 'но', 'Lekin', NULL),
  ('kunlik-oqish-51', 'о', 'о', '…haqida', NULL),
  ('kunlik-oqish-51', 'облака', 'облака', 'Bulutlar', NULL),
  ('kunlik-oqish-51', 'Обычно', 'обычно', 'Odatda', NULL),
  ('kunlik-oqish-51', 'один', 'один', 'Bir', NULL),
  ('kunlik-oqish-51', 'одной', 'одной', 'Bitta (yo‘l)', NULL),
  ('kunlik-oqish-51', 'Он', 'он', 'U (erkak)', NULL),
  ('kunlik-oqish-51', 'особенно', 'особенно', 'Ayniqsa', NULL),
  ('kunlik-oqish-51', 'отпуске', 'отпуске', 'Ta’tilda', NULL),
  ('kunlik-oqish-51', 'пакетами', 'пакетами', 'Paketlar bilan', NULL),
  ('kunlik-oqish-51', 'пахло', 'пахло', 'Hidi chiqardi', NULL),
  ('kunlik-oqish-51', 'перекрёстка', 'перекрестка', 'Chorrahani', NULL),
  ('kunlik-oqish-51', 'пешком', 'пешком', 'Piyoda', NULL),
  ('kunlik-oqish-51', 'плыли', 'плыли', 'Suzgan', NULL),
  ('kunlik-oqish-51', 'По', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-51', 'поговорили', 'поговорили', 'Gaplashdik', NULL),
  ('kunlik-oqish-51', 'Погода', 'погода', 'Ob-havo', NULL),
  ('kunlik-oqish-51', 'подумать', 'подумать', 'O‘ylamoq', NULL),
  ('kunlik-oqish-51', 'подышать', 'подышать', 'Nafas olmoq', NULL),
  ('kunlik-oqish-51', 'поздно', 'поздно', 'Kech', NULL),
  ('kunlik-oqish-51', 'полезно', 'полезно', 'Foydali', NULL),
  ('kunlik-oqish-51', 'после', 'после', 'Keyin', NULL),
  ('kunlik-oqish-51', 'посмеялись', 'посмеялись', 'Kulishdi', NULL),
  ('kunlik-oqish-51', 'потому', 'потому', 'Chunki', NULL),
  ('kunlik-oqish-51', 'пошёл', 'пошел', 'Bordim (erkak)', NULL),
  ('kunlik-oqish-51', 'пошли', 'пошли', 'Ketishdi', NULL),
  ('kunlik-oqish-51', 'пришёл', 'пришел', 'Keldi', NULL),
  ('kunlik-oqish-51', 'приятно', 'приятно', 'Yoqimli', NULL),
  ('kunlik-oqish-51', 'про', 'про', 'Haqida', NULL),
  ('kunlik-oqish-51', 'пройтись', 'пройтись', 'Sayr qilmoq', NULL),
  ('kunlik-oqish-51', 'просто', 'просто', 'Oddiy', NULL),
  ('kunlik-oqish-51', 'прошлый', 'прошлый', 'O‘tgan', NULL),
  ('kunlik-oqish-51', 'работе', 'работе', 'Ish haqida', NULL),
  ('kunlik-oqish-51', 'работу', 'работу', 'Ishni', NULL),
  ('kunlik-oqish-51', 'работы', 'работы', 'Ishdan keyin', NULL),
  ('kunlik-oqish-51', 'раз', 'раз', 'Marta', NULL),
  ('kunlik-oqish-51', 'рассказал', 'рассказал', 'Aytib berdi', NULL),
  ('kunlik-oqish-51', 'расстались', 'расстались', 'Ajrashdik', NULL),
  ('kunlik-oqish-51', 'решил', 'решил', 'qaror qildi', NULL),
  ('kunlik-oqish-51', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-51', 'свежим', 'свежим', 'Shinam', NULL),
  ('kunlik-oqish-51', 'своего', 'своего', 'o‘zining', NULL),
  ('kunlik-oqish-51', 'свои', 'свои', 'O‘zingning', NULL),
  ('kunlik-oqish-51', 'Сегодня', 'сегодня', 'Bugun', NULL),
  ('kunlik-oqish-51', 'сказал', 'сказал', 'dedim', NULL),
  ('kunlik-oqish-51', 'следующего', 'следующего', 'Keyingi', NULL),
  ('kunlik-oqish-51', 'слышал', 'слышал', 'Eshitgan edi', NULL),
  ('kunlik-oqish-51', 'смотришь', 'смотришь', 'Qaraysan', NULL),
  ('kunlik-oqish-51', 'снуют', 'снуют', 'Tez harakatlanadi', NULL),
  ('kunlik-oqish-51', 'согласился', 'согласился', 'Rozi bo‘ldi', NULL),
  ('kunlik-oqish-51', 'спешил', 'спешил', 'Shoshilgan edi', NULL),
  ('kunlik-oqish-51', 'спешит', 'спешит', 'Shoshiladi', NULL),
  ('kunlik-oqish-51', 'спросила', 'спросила', 'So‘radi', NULL),
  ('kunlik-oqish-51', 'старого', 'старого', 'eski', NULL),
  ('kunlik-oqish-51', 'столе', 'столе', 'Stolda', NULL),
  ('kunlik-oqish-51', 'сторонам', 'сторонам', 'Tomonlarga', NULL),
  ('kunlik-oqish-51', 'стояла', 'стояла', 'Turardi', NULL),
  ('kunlik-oqish-51', 'супом', 'супом', 'Sup bilan', NULL),
  ('kunlik-oqish-51', 'сходишь', 'сходишь', 'Borasan (bir marta)', NULL),
  ('kunlik-oqish-51', 'тарелка', 'тарелка', 'Likopcha', NULL),
  ('kunlik-oqish-51', 'тишины', 'тишины', 'Jimjitlik', NULL),
  ('kunlik-oqish-51', 'тоже', 'тоже', 'Ham', NULL),
  ('kunlik-oqish-51', 'только', 'только', 'Faqat', NULL),
  ('kunlik-oqish-51', 'Ты', 'ты', 'Sen', NULL),
  ('kunlik-oqish-51', 'уже', 'уже', 'Allaqachon', NULL),
  ('kunlik-oqish-51', 'ужинать', 'ужинать', 'Kechki ovqat qilmoq', NULL),
  ('kunlik-oqish-51', 'улице', 'улице', 'ko‘chada', NULL),
  ('kunlik-oqish-51', 'улыбнулся', 'улыбнулся', 'Kulimsirdi', NULL),
  ('kunlik-oqish-51', 'умылся', 'умылся', 'Yuvindi', NULL),
  ('kunlik-oqish-51', 'ходил', 'ходил', 'Borgan edi (bir marta)', NULL),
  ('kunlik-oqish-51', 'ходит', 'ходит', 'Boradi (muntazam)', NULL),
  ('kunlik-oqish-51', 'хожу', 'хожу', 'Boraman (muntazam)', NULL),
  ('kunlik-oqish-51', 'хорошая', 'хорошая', 'Yaxshi', NULL),
  ('kunlik-oqish-51', 'хотел', 'хотел', 'Xohlardi', NULL),
  ('kunlik-oqish-51', 'хотелось', 'хотелось', 'Xohlardi', NULL),
  ('kunlik-oqish-51', 'часто', 'часто', 'Tez-tez', NULL),
  ('kunlik-oqish-51', 'что', 'что', 'Nima', NULL),
  ('kunlik-oqish-51', 'шаги', 'шаги', 'Qadamlar', NULL),
  ('kunlik-oqish-51', 'шёл', 'шел', 'Ketayotgan edi', NULL),
  ('kunlik-oqish-51', 'это', 'это', 'Bu', NULL),
  ('kunlik-oqish-51', 'я', 'я', 'Men', NULL),
  ('kunlik-oqish-52', 'а', 'а', 'Va', NULL),
  ('kunlik-oqish-52', 'Автобус', 'автобус', 'Avtobus', NULL),
  ('kunlik-oqish-52', 'автобусе', 'автобусе', 'Avtobusda', NULL),
  ('kunlik-oqish-52', 'Антон', 'антон', 'Anton', NULL),
  ('kunlik-oqish-52', 'архитектуру', 'архитектуру', 'Arxitekturasini', NULL),
  ('kunlik-oqish-52', 'бабушка', 'бабушка', 'Buvi', NULL),
  ('kunlik-oqish-52', 'билеты', 'билеты', 'Chiptalar', NULL),
  ('kunlik-oqish-52', 'болтали', 'болтали', 'Suhbatlashdik', NULL),
  ('kunlik-oqish-52', 'больше', 'больше', 'Ko‘proq', NULL),
  ('kunlik-oqish-52', 'будет', 'будет', 'Bo‘ladi', NULL),
  ('kunlik-oqish-52', 'было', 'было', 'Bo‘ldi', NULL),
  ('kunlik-oqish-52', 'В', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-52', 'вагоне', 'вагоне', 'Vagonda', NULL),
  ('kunlik-oqish-52', 'Вечером', 'вечером', 'Kechqurun', NULL),
  ('kunlik-oqish-52', 'восемь', 'восемь', 'Sakkiz', NULL),
  ('kunlik-oqish-52', 'время', 'время', 'Vaqt', NULL),
  ('kunlik-oqish-52', 'всегда', 'всегда', 'Har doim', NULL),
  ('kunlik-oqish-52', 'выходные', 'выходные', 'Dam olish kunlari', NULL),
  ('kunlik-oqish-52', 'говорит', 'говорит', 'Gapiradi', NULL),
  ('kunlik-oqish-52', 'город', 'город', 'Shahar', NULL),
  ('kunlik-oqish-52', 'городах', 'городах', 'Shaharlarda', NULL),
  ('kunlik-oqish-52', 'гуляли', 'гуляли', 'Sayr qildik', NULL),
  ('kunlik-oqish-52', 'делал', 'делал', 'Qildi', NULL),
  ('kunlik-oqish-52', 'для', 'для', 'uchun', NULL),
  ('kunlik-oqish-52', 'дороге', 'дороге', 'yo‘lda', NULL),
  ('kunlik-oqish-52', 'дорогу', 'дорогу', 'Yo‘lga', NULL),
  ('kunlik-oqish-52', 'друг', 'друг', 'Do‘st', NULL),
  ('kunlik-oqish-52', 'его', 'его', 'Uni', NULL),
  ('kunlik-oqish-52', 'ездили', 'ездили', 'Bordik', NULL),
  ('kunlik-oqish-52', 'ездим', 'ездим', 'Boramiz', NULL),
  ('kunlik-oqish-52', 'ездит', 'ездит', 'Boradi', NULL),
  ('kunlik-oqish-52', 'ехал', 'ехал', 'Ketayotgan edi', NULL),
  ('kunlik-oqish-52', 'ехали', 'ехали', 'Ketayotgan edik', NULL),
  ('kunlik-oqish-52', 'ехать', 'ехать', 'Ketmoq', NULL),
  ('kunlik-oqish-52', 'ещё', 'еще', 'Yana', NULL),
  ('kunlik-oqish-52', 'заранее', 'заранее', 'Oldindan', NULL),
  ('kunlik-oqish-52', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-52', 'Иногда', 'иногда', 'Ba’zida', NULL),
  ('kunlik-oqish-52', 'интересно', 'интересно', 'Qiziqarli', NULL),
  ('kunlik-oqish-52', 'к', 'к', '…ga / …tomon', NULL),
  ('kunlik-oqish-52', 'как', 'как', 'Qanday', NULL),
  ('kunlik-oqish-52', 'купили', 'купили', 'Sotib oldik', NULL),
  ('kunlik-oqish-52', 'лесами', 'лесами', 'O‘rmonlar bilan', NULL),
  ('kunlik-oqish-52', 'любим', 'любим', 'Sevamiz', NULL),
  ('kunlik-oqish-52', 'любовались', 'любовались', 'Hayratlangan edik', NULL),
  ('kunlik-oqish-52', 'маршрут', 'маршрут', 'Marshrut', NULL),
  ('kunlik-oqish-52', 'медленнее', 'медленнее', 'Sekinroq', NULL),
  ('kunlik-oqish-52', 'месяце', 'месяце', 'Oyda', NULL),
  ('kunlik-oqish-52', 'могли', 'могли', 'Oldik / qilishardi', NULL),
  ('kunlik-oqish-52', 'можно', 'можно', 'Mumkin', NULL),
  ('kunlik-oqish-52', 'Мой', 'мой', 'Mening', NULL),
  ('kunlik-oqish-52', 'Москву', 'москву', 'Moskvaga', NULL),
  ('kunlik-oqish-52', 'Моя', 'моя', 'Mening (ayol otl.)', NULL),
  ('kunlik-oqish-52', 'музеи', 'музеи', 'Muzeylar', NULL),
  ('kunlik-oqish-52', 'мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-52', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-52', 'набережной', 'набережной', 'Saybon bo‘ylab', NULL),
  ('kunlik-oqish-52', 'Надеюсь', 'надеюсь', 'Umid qilaman', NULL),
  ('kunlik-oqish-52', 'нами', 'нами', 'Biz bilan', NULL),
  ('kunlik-oqish-52', 'Невскому', 'невскому', 'Nevskiy', NULL),
  ('kunlik-oqish-52', 'незаметно', 'незаметно', 'Sezmasdan', NULL),
  ('kunlik-oqish-52', 'ней', 'ней', 'Unga (ona)', NULL),
  ('kunlik-oqish-52', 'но', 'но', 'Lekin', NULL),
  ('kunlik-oqish-52', 'новый', 'новый', 'Yangi', NULL),
  ('kunlik-oqish-52', 'Обратно', 'обратно', 'Qaytib', NULL),
  ('kunlik-oqish-52', 'огнями', 'огнями', 'Chiroqlar bilan', NULL),
  ('kunlik-oqish-52', 'окно', 'окно', 'Deraza', NULL),
  ('kunlik-oqish-52', 'Она', 'она', 'U (ayol)', NULL),
  ('kunlik-oqish-52', 'остановки', 'остановки', 'To‘xtashlar', NULL),
  ('kunlik-oqish-52', 'Петербург', 'петербург', 'Peterburg', NULL),
  ('kunlik-oqish-52', 'Петродворец', 'петродворец', 'Petrodvorets', NULL),
  ('kunlik-oqish-52', 'Питер', 'питер', 'Piter', NULL),
  ('kunlik-oqish-52', 'По', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-52', 'поедем', 'поедем', 'Boramiz (kelasi)', NULL),
  ('kunlik-oqish-52', 'Поезд', 'поезд', 'Poyezd', NULL),
  ('kunlik-oqish-52', 'поезде', 'поезде', 'Poyezdda', NULL),
  ('kunlik-oqish-52', 'поля', 'поля', 'Dalalar', NULL),
  ('kunlik-oqish-52', 'полями', 'полями', 'Dalalar bilan', NULL),
  ('kunlik-oqish-52', 'попробуем', 'попробуем', 'Sinab ko‘ramiz', NULL),
  ('kunlik-oqish-52', 'посмотрели', 'посмотрели', 'Ko‘rdik', NULL),
  ('kunlik-oqish-52', 'посмотреть', 'посмотреть', 'Ko‘rishni', NULL),
  ('kunlik-oqish-52', 'потому', 'потому', 'Chunki', NULL),
  ('kunlik-oqish-52', 'приносил', 'приносил', 'Olib kelardi', NULL),
  ('kunlik-oqish-52', 'проводник', 'проводник', 'Provodnik', NULL),
  ('kunlik-oqish-52', 'проспекту', 'проспекту', 'Prospekti', NULL),
  ('kunlik-oqish-52', 'прошло', 'прошло', 'O‘tdi', NULL),
  ('kunlik-oqish-52', 'прошлом', 'прошлом', 'O‘tgan', NULL),
  ('kunlik-oqish-52', 'путешествий', 'путешествий', 'Sayohatlar', NULL),
  ('kunlik-oqish-52', 'раз', 'раз', 'Marta', NULL),
  ('kunlik-oqish-52', 'реки', 'реки', 'Daryolar', NULL),
  ('kunlik-oqish-52', 'решили', 'решили', 'qaror qilishdi', NULL),
  ('kunlik-oqish-52', 'родственникам', 'родственникам', 'Qarindoshlariga', NULL),
  ('kunlik-oqish-52', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-52', 'самый', 'самый', 'Eng', NULL),
  ('kunlik-oqish-52', 'Санкт', 'санкт', 'Sankt', NULL),
  ('kunlik-oqish-52', 'светился', 'светился', 'Yaltirardi', NULL),
  ('kunlik-oqish-52', 'скоростном', 'скоростном', 'Tezyurar', NULL),
  ('kunlik-oqish-52', 'следующий', 'следующий', 'Keyingi', NULL),
  ('kunlik-oqish-52', 'смеялись', 'смеялись', 'Kulishdi', NULL),
  ('kunlik-oqish-52', 'смотрели', 'смотрели', 'qarashdi', NULL),
  ('kunlik-oqish-52', 'согласен', 'согласен', 'Roziman', NULL),
  ('kunlik-oqish-52', 'спокойно', 'спокойно', 'Xotirjam', NULL),
  ('kunlik-oqish-52', 'сравнить', 'сравнить', 'Taqqoslash', NULL),
  ('kunlik-oqish-52', 'тихо', 'тихо', 'Jimjit', NULL),
  ('kunlik-oqish-52', 'тоже', 'тоже', 'Ham', NULL),
  ('kunlik-oqish-52', 'транспорт', 'транспорт', 'Transport', NULL),
  ('kunlik-oqish-52', 'туда', 'туда', 'u yerga', NULL),
  ('kunlik-oqish-52', 'туристы', 'туристы', 'Sayyohlar', NULL),
  ('kunlik-oqish-52', 'увидеть', 'увидеть', 'Ko‘rmoq (СВ)', NULL),
  ('kunlik-oqish-52', 'удобный', 'удобный', 'Qulay', NULL),
  ('kunlik-oqish-52', 'уютно', 'уютно', 'Qulay', NULL),
  ('kunlik-oqish-52', 'хотели', 'хотели', 'Xohlardi', NULL),
  ('kunlik-oqish-52', 'хотелось', 'хотелось', 'Xohlardi', NULL),
  ('kunlik-oqish-52', 'чай', 'чай', 'Choy', NULL),
  ('kunlik-oqish-52', 'часов', 'часов', 'Soat', NULL),
  ('kunlik-oqish-52', 'часто', 'часто', 'Tez-tez', NULL),
  ('kunlik-oqish-52', 'что', 'что', 'Nima', NULL),
  ('kunlik-oqish-52', 'шли', 'шли', 'Ketishardi (piyoda)', NULL),
  ('kunlik-oqish-52', 'экскурсию', 'экскурсию', 'Ekskursiyaga', NULL),
  ('kunlik-oqish-52', 'Эрмитаж', 'эрмитаж', 'Ermitaj', NULL),
  ('kunlik-oqish-52', 'это', 'это', 'Bu', NULL),
  ('kunlik-oqish-52', 'этот', 'этот', 'Bu', NULL),
  ('kunlik-oqish-52', 'Я', 'я', 'Men', NULL);
INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (51, 0, 'Siz hozir qayerga ketyapsiz? – Men uyga ketyapman.', 'Куда вы идёте сейчас? – Я иду домой.'),
  (51, 1, 'U har kuni ishga avtobusda boradimi?', 'Он каждый день ходит на работу на автобусе?'),
  (51, 2, 'Kecha kechqurun qayerda edingiz? – Teatrda edim.', 'Где вы были вчера вечером? – Я ходил в театр.'),
  (51, 3, 'Siz ko‘pincha dam olish kunlari qayerga borasiz?', 'Куда вы часто ходите в выходные?'),
  (51, 4, 'U ko‘chada ketayotgan edi, birdan yomg‘ir yog‘a boshladi.', 'Он шёл по улице, вдруг начался дождь.'),
  (51, 5, 'Bolalar, siz qayerda yurasiz? – Biz parkda yuramiz.', 'Дети, где вы гуляете? – Мы гуляем в парке.'),
  (51, 6, 'Kechagi yomg‘irda men piyoda ketdim va ho‘l bo‘ldim.', 'Вчера под дождём я шёл пешком и промок.'),
  (51, 7, 'Nega siz ishga kech qoldingiz? – Men piyoda keldim.', 'Почему вы опоздали на работу? – Я шёл пешком.'),
  (51, 8, 'U tez-tez do‘stlariga mehmonga boradimi?', 'Он часто ходит в гости к друзьям?'),
  (51, 9, 'Bugun ertalab men parkda yurgan edim, sizni ko‘rmadim.', 'Сегодня утром я гулял в парке, я вас не видел.'),
  (52, 0, 'Siz qaysi transportda sayohat qilishni yaxshi ko‘rasiz?', 'Какой транспорт вы любите для путешествий?'),
  (52, 1, 'U bu yozda poyezdda Qrimga boradi.', 'Он поедет в Крым на поезде этим летом.'),
  (52, 2, 'Biz kecha butun kun avtobusda ketyapmiz va juda charchadik.', 'Мы ехали на автобусе целый день вчера и очень устали.'),
  (52, 3, 'Siz qanchalik tez-tez chet elga borasiz?', 'Как часто вы ездите за границу?'),
  (52, 4, 'Men bu shaharda birinchi marta bo‘lganim uchun, metroda qanday borishni bilmayman.', 'Так как я впервые в этом городе, я не знаю, как ездить на метро.'),
  (52, 5, 'U odatda ishga velosipedda boradi, chunki bu sog‘lom.', 'Он обычно ездит на работу на велосипеде, потому что это полезно.'),
  (52, 6, 'Kechagi yo‘l uzoq bo‘lgani sababli, men bir necha marta mashina haydashni to‘xtatdim.', 'Вчера дорога была долгой, поэтому я несколько раз останавливался за рулём.'),
  (52, 7, 'Ular bu yil qishda qayerga borishadi? – Tog‘larga.', 'Куда они поедут этой зимой? – В горы.'),
  (52, 8, 'Men hech qachon samolyotda uchmaganman, qo‘rqaman.', 'Я никогда не летал на самолёте, боюсь.'),
  (52, 9, 'Kechirasiz, bu avtobus markazga boradimi?', 'Извините, этот автобус едет в центр?');
