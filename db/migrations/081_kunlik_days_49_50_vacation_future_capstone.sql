-- Kunlik kun 49–50: sayohat/reja dialoglari va kelasi zamon yakuniy takrorlash (41–50).

DELETE FROM public.daily_practice_prompts WHERE day_number >= 49 AND day_number <= 50;

DELETE FROM public.daily_reading_lexemes WHERE text_id IN (
  SELECT text_id FROM public.daily_reading_passages WHERE day_number >= 49 AND day_number <= 50
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reading_lexemes' AND column_name = 'day_number'
  ) THEN
    DELETE FROM public.daily_reading_lexemes WHERE day_number >= 49 AND day_number <= 50;
  END IF;
END $$;

DELETE FROM public.daily_reading_passages WHERE day_number >= 49 AND day_number <= 50;

DELETE FROM public.daily_vocab_words WHERE day_number >= 49 AND day_number <= 50;

DELETE FROM public.daily_grammar_matches WHERE day_number >= 49 AND day_number <= 50;
DELETE FROM public.daily_grammar_sentence_arrange WHERE day_number >= 49 AND day_number <= 50;
DELETE FROM public.daily_grammar_mcqs WHERE day_number >= 49 AND day_number <= 50;
DELETE FROM public.daily_grammar_topics WHERE day_number >= 49 AND day_number <= 50;

-- ========== Kun 49 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  49,
  'Kelasi zamon: sayohat va ta’til',
  $theory$
**Jarayon:** *буду путешествовать*, *буду отдыхать*, *буду фотографировать*.

**Natija:** *съезжу*, *отдохну*, *сфотографирую*, *познакомлюсь*, *попробую*.

**Режа:** *планирую*, *собираюсь*, *хочу* + инфинитив.

