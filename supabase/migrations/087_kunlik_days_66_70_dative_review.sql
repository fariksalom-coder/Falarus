-- Kunlik kun 66–70: дательный падеж (yordam/maslahat/vaʼda, holat/yosh, нравиться + bezlichnye, takrorlash).

DELETE FROM public.daily_practice_prompts WHERE day_number >= 66 AND day_number <= 70;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number >= 66 AND day_number <= 70
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number >= 66 AND day_number <= 70;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number >= 66 AND day_number <= 70;

DELETE FROM public.daily_vocab_words WHERE day_number >= 66 AND day_number <= 70;

DELETE FROM public.daily_grammar_matches WHERE day_number >= 66 AND day_number <= 70;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number >= 66 AND day_number <= 70;
DELETE FROM public.daily_grammar_mcqs WHERE day_number >= 66 AND day_number <= 70;
DELETE FROM public.daily_grammar_topics WHERE day_number >= 66 AND day_number <= 70;

-- ========== Kun 66 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  66,
  'Д.п.: помогать, советовать, обещать',
  $theory$
**Д.п.** — *кому?*: *Я помогаю **брату**.* · *Он советует **мне**.* · *Она обещает **другу**.*

**Tuzilish:** kim (Им.п.) + fe’l + **кому** (Д.п.) + ba’zan infinitiv (*помогаю брату **делать уроки***).
**Ko‘plik:** *студент**ам***.