**Умид / орзу:** *надеюсь, что отдохну*; *мечтаю объехать мир*.
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (49, 'rule', 0, '«Men yozda dengizga borib suzmoqni rejalashtiryapman»', 'Я планирую поехать на море и плавать этим летом.', 'Я планирую поехать на море и поплавать этим летом.', 'Оба варианта возможны в зависимости от смысла.', 'Оба неверны.', 0),
  (49, 'rule', 1, '«U bir haftada Italiyaga borib Rim va Venetsiyani ko‘rishni xohlaydi»', 'Он хочет поехать в Италию и смотреть Рим и Венецию.', 'Он хочет поехать в Италию и посмотреть Рим и Венецию.', 'Он хочет ехать в Италию и смотреть Рим и Венецию.', 'Он уже всё видел.', 1),
  (49, 'rule', 2, '«Мечтать» dan keyin СВ misoli', 'Я мечтаю путешествовать по всему миру.', 'Я мечтаю объехать весь мир.', 'Я мечтаю ездить по всему миру.', 'Я только работаю.', 1),
  (49, 'rule', 3, '«Biz yozda birga dam olamiz…» — jarayon', 'Мы будем отдыхать вместе, загорать и плавать этим летом.', 'Мы отдохнём вместе, загорим и поплаваем этим летом.', 'Мы отдыхаем вместе, загораем и плаваем этим летом.', 'Мы уже вернулись.', 0),
  (49, 'rule', 4, '«Men bir marta sayohatga chiqmoqchiman» — собираться', 'Я собираюсь путешествовать.', 'Я собираюсь съездить в путешествие.', 'Я собираюсь ездить в путешествие.', 'Я уже поехал.', 1),
  (49, 'rule', 5, '«Kelasi safar albatta tatib ko‘raman»', 'Извините, я никогда не пробовал это блюдо, но в следующий раз обязательно попробую.', 'Извините, я никогда не пробовал это блюдо, но в следующий раз обязательно буду пробовать.', 'Извините, я никогда не пробовал это блюдо, но в следующий раз обязательно пробую.', 'Извините, я уже пробовал.', 0),
  (49, 'rule', 6, '«Umid qilamanki, yozda bir marta dam olaman»', 'Я надеюсь, что буду отдыхать этим летом.', 'Я надеюсь, что отдохну этим летом.', 'Я надеюсь, что отдыхаю этим летом.', 'Я надеюсь, что уже отдыхал.', 1),
  (49, 'rule', 7, '«Sayohatda ko‘plab tanishadi» — jarayon', 'Они познакомятся с многими новыми людьми во время путешествия.', 'Они будут знакомиться с многими новыми людьми во время путешествия.', 'Они знакомятся с многими новыми людьми во время путешествия.', 'Они уже познакомились.', 1),
  (49, 'rule', 8, '«Manzarani suratga olmoqchiman» — bir marta', 'Я хочу фотографировать этот красивый пейзаж.', 'Я хочу сфотографировать этот красивый пейзаж.', 'Я хочу снимать этот красивый пейзаж.', 'Я уже снял.', 1),
  (49, 'rule', 9, '«Har yili yangi joylarni kashf qilaman» — kelasi takror', 'Да, каждый год я буду открывать новые места.', 'Да, каждый год я открою новые места.', 'Да, каждый год я открываю новые места.', 'Да, я не люблю новые места.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (49, 0, 0, 'Men bu yozda dengizga boraman va ikki hafta dam olaman.', 'Я поеду на море и отдохну две недели.'),
  (49, 0, 1, 'Men bu yozda dengizga boraman va har kuni suzaman.', 'Я поеду на море и буду каждый день плавать этим летом.'),
  (49, 0, 2, 'U bir hafta ichida uchta mamlakatga sayohat qiladi.', 'Он съездит в три страны за неделю.'),
  (49, 0, 3, 'U sayohat davomida ko‘plab yangi taomlarni tatib ko‘radi.', 'Он попробует много новых блюд во время путешествия.'),
  (49, 0, 4, 'Biz yangi joylarni kashf qilamiz va suratga olamiz.', 'Мы будем открывать новые места и фотографировать.'),
  (49, 0, 5, 'Biz bu joylarni bir marta ko‘rib chiqamiz.', 'Мы посмотрим эти места один раз.'),
  (49, 0, 6, 'U kelgusi yili sayohat qilishni rejalashtiryapti.', 'Он планирует путешествовать в следующем году.'),
  (49, 0, 7, 'U bir kun ichida butun shaharni aylanib chiqadi.', 'Он объедет весь город за один день.'),
  (49, 0, 8, 'Yozda men har kuni ertalab plyajda yuguraman.', 'Я буду бегать по пляжу каждое утро летом.'),
  (49, 0, 9, 'U bu sayohatdan keyin yaxshilab dam oladi.', 'Он хорошо отдохнёт после этого путешествия.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (49, 0, 'uz', '(на, следующий, неделе, мы, поехать, в, горы)', ARRAY['На', 'следующей', 'неделе', 'мы', 'поедем', 'в', 'горы.', 'едем'], 'На следующей неделе мы поедем в горы.'),
  (49, 1, 'uz', '(я, весь, отпуск, читать, и, отдыхать)', ARRAY['Я', 'весь', 'отпуск', 'буду', 'читать', 'и', 'отдыхать.', 'прочитаю'], 'Я весь отпуск буду читать и отдыхать.'),
  (49, 2, 'uz', '(ты, когда, наконец, научиться, плавать)', ARRAY['Когда', 'ты', 'наконец', 'научишься', 'плавать?', 'учишься'], 'Когда ты наконец научишься плавать?'),
  (49, 3, 'uz', '(они, завтра, в, 5, утра, выехать, на, море)', ARRAY['Они', 'завтра', 'в', '5', 'утра', 'выедут', 'на', 'море.', 'выезжают'], 'Они завтра в 5 утра выедут на море.'),
  (49, 4, 'uz', '(мы, там, жить, в, палатка, готовить, на, костёр)', ARRAY['Мы', 'будем', 'жить', 'там', 'в', 'палатке', 'и', 'готовить', 'на', 'костре.', 'жили'], 'Мы будем жить там в палатке и готовить на костре.'),
  (49, 5, 'uz', '(вы, сколько, раз, путешествовать, в, год)', ARRAY['Сколько', 'раз', 'в', 'год', 'вы', 'будете', 'путешествовать?', 'путешествуете'], 'Сколько раз в год вы будете путешествовать?'),
  (49, 6, 'uz', '(я, обязательно, купить, сувенир, для, ты)', ARRAY['Я', 'обязательно', 'куплю', 'сувенир', 'для', 'тебя.', 'купить'], 'Я обязательно куплю сувенир для тебя.'),
  (49, 7, 'uz', '(дети, смотреть, дельфинов, и, радоваться)', ARRAY['Дети', 'будут', 'смотреть', 'на', 'дельфинов', 'и', 'радоваться.', 'посмотрят'], 'Дети будут смотреть на дельфинов и радоваться.'),
  (49, 8, 'uz', '(мы, вернуться, домой, поздно, вечером)', ARRAY['Мы', 'вернёмся', 'домой', 'поздно', 'вечером.', 'вернулись'], 'Мы вернёмся домой поздно вечером.'),
  (49, 9, 'uz', '(я, никогда, не, забыть, этот, отпуск)', ARRAY['Я', 'никогда', 'не', 'забуду', 'этот', 'незабываемый', 'отпуск.', 'забываю'], 'Я никогда не забуду этот незабываемый отпуск.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (49, 0, 'Kelmoq (vaqt)', 'Наступить'),
  (49, 1, 'Rejalashtirmoq', 'Планировать'),
  (49, 2, 'Quyosh botishi', 'Закат'),
  (49, 3, 'Okean', 'Океан'),
  (49, 4, 'Ijaraga olmoq', 'Снять'),
  (49, 5, 'Qirg‘oq', 'Берег'),
  (49, 6, 'Shovqin', 'Прибой'),
  (49, 7, 'Ayvon', 'Терраса'),
  (49, 8, 'Qayiq', 'Лодка'),
  (49, 9, 'Suzmoq (qayiqda)', 'Плыть / поплыть'),
  (49, 10, 'Suratga olmoq', 'Фотографировать'),
  (49, 11, 'Qaytish', 'Возвращение'),
  (49, 12, 'Baxtli', 'Счастливый'),
  (49, 13, 'Tajriba', 'Впечатление'),
  (49, 14, 'O‘zgartirmoq', 'Изменить');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  49,
  'Планы на идеальный отпуск',
  $body$
Когда наступят каникулы, мы с семьёй поедем на море. Мы уже начали планировать наш отпуск и долго выбирали билеты.

Я мечтаю увидеть закат на океане. Мы снимем небольшой домик у самого берега и представляю солёный воздух, чайки над водой и долгие прогулки без спешки.

Каждое утро я буду просыпаться под звуки прибоя. Я буду пить кофе на террасе и читать книги в тени деревьев.

Днём мы будем купаться и загорать. Я наконец научусь плавать кролем.

Вечером мы будем гулять по набережной, есть мороженое и слушать живую музыку.

Однажды мы возьмём лодку и поплывём в море. Я сделаю много фотографий.

Мама спросила, не забыли ли мы страховку, а папа уже записал адрес отеля в телефон.

Дети ждут мороженое и карту достопримечательностей — они хотят всё успеть за две недели.

Я знаю: даже если будет дождь один день, мы всё равно найдём, чем заняться — музей, кино или настольные игры в домике.

Я уверен, что этот отпуск будет самым лучшим в моей жизни. После возвращения я буду долго вспоминать эти счастливые дни.

Главное — быть вместе, отключиться от рабочих чатов и привезти домой альбом ярких фотографий.
$body$,
  'kunlik-oqish-49'
);

INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-49', 'а', 'а', 'Va', NULL),
  ('kunlik-oqish-49', 'адрес', 'адрес', 'Manzil', NULL),
  ('kunlik-oqish-49', 'альбом', 'альбом', 'Albom', NULL),
  ('kunlik-oqish-49', 'без', 'без', '…siz', NULL),
  ('kunlik-oqish-49', 'берега', 'берега', 'Qirg‘oq (rod.)', NULL),
  ('kunlik-oqish-49', 'билеты', 'билеты', 'Chiptalar', NULL),
  ('kunlik-oqish-49', 'будем', 'будем', 'Bo‘lamiz', NULL),
  ('kunlik-oqish-49', 'будет', 'будет', 'Bo‘ladi', NULL),
  ('kunlik-oqish-49', 'буду', 'буду', 'Bo‘laman', NULL),
  ('kunlik-oqish-49', 'быть', 'быть', 'Bo‘lmoq', NULL),
  ('kunlik-oqish-49', 'в', 'в', '...da / ...ga', NULL),
  ('kunlik-oqish-49', 'Вечером', 'вечером', 'Kechqurun', NULL),
  ('kunlik-oqish-49', 'вместе', 'вместе', 'Birga', NULL),
  ('kunlik-oqish-49', 'водой', 'водой', 'Suv ustida (tvor.)', NULL),
  ('kunlik-oqish-49', 'возвращения', 'возвращения', 'Qaytish (rod.)', NULL),
  ('kunlik-oqish-49', 'воздух', 'воздух', 'Havo', NULL),
  ('kunlik-oqish-49', 'возьмём', 'возьмем', 'Olamiz (СВ)', NULL),
  ('kunlik-oqish-49', 'всё', 'все', 'Hammasini', NULL),
  ('kunlik-oqish-49', 'вспоминать', 'вспоминать', 'Eslamoq', NULL),
  ('kunlik-oqish-49', 'выбирали', 'выбирали', 'Tanlagan edik', NULL),
  ('kunlik-oqish-49', 'Главное', 'главное', 'Eng muhimi', NULL),
  ('kunlik-oqish-49', 'гулять', 'гулять', 'Sayr qilmoq', NULL),
  ('kunlik-oqish-49', 'даже', 'даже', 'Hatto', NULL),
  ('kunlik-oqish-49', 'две', 'две', 'Ikki', NULL),
  ('kunlik-oqish-49', 'день', 'день', 'Kun', NULL),
  ('kunlik-oqish-49', 'деревьев', 'деревьев', 'Daraxtlarning', NULL),
  ('kunlik-oqish-49', 'Дети', 'дети', 'Bolalar', NULL),
  ('kunlik-oqish-49', 'Днём', 'днем', 'Kunduzi', NULL),
  ('kunlik-oqish-49', 'дни', 'дни', 'Kunlar', NULL),
  ('kunlik-oqish-49', 'дождь', 'дождь', 'Yomg‘ir', NULL),
  ('kunlik-oqish-49', 'долгие', 'долгие', 'Uzoq', NULL),
  ('kunlik-oqish-49', 'долго', 'долго', 'Uzoq', NULL),
  ('kunlik-oqish-49', 'домик', 'домик', 'Uyacha', NULL),
  ('kunlik-oqish-49', 'домике', 'домике', 'Uyacha ichida', NULL),
  ('kunlik-oqish-49', 'домой', 'домой', 'Uyga', NULL),
  ('kunlik-oqish-49', 'достопримечательностей', 'достопримечательностей', 'Diqqatga sazovor joylar', NULL),
  ('kunlik-oqish-49', 'если', 'если', 'Agar', NULL),
  ('kunlik-oqish-49', 'есть', 'есть', 'Yemoq (inf)', NULL),
  ('kunlik-oqish-49', 'ждут', 'ждут', 'Kutmoqdalar', NULL),
  ('kunlik-oqish-49', 'живую', 'живую', 'Jonli', NULL),
  ('kunlik-oqish-49', 'жизни', 'жизни', 'Hayotimda', NULL),
  ('kunlik-oqish-49', 'за', 'за', '…ichida', NULL),
  ('kunlik-oqish-49', 'забыли', 'забыли', 'Unutganmizmi', NULL),
  ('kunlik-oqish-49', 'загорать', 'загорать', 'Quyoshda yonmoq', NULL),
  ('kunlik-oqish-49', 'закат', 'закат', 'Quyosh botishi', NULL),
  ('kunlik-oqish-49', 'заняться', 'заняться', 'Mashg‘ul bo‘lmoq', NULL),
  ('kunlik-oqish-49', 'записал', 'записал', 'Yozib qo‘ydi', NULL),
  ('kunlik-oqish-49', 'звуки', 'звуки', 'Tovushlar', NULL),
  ('kunlik-oqish-49', 'знаю', 'знаю', 'Bilaman', NULL),
  ('kunlik-oqish-49', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-49', 'игры', 'игры', 'O‘yinlar', NULL),
  ('kunlik-oqish-49', 'или', 'или', 'Yoki', NULL),
  ('kunlik-oqish-49', 'Каждое', 'каждое', 'Har bir', NULL),
  ('kunlik-oqish-49', 'каникулы', 'каникулы', 'Ta’tillar', NULL),
  ('kunlik-oqish-49', 'карту', 'карту', 'Xaritani', NULL),
  ('kunlik-oqish-49', 'кино', 'кино', 'Kino', NULL),
  ('kunlik-oqish-49', 'книги', 'книги', 'Kitoblar', NULL),
  ('kunlik-oqish-49', 'Когда', 'когда', 'Qachon', NULL),
  ('kunlik-oqish-49', 'кофе', 'кофе', 'Kofe', NULL),
  ('kunlik-oqish-49', 'кролем', 'кролем', 'Krol bilan', NULL),
  ('kunlik-oqish-49', 'купаться', 'купаться', 'Cho‘milmoq', NULL),
  ('kunlik-oqish-49', 'ли', 'ли', '-mi', NULL),
  ('kunlik-oqish-49', 'лодку', 'лодку', 'Qayiqni', NULL),
  ('kunlik-oqish-49', 'лучшим', 'лучшим', 'Eng yaxshi (tvor.)', NULL),
  ('kunlik-oqish-49', 'Мама', 'мама', 'Ona', NULL),
  ('kunlik-oqish-49', 'мечтаю', 'мечтаю', 'Orzu qilaman', NULL),
  ('kunlik-oqish-49', 'много', 'много', 'Ko‘p', NULL),
  ('kunlik-oqish-49', 'моей', 'моей', 'Mening', NULL),
  ('kunlik-oqish-49', 'море', 'море', 'Dengiz', NULL),
  ('kunlik-oqish-49', 'мороженое', 'мороженое', 'Muzqaymoq', NULL),
  ('kunlik-oqish-49', 'музей', 'музей', 'Muzey', NULL),
  ('kunlik-oqish-49', 'музыку', 'музыку', 'Musiqani', NULL),
  ('kunlik-oqish-49', 'мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-49', 'на', 'на', '…da / ustiga', NULL),
  ('kunlik-oqish-49', 'набережной', 'набережной', 'Saybon yo‘lakda', NULL),
  ('kunlik-oqish-49', 'над', 'над', 'Ustida', NULL),
  ('kunlik-oqish-49', 'найдём', 'найдем', 'Topamiz (СВ)', NULL),
  ('kunlik-oqish-49', 'наконец', 'наконец', 'Nihoyat', NULL),
  ('kunlik-oqish-49', 'настольные', 'настольные', 'Stol ustidagi', NULL),
  ('kunlik-oqish-49', 'наступят', 'наступят', 'Keladi (СВ)', NULL),
  ('kunlik-oqish-49', 'научусь', 'научусь', 'O‘rganaman (СВ)', NULL),
  ('kunlik-oqish-49', 'начали', 'начали', 'Boshladik', NULL),
  ('kunlik-oqish-49', 'наш', 'наш', 'Bizning', NULL),
  ('kunlik-oqish-49', 'не', 'не', '…mas', NULL),
  ('kunlik-oqish-49', 'небольшой', 'небольшой', 'Kichik', NULL),
  ('kunlik-oqish-49', 'недели', 'недели', 'Hafta', NULL),
  ('kunlik-oqish-49', 'один', 'один', 'Bir', NULL),
  ('kunlik-oqish-49', 'Однажды', 'однажды', 'Bir kun', NULL),
  ('kunlik-oqish-49', 'океане', 'океане', 'Okeanda', NULL),
  ('kunlik-oqish-49', 'они', 'они', 'Ular', NULL),
  ('kunlik-oqish-49', 'от', 'от', '…dan', NULL),
  ('kunlik-oqish-49', 'отеля', 'отеля', 'Mehmonxonaning', NULL),
  ('kunlik-oqish-49', 'отключиться', 'отключиться', 'Uzaklashmoq', NULL),
  ('kunlik-oqish-49', 'отпуск', 'отпуск', 'Ta’til', NULL),
  ('kunlik-oqish-49', 'папа', 'папа', 'Ota', NULL),
  ('kunlik-oqish-49', 'пить', 'пить', 'Ichmoq', NULL),
  ('kunlik-oqish-49', 'плавать', 'плавать', 'Suzmoq', NULL),
  ('kunlik-oqish-49', 'планировать', 'планировать', 'Rejalashtirmoq', NULL),
  ('kunlik-oqish-49', 'по', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-49', 'под', 'под', 'Ostida', NULL),
  ('kunlik-oqish-49', 'поедем', 'поедем', 'Boramiz (СВ)', NULL),
  ('kunlik-oqish-49', 'поплывём', 'поплывем', 'Suzamiz (СВ)', NULL),
  ('kunlik-oqish-49', 'После', 'после', 'Keyin', NULL),
  ('kunlik-oqish-49', 'представляю', 'представляю', 'Tasavvur qilyapman', NULL),
  ('kunlik-oqish-49', 'прибоя', 'прибоя', 'Shovqin', NULL),
  ('kunlik-oqish-49', 'привезти', 'привезти', 'Olib kelmoq (СВ)', NULL),
  ('kunlik-oqish-49', 'прогулки', 'прогулки', 'Sayohatlar', NULL),
  ('kunlik-oqish-49', 'просыпаться', 'просыпаться', 'Uyg‘onmoq', NULL),
  ('kunlik-oqish-49', 'рабочих', 'рабочих', 'Ish bilan bog‘liq', NULL),
  ('kunlik-oqish-49', 'равно', 'равно', 'Baribir', NULL),
  ('kunlik-oqish-49', 'с', 'с', 'Bilan', NULL),
  ('kunlik-oqish-49', 'самого', 'самого', 'Eng yaqin', NULL),
  ('kunlik-oqish-49', 'самым', 'самым', 'Eng', NULL),
  ('kunlik-oqish-49', 'сделаю', 'сделаю', 'Qilaman (СВ)', NULL),
  ('kunlik-oqish-49', 'семьёй', 'семьей', 'Oila bilan', NULL),
  ('kunlik-oqish-49', 'слушать', 'слушать', 'Tinglamoq', NULL),
  ('kunlik-oqish-49', 'снимем', 'снимем', 'Ijaraga olamiz (СВ)', NULL),
  ('kunlik-oqish-49', 'солёный', 'соленый', 'Sho‘r', NULL),
  ('kunlik-oqish-49', 'спешки', 'спешки', 'Shoshilinchlik', NULL),
  ('kunlik-oqish-49', 'спросила', 'спросила', 'So‘radi', NULL),
  ('kunlik-oqish-49', 'страховку', 'страховку', 'Sug‘urtani', NULL),
  ('kunlik-oqish-49', 'счастливые', 'счастливые', 'Baxtli', NULL),
  ('kunlik-oqish-49', 'телефон', 'телефон', 'Telefon', NULL),
  ('kunlik-oqish-49', 'тени', 'тени', 'Soyada', NULL),
  ('kunlik-oqish-49', 'террасе', 'террасе', 'Terrasada', NULL),
  ('kunlik-oqish-49', 'у', 'у', '…da bor', NULL),
  ('kunlik-oqish-49', 'уверен', 'уверен', 'Ishonchliman', NULL),
  ('kunlik-oqish-49', 'увидеть', 'увидеть', 'Ko‘rmoq (СВ)', NULL),
  ('kunlik-oqish-49', 'уже', 'уже', 'Allaqachon', NULL),
  ('kunlik-oqish-49', 'успеть', 'успеть', 'Ulg‘urmoq', NULL),
  ('kunlik-oqish-49', 'утро', 'утро', 'Ertalab', NULL),
  ('kunlik-oqish-49', 'фотографий', 'фотографий', 'Suratlar', NULL),
  ('kunlik-oqish-49', 'хотят', 'хотят', 'Xohlashmoqdalar', NULL),
  ('kunlik-oqish-49', 'чайки', 'чайки', 'Chayka qushi', NULL),
  ('kunlik-oqish-49', 'чатов', 'чатов', 'Chatlar', NULL),
  ('kunlik-oqish-49', 'чем', 'чем', 'Nima bilan', NULL),
  ('kunlik-oqish-49', 'читать', 'читать', 'O‘qimoq', NULL),
  ('kunlik-oqish-49', 'что', 'что', 'Bu', NULL),
  ('kunlik-oqish-49', 'эти', 'эти', 'Bu', NULL),
  ('kunlik-oqish-49', 'этот', 'этот', 'Bu', NULL),
  ('kunlik-oqish-49', 'Я', 'я', 'Men', NULL),
  ('kunlik-oqish-49', 'ярких', 'ярких', 'Yorqin', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (49, 0, 'Sizning orzu qilgan sayohatingiz qayerga?', 'Куда вы мечтаете поехать?'),
  (49, 1, 'Men okean bo‘yida kichik uy ijaraga olib, bir oy yashashni xohlayman.', 'Я хочу снять маленький домик у океана и пожить там месяц.'),
  (49, 2, 'U sayohatdan oldin hamma narsani puxta rejalashtiradi.', 'Он всё тщательно спланирует перед путешествием.'),
  (49, 3, 'Biz bu yozda birinchi marta birga dam olamiz.', 'Этим летом мы впервые отдохнём вместе.'),
  (49, 4, 'Siz sayohat qilishni yoqtirasizmi? – Ha, men har yili yangi mamlakatlarni kashf qilaman.', 'Вы любите путешествовать? – Да, каждый год я буду открывать новые страны.'),
  (49, 5, 'Kechirasiz, men bu taklifni rad etishga majburman, chunki vaqtim yo‘q.', 'Извините, я вынужден отказаться от этого предложения, потому что у меня нет времени.'),
  (49, 6, 'U yugurishni boshlashdan oldin albatta shifokorga murojaat qiladi.', 'Прежде чем начать бегать, он обязательно обратится к врачу.'),
  (49, 7, 'Sizningcha, sayohatda eng muhim narsa nima? – Yangi tajribalar.', 'Что, по-вашему, самое важное в путешествии? – Новые впечатления.'),
  (49, 8, 'Biz qaytib kelganimizdan keyin albatta sizga qo‘ng‘iroq qilamiz.', 'После того как мы вернёмся, мы обязательно вам позвоним.'),
  (49, 9, 'Ushbu sayohat uning hayotini butunlay o‘zgartirib yuboradi.', 'Это путешествие полностью изменит его жизнь.');

-- ========== Kun 50 ==========
INSERT INTO public.daily_grammar_topics (day_number, title, theory_text)
VALUES (
  50,
  'Kelasi zamon: yakuniy takrorlash (kunlar 41–50)',
  $theory$
**Murakkab kelasi zamon (НСВ):** *буду / будешь / … + инфинитив НСВ* — jarayon, davomiylik, takror.

**Oddiy kelasi zamon (СВ):** fe’lning o‘zi *напишу, скажу, сделаю* — natija, bir marta, tugallanganlik.

**Savollar:** *Что буду делать?* / *Что сделаю?*

**Kalit iboralar НСВ:** *весь день, долго, каждый день, всегда, часами*

**Kalit iboralar СВ:** *за час, через день, сразу, наконец, быстро*

**Inkор:** *не буду делать* vs *не сделаю*

**Eslab qoling:** СВ ning hozirgi zamon shakli yo‘q — faqat o‘tgan va kelasi zamonda.

**Tipik xatolar:** *Я буду сделаю* ❌ → *Я сделаю* yoki *Я буду делать*; *Когда ты будешь вернуться?* ❌ → *Когда ты вернёшься?*
$theory$
);

INSERT INTO public.daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
  (50, 'rule', 0, 'Qaysi variantda НСВ kelasi zamonda to‘g‘ri?', 'Я буду прочитать книгу завтра.', 'Я прочитаю книгу завтра.', 'Я буду читать книгу завтра весь день.', 'Я читаю книгу завтра весь день.', 2),
  (50, 'rule', 1, 'Qaysi variantda СВ kelasi zamonda to‘g‘ri?', 'Я буду купить машину через месяц.', 'Я куплю машину через месяц.', 'Я буду покупать машину через месяц.', 'Я купил машину через месяц.', 1),
  (50, 'rule', 2, 'Qaysi gapda kelasi zamonda takrorlangan harakat bor?', 'Каждое воскресенье мы будем ходить в парк.', 'Каждое воскресенье мы пойдём в парк.', 'Каждое воскресенье мы ходим в парк.', 'Каждое воскресенье мы ходили в парк.', 0),
  (50, 'rule', 3, '«U bu ishni qancha vaqtda tugatadi?» — qaysi gap?', 'За сколько времени он закончит эту работу?', 'Сколько времени он будет заканчивать эту работу?', 'Сколько времени он заканчивает эту работу?', 'За какое время он закончивал эту работу?', 0),
  (50, 'rule', 4, '«Не буду» va «не сделаю» haqida qaysi gap to‘g‘ri?', 'Я не буду делать этого никогда.', 'Я не сделаю этого никогда.', 'Оба возможны, но смысл разный.', 'Ни один из вариантов не верен.', 2),
  (50, 'rule', 5, '«Sizga qachon qo‘ng‘iroq qilishim mumkin?» — bir marta', 'Когда я могу тебе звонить?', 'Когда я могу тебе позвонить?', 'Оба варианта одинаково часто.', 'Никогда не звони.', 1),
  (50, 'rule', 6, 'Qaysi gapda vaqt ko‘rsatkichi НСВ bilan mos?', 'Я буду читать эту книгу через час.', 'Я буду читать эту книгу целый час.', 'Я читаю эту книгу целый час.', 'Я прочитаю эту книгу через час.', 1),
  (50, 'rule', 7, '«Biz kelasi yili chet elga bir marta boramiz»', 'Мы будем ездить за границу в следующем году.', 'Мы поедем за границу в следующем году.', 'Мы ездим за границу в следующем году.', 'Мы поехали за границу в следующем году.', 1),
  (50, 'rule', 8, '«После того как» bilan qaysi gap mos?', 'После того как я сделаю уроки, я пойду гулять.', 'После того как я буду делать уроки, я пойду гулять.', 'После того как я делаю уроки, я пойду гулять.', 'После того как я сделал уроки, я пойду гулять.', 0),
  (50, 'rule', 9, '«Как только» bilan qaysi gap mos?', 'Как только он встанет завтра утром, он сразу начнёт работать.', 'Как только он будет вставать завтра утром, он сразу начнёт работать.', 'Как только он встаёт завтра утром, он сразу начинает работать.', 'Когда он встанет, он уже работает.', 0);

INSERT INTO public.daily_grammar_matches (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
  (50, 0, 0, 'Men ertaga butun kun ishlayman (jarayon).', 'Я буду работать завтра весь день.'),
  (50, 0, 1, 'Men ertaga ishni tugataman (natija).', 'Я закончу работу завтра.'),
  (50, 0, 2, 'Sen kelmaguncha men ovqat tayyorlab turaman.', 'Я буду готовить ужин, пока ты не придёшь.'),
  (50, 0, 3, 'Sen kelganingda ovqat tayyor bo‘ladi (natija).', 'Я приготовлю ужин к твоему приходу.'),
  (50, 0, 4, 'Har yakshanba biz bog‘da sayr qilamiz (kelasi takror).', 'Каждое воскресенье мы будем гулять в парке.'),
  (50, 0, 5, 'U ertaga tongda soat 7 da turadi (bir marta).', 'Он встанет завтра в семь часов.'),
  (50, 0, 6, 'Men senga kitobni ertaga olib kelaman.', 'Я принесу тебе книгу завтра.'),
  (50, 0, 7, 'Sayohatda men har kuni suzaman.', 'Я буду плавать каждый день во время путешествия.'),
  (50, 0, 8, 'Men kechki ovqat qilib, seni kutaman.', 'Я буду готовить ужин и ждать тебя.'),
  (50, 0, 9, 'U har kuni tongda soat 7 da turadi (odat).', 'Он встаёт в семь часов каждое утро.');

INSERT INTO public.daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
  (50, 0, 'uz', '(через, два, года, я, закончить, университет)', ARRAY['Через', 'два', 'года', 'я', 'закончу', 'университет.', 'учусь'], 'Через два года я закончу университет.'),
  (50, 1, 'uz', '(завтра, мы, весь, день, гулять, по, город)', ARRAY['Завтра', 'мы', 'весь', 'день', 'будем', 'гулять', 'по', 'городу.', 'гуляем'], 'Завтра мы весь день будем гулять по городу.'),
  (50, 2, 'uz', '(ты, когда, вернуться, из, командировка)', ARRAY['Когда', 'ты', 'вернёшься', 'из', 'командировки?', 'вернулся'], 'Когда ты вернёшься из командировки?'),
  (50, 3, 'uz', '(каждый, месяц, я, откладывать, деньги, на, отпуск)', ARRAY['Каждый', 'месяц', 'я', 'буду', 'откладывать', 'деньги', 'на', 'отпуск.', 'отложу'], 'Каждый месяц я буду откладывать деньги на отпуск.'),
  (50, 4, 'uz', '(они, не, купить, этот, дом, потому что, дорого)', ARRAY['Они', 'не', 'купят', 'этот', 'дом,', 'потому', 'что', 'дорого.', 'купили'], 'Они не купят этот дом, потому что дорого.'),
  (50, 5, 'uz', '(что, вы, делать, в, выходные, — отдыхать)', ARRAY['Что', 'вы', 'будете', 'делать', 'в', 'выходные?', '–', 'Отдыхать.', 'делаете'], 'Что вы будете делать в выходные? – Отдыхать.'),
  (50, 6, 'uz', '(он, сразу, понять, что, я, прав)', ARRAY['Он', 'сразу', 'поймёт,', 'что', 'я', 'прав.', 'понимает'], 'Он сразу поймёт, что я прав.'),
  (50, 7, 'uz', '(мы, обязательно, встретиться, на, вокзале, и, пойти, в, кафе)', ARRAY['Мы', 'обязательно', 'встретимся', 'на', 'вокзале', 'и', 'пойдём', 'в', 'кафе.', 'встречаемся'], 'Мы обязательно встретимся на вокзале и пойдём в кафе.'),
  (50, 8, 'uz', '(дети, скоро, вырасти, и, стать, взрослыми)', ARRAY['Дети', 'скоро', 'вырастут', 'и', 'станут', 'взрослыми.', 'вырастают'], 'Дети скоро вырастут и станут взрослыми.'),
  (50, 9, 'uz', '(я, верить, что, всё, быть, хорошо)', ARRAY['Я', 'верю,', 'что', 'всё', 'будет', 'хорошо.', 'верил'], 'Я верю, что всё будет хорошо.');

INSERT INTO public.daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
  (50, 0, 'Kelajak', 'Будущее'),
  (50, 1, 'O‘tmish', 'Прошлое'),
  (50, 2, 'Satr', 'Строка'),
  (50, 3, 'Orzu qilgan ish', 'Работа мечты'),
  (50, 4, 'Yaratmoq (oila)', 'Создать'),
  (50, 5, 'Aylanib chiqmoq', 'Объехать'),
  (50, 6, 'Yuksalish', 'Взлёт'),
  (50, 7, 'Tushish', 'Падение'),
  (50, 8, 'Bardosh bermoq', 'Справиться'),
  (50, 9, 'Qiyinchilik', 'Трудность'),
  (50, 10, 'Yaqinlar', 'Близкие'),
  (50, 11, 'Baxt', 'Счастье'),
  (50, 12, 'Sog‘liq', 'Здоровье'),
  (50, 13, 'Kelajakda', 'В будущем'),
  (50, 14, 'Poydevor', 'Фундамент');

INSERT INTO public.daily_reading_passages (day_number, title, body_ru, text_id)
VALUES (
  50,
  'Письмо самому себе через 10 лет',
  $body$
Здравствуй, мой будущий я! Сегодня мне двадцать, а ты читаешь это письмо через десять лет. Я пишу тебе из прошлого — чтобы ты помнил, кто ты был и что ты хотел изменить в своей жизни.

Когда ты будешь читать эти строки, мне уже будет тридцать лет. Я надеюсь, что ты счастлив и что ты нашёл свой путь — или хотя бы честно ищешь его.

Ты наверняка уже закончил университет, нашёл работу мечты и, возможно, создал семью. Или ты всё ещё учишься и строишь карьеру: это тоже нормально.

Помнишь ли ты наши старые планы? Мы хотели объехать весь мир и показать друг другу моря и города. Ты сделал это?

А ещё ты обещал себе научиться играть на фортепиано по вечерам. Ты выучил испанский язык или другой язык, который тебе был интересен?

Я знаю, что жизнь не всегда легка: у тебя были взлёты и падения, успехи и разочарования.

Но я верю, что ты справился со всеми трудностями и что ты гордишься собой не только за победы, но и за то, как ты поднимался после ошибок.

Посмотри на свои маленькие привычки: ты хотел спать пораньше, читать перед сном и меньше спорить из‑за мелочей. Если ты смог сохранить хотя бы часть этого — ты уже победил.

И последнее: поблагодари себя за то, что ты не сдался в те дни, когда было страшно. Я верю в тебя сильнее, чем в любые прогнозы.

Пожалуйста, не забывай своих близких. Цени каждый момент и простые разговоры дома.

Я желаю тебе счастья, здоровья и удачи. Я знаю, что ты справишься.

До встречи в будущем.
$body$,
  'kunlik-oqish-50'
);
INSERT INTO public.daily_reading_lexemes (text_id, word_ru, word_ru_normalized, translation_uz, audio_ru)
VALUES
  ('kunlik-oqish-50', 'а', 'а', 'Va', NULL),
  ('kunlik-oqish-50', 'близких', 'близких', 'Yaqinlaringni', NULL),
  ('kunlik-oqish-50', 'будет', 'будет', 'Bo‘ladi', NULL),
  ('kunlik-oqish-50', 'будешь', 'будешь', 'Bo‘lasan', NULL),
  ('kunlik-oqish-50', 'будущем', 'будущем', 'Kelajakda', NULL),
  ('kunlik-oqish-50', 'будущий', 'будущий', 'Kelajakdagi', NULL),
  ('kunlik-oqish-50', 'бы', 'бы', 'Hatto', NULL),
  ('kunlik-oqish-50', 'был', 'был', 'Bo‘lgan edi', NULL),
  ('kunlik-oqish-50', 'были', 'были', 'Bo‘lgan', NULL),
  ('kunlik-oqish-50', 'было', 'было', 'Bo‘ldi', NULL),
  ('kunlik-oqish-50', 'в', 'в', '…da / ichiga', NULL),
  ('kunlik-oqish-50', 'верю', 'верю', 'Ishonaman', NULL),
  ('kunlik-oqish-50', 'весь', 'весь', 'Butun', NULL),
  ('kunlik-oqish-50', 'вечерам', 'вечерам', 'Kechalar', NULL),
  ('kunlik-oqish-50', 'взлёты', 'взлеты', 'Yuksalishlar', NULL),
  ('kunlik-oqish-50', 'возможно', 'возможно', 'Ehtimol', NULL),
  ('kunlik-oqish-50', 'всё', 'все', 'Hammasi', NULL),
  ('kunlik-oqish-50', 'всегда', 'всегда', 'Har doim', NULL),
  ('kunlik-oqish-50', 'всеми', 'всеми', 'Hammasi bilan', NULL),
  ('kunlik-oqish-50', 'встречи', 'встречи', 'Uchrashuv', NULL),
  ('kunlik-oqish-50', 'выучил', 'выучил', 'O‘rgangan', NULL),
  ('kunlik-oqish-50', 'гордишься', 'гордишься', 'Iftixorlanasan', NULL),
  ('kunlik-oqish-50', 'города', 'города', 'Shaharlar', NULL),
  ('kunlik-oqish-50', 'двадцать', 'двадцать', 'Yigirma', NULL),
  ('kunlik-oqish-50', 'десять', 'десять', 'O‘n', NULL),
  ('kunlik-oqish-50', 'дни', 'дни', 'Kunlar', NULL),
  ('kunlik-oqish-50', 'До', 'до', '…gacha', NULL),
  ('kunlik-oqish-50', 'дома', 'дома', 'Uyda', NULL),
  ('kunlik-oqish-50', 'друг', 'друг', 'Do‘st', NULL),
  ('kunlik-oqish-50', 'другой', 'другой', 'Boshqa', NULL),
  ('kunlik-oqish-50', 'другу', 'другу', 'Do‘stga', NULL),
  ('kunlik-oqish-50', 'его', 'его', 'Uni', NULL),
  ('kunlik-oqish-50', 'Если', 'если', 'Agar', NULL),
  ('kunlik-oqish-50', 'ещё', 'еще', 'Yana', NULL),
  ('kunlik-oqish-50', 'желаю', 'желаю', 'Tilayman', NULL),
  ('kunlik-oqish-50', 'жизни', 'жизни', 'Hayotida', NULL),
  ('kunlik-oqish-50', 'жизнь', 'жизнь', 'Hayot', NULL),
  ('kunlik-oqish-50', 'за', 'за', '…uchun', NULL),
  ('kunlik-oqish-50', 'забывай', 'забывай', 'Unutma', NULL),
  ('kunlik-oqish-50', 'закончил', 'закончил', 'Tugatgan', NULL),
  ('kunlik-oqish-50', 'здоровья', 'здоровья', 'Sog‘liq', NULL),
  ('kunlik-oqish-50', 'Здравствуй', 'здравствуй', 'Salom', NULL),
  ('kunlik-oqish-50', 'знаю', 'знаю', 'Bilaman', NULL),
  ('kunlik-oqish-50', 'и', 'и', 'Va', NULL),
  ('kunlik-oqish-50', 'играть', 'играть', 'O‘ynamoq', NULL),
  ('kunlik-oqish-50', 'из', 'из', '…dan', NULL),
  ('kunlik-oqish-50', 'изменить', 'изменить', 'O‘zgartirmoq', NULL),
  ('kunlik-oqish-50', 'или', 'или', 'Yoki', NULL),
  ('kunlik-oqish-50', 'интересен', 'интересен', 'Qiziqarli', NULL),
  ('kunlik-oqish-50', 'испанский', 'испанский', 'Ispan', NULL),
  ('kunlik-oqish-50', 'ищешь', 'ищешь', 'Qidirasan', NULL),
  ('kunlik-oqish-50', 'каждый', 'каждый', 'Har bir', NULL),
  ('kunlik-oqish-50', 'как', 'как', 'Qanday', NULL),
  ('kunlik-oqish-50', 'карьеру', 'карьеру', 'Karyerani', NULL),
  ('kunlik-oqish-50', 'Когда', 'когда', 'Qachon', NULL),
  ('kunlik-oqish-50', 'который', 'который', 'Qaysiki', NULL),
  ('kunlik-oqish-50', 'кто', 'кто', 'Kim', NULL),
  ('kunlik-oqish-50', 'легка', 'легка', 'Oson', NULL),
  ('kunlik-oqish-50', 'лет', 'лет', 'Yosh', NULL),
  ('kunlik-oqish-50', 'ли', 'ли', '-mi', NULL),
  ('kunlik-oqish-50', 'любые', 'любые', 'Har qanday', NULL),
  ('kunlik-oqish-50', 'маленькие', 'маленькие', 'Kichik', NULL),
  ('kunlik-oqish-50', 'мелочей', 'мелочей', 'Melochlar', NULL),
  ('kunlik-oqish-50', 'меньше', 'меньше', 'Kamroq', NULL),
  ('kunlik-oqish-50', 'мечты', 'мечты', 'Orzu', NULL),
  ('kunlik-oqish-50', 'мир', 'мир', 'Dunyo', NULL),
  ('kunlik-oqish-50', 'мне', 'мне', 'Menga', NULL),
  ('kunlik-oqish-50', 'мой', 'мой', 'Mening', NULL),
  ('kunlik-oqish-50', 'момент', 'момент', 'Lahza', NULL),
  ('kunlik-oqish-50', 'моря', 'моря', 'Dengizlar', NULL),
  ('kunlik-oqish-50', 'Мы', 'мы', 'Biz', NULL),
  ('kunlik-oqish-50', 'на', 'на', '…da', NULL),
  ('kunlik-oqish-50', 'наверняка', 'наверняка', 'Albatta', NULL),
  ('kunlik-oqish-50', 'надеюсь', 'надеюсь', 'Umid qilaman', NULL),
  ('kunlik-oqish-50', 'научиться', 'научиться', 'O‘rganmoq', NULL),
  ('kunlik-oqish-50', 'нашёл', 'нашел', 'Topgan', NULL),
  ('kunlik-oqish-50', 'наши', 'наши', 'Bizning', NULL),
  ('kunlik-oqish-50', 'не', 'не', 'Emas', NULL),
  ('kunlik-oqish-50', 'Но', 'но', 'Lekin', NULL),
  ('kunlik-oqish-50', 'нормально', 'нормально', 'Oddiy', NULL),
  ('kunlik-oqish-50', 'обещал', 'обещал', 'Va’da bergan', NULL),
  ('kunlik-oqish-50', 'объехать', 'объехать', 'Aylanib chiqmoq', NULL),
  ('kunlik-oqish-50', 'ошибок', 'ошибок', 'Xatolardan', NULL),
  ('kunlik-oqish-50', 'падения', 'падения', 'Tushishlar', NULL),
  ('kunlik-oqish-50', 'перед', 'перед', 'Oldin', NULL),
  ('kunlik-oqish-50', 'письмо', 'письмо', 'Xat', NULL),
  ('kunlik-oqish-50', 'пишу', 'пишу', 'Yozyapman', NULL),
  ('kunlik-oqish-50', 'планы', 'планы', 'Rejalar', NULL),
  ('kunlik-oqish-50', 'по', 'по', 'Bo‘ylab', NULL),
  ('kunlik-oqish-50', 'победил', 'победил', 'G‘olib bo‘ldi', NULL),
  ('kunlik-oqish-50', 'победы', 'победы', 'G‘alabalar', NULL),
  ('kunlik-oqish-50', 'поблагодари', 'поблагодари', 'Minnatdor bo‘l', NULL),
  ('kunlik-oqish-50', 'поднимался', 'поднимался', 'Ko‘tarilgan eding', NULL),
  ('kunlik-oqish-50', 'Пожалуйста', 'пожалуйста', 'Iltimos', NULL),
  ('kunlik-oqish-50', 'показать', 'показать', 'Ko‘rsatmoq', NULL),
  ('kunlik-oqish-50', 'помнил', 'помнил', 'Eslagan bo‘lasan', NULL),
  ('kunlik-oqish-50', 'Помнишь', 'помнишь', 'Esingdami', NULL),
  ('kunlik-oqish-50', 'пораньше', 'пораньше', 'Ertaroq', NULL),
  ('kunlik-oqish-50', 'после', 'после', 'Keyin', NULL),
  ('kunlik-oqish-50', 'последнее', 'последнее', 'Oxirgi', NULL),
  ('kunlik-oqish-50', 'Посмотри', 'посмотри', 'Qarab chiq', NULL),
  ('kunlik-oqish-50', 'привычки', 'привычки', 'Odatlar', NULL),
  ('kunlik-oqish-50', 'прогнозы', 'прогнозы', 'Prognozlar', NULL),
  ('kunlik-oqish-50', 'простые', 'простые', 'Oddiy', NULL),
  ('kunlik-oqish-50', 'прошлого', 'прошлого', 'O‘tmishdan', NULL),
  ('kunlik-oqish-50', 'путь', 'путь', 'Yo‘l', NULL),
  ('kunlik-oqish-50', 'работу', 'работу', 'Ishni', NULL),
  ('kunlik-oqish-50', 'разговоры', 'разговоры', 'Suhbatlar', NULL),
  ('kunlik-oqish-50', 'разочарования', 'разочарования', 'Xafa bo‘lishlar', NULL),
  ('kunlik-oqish-50', 'своей', 'своей', 'O‘zingning', NULL),
  ('kunlik-oqish-50', 'свои', 'свои', 'O‘zingning', NULL),
  ('kunlik-oqish-50', 'своих', 'своих', 'O‘zingning', NULL),
  ('kunlik-oqish-50', 'свой', 'свой', 'O‘zing', NULL),
  ('kunlik-oqish-50', 'сдался', 'сдался', 'Topshirib yuborgan', NULL),
  ('kunlik-oqish-50', 'сделал', 'сделал', 'Qildi', NULL),
  ('kunlik-oqish-50', 'себе', 'себе', 'O‘zingga', NULL),
  ('kunlik-oqish-50', 'себя', 'себя', 'O‘zingni', NULL),
  ('kunlik-oqish-50', 'Сегодня', 'сегодня', 'Bugun', NULL),
  ('kunlik-oqish-50', 'семью', 'семью', 'Oilani', NULL),
  ('kunlik-oqish-50', 'сильнее', 'сильнее', 'Kuchliroq', NULL),
  ('kunlik-oqish-50', 'смог', 'смог', 'Ulg‘urdi', NULL),
  ('kunlik-oqish-50', 'сном', 'сном', 'Uyqudan oldin', NULL),
  ('kunlik-oqish-50', 'со', 'со', 'Bilan', NULL),
  ('kunlik-oqish-50', 'собой', 'собой', 'O‘zing bilan', NULL),
  ('kunlik-oqish-50', 'создал', 'создал', 'Yaratgan', NULL),
  ('kunlik-oqish-50', 'сохранить', 'сохранить', 'Saqlamoq', NULL),
  ('kunlik-oqish-50', 'спать', 'спать', 'Uxlamoq', NULL),
  ('kunlik-oqish-50', 'спорить', 'спорить', 'Bahslashmoq', NULL),
  ('kunlik-oqish-50', 'справился', 'справился', 'Bardosh bergan', NULL),
  ('kunlik-oqish-50', 'справишься', 'справишься', 'Bardosh berasan', NULL),
  ('kunlik-oqish-50', 'старые', 'старые', 'Eski', NULL),
  ('kunlik-oqish-50', 'страшно', 'страшно', 'Qo‘rqinchli', NULL),
  ('kunlik-oqish-50', 'строишь', 'строишь', 'Quryapsan', NULL),
  ('kunlik-oqish-50', 'строки', 'строки', 'Satrlar', NULL),
  ('kunlik-oqish-50', 'счастлив', 'счастлив', 'Baxtli', NULL),
  ('kunlik-oqish-50', 'счастья', 'счастья', 'Baxt', NULL),
  ('kunlik-oqish-50', 'те', 'те', 'Bu', NULL),
  ('kunlik-oqish-50', 'тебе', 'тебе', 'Senga', NULL),
  ('kunlik-oqish-50', 'тебя', 'тебя', 'Seni', NULL),
  ('kunlik-oqish-50', 'то', 'то', 'Ana shu', NULL),
  ('kunlik-oqish-50', 'тоже', 'тоже', 'Ham', NULL),
  ('kunlik-oqish-50', 'только', 'только', 'Faqat', NULL),
  ('kunlik-oqish-50', 'тридцать', 'тридцать', 'O‘ttiz', NULL),
  ('kunlik-oqish-50', 'трудностями', 'трудностями', 'Qiyinchiliklar bilan', NULL),
  ('kunlik-oqish-50', 'ты', 'ты', 'Sen', NULL),
  ('kunlik-oqish-50', 'у', 'у', '…da bor', NULL),
  ('kunlik-oqish-50', 'удачи', 'удачи', 'Omad', NULL),
  ('kunlik-oqish-50', 'уже', 'уже', 'Allaqachon', NULL),
  ('kunlik-oqish-50', 'университет', 'университет', 'Universitet', NULL),
  ('kunlik-oqish-50', 'успехи', 'успехи', 'Muvaffaqiyatlar', NULL),
  ('kunlik-oqish-50', 'учишься', 'учишься', 'O‘qiysan', NULL),
  ('kunlik-oqish-50', 'фортепиано', 'фортепиано', 'Pianino', NULL),
  ('kunlik-oqish-50', 'хотел', 'хотел', 'Xohlardi', NULL),
  ('kunlik-oqish-50', 'хотели', 'хотели', 'Xohlardi', NULL),
  ('kunlik-oqish-50', 'хотя', 'хотя', 'Garchi', NULL),
  ('kunlik-oqish-50', 'Цени', 'цени', 'Qadrla', NULL),
  ('kunlik-oqish-50', 'часть', 'часть', 'Qism', NULL),
  ('kunlik-oqish-50', 'чем', 'чем', '…dan ko‘ra', NULL),
  ('kunlik-oqish-50', 'через', 'через', 'Orqali', NULL),
  ('kunlik-oqish-50', 'честно', 'честно', 'Halol', NULL),
  ('kunlik-oqish-50', 'читаешь', 'читаешь', 'O‘qiysan', NULL),
  ('kunlik-oqish-50', 'читать', 'читать', 'O‘qimoq', NULL),
  ('kunlik-oqish-50', 'что', 'что', 'Nima', NULL),
  ('kunlik-oqish-50', 'чтобы', 'чтобы', 'Shunda ki', NULL),
  ('kunlik-oqish-50', 'эти', 'эти', 'Bu', NULL),
  ('kunlik-oqish-50', 'это', 'это', 'Bu', NULL),
  ('kunlik-oqish-50', 'этого', 'этого', 'Shundan', NULL),
  ('kunlik-oqish-50', 'я', 'я', 'Men', NULL),
  ('kunlik-oqish-50', 'язык', 'язык', 'Til', NULL);

INSERT INTO public.daily_practice_prompts (day_number, sort_order, uz_text, ru_correct)
VALUES
  (50, 0, '10 yildan keyin o‘zingizni qayerda ko‘rasiz?', 'Где вы видите себя через 10 лет?'),
  (50, 1, 'Men kelajakda o‘z biznesimni ochaman va muvaffaqiyatli tadbirkor bo‘laman.', 'В будущем я открою свой бизнес и стану успешным предпринимателем.'),
  (50, 2, 'U 5 yil ichida uy sotib olishni va’da qilgan edi.', 'Он обещал купить дом через 5 лет.'),
  (50, 3, 'Bugungi rejalaringiz kelajakdagi muvaffaqiyatingizning poydevoridir.', 'Сегодняшние планы – это фундамент вашего будущего успеха.'),
  (50, 4, 'Sizningcha, kelajakda qanday kasblar eng kerakli bo‘ladi?', 'Какие профессии, по-вашему, будут самыми востребованными в будущем?'),
  (50, 5, 'U yoshligida juda ko‘p orzu qilgan, lekin hammasini amalga oshira olmagan.', 'В молодости он много мечтал, но не смог осуществить всё.'),
  (50, 6, 'Biz bu loyihani kelasi yilning boshida boshlaymiz va yozda tugatamiz.', 'Мы начнём этот проект в начале следующего года и закончим летом.'),
  (50, 7, 'U kelajakdagi xatolaridan qo‘rqmaydi, chunki biladiki, xatolarsiz muvaffaqiyat bo‘lmaydi.', 'Он не боится будущих ошибок, потому что знает: без ошибок нет успеха.'),
  (50, 8, 'Oilangiz bilan birga kelajak rejalaringizni muhokama qilasizmi?', 'Вы обсуждаете свои будущие планы с семьёй?'),
  (50, 9, 'Qaniydi, kelajakda dunyoda tinchlik bo‘lsa.', 'Хочется верить, что в будущем в мире будет мир.');