**Olmoshlar:** *мне, тебе, ему, ей, нам, вам, им*.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (66, 'rule', 0, '«Men ukamga yordam beraman»', 'Я помогаю брату.', 'Я помогаю брата.', 'Я помогаю братом.', 'Я помогаю брате.', 0),
  (66, 'rule', 1, '«U menga maslahat beradi»', 'Он советует меня.', 'Он советует мне.', 'Он советует мной.', 'Он советует мною.', 1),
  (66, 'rule', 2, '«U do‘stiga vaʼda beradi»', 'Он обещает другу.', 'Он обещает друга.', 'Он обещает другом.', 'Он обещает друге.', 0),
  (66, 'rule', 3, '«Biz talabalarga yordam beramiz»', 'Мы помогаем студентам.', 'Мы помогаем студентов.', 'Мы помогаем студентами.', 'Мы помогаем студентах.', 0),
  (66, 'rule', 4, '«Sizga kim maslahat beradi?»', 'Кто советует вам?', 'Кто советует вас?', 'Кто советует вами?', 'Кто советует им?', 0),
  (66, 'rule', 5, '«Ular menga yordam berishdi»', 'Они помогли мне.', 'Они помогли меня.', 'Они помогли мной.', 'Они помогли мною.', 0),
  (66, 'rule', 6, '«U hech kimga vaʼda bermaydi»', 'Он не обещает никому.', 'Он не обещает некого.', 'Он не обещает ничем.', 'Он не обещает никого.', 0),
  (66, 'rule', 7, '«Siz onangizga tez-tez yordam berasizmi?»', 'Вы часто помогаете маме?', 'Вы часто помогаете маму?', 'Вы часто помогаете мамой?', 'Вы часто помогаете мамою?', 0),
  (66, 'rule', 8, '«U menga dam olishni maslahat berdi»', 'Он посоветовал мне отдохнуть.', 'Он посоветовал меня отдохнуть.', 'Он посоветовал мной отдохнуть.', 'Он посоветовал мною отдохнуть.', 0),
  (66, 'rule', 9, '«Iltimos, menga yordam bering»', 'Пожалуйста, помогите мне.', 'Пожалуйста, помогите меня.', 'Пожалуйста, помогите мной.', 'Пожалуйста, помогите мною.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (66, 0, 0, 'Men akamga yordam beraman.', 'Я помогаю брату.'),
  (66, 0, 1, 'U menga maslahat beradi.', 'Он советует мне.'),
  (66, 0, 2, 'Biz talabalarga vaʼda beramiz.', 'Мы обещаем студентам.'),
  (66, 0, 3, 'Onamga yordam beraman.', 'Я помогаю маме.'),
  (66, 0, 4, 'Siz unga (ayol) maslahat berasiz.', 'Вы советуете ей.'),
  (66, 0, 5, 'U mening do‘stimga yordam beradi.', 'Он помогает моему другу.'),
  (66, 0, 6, 'Sen do‘stingga yordam berasan.', 'Ты помогаешь другу.'),
  (66, 0, 7, 'U ularga vaʼda beradi.', 'Он обещает им.'),
  (66, 0, 8, 'Siz unga (ayol) maslahat berasizmi?', 'Вы советуете ей?'),
  (66, 0, 9, 'Biz bolalarga yordam beramiz.', 'Мы помогаем детям.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (66, 0, 'uz', '(я, помогать, мой, брат, делать, уроки)', ARRAY['Я', 'помогаю', 'моему', 'брату', 'делать', 'уроки.', 'брат'], 'Я помогаю моему брату делать уроки.'),
  (66, 1, 'uz', '(ты, советовать, я, отдохнуть)', ARRAY['Ты', 'советуешь', 'мне', 'отдохнуть.', 'меня'], 'Ты советуешь мне отдохнуть.'),
  (66, 2, 'uz', '(он, обещать, свой, друг, прийти, завтра)', ARRAY['Он', 'обещает', 'своему', 'другу', 'прийти', 'завтра.', 'друг'], 'Он обещает своему другу прийти завтра.'),
  (66, 3, 'uz', '(мы, помогать, наш, учитель, проверять, тетради)', ARRAY['Мы', 'помогаем', 'нашему', 'учителю', 'проверять', 'тетради.', 'учитель'], 'Мы помогаем нашему учителю проверять тетради.'),
  (66, 4, 'uz', '(вы, советовать, они, не, спешить)', ARRAY['Вы', 'советуете', 'им', 'не', 'спешить.', 'они'], 'Вы советуете им не спешить.'),
  (66, 5, 'uz', '(она, помогать, свой, сестра, готовить, ужин)', ARRAY['Она', 'помогает', 'своей', 'сестре', 'готовить', 'ужин.', 'сестра'], 'Она помогает своей сестре готовить ужин.'),
  (66, 6, 'uz', '(я, обещать, ты, позвонить, вечером)', ARRAY['Я', 'обещаю', 'тебе', 'позвонить', 'вечером.', 'ты'], 'Я обещаю тебе позвонить вечером.'),
  (66, 7, 'uz', '(дети, помогать, бабушка, нести, сумки)', ARRAY['Дети', 'помогают', 'бабушке', 'нести', 'сумки.', 'бабушку'], 'Дети помогают бабушке нести сумки.'),
  (66, 8, 'uz', '(почему, ты, не, помогать, свой, родители)', ARRAY['Почему', 'ты', 'не', 'помогаешь', 'своим', 'родителям?', 'родители'], 'Почему ты не помогаешь своим родителям?'),
  (66, 9, 'uz', '(кто, советовать, вы, учить, русский, язык)', ARRAY['Кто', 'советует', 'вам', 'учить', 'русский', 'язык?', 'вас'], 'Кто советует вам учить русский язык?');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (66, 0, 'Yordam bermoq', 'Помогать / помочь'),
  (66, 1, 'Maslahat bermoq', 'Советовать / посоветовать'),
  (66, 2, 'Vaʼda bermoq', 'Обещать / пообещать'),
  (66, 3, 'Yordam', 'Помощь'),
  (66, 4, 'Rozi bo‘lmoq', 'Согласиться'),
  (66, 5, 'Masala', 'Задача'),
  (66, 6, 'To‘plam', 'Сборник'),
  (66, 7, 'Mehmon qilmoq', 'Угощать'),
  (66, 8, 'Orqada qolmoq', 'Отставать'),
  (66, 9, 'Xursand', 'Рад'),
  (66, 10, 'Muhim', 'Важный'),
  (66, 11, 'Uy ishlarida', 'По дому'),
  (66, 12, 'Tayyorgarlik ko‘rmoq', 'Готовиться'),
  (66, 13, 'Kutmoq', 'Ждать'),
  (66, 14, 'Nashr', 'Издание');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  66,
  'Помощь другу',
  $body$
Вчера мой друг Сергей попросил меня о помощи. Он сказал, что не может сделать домашнее задание по математике.

Я сразу согласился помочь ему. Мы встретились у него дома и начали решать задачи.

Я объяснял ему трудные темы, а он внимательно слушал. Потом я посоветовал ему купить сборник задач.

Он пообещал мне заниматься каждый день. После уроков мы вместе пошли в кафе: я хотел угостить его мороженым.

Он сказал: «Спасибо тебе за помощь! Ты очень хороший друг».

Я обещал ему, что больше не буду отставать в школе. Мне было приятно слышать эти слова.

Помогать друзьям — это важное дело.
$body$,
  'kunlik-oqish-66'
);

-- ========== Kun 67 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  67,
  'Д.п.: возраст и состояние',
  $theory$
**Yosh:** *Мне 20 лет.* · *Ему 5 лет.* (*год / года / лет*).

**Holat:** *Мне холодно.* · *Тебе жарко?* · *Нам скучно.* · *Им весело.*

**Kerak / mumkin:** *Мне нужно идти.* · *Тебе можно отдыхать.* · *Нам пора выходить.*

Bularning hammasida birinchi **кому?** (Д.п.).
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (67, 'rule', 0, '«Men 20 yoshdaman»', 'Мне 20 лет.', 'Мне 20 годов.', 'У меня 20 лет.', 'Я 20 лет.', 0),
  (67, 'rule', 1, '«Menga sovuq, derazani yoping»', 'Мне холодно, закрой окно.', 'Мне жарко, закрой окно.', 'Мне скучно, закрой окно.', 'Мне весело, закрой окно.', 0),
  (67, 'rule', 2, '«Unga issiq»', 'Ему жарко.', 'Ему холодно.', 'Ему скучно.', 'Ему весело.', 0),
  (67, 'rule', 3, '«Sizga qiziqmi?»', 'Вам интересно?', 'Вам скучно?', 'Вам тепло?', 'Вам холодно?', 0),
  (67, 'rule', 4, '«U (ayol) 3 yoshda»', 'Ей 3 года.', 'Ей 3 лет.', 'У неё 3 года.', 'Она 3 года.', 0),
  (67, 'rule', 5, '«Bizga zerikarli»', 'Нам скучно.', 'Нам весело.', 'Нам интересно.', 'Нам холодно.', 0),
  (67, 'rule', 6, '«Menga ketish kerak»', 'Мне нужно уходить.', 'Мне можно уходить.', 'Мне нельзя уходить.', 'Мне пора уходить.', 0),
  (67, 'rule', 7, '«Sizga qiyinmi?»', 'Вам трудно?', 'Вам легко?', 'Вам интересно?', 'Вам скучно?', 0),
  (67, 'rule', 8, '«Bizga ketish vaqti keldi»', 'Нам пора идти.', 'Нам нужно идти.', 'Нам можно идти.', 'Нам нельзя идти.', 0),
  (67, 'rule', 9, '«Bolalarga qiziqarli»', 'Детям интересно.', 'Детям скучно.', 'Детям тепло.', 'Детям холодно.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (67, 0, 0, 'Men 25 yoshdaman.', 'Мне 25 лет.'),
  (67, 0, 1, 'Unga issiq.', 'Ему жарко.'),
  (67, 0, 2, 'Bizga quvnoq.', 'Нам весело.'),
  (67, 0, 3, 'Menga ketish kerak.', 'Мне нужно идти.'),
  (67, 0, 4, 'Sizga qiziqmi?', 'Вам интересно?'),
  (67, 0, 5, 'Bizga vaqt keldi.', 'Нам пора.'),
  (67, 0, 6, 'Bolalarga qiyin.', 'Детям трудно.'),
  (67, 0, 7, 'U (ayol) 4 yoshda.', 'Ей 4 года.'),
  (67, 0, 8, 'Onangga sovuqmi?', 'Маме холодно?'),
  (67, 0, 9, 'Ularga sovuq.', 'Им холодно.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (67, 0, 'uz', '(мне, 30, лет)', ARRAY['Мне', '30', 'лет.', 'меня'], 'Мне 30 лет.'),
  (67, 1, 'uz', '(ей, холодно, на, улица)', ARRAY['Ей', 'холодно', 'на', 'улице.', 'улица'], 'Ей холодно на улице.'),
  (67, 2, 'uz', '(нам, скучно, без, ты)', ARRAY['Нам', 'скучно', 'без', 'тебя.', 'ты'], 'Нам скучно без тебя.'),
  (67, 3, 'uz', '(ему, легко, решать, эта, задача)', ARRAY['Ему', 'легко', 'решать', 'эту', 'задачу.', 'его'], 'Ему легко решать эту задачу.'),
  (67, 4, 'uz', '(вам, сколько, лет)', ARRAY['Сколько', 'вам', 'лет?', 'тебе'], 'Сколько вам лет?'),
  (67, 5, 'uz', '(детям, весело, на, праздник)', ARRAY['Детям', 'весело', 'на', 'празднике.', 'праздник'], 'Детям весело на празднике.'),
  (67, 6, 'uz', '(мне, пора, идти, на, работа)', ARRAY['Мне', 'пора', 'идти', 'на', 'работу.', 'работа'], 'Мне пора идти на работу.'),
  (67, 7, 'uz', '(тебе, не, сложно, помочь, я)', ARRAY['Тебе', 'не', 'сложно', 'помочь', 'мне?', 'меня'], 'Тебе не сложно помочь мне?'),
  (67, 8, 'uz', '(брату, 10, лет, он, учится, в, 4, класс)', ARRAY['Брату', '10', 'лет,', 'он', 'учится', 'в', '4', 'классе.', 'класс'], 'Брату 10 лет, он учится в 4 классе.'),
  (67, 9, 'uz', '(нам, жарко, открой, окно)', ARRAY['Нам', 'жарко,', 'открой', 'окно.', 'холодно'], 'Нам жарко, открой окно.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (67, 0, 'Yosh', 'Возраст / лет'),
  (67, 1, 'Sovuq (holat)', 'Холодно'),
  (67, 2, 'Issiq (holat)', 'Жарко'),
  (67, 3, 'Qiziq (holat)', 'Интересно'),
  (67, 4, 'Zerikarli', 'Скучно'),
  (67, 5, 'Quvnoq (holat)', 'Весело'),
  (67, 6, 'Qiyin (holat)', 'Трудно'),
  (67, 7, 'Oson (holat)', 'Легко'),
  (67, 8, 'Uyat', 'Стыдно'),
  (67, 9, 'Yoqimli', 'Приятно'),
  (67, 10, 'Og‘riyapti', 'Больно'),
  (67, 11, 'Kerak', 'Нужно'),
  (67, 12, 'Mumkin', 'Можно'),
  (67, 13, 'Mumkin emas', 'Нельзя'),
  (67, 14, 'Vaqt keldi', 'Пора');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  67,
  'Моя семья. Сколько лет?',
  $body$
Меня зовут Анна. Мне 25 лет. Я работаю в школе учительницей.

Моему брату 30 лет. Он инженер. Ему нравится его работа.

Моей сестре 22 года. Она студентка. Ей интересно учиться в университете.

Моим родителям 50 и 48 лет. Им не скучно вместе: они любят путешествовать.

Моей бабушке 70 лет. Ей иногда трудно ходить по лестнице, но ей весело с внуками.

Мне холодно зимой, поэтому я всегда одеваюсь тепло.

Моему другу тоже холодно, но он не любит шапки. Ему часто бывает стыдно за свои ошибки, но мне легко его прощать — он хороший человек.
$body$,
  'kunlik-oqish-67'
);

-- ========== Kun 68 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  68,
  'Д.п.: нравиться va bezlichnye gaplar',
  $theory$
**Нравиться:** *Кому (Д.п.) + нравится / нравятся + что (Им.п.)* — *Мне нравится этот фильм.*

**Bezlichnye:** *мне можно*, *тебе нельзя*, *нам нужно*, *ему пора*, *мне хочется*, *вам интересно*.

**O‘tgan zamon:** *Мне было интересно.* · *Ей было трудно.*
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (68, 'rule', 0, '«Menga bu film yoqadi»', 'Мне нравится этот фильм.', 'Я нравлюсь этот фильм.', 'Меня нравится этот фильм.', 'Мной нравится этот фильм.', 0),
  (68, 'rule', 1, '«Sizga muzey yoqdimi?»', 'Вам понравился музей?', 'Вы понравились музею?', 'Вас понравился музей?', 'Вами понравился музей?', 0),
  (68, 'rule', 2, '«Menga uxlash istagi bor»', 'Мне хочется спать.', 'Я хочу сплю.', 'Мне хочется сплю.', 'Мне хочу спать.', 0),
  (68, 'rule', 3, '«Bolalarga kechki ovqatdan keyin shirinlik mumkinmi?»', 'Детям можно есть сладкое после ужина?', 'Детям нельзя есть сладкое после ужина?', 'Детям нужно есть сладкое после ужина?', 'Детям пора есть сладкое после ужина?', 0),
  (68, 'rule', 4, '«Unga gapirish mumkin emas»', 'Ему нельзя говорить.', 'Ему можно говорить.', 'Ему нужно говорить.', 'Ему пора говорить.', 0),
  (68, 'rule', 5, '«Sizga qanday musiqa yoqadi?»', 'Какая музыка вам нравится?', 'Какая музыка вы нравитесь?', 'Какая музыка вас нравится?', 'Какая музыка вами нравится?', 0),
  (68, 'rule', 6, '«Menga bu qo‘shiqlar yoqadi»', 'Мне нравятся эти песни.', 'Мне нравится эти песни.', 'Мне нравятся эта песни.', 'Мне нравится эта песни.', 0),
  (68, 'rule', 7, '«Sizga bu yerda ishlash yoqadimi?»', 'Вам нравится работать здесь?', 'Вы нравитесь работать здесь?', 'Вас нравится работать здесь?', 'Вами нравится работать здесь?', 0),
  (68, 'rule', 8, '«Menga qiziq edi»', 'Мне было интересно.', 'Мне было интересен.', 'Мне была интересно.', 'Мне были интересно.', 0),
  (68, 'rule', 9, '«Stolni deraza yoniga qo‘yish mumkinmi?»', 'Извините, можно поставить стол у окна?', 'Извините, нельзя поставить стол у окна?', 'Извините, нужно поставить стол у окна?', 'Извините, пора поставить стол у окна?', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (68, 0, 0, 'Menga teatr yoqadi.', 'Мне нравится театр.'),
  (68, 0, 1, 'Senga choy yoqadimi?', 'Тебе нравится чай?'),
  (68, 0, 2, 'Unga (ayol) o‘qish yoqadi.', 'Ей нравится читать.'),
  (68, 0, 3, 'Bolalarga muzey yoqdimi?', 'Детям понравился музей?'),
  (68, 0, 4, 'Ularga bu shahar yoqadi.', 'Им нравится этот город.'),
  (68, 0, 5, 'Sizga kirish mumkinmi?', 'Вам можно войти?'),
  (68, 0, 6, 'Unga (erkak) ketish kerak.', 'Ему нужно уходить.'),
  (68, 0, 7, 'Menga yeyish istagi bor.', 'Мне хочется есть.'),
  (68, 0, 8, 'Bizga vaqt keldi.', 'Нам пора.'),
  (68, 0, 9, 'Unga (ayol) bu ishni qilish qiyin edi.', 'Ей было трудно сделать эту работу.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (68, 0, 'uz', '(мне, нравиться, этот, книга)', ARRAY['Мне', 'нравится', 'эта', 'книга.', 'меня'], 'Мне нравится эта книга.'),
  (68, 1, 'uz', '(тебе, нравиться, путешествовать, поезд)', ARRAY['Тебе', 'нравится', 'путешествовать', 'на', 'поезде?', 'ты'], 'Тебе нравится путешествовать на поезде?'),
  (68, 2, 'uz', '(ему, нравиться, наша, компания)', ARRAY['Ему', 'нравится', 'наша', 'компания.', 'его'], 'Ему нравится наша компания.'),
  (68, 3, 'uz', '(нам, нравиться, гулять, в, парк, вечером)', ARRAY['Нам', 'нравится', 'гулять', 'в', 'парке', 'вечером.', 'мы'], 'Нам нравится гулять в парке вечером.'),
  (68, 4, 'uz', '(вам, можно, взять, этот, стул)', ARRAY['Вам', 'можно', 'взять', 'этот', 'стул?', 'вас'], 'Вам можно взять этот стул?'),
  (68, 5, 'uz', '(детям, нельзя, играть, на, дорога)', ARRAY['Детям', 'нельзя', 'играть', 'на', 'дороге.', 'дорога'], 'Детям нельзя играть на дороге.'),
  (68, 6, 'uz', '(мне, хочется, выпить, чашка, кофе)', ARRAY['Мне', 'хочется', 'выпить', 'чашку', 'кофе.', 'меня'], 'Мне хочется выпить чашку кофе.'),
  (68, 7, 'uz', '(ему, трудно, просыпаться, рано, утром)', ARRAY['Ему', 'трудно', 'просыпаться', 'рано', 'утром.', 'его'], 'Ему трудно просыпаться рано утром.'),
  (68, 8, 'uz', '(нам, было, весело, на, праздник)', ARRAY['Нам', 'было', 'весело', 'на', 'празднике.', 'мы'], 'Нам было весело на празднике.'),
  (68, 9, 'uz', '(тебе, не, сложно, перевести, этот, текст)', ARRAY['Тебе', 'не', 'сложно', 'перевести', 'этот', 'текст?', 'тебя'], 'Тебе не сложно перевести этот текст?');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (68, 0, 'Yoqmoq', 'Нравиться'),
  (68, 1, 'Choy', 'Чай'),
  (68, 2, 'Qahva', 'Кофе'),
  (68, 3, 'Achchiq ta’m', 'Острый'),
  (68, 4, 'Shirin', 'Сладкий'),
  (68, 5, 'Tadbir', 'Мероприятие'),
  (68, 6, 'Kitobxon', 'Читатель'),
  (68, 7, 'Tanlamoq', 'Выбирать'),
  (68, 8, 'Yig‘moq', 'Собирать'),
  (68, 9, 'Chamadon', 'Чемодан'),
  (68, 10, 'Futbol', 'Футбол'),
  (68, 11, 'Tabassum', 'Улыбка'),
  (68, 12, 'Yuz', 'Лицо'),
  (68, 13, 'Ertak', 'Сказка'),
  (68, 14, 'Gorcha ta’m', 'Горький');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  68,
  'Что мне нравится?',
  $body$
Мне очень нравится моя работа. Я работаю в библиотеке: мне нравится общаться с читателями и помогать им выбирать книги.

Моему коллеге тоже нравится его работа. Ему интересно проводить мероприятия для детей.

Детям очень нравится приходить к нам в библиотеку — им весело и интересно.

Моей подруге нравится путешествовать: ей легко собирать чемодан за пять минут, а мне это трудно.

Моему брату нравится спорт: он может часами смотреть футбол по телевизору. Мне скучно смотреть футбол.

Мне нравится, когда все счастливы. Поэтому я всегда стараюсь помогать людям.

Мне приятно, когда я вижу улыбки на их лицах.
$body$,
  'kunlik-oqish-68'
);

-- ========== Kun 69 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  69,
  'Д.п.: takrorlash (кому? чему?)',
  $theory$
**Д.п.** — *кому? чему?*: yosh (*Мне 20 лет*), holat (*Тебе холодно?*), kerak (*Нам пора*), *нравится*, *помогать / советовать / обещать*, *к кому*, *по чему*.

**Olmoshlar:** *мне… им*.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (69, 'rule', 0, '«Menga sovuq»', 'Мне холодно.', 'Мне жарко.', 'Мне скучно.', 'Мне весело.', 0),
  (69, 'rule', 1, '«Unga (ayol) 30 yosh»', 'Ей 30 лет.', 'Ему 30 лет.', 'Ей 30 год.', 'Ему 30 год.', 0),
  (69, 'rule', 2, '«Bizga bu shahar yoqadi»', 'Нам нравится этот город.', 'Нам нравятся этот город.', 'Мы нравимся этот город.', 'Мы нравимся этому городу.', 0),
  (69, 'rule', 3, '«Men sizga qanday yordam bera olaman?»', 'Чем я могу вам помочь?', 'Чем я могу тебе помочь?', 'Чем я могу помочь вас?', 'Чем я могу помочь вами?', 0),
  (69, 'rule', 4, '«Unga dam olish kerak»', 'Ему нужно отдохнуть.', 'Ему можно отдохнуть.', 'Ему нельзя отдохнуть.', 'Ему пора отдохнуть.', 0),
  (69, 'rule', 5, '«Bolalarga ertak o‘qish yoqadimi?»', 'Детям нравится, когда им читают сказки?', 'Детям нравятся читать сказки?', 'Дети нравятся читать сказки?', 'Детей нравится читать сказки?', 0),
  (69, 'rule', 6, '«Menga bu qo‘shiqlar yoqadi»', 'Мне нравятся эти песни.', 'Мне нравится эти песни.', 'Мне нравится эти песня.', 'Мне нравятся эта песни.', 0),
  (69, 'rule', 7, '«Siz qachon onangizga qo‘ng‘iroq qilasiz?»', 'Когда вы позвоните маме?', 'Когда вы позвоните маму?', 'Когда вы позвоните мамой?', 'Когда вы позвоните мамою?', 0),
  (69, 'rule', 8, '«Bizga ketish vaqti keldi»', 'Нам пора идти.', 'Нам можно идти.', 'Нам нужно идти.', 'Нам нельзя идти.', 0),
  (69, 'rule', 9, '«U menga yordam berishni vaʼda qildi»', 'Он обещал мне помочь.', 'Он обещал меня помочь.', 'Он обещал мной помочь.', 'Он обещал мною помочь.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (69, 0, 0, 'Menga 25 yosh.', 'Мне 25 лет.'),
  (69, 0, 1, 'Unga issiq.', 'Ему жарко.'),
  (69, 0, 2, 'Ularga sovuq.', 'Им холодно.'),
  (69, 0, 3, 'Menga raqsga tushish yoqadi.', 'Мне нравится танцевать.'),
  (69, 0, 4, 'Sizga qiyinmi?', 'Вам трудно?'),
  (69, 0, 5, 'Menga ishlash kerak.', 'Мне нужно работать.'),
  (69, 0, 6, 'Bolalar muzeyni yoqtimi?', 'Детям понравился музей?'),
  (69, 0, 7, 'Siz onangizga yordam berasiz.', 'Вы помогаете маме.'),
  (69, 0, 8, 'Biz o‘qituvchiga yordam beramiz.', 'Мы помогаем учителю.'),
  (69, 0, 9, 'Unga bu kitob yoqdi.', 'Ему понравилась эта книга.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (69, 0, 'uz', '(я, помогать, свой, бабушка, по, дому)', ARRAY['Я', 'помогаю', 'своей', 'бабушке', 'по', 'дому.', 'бабушка'], 'Я помогаю своей бабушке по дому.'),
  (69, 1, 'uz', '(ты, нравиться, этот, город)', ARRAY['Тебе', 'нравится', 'этот', 'город?', 'ты'], 'Тебе нравится этот город?'),
  (69, 2, 'uz', '(ему, 40, лет, он, работает, врачом)', ARRAY['Ему', '40', 'лет,', 'он', 'работает', 'врачом.', 'его'], 'Ему 40 лет, он работает врачом.'),
  (69, 3, 'uz', '(нам, холодно, включи, отопление)', ARRAY['Нам', 'холодно,', 'включи', 'отопление.', 'тебе'], 'Нам холодно, включи отопление.'),
  (69, 4, 'uz', '(вы, обещать, дети, сводить, их, в, зоопарк)', ARRAY['Вы', 'обещаете', 'детям', 'сводить', 'их', 'в', 'зоопарк.', 'дети'], 'Вы обещаете детям сводить их в зоопарк.'),
  (69, 5, 'uz', '(мне, пора, собираться, на, работу)', ARRAY['Мне', 'пора', 'собираться', 'на', 'работу.', 'можно'], 'Мне пора собираться на работу.'),
  (69, 6, 'uz', '(ей, трудно, одной, поднимать, тяжелые, сумки)', ARRAY['Ей', 'трудно', 'одной', 'поднимать', 'тяжёлые', 'сумки.', 'её'], 'Ей трудно одной поднимать тяжёлые сумки.'),
  (69, 7, 'uz', '(вам, можно, взять, эта, книга, на, неделя)', ARRAY['Вам', 'можно', 'взять', 'эту', 'книгу', 'на', 'неделю.', 'вас'], 'Вам можно взять эту книгу на неделю.'),
  (69, 8, 'uz', '(детям, нравиться, когда, им, читают, вслух)', ARRAY['Детям', 'нравится,', 'когда', 'им', 'читают', 'вслух.', 'дети'], 'Детям нравится, когда им читают вслух.'),
  (69, 9, 'uz', '(почему, ты, не, помогать, свой, родители)', ARRAY['Почему', 'ты', 'не', 'помогаешь', 'своим', 'родителям?', 'родители'], 'Почему ты не помогаешь своим родителям?');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (69, 0, 'Keksa odam', 'Пожилой'),
  (69, 1, 'Yolg‘iz', 'Один / одна'),
  (69, 2, 'Uddalamoq', 'Справляться'),
  (69, 3, 'Ovoz chiqarib', 'Вслух'),
  (69, 4, 'Klassik', 'Классический'),
  (69, 5, 'Roman', 'Роман'),
  (69, 6, 'Qahramon', 'Герой'),
  (69, 7, 'Televizor', 'Телевизор'),
  (69, 8, 'Radio', 'Радио'),
  (69, 9, 'Nevara', 'Внученька'),
  (69, 10, 'Tez-tezroq', 'Чаще'),
  (69, 11, 'Axir', 'Ведь'),
  (69, 12, 'Eʼtibor', 'Внимание'),
  (69, 13, 'G‘amxo‘rlik', 'Забота'),
  (69, 14, 'Tuyulmoq', 'Казаться');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  69,
  'Моя бабушка',
  $body$
Моей бабушке 70 лет. Она живёт в деревне одна.

Ей иногда трудно справляться с домашними делами. Поэтому я часто приезжаю к ней и помогаю ей.

Мне нравится бывать у бабушки. Ей нравится, когда я читаю ей вслух книги.

Моей бабушке нравятся классические романы — ей интересно узнавать о жизни героев.

Я часто советую ей смотреть телевизор и слушать радио, чтобы ей не было скучно.

Бабушка всегда рада меня видеть. Она говорит мне: «Спасибо, внученька, что ты мне помогаешь».

Мне приятно слышать эти слова. Я обещаю ей приезжать чаще.

Ведь пожилым людям очень важно внимание и забота.
$body$,
  'kunlik-oqish-69'
);

-- ========== Kun 70 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  70,
  'Д.п.: yakuniy takrorlash (61–69)',
  $theory$
**Д.п.** — *кому? чему?*: yosh, holat, *нужно / можно / пора*, *нравится*, *помогать*, *советовать*, *обещать*, *к кому*, *по улице*.

**Olmoshlar:** *мне … им* · **год / года / лет**.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (70, 'rule', 0, '«Menga 20 yosh»', 'Мне 20 лет.', 'Мне 20 год.', 'Меня 20 лет.', 'У меня 20 лет.', 0),
  (70, 'rule', 1, '«Unga issiq»', 'Ему жарко.', 'Ему холодно.', 'Ему скучно.', 'Ему весело.', 0),
  (70, 'rule', 2, '«Bizga bu qo‘shiq yoqadi»', 'Нам нравится эта песня.', 'Нам нравятся эта песня.', 'Мы нравимся эта песня.', 'Нас нравится эта песня.', 0),
  (70, 'rule', 3, '«Men sizga yordam bera olamanmi?»', 'Могу ли я вам помочь?', 'Могу ли я тебе помочь?', 'Могу ли я помочь вас?', 'Могу ли я помочь вами?', 0),
  (70, 'rule', 4, '«Menga ketish vaqti keldi»', 'Мне пора идти.', 'Мне можно идти.', 'Мне нужно идти.', 'Мне нельзя идти.', 0),
  (70, 'rule', 5, '«U menga kelishga vaʼda berdi»', 'Он обещал мне прийти.', 'Он обещал меня прийти.', 'Он обещал мной прийти.', 'Он обещал мною прийти.', 0),
  (70, 'rule', 6, '«Menga bu gullar yoqadi»', 'Мне нравятся эти цветы.', 'Мне нравится эти цветы.', 'Мне нравятся этот цветы.', 'Мне нравится этот цветы.', 0),
  (70, 'rule', 7, '«Bolalarga kechki ovqatdan keyin shirinlik mumkinmi?»', 'Детям можно есть сладкое после ужина?', 'Детям нельзя есть сладкое после ужина?', 'Детям нужно есть сладкое после ужина?', 'Детям пора есть сладкое после ужина?', 0),
  (70, 'rule', 8, '«Menga uxlash istagi bor»', 'Мне хочется спать.', 'Мне хочется есть.', 'Мне хочется пить.', 'Мне хочется гулять.', 0),
  (70, 'rule', 9, '«U menga ishda yordam berdi»', 'Он помог мне на работе.', 'Он помог меня на работе.', 'Он помог мной на работе.', 'Он помог мною на работе.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (70, 0, 0, 'Menga 18 yosh.', 'Мне 18 лет.'),
  (70, 0, 1, 'Unga sport yoqadi.', 'Ему нравится спорт.'),
  (70, 0, 2, 'Bolalarga zerikarli.', 'Детям скучно.'),
  (70, 0, 3, 'Buvimga dam olish kerak.', 'Бабушке нужно отдохнуть.'),
  (70, 0, 4, 'Sizga yordam kerakmi?', 'Вам нужна помощь?'),
  (70, 0, 5, 'Unga (ayol) yangi mashina yoqdi.', 'Ей понравилась новая машина.'),
  (70, 0, 6, 'Bizga kechki ovqatdan keyin uchrashish kerak.', 'Нам нужно встретиться после ужина.'),
  (70, 0, 7, 'Bolalarga sovg‘a vaʼda qilamiz.', 'Мы обещаем детям подарки.'),
  (70, 0, 8, 'Unga (erkak) bu kitobni o‘qish qiyin edi.', 'Ему было трудно читать эту книгу.'),
  (70, 0, 9, 'Siz onangizga qo‘ng‘iroq qilasizmi?', 'Вы позвоните маме?');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (70, 0, 'uz', '(мне, 25, лет, я, живу, в, Москве)', ARRAY['Мне', '25', 'лет,', 'я', 'живу', 'в', 'Москве.', 'меня'], 'Мне 25 лет, я живу в Москве.'),
  (70, 1, 'uz', '(тебе, нравиться, этот, музыка)', ARRAY['Тебе', 'нравится', 'эта', 'музыка?', 'ты'], 'Тебе нравится эта музыка?'),
  (70, 2, 'uz', '(ему, трудно, просыпаться, рано, утром)', ARRAY['Ему', 'трудно', 'просыпаться', 'рано', 'утром.', 'его'], 'Ему трудно просыпаться рано утром.'),
  (70, 3, 'uz', '(нам, холодно, давай, пойдём, в, кафе)', ARRAY['Нам', 'холодно,', 'давай', 'пойдём', 'в', 'кафе.', 'мы'], 'Нам холодно, давай пойдём в кафе.'),
  (70, 4, 'uz', '(вы, помогать, свой, дети, делать, уроки)', ARRAY['Вы', 'помогаете', 'своим', 'детям', 'делать', 'уроки.', 'дети'], 'Вы помогаете своим детям делать уроки.'),
  (70, 5, 'uz', '(я, обещать, ты, позвонить, завтра)', ARRAY['Я', 'обещаю', 'тебе', 'позвонить', 'завтра.', 'ты'], 'Я обещаю тебе позвонить завтра.'),
  (70, 6, 'uz', '(ей, 5, лет, она, ходить, в, детский, сад)', ARRAY['Ей', '5', 'лет,', 'она', 'ходит', 'в', 'детский', 'сад.', 'её'], 'Ей 5 лет, она ходит в детский сад.'),
  (70, 7, 'uz', '(нам, пора, выходить, из, дома, через, 10, минут)', ARRAY['Нам', 'пора', 'выходить', 'из', 'дома', 'через', '10', 'минут.', 'мы'], 'Нам пора выходить из дома через 10 минут.'),
  (70, 8, 'uz', '(детям, можно, играть, на, улице, до, вечера)', ARRAY['Детям', 'можно', 'играть', 'на', 'улице', 'до', 'вечера.', 'дети'], 'Детям можно играть на улице до вечера.'),
  (70, 9, 'uz', '(почему, ты, не, помогать, свой, мама, мыть, посуду)', ARRAY['Почему', 'ты', 'не', 'помогаешь', 'своей', 'маме', 'мыть', 'посуду?', 'мама'], 'Почему ты не помогаешь своей маме мыть посуду?');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (70, 0, 'Do‘st', 'Друг'),
  (70, 1, 'Tanishmoq', 'Познакомиться'),
  (70, 2, 'Halollik', 'Честность'),
  (70, 3, 'Hazil tuyg‘usi', 'Чувство юмора'),
  (70, 4, 'Bir-biriga', 'Друг другу'),
  (70, 5, 'Muammo', 'Проблема'),
  (70, 6, 'Chiqmoq (natija)', 'Получаться'),
  (70, 7, 'Sayohat qilmoq', 'Путешествовать'),
  (70, 8, 'Hazillashmoq', 'Шутить'),
  (70, 9, 'Shu sabab bilan', 'По этому поводу'),
  (70, 10, 'Xursand', 'Рад'),
  (70, 11, 'Qadriyat', 'Ценность'),
  (70, 12, 'Mavzu', 'Тема'),
  (70, 13, 'Atamoq', 'Назвать'),
  (70, 14, 'Oxirgi marta', 'Последний раз');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  70,
  'Мой лучший друг',
  $body$
У меня есть лучший друг. Его зовут Дима. Ему 23 года.

Мы познакомились в университете три года назад. Мне нравится в нём его честность и чувство юмора.

Диме тоже нравится общаться со мной. Мы часто помогаем друг другу.

Когда у меня бывают проблемы, Дима всегда советует мне. А когда у него что-то не получается, я стараюсь помочь ему.

Диме интересно путешествовать: ему нравится узнавать новые места и знакомиться с новыми людьми.

Мне тоже нравится путешествовать, но мне иногда бывает трудно собрать чемодан. Дима всегда шутит над мной по этому поводу.

Мне с ним всегда легко и весело. Я рад, что у меня есть такой друг.

Дружба — это большая ценность.
$body$,
  'kunlik-oqish-70'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-66', 'а', 'а', 'Va', NULL),
  ('kunlik-oqish-66', 'больше', 'больше', 'Ko‘proq', NULL),
  ('kunlik-oqish-66', 'буду', 'буду', 'Bo‘laman', NULL),
  ('kunlik-oqish-66', 'было', 'было', 'Bo‘ldi', NULL),
  ('kunlik-oqish-66', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-66', 'важное', 'важное', 'Muhim (ish)', NULL),
  ('kunlik-oqish-66', 'вместе', 'вместе', 'Birga', NULL),
  ('kunlik-oqish-66', 'внимательно', 'внимательно', 'Diqqat bilan', NULL),
  ('kunlik-oqish-66', 'встретились', 'встретились', 'Uchrashdik', NULL),
  ('kunlik-oqish-66', 'Вчера', 'вчера', 'Kecha', NULL),
  ('kunlik-oqish-66', 'дело', 'дело', 'Ish', NULL),
  ('kunlik-oqish-66', 'день', 'день', 'Kun', NULL),
  ('kunlik-oqish-66', 'дома', 'дома', 'Uyda', NULL),
  ('kunlik-oqish-66', 'домашнее', 'домашнее', 'Uy vazifasi', NULL),
  ('kunlik-oqish-66', 'друг', 'друг', 'Do‘st', NULL),
  ('kunlik-oqish-66', 'друзьям', 'друзьям', 'Do‘stlarga', NULL),
  ('kunlik-oqish-66', 'его', 'его', 'Uni', NULL),
  ('kunlik-oqish-66', 'ему', 'ему', 'Unga (erkak)', NULL),
  ('kunlik-oqish-66', 'за', 'за', '…uchun', NULL),
  ('kunlik-oqish-66', 'задание', 'задание', 'Vazifa', NULL),
  ('kunlik-oqish-66', 'задач', 'задач', 'Masalalar (qaysi?)', NULL),
  ('kunlik-oqish-66', 'задачи', 'задачи', 'Vazifalar', NULL),
  ('kunlik-oqish-66', 'заниматься', 'заниматься', 'Shug‘ullanmoq', NULL),
  ('kunlik-oqish-66', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-66', 'каждый', 'каждый', 'Har bir', NULL),
  ('kunlik-oqish-66', 'кафе', 'кафе', 'Kafe', NULL),
  ('kunlik-oqish-66', 'купить', 'купить', 'Sotib olish', NULL),
  ('kunlik-oqish-66', 'математике', 'математике', 'Matematika (da)', NULL),
  ('kunlik-oqish-66', 'меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-66', 'мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-66', 'может', 'может', 'Oladi / mumkin', NULL),
  ('kunlik-oqish-66', 'мой', 'мой', 'Mening', NULL),
  ('kunlik-oqish-66', 'мороженым', 'мороженым', 'Muzqaymoq bilan', NULL),
  ('kunlik-oqish-66', 'Мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-66', 'начали', 'начали', 'Boshladik', NULL),
  ('kunlik-oqish-66', 'не', 'не', 'Emas', NULL),
  ('kunlik-oqish-66', 'него', 'него', 'U (род)', NULL),
  ('kunlik-oqish-66', 'о', 'о', '…haqida', NULL),
  ('kunlik-oqish-66', 'обещал', 'обещал', 'Vaʼda bergan', NULL),
  ('kunlik-oqish-66', 'объяснял', 'объяснял', 'Tushuntirardi', NULL),
  ('kunlik-oqish-66', 'Он', 'он', 'U (erkak)', NULL),
  ('kunlik-oqish-66', 'отставать', 'отставать', 'Orqada qolmoq', NULL),
  ('kunlik-oqish-66', 'очень', 'очень', 'Juda', NULL),
  ('kunlik-oqish-66', 'по', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-66', 'Помогать', 'помогать', 'Yordam bermoq', NULL),
  ('kunlik-oqish-66', 'помочь', 'помочь', 'Yordam bermoq', NULL),
  ('kunlik-oqish-66', 'помощи', 'помощи', 'Yordam (rod)', NULL),
  ('kunlik-oqish-66', 'помощь', 'помощь', 'Yordam', NULL),
  ('kunlik-oqish-66', 'пообещал', 'пообещал', 'Vaʼda berdi', NULL),
  ('kunlik-oqish-66', 'попросил', 'попросил', 'so‘radi', NULL),
  ('kunlik-oqish-66', 'После', 'после', 'Keyin', NULL),
  ('kunlik-oqish-66', 'посоветовал', 'посоветовал', 'Maslahat berdi', NULL),
  ('kunlik-oqish-66', 'Потом', 'потом', 'Keyin', NULL),
  ('kunlik-oqish-66', 'пошли', 'пошли', 'Ketishdi', NULL),
  ('kunlik-oqish-66', 'приятно', 'приятно', 'Yoqimli', NULL),
  ('kunlik-oqish-66', 'решать', 'решать', 'Yechmoq', NULL),
  ('kunlik-oqish-66', 'сборник', 'сборник', 'To‘plam', NULL),
  ('kunlik-oqish-66', 'сделать', 'сделать', 'Qilmoq', NULL),
  ('kunlik-oqish-66', 'Сергей', 'сергей', 'Sergey', NULL),
  ('kunlik-oqish-66', 'сказал', 'сказал', 'Dedi', NULL),
  ('kunlik-oqish-66', 'слова', 'слова', 'so‘zlar', NULL),
  ('kunlik-oqish-66', 'слушал', 'слушал', 'Tingladim', NULL),
  ('kunlik-oqish-66', 'слышать', 'слышать', 'Eshitmoq', NULL),
  ('kunlik-oqish-66', 'согласился', 'согласился', 'Rozi bo‘ldi', NULL),
  ('kunlik-oqish-66', 'Спасибо', 'спасибо', 'Rahmat', NULL),
  ('kunlik-oqish-66', 'сразу', 'сразу', 'Darhol', NULL),
  ('kunlik-oqish-66', 'тебе', 'тебе', 'Senga', NULL),
  ('kunlik-oqish-66', 'темы', 'темы', 'Mavzular', NULL),
  ('kunlik-oqish-66', 'трудные', 'трудные', 'Qiyinlar', NULL),
  ('kunlik-oqish-66', 'Ты', 'ты', 'Sen', NULL),
  ('kunlik-oqish-66', 'у', 'у', '…da bor', NULL),
  ('kunlik-oqish-66', 'угостить', 'угостить', 'Mehmon qilmoq', NULL),
  ('kunlik-oqish-66', 'уроков', 'уроков', 'Darslar (dan)', NULL),
  ('kunlik-oqish-66', 'хороший', 'хороший', 'Yaxshi', NULL),
  ('kunlik-oqish-66', 'хотел', 'хотел', 'Xohlardi', NULL),
  ('kunlik-oqish-66', 'что', 'что', 'Nima', NULL),
  ('kunlik-oqish-66', 'школе', 'школе', 'Maktabda', NULL),
  ('kunlik-oqish-66', 'эти', 'эти', 'Bu', NULL),
  ('kunlik-oqish-66', 'это', 'это', 'Bu', NULL),
  ('kunlik-oqish-66', 'Я', 'я', 'Men', NULL),
  ('kunlik-oqish-67', 'Анна', 'анна', 'Anna (ism)', NULL),
  ('kunlik-oqish-67', 'бабушке', 'бабушке', 'Buvimga', NULL),
  ('kunlik-oqish-67', 'брату', 'брату', 'Akaga', NULL),
  ('kunlik-oqish-67', 'бывает', 'бывает', 'Bo‘ladi', NULL),
  ('kunlik-oqish-67', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-67', 'весело', 'весело', 'Quvnoq', NULL),
  ('kunlik-oqish-67', 'вместе', 'вместе', 'Birga', NULL),
  ('kunlik-oqish-67', 'внуками', 'внуками', 'Nevaralar bilan', NULL),
  ('kunlik-oqish-67', 'всегда', 'всегда', 'Har doim', NULL),
  ('kunlik-oqish-67', 'года', 'года', 'Yosh (22 года)', NULL),
  ('kunlik-oqish-67', 'другу', 'другу', 'Do‘stimga', NULL),
  ('kunlik-oqish-67', 'его', 'его', 'Uni', NULL),
  ('kunlik-oqish-67', 'Ей', 'ей', 'Unga (ayol)', NULL),
  ('kunlik-oqish-67', 'Ему', 'ему', 'Unga (erkak)', NULL),
  ('kunlik-oqish-67', 'за', 'за', '…uchun', NULL),
  ('kunlik-oqish-67', 'зимой', 'зимой', 'Qishda', NULL),
  ('kunlik-oqish-67', 'зовут', 'зовут', 'Chaqirishadi', NULL),
  ('kunlik-oqish-67', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-67', 'Им', 'им', 'Ularga', NULL),
  ('kunlik-oqish-67', 'инженер', 'инженер', 'Muhandis', NULL),
  ('kunlik-oqish-67', 'иногда', 'иногда', 'Ba’zida', NULL),
  ('kunlik-oqish-67', 'интересно', 'интересно', 'Qiziq', NULL),
  ('kunlik-oqish-67', 'легко', 'легко', 'Oson', NULL),
  ('kunlik-oqish-67', 'лестнице', 'лестнице', 'Zinapoya', NULL),
  ('kunlik-oqish-67', 'лет', 'лет', 'Yosh', NULL),
  ('kunlik-oqish-67', 'любит', 'любит', 'Yaxshi ko‘radi', NULL),
  ('kunlik-oqish-67', 'любят', 'любят', 'sevishadi', NULL),
  ('kunlik-oqish-67', 'Меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-67', 'Мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-67', 'Моей', 'моей', 'Mening …-ga', NULL),
  ('kunlik-oqish-67', 'Моему', 'моему', 'Mening …-ga', NULL),
  ('kunlik-oqish-67', 'Моим', 'моим', 'Mening …-ga', NULL),
  ('kunlik-oqish-67', 'не', 'не', 'Emas', NULL),
  ('kunlik-oqish-67', 'но', 'но', 'Lekin', NULL),
  ('kunlik-oqish-67', 'нравится', 'нравится', 'Yoqadi', NULL),
  ('kunlik-oqish-67', 'одеваюсь', 'одеваюсь', 'Kiyinaman', NULL),
  ('kunlik-oqish-67', 'Он', 'он', 'U (erkak)', NULL),
  ('kunlik-oqish-67', 'Она', 'она', 'U (ayol)', NULL),
  ('kunlik-oqish-67', 'они', 'они', 'Ular', NULL),
  ('kunlik-oqish-67', 'ошибки', 'ошибки', 'Xatolar', NULL),
  ('kunlik-oqish-67', 'по', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-67', 'поэтому', 'поэтому', 'Shuning uchun', NULL),
  ('kunlik-oqish-67', 'прощать', 'прощать', 'Kechirmoq', NULL),
  ('kunlik-oqish-67', 'путешествовать', 'путешествовать', 'Sayohat qilish', NULL),
  ('kunlik-oqish-67', 'работа', 'работа', 'Ish', NULL),
  ('kunlik-oqish-67', 'работаю', 'работаю', 'Ishlayman', NULL),
  ('kunlik-oqish-67', 'родителям', 'родителям', 'Ota-onaga', NULL),
  ('kunlik-oqish-67', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-67', 'свои', 'свои', 'O‘zingning', NULL),
  ('kunlik-oqish-67', 'сестре', 'сестре', 'Singlim haqida', NULL),
  ('kunlik-oqish-67', 'скучно', 'скучно', 'Zerikarli', NULL),
  ('kunlik-oqish-67', 'студентка', 'студентка', 'Talaba (qiz)', NULL),
  ('kunlik-oqish-67', 'стыдно', 'стыдно', 'Uyat', NULL),
  ('kunlik-oqish-67', 'тепло', 'тепло', 'Iliqlik', NULL),
  ('kunlik-oqish-67', 'тоже', 'тоже', 'Ham', NULL),
  ('kunlik-oqish-67', 'трудно', 'трудно', 'Qiyin', NULL),
  ('kunlik-oqish-67', 'университете', 'университете', 'Universitetda', NULL),
  ('kunlik-oqish-67', 'учительницей', 'учительницей', 'O‘qituvchi (qiz) sifatida', NULL),
  ('kunlik-oqish-67', 'учиться', 'учиться', 'O‘qimoq', NULL),
  ('kunlik-oqish-67', 'ходить', 'ходить', 'Yurmoq', NULL),
  ('kunlik-oqish-67', 'холодно', 'холодно', 'Sovuq', NULL),
  ('kunlik-oqish-67', 'хороший', 'хороший', 'Yaxshi', NULL),
  ('kunlik-oqish-67', 'часто', 'часто', 'Tez-tez', NULL),
  ('kunlik-oqish-67', 'человек', 'человек', 'Inson', NULL),
  ('kunlik-oqish-67', 'шапки', 'шапки', 'Shapkalar', NULL),
  ('kunlik-oqish-67', 'школе', 'школе', 'Maktabda', NULL),
  ('kunlik-oqish-67', 'Я', 'я', 'Men', NULL),
  ('kunlik-oqish-68', 'а', 'а', 'Va', NULL),
  ('kunlik-oqish-68', 'библиотеке', 'библиотеке', 'Kutubxonada', NULL),
  ('kunlik-oqish-68', 'библиотеку', 'библиотеку', 'Kutubxonaga', NULL),
  ('kunlik-oqish-68', 'брату', 'брату', 'Akaga', NULL),
  ('kunlik-oqish-68', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-68', 'весело', 'весело', 'Quvnoq', NULL),
  ('kunlik-oqish-68', 'вижу', 'вижу', 'ko‘raman', NULL),
  ('kunlik-oqish-68', 'все', 'все', 'Hammasi', NULL),
  ('kunlik-oqish-68', 'всегда', 'всегда', 'Har doim', NULL),
  ('kunlik-oqish-68', 'выбирать', 'выбирать', 'Tanlamoq', NULL),
  ('kunlik-oqish-68', 'детей', 'детей', 'bolalar', NULL),
  ('kunlik-oqish-68', 'Детям', 'детям', 'Bolalarga', NULL),
  ('kunlik-oqish-68', 'для', 'для', 'uchun', NULL),
  ('kunlik-oqish-68', 'его', 'его', 'Uni', NULL),
  ('kunlik-oqish-68', 'ей', 'ей', 'Unga (ayol)', NULL),
  ('kunlik-oqish-68', 'Ему', 'ему', 'Unga (erkak)', NULL),
  ('kunlik-oqish-68', 'за', 'за', '…uchun', NULL),
  ('kunlik-oqish-68', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-68', 'им', 'им', 'Ularga', NULL),
  ('kunlik-oqish-68', 'интересно', 'интересно', 'Qiziq', NULL),
  ('kunlik-oqish-68', 'их', 'их', 'Ularga', NULL),
  ('kunlik-oqish-68', 'к', 'к', '…ga / …tomon', NULL),
  ('kunlik-oqish-68', 'книги', 'книги', 'Kitoblar', NULL),
  ('kunlik-oqish-68', 'когда', 'когда', 'Qachon', NULL),
  ('kunlik-oqish-68', 'коллеге', 'коллеге', 'Hamkasbga', NULL),
  ('kunlik-oqish-68', 'легко', 'легко', 'Oson', NULL),
  ('kunlik-oqish-68', 'лицах', 'лицах', 'Yuzlarda', NULL),
  ('kunlik-oqish-68', 'людям', 'людям', 'Odamlarga', NULL),
  ('kunlik-oqish-68', 'мероприятия', 'мероприятия', 'Tadbirlar', NULL),
  ('kunlik-oqish-68', 'минут', 'минут', 'Daqiqa', NULL),
  ('kunlik-oqish-68', 'Мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-68', 'Моей', 'моей', 'Mening …-ga', NULL),
  ('kunlik-oqish-68', 'Моему', 'моему', 'Mening …-ga', NULL),
  ('kunlik-oqish-68', 'может', 'может', 'Oladi / mumkin', NULL),
  ('kunlik-oqish-68', 'моя', 'моя', 'Mening (ayol otl.)', NULL),
  ('kunlik-oqish-68', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-68', 'нам', 'нам', 'Bizga', NULL),
  ('kunlik-oqish-68', 'нравится', 'нравится', 'Yoqadi', NULL),
  ('kunlik-oqish-68', 'общаться', 'общаться', 'Muloqot qilmoq', NULL),
  ('kunlik-oqish-68', 'он', 'он', 'U (erkak)', NULL),
  ('kunlik-oqish-68', 'очень', 'очень', 'Juda', NULL),
  ('kunlik-oqish-68', 'по', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-68', 'подруге', 'подруге', 'Qiz do‘stga', NULL),
  ('kunlik-oqish-68', 'помогать', 'помогать', 'Yordam bermoq', NULL),
  ('kunlik-oqish-68', 'Поэтому', 'поэтому', 'Shuning uchun', NULL),
  ('kunlik-oqish-68', 'приходить', 'приходить', 'Kelmoq', NULL),
  ('kunlik-oqish-68', 'приятно', 'приятно', 'Yoqimli', NULL),
  ('kunlik-oqish-68', 'проводить', 'проводить', 'O‘tkazmoq', NULL),
  ('kunlik-oqish-68', 'путешествовать', 'путешествовать', 'Sayohat qilish', NULL),
  ('kunlik-oqish-68', 'пять', 'пять', 'Besh', NULL),
  ('kunlik-oqish-68', 'работа', 'работа', 'Ish', NULL),
  ('kunlik-oqish-68', 'работаю', 'работаю', 'Ishlayman', NULL),
  ('kunlik-oqish-68', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-68', 'скучно', 'скучно', 'Zerikarli', NULL),
  ('kunlik-oqish-68', 'смотреть', 'смотреть', 'Qaramoq', NULL),
  ('kunlik-oqish-68', 'собирать', 'собирать', 'Yig‘moq', NULL),
  ('kunlik-oqish-68', 'спорт', 'спорт', 'Sport', NULL),
  ('kunlik-oqish-68', 'стараюсь', 'стараюсь', 'Harakat qilaman', NULL),
  ('kunlik-oqish-68', 'счастливы', 'счастливы', 'baxtli', NULL),
  ('kunlik-oqish-68', 'телевизору', 'телевизору', 'Televizor', NULL),
  ('kunlik-oqish-68', 'тоже', 'тоже', 'Ham', NULL),
  ('kunlik-oqish-68', 'трудно', 'трудно', 'Qiyin', NULL),
  ('kunlik-oqish-68', 'улыбки', 'улыбки', 'Tabassumlar', NULL),
  ('kunlik-oqish-68', 'футбол', 'футбол', 'Futbol', NULL),
  ('kunlik-oqish-68', 'часами', 'часами', 'Soatlab', NULL),
  ('kunlik-oqish-68', 'чемодан', 'чемодан', 'Chamadon', NULL),
  ('kunlik-oqish-68', 'читателями', 'читателями', 'Kitobxonlar bilan', NULL),
  ('kunlik-oqish-68', 'это', 'это', 'Bu', NULL),
  ('kunlik-oqish-68', 'Я', 'я', 'Men', NULL),
  ('kunlik-oqish-69', 'Бабушка', 'бабушка', 'Buvi', NULL),
  ('kunlik-oqish-69', 'бабушке', 'бабушке', 'Buvimga', NULL),
  ('kunlik-oqish-69', 'бабушки', 'бабушки', 'Buvimnikida', NULL),
  ('kunlik-oqish-69', 'бывать', 'бывать', 'Bo‘lish (tez-tez)', NULL),
  ('kunlik-oqish-69', 'было', 'было', 'Bo‘ldi', NULL),
  ('kunlik-oqish-69', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-69', 'важно', 'важно', 'Muhim', NULL),
  ('kunlik-oqish-69', 'Ведь', 'ведь', 'Axir', NULL),
  ('kunlik-oqish-69', 'видеть', 'видеть', 'Ko‘rmoq (sezgi)', NULL),
  ('kunlik-oqish-69', 'внимание', 'внимание', 'Diqqat', NULL),
  ('kunlik-oqish-69', 'внученька', 'внученька', 'Nevara (qiz)', NULL),
  ('kunlik-oqish-69', 'всегда', 'всегда', 'Har doim', NULL),
  ('kunlik-oqish-69', 'вслух', 'вслух', 'Ovoz chiqarib', NULL),
  ('kunlik-oqish-69', 'героев', 'героев', 'Qahramonlar', NULL),
  ('kunlik-oqish-69', 'говорит', 'говорит', 'Gapiradi', NULL),
  ('kunlik-oqish-69', 'делами', 'делами', 'Ishlar bilan', NULL),
  ('kunlik-oqish-69', 'деревне', 'деревне', 'Qishloqda', NULL),
  ('kunlik-oqish-69', 'домашними', 'домашними', 'Uy …', NULL),
  ('kunlik-oqish-69', 'Ей', 'ей', 'Unga (ayol)', NULL),
  ('kunlik-oqish-69', 'живёт', 'живет', 'Yashaydi', NULL),
  ('kunlik-oqish-69', 'жизни', 'жизни', 'Hayotida', NULL),
  ('kunlik-oqish-69', 'забота', 'забота', 'G‘amxo‘rlik', NULL),
  ('kunlik-oqish-69', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-69', 'иногда', 'иногда', 'Ba’zida', NULL),
  ('kunlik-oqish-69', 'интересно', 'интересно', 'Qiziq', NULL),
  ('kunlik-oqish-69', 'к', 'к', '…ga / …tomon', NULL),
  ('kunlik-oqish-69', 'классические', 'классические', 'Klassik', NULL),
  ('kunlik-oqish-69', 'книги', 'книги', 'Kitoblar', NULL),
  ('kunlik-oqish-69', 'когда', 'когда', 'Qachon', NULL),
  ('kunlik-oqish-69', 'лет', 'лет', 'Yosh', NULL),
  ('kunlik-oqish-69', 'людям', 'людям', 'Odamlarga', NULL),
  ('kunlik-oqish-69', 'меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-69', 'Мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-69', 'Моей', 'моей', 'Mening …-ga', NULL),
  ('kunlik-oqish-69', 'не', 'не', 'Emas', NULL),
  ('kunlik-oqish-69', 'ней', 'ней', 'Unga (ona)', NULL),
  ('kunlik-oqish-69', 'нравится', 'нравится', 'Yoqadi', NULL),
  ('kunlik-oqish-69', 'нравятся', 'нравятся', 'Yoqadi (ko‘plik)', NULL),
  ('kunlik-oqish-69', 'о', 'о', '…haqida', NULL),
  ('kunlik-oqish-69', 'обещаю', 'обещаю', 'va’da beraman', NULL),
  ('kunlik-oqish-69', 'одна', 'одна', 'Yolg‘iz (ayol)', NULL),
  ('kunlik-oqish-69', 'Она', 'она', 'U (ayol)', NULL),
  ('kunlik-oqish-69', 'очень', 'очень', 'Juda', NULL),
  ('kunlik-oqish-69', 'пожилым', 'пожилым', 'Keksa', NULL),
  ('kunlik-oqish-69', 'помогаешь', 'помогаешь', 'Yordam berasan', NULL),
  ('kunlik-oqish-69', 'помогаю', 'помогаю', 'Yordam beraman', NULL),
  ('kunlik-oqish-69', 'Поэтому', 'поэтому', 'Shuning uchun', NULL),
  ('kunlik-oqish-69', 'приезжать', 'приезжать', 'Kelmoq (borib)', NULL),
  ('kunlik-oqish-69', 'приезжаю', 'приезжаю', 'Kelaman (boraman)', NULL),
  ('kunlik-oqish-69', 'приятно', 'приятно', 'Yoqimli', NULL),
  ('kunlik-oqish-69', 'рада', 'рада', 'Xursand', NULL),
  ('kunlik-oqish-69', 'радио', 'радио', 'Radio', NULL),
  ('kunlik-oqish-69', 'романы', 'романы', 'Romanlar', NULL),
  ('kunlik-oqish-69', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-69', 'скучно', 'скучно', 'Zerikarli', NULL),
  ('kunlik-oqish-69', 'слова', 'слова', 'so‘zlar', NULL),
  ('kunlik-oqish-69', 'слушать', 'слушать', 'Tinglamoq', NULL),
  ('kunlik-oqish-69', 'слышать', 'слышать', 'Eshitmoq', NULL),
  ('kunlik-oqish-69', 'смотреть', 'смотреть', 'Qaramoq', NULL),
  ('kunlik-oqish-69', 'советую', 'советую', 'Maslahat beraman', NULL),
  ('kunlik-oqish-69', 'Спасибо', 'спасибо', 'Rahmat', NULL),
  ('kunlik-oqish-69', 'справляться', 'справляться', 'Uddalamoq', NULL),
  ('kunlik-oqish-69', 'телевизор', 'телевизор', 'televizor', NULL),
  ('kunlik-oqish-69', 'трудно', 'трудно', 'Qiyin', NULL),
  ('kunlik-oqish-69', 'ты', 'ты', 'Sen', NULL),
  ('kunlik-oqish-69', 'у', 'у', '…da bor', NULL),
  ('kunlik-oqish-69', 'узнавать', 'узнавать', 'Tanimoq', NULL),
  ('kunlik-oqish-69', 'часто', 'часто', 'Tez-tez', NULL),
  ('kunlik-oqish-69', 'чаще', 'чаще', 'Tez-tezroq', NULL),
  ('kunlik-oqish-69', 'читаю', 'читаю', 'O‘qiyman', NULL),
  ('kunlik-oqish-69', 'что', 'что', 'Nima', NULL),
  ('kunlik-oqish-69', 'чтобы', 'чтобы', 'Shunda ki', NULL),
  ('kunlik-oqish-69', 'эти', 'эти', 'Bu', NULL),
  ('kunlik-oqish-69', 'я', 'я', 'Men', NULL),
  ('kunlik-oqish-70', 'А', 'а', 'Va', NULL),
  ('kunlik-oqish-70', 'большая', 'большая', 'Katta', NULL),
  ('kunlik-oqish-70', 'бывает', 'бывает', 'Bo‘ladi', NULL),
  ('kunlik-oqish-70', 'бывают', 'бывают', 'Bo‘ladi (ko‘plik)', NULL),
  ('kunlik-oqish-70', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-70', 'весело', 'весело', 'Quvnoq', NULL),
  ('kunlik-oqish-70', 'всегда', 'всегда', 'Har doim', NULL),
  ('kunlik-oqish-70', 'года', 'года', 'Yosh (22 года)', NULL),
  ('kunlik-oqish-70', 'Дима', 'дима', 'Dima', NULL),
  ('kunlik-oqish-70', 'Диме', 'диме', 'Dimaga', NULL),
  ('kunlik-oqish-70', 'друг', 'друг', 'Do‘st', NULL),
  ('kunlik-oqish-70', 'другу', 'другу', 'Do‘stimga', NULL),
  ('kunlik-oqish-70', 'Дружба', 'дружба', 'Do‘stlik', NULL),
  ('kunlik-oqish-70', 'Его', 'его', 'Uni', NULL),
  ('kunlik-oqish-70', 'Ему', 'ему', 'Unga (erkak)', NULL),
  ('kunlik-oqish-70', 'есть', 'есть', 'Yemoq (inf)', NULL),
  ('kunlik-oqish-70', 'знакомиться', 'знакомиться', 'Tanishmoq', NULL),
  ('kunlik-oqish-70', 'зовут', 'зовут', 'Chaqirishadi', NULL),
  ('kunlik-oqish-70', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-70', 'иногда', 'иногда', 'Ba’zida', NULL),
  ('kunlik-oqish-70', 'интересно', 'интересно', 'Qiziq', NULL),
  ('kunlik-oqish-70', 'Когда', 'когда', 'Qachon', NULL),
  ('kunlik-oqish-70', 'легко', 'легко', 'Oson', NULL),
  ('kunlik-oqish-70', 'лучший', 'лучший', 'Eng yaxshi', NULL),
  ('kunlik-oqish-70', 'людьми', 'людьми', 'Odamlar bilan', NULL),
  ('kunlik-oqish-70', 'меня', 'меня', 'Meni', NULL),
  ('kunlik-oqish-70', 'места', 'места', 'joylar', NULL),
  ('kunlik-oqish-70', 'Мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-70', 'мной', 'мной', 'Meni bilan', NULL),
  ('kunlik-oqish-70', 'Мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-70', 'над', 'над', 'Ustida', NULL),
  ('kunlik-oqish-70', 'назад', 'назад', 'orqaga', NULL),
  ('kunlik-oqish-70', 'не', 'не', 'Emas', NULL),
  ('kunlik-oqish-70', 'него', 'него', 'U (род)', NULL),
  ('kunlik-oqish-70', 'нём', 'нем', 'Unda (prep + u)', NULL),
  ('kunlik-oqish-70', 'ним', 'ним', 'U bilan', NULL),
  ('kunlik-oqish-70', 'но', 'но', 'Lekin', NULL),
  ('kunlik-oqish-70', 'новые', 'новые', 'Yangi', NULL),
  ('kunlik-oqish-70', 'новыми', 'новыми', 'Yangi (ins)', NULL),
  ('kunlik-oqish-70', 'нравится', 'нравится', 'Yoqadi', NULL),
  ('kunlik-oqish-70', 'общаться', 'общаться', 'Muloqot qilmoq', NULL),
  ('kunlik-oqish-70', 'по', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-70', 'поводу', 'поводу', 'Bora (shu)', NULL),
  ('kunlik-oqish-70', 'познакомились', 'познакомились', 'Tanishdik', NULL),
  ('kunlik-oqish-70', 'получается', 'получается', 'Chiqadi', NULL),
  ('kunlik-oqish-70', 'помогаем', 'помогаем', 'Yordam beramiz', NULL),
  ('kunlik-oqish-70', 'помочь', 'помочь', 'Yordam bermoq', NULL),
  ('kunlik-oqish-70', 'проблемы', 'проблемы', 'Muammolar', NULL),
  ('kunlik-oqish-70', 'путешествовать', 'путешествовать', 'Sayohat qilish', NULL),
  ('kunlik-oqish-70', 'рад', 'рад', 'Xursand', NULL),
  ('kunlik-oqish-70', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-70', 'со', 'со', 'Bilan', NULL),
  ('kunlik-oqish-70', 'собрать', 'собрать', 'Yig‘moq', NULL),
  ('kunlik-oqish-70', 'советует', 'советует', 'Maslahat beradi', NULL),
  ('kunlik-oqish-70', 'стараюсь', 'стараюсь', 'Harakat qilaman', NULL),
  ('kunlik-oqish-70', 'такой', 'такой', 'Shunday', NULL),
  ('kunlik-oqish-70', 'то', 'то', 'Ana shu', NULL),
  ('kunlik-oqish-70', 'тоже', 'тоже', 'Ham', NULL),
  ('kunlik-oqish-70', 'три', 'три', 'Uch', NULL),
  ('kunlik-oqish-70', 'трудно', 'трудно', 'Qiyin', NULL),
  ('kunlik-oqish-70', 'У', 'у', '…da bor', NULL),
  ('kunlik-oqish-70', 'узнавать', 'узнавать', 'Tanimoq', NULL),
  ('kunlik-oqish-70', 'университете', 'университете', 'Universitetda', NULL),
  ('kunlik-oqish-70', 'ценность', 'ценность', 'Qadriyat', NULL),
  ('kunlik-oqish-70', 'часто', 'часто', 'Tez-tez', NULL),
  ('kunlik-oqish-70', 'чемодан', 'чемодан', 'Chamadon', NULL),
  ('kunlik-oqish-70', 'честность', 'честность', 'Halollik', NULL),
  ('kunlik-oqish-70', 'что', 'что', 'Nima', NULL),
  ('kunlik-oqish-70', 'чувство', 'чувство', 'Tuyg‘u', NULL),
  ('kunlik-oqish-70', 'шутит', 'шутит', 'Hazillashadi', NULL),
  ('kunlik-oqish-70', 'это', 'это', 'Bu', NULL),
  ('kunlik-oqish-70', 'этому', 'этому', 'Shunga', NULL),
  ('kunlik-oqish-70', 'юмора', 'юмора', 'Hazil', NULL),
  ('kunlik-oqish-70', 'я', 'я', 'Men', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (66, 0, 'Do‘stingizga qanday yordam berasiz?', 'Как вы помогаете своему другу?'),
  (66, 1, 'Menga vazifani tushuntirib bering, iltimos.', 'Объясните мне задание, пожалуйста.'),
  (66, 2, 'U har doim ota-onasiga uy ishlarida yordam beradi.', 'Он всегда помогает родителям по дому.'),
  (66, 3, 'Sizga bu kitobni o‘qishni maslahat beraman.', 'Я советую вам прочитать эту книгу.'),
  (66, 4, 'Ular menga vaʼda berishdi, lekin kelishmadi.', 'Они обещали мне, но не пришли.'),
  (66, 5, 'Nega ukangizga yordam bermaysiz?', 'Почему вы не помогаете вашему брату?'),
  (66, 6, 'O‘qituvchi talabalarga imtihonga tayyorgarlik ko‘rishni maslahat berdi.', 'Преподаватель посоветовал студентам готовиться к экзамену.'),
  (66, 7, 'Sizga kim yordam berdi? – Mening do‘stim.', 'Кто вам помог? – Мой друг.'),
  (66, 8, 'U menga kechqurun qo‘ng‘iroq qilishga vaʼda berdi.', 'Он обещал мне позвонить вечером.'),
  (66, 9, 'Bolalarga o‘qishda yordam bering, ular sizdan yordam kutishadi.', 'Помогайте детям в учёбе, они ждут вашей помощи.'),
  (67, 0, 'Sizga necha yosh? – Menga 20 yosh.', 'Сколько вам лет? – Мне 20 лет.'),
  (67, 1, 'Menga juda sovuq, pech oldiga boraylik.', 'Мне очень холодно, пойдём к печке.'),
  (67, 2, 'Sizga qiziqmi? – Ha, juda qiziq.', 'Вам интересно? – Да, очень интересно.'),
  (67, 3, 'Bolalarga zerikarli, ularni sayrga olib chiqing.', 'Детям скучно, выведите их гулять.'),
  (67, 4, 'Unga og‘riyapti, shifokorni chaqiring.', 'Ему больно, вызовите врача.'),
  (67, 5, 'Sizga bu vazifani bajarish qiyinmi?', 'Вам трудно выполнить это задание?'),
  (67, 6, 'Menga ertalab yugurish oson, kechqurun esa qiyin.', 'Мне легко бегать утром, а вечером трудно.'),
  (67, 7, 'Sizning ukangizga necha yosh? – Unga 5 yosh.', 'Сколько лет вашему брату? – Ему 5 лет.'),
  (67, 8, 'Bizga kechki ovqatdan keyin uchrashish kerak.', 'Нам нужно встретиться после ужина.'),
  (67, 9, 'Sizga uyda nimani qilish qiyin? – Menga dazmollash qiyin.', 'Что вам трудно делать дома? – Мне трудно гладить.'),
  (68, 0, 'Sizga nima qilish yoqadi? – Menga rasm chizish yoqadi.', 'Что вам нравится делать? – Мне нравится рисовать.'),
  (68, 1, 'Sizning do‘stingizga qaysi film yoqadi?', 'Какой фильм нравится вашему другу?'),
  (68, 2, 'Bolalarga ertak o‘qish yoqadimi?', 'Детям нравится, когда им читают сказки?'),
  (68, 3, 'Sizga bu yerda ishlash yoqadimi? – Ha, juda yoqadi.', 'Вам нравится работать здесь? – Да, очень нравится.'),
  (68, 4, 'Unga nima qilish qiyin? – Unga erta turish qiyin.', 'Что ему трудно делать? – Ему трудно рано вставать.'),
  (68, 5, 'Menga bu taom yoqmadi, juda achchiq edi.', 'Мне не понравилось это блюдо, оно было слишком острым.'),
  (68, 6, 'Sizga qahva yoki choy ko‘proq yoqadi?', 'Что вам нравится больше: кофе или чай?'),
  (68, 7, 'Bolalarga kechqurun ko‘p shirinlik yeyish mumkin emas.', 'Детям нельзя есть много сладкого вечером.'),
  (68, 8, 'Bizga sayohat qilish yoqadi, shuning uchun har yili yangi joylarga boramiz.', 'Нам нравится путешествовать, поэтому каждый год мы ездим в новые места.'),
  (68, 9, 'Sizningcha, odamlarga nima qilish oson?', 'Как вы думаете, что людям легко делать?'),
  (69, 0, 'Sizning buvivingizga necha yosh?', 'Сколько лет вашей бабушке?'),
  (69, 1, 'Unga uy ishlarida yordam berasizmi?', 'Вы помогаете ей по дому?'),
  (69, 2, 'Sizga qanday kitoblar o‘qish yoqadi?', 'Какие книги вам нравится читать?'),
  (69, 3, 'Unga qanday maslahat berdingiz?', 'Какой совет вы ей дали?'),
  (69, 4, 'Keksa odamlarga g‘amxo‘rlik qilish kerak.', 'Пожилым людям нужна забота.'),
  (69, 5, 'Sizga bu fikr yoqadimi?', 'Вам нравится эта мысль?'),
  (69, 6, 'U do‘stlariga doim yordam berishga vaʼda berdi.', 'Он обещал друзьям всегда помогать.'),
  (69, 7, 'Bolalarga qanday qilib yaxshi odatni o‘rgatish mumkin?', 'Как можно привить детям хорошую привычку?'),
  (69, 8, 'Sizga dam olish kunlarida nima qilish yoqadi?', 'Что вам нравится делать в выходные?'),
  (69, 9, 'Unga bu ishni qilish qiyin, shuning uchun biz unga yordam beramiz.', 'Ему трудно сделать эту работу, поэтому мы помогаем ему.'),
  (70, 0, 'Sizning eng yaxshi do‘stingizga necha yosh?', 'Сколько лет вашему лучшему другу?'),
  (70, 1, 'Sizga do‘stingizda nima yoqadi?', 'Что вам нравится в вашем друге?'),
  (70, 2, 'Siz bir-biringizga qanday yordam berasiz?', 'Как вы помогаете друг другу?'),
  (70, 3, 'Do‘stingiz sizga qanday maslahat berdi?', 'Какой совет вам дал друг?'),
  (70, 4, 'Sizga birga sayohat qilish yoqadimi?', 'Вам нравится путешествовать вместе?'),
  (70, 5, 'Unga qanday mavzular haqida gapirish qiziq?', 'О каких темах ему интересно говорить?'),
  (70, 6, 'Sizga do‘stingiz bilan vaqt o‘tkazish osonmi?', 'Вам легко проводить время с другом?'),
  (70, 7, 'U sizning oilangizga yordam beradimi?', 'Он помогает вашей семье?'),
  (70, 8, 'Siz qanday odamlarni do‘st deb atash mumkin deb o‘ylaysiz?', 'Каких людей, по-вашему, можно назвать друзьями?'),
  (70, 9, 'Do‘stingizga oxirgi marta qachon yordam berdingiz?', 'Когда вы последний раз помогали своему другу?');

