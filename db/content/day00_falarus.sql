-- ============================================================
-- FalaRus.uz — DAY 0
-- Тема: «Первый разговор» — Здравствуйте! Извините, где метро?
--       Сколько стоит? Я хочу… Можно…? Я не понимаю. Иди сюда! Подождите!
-- Грамматика: самые нужные фразы общения (вопрос интонацией,
--             где / что / сколько стоит, я хочу, можно, я не понимаю)
--             + повелительное наклонение: иди, дай, принеси, подожди, помоги, покажи
-- Словарь: 6 слов первой необходимости
-- Уровень: A1+
-- ============================================================

BEGIN;

-- ---------- очистка дня 0 (идемпотентность) ----------
DELETE FROM daily_grammar_topics            WHERE day_number = 0;
DELETE FROM daily_grammar_mcqs              WHERE day_number = 0;
DELETE FROM daily_grammar_matches           WHERE day_number = 0;
DELETE FROM daily_grammar_sentence_arrange  WHERE day_number = 0;
DELETE FROM daily_vocab_words               WHERE day_number = 0;
DELETE FROM daily_phrase_mcqs               WHERE day_number = 0;
DELETE FROM daily_text_questions            WHERE day_number = 0;
DELETE FROM daily_practice_prompts          WHERE day_number = 0;
DELETE FROM daily_speaking_tasks            WHERE day_number = 0;
DELETE FROM daily_reading_lexemes           WHERE text_id = 'kunlik-oqish-00';
DELETE FROM daily_reading_passages          WHERE day_number = 0;


-- ============================================================
-- БЛОК 1. ГРАММАТИКА
-- ============================================================
INSERT INTO daily_grammar_topics (day_number, title, theory_text)
VALUES (0, 'Birinchi suhbat: eng kerakli iboralar', $theory$
# 0-kun. Birinchi suhbat: eng kerakli iboralar

Rus tilida gapira boshlagan odam kuniga eng koʻp ishlatadigan iboralar bor.
Bugun aynan shularni oʻrganamiz: salomlashish, odob soʻzlari, savol berish, biror narsani soʻrash va tushunmaganda nima deyish.

## 1. Salomlashish va xayrlashish

| Ruscha | Oʻzbekcha | Kimga |
|---|---|---|
| **Здравствуйте!** | Assalomu alaykum! | notanish odam, kattalar, boshliq |
| **Привет!** | Salom! | doʻst, tanish |
| **До свидания!** | Xayr! | notanish odam, kattalar |
| **Пока!** | Xayr! / Koʻrishguncha! | doʻst, tanish |

**Yodda tuting:** doʻkonda, ishda, politsiya yoki hujjat idorasida doim **Здравствуйте** va **До свидания** deng. **Привет** va **Пока** — faqat doʻstlarga.

## 2. Odob soʻzlari

| Ruscha | Oʻzbekcha |
|---|---|
| **Спасибо** | Rahmat |
| **Пожалуйста** | 1) Iltimos 2) Arzimaydi |
| **Извините** | Kechirasiz |
| **Да / Нет** | Ha / Yoʻq |

**Пожалуйста** ikki maʼnoda ishlatiladi:
- Soʻraganda: Повторите, **пожалуйста**. — Takrorlang, iltimos.
- «Спасибо»ga javob: — Спасибо! — **Пожалуйста!** — Rahmat! — Arzimaydi!

Notanish odamga savol berishdan oldin doim **Извините** deng: **Извините, где метро?**

## 3. Savol: soʻz tartibi oʻzgarmaydi — faqat ohang

Oʻzbek tilida savol uchun **-mi** qoʻshimchasi qoʻshiladi. Rus tilida esa gap **xuddi shunday qoladi**, faqat ohang koʻtariladi va oxiriga **?** qoʻyiladi.

| Darak gap | Soʻroq gap |
|---|---|
| Это метро. — Bu metro. | Это метро? — Bu metromi? |
| Это чай. — Bu choy. | Это чай? — Bu choymi? |

## 4. Savol soʻzlari: Где? Что? Сколько стоит?

| Ruscha | Oʻzbekcha | Misol |
|---|---|---|
| **Где?** | Qayerda? | **Где** метро? **Где** туалет? |
| **Что?** | Nima? | **Что** это? |
| **Сколько стоит?** | Qancha turadi? | **Сколько стоит** чай? |

✅ Где метро?
❌ Где **есть** метро?

✅ Сколько стоит билет?
❌ Билет сколько **есть**?

**Yodda tuting:** rus tilida hozirgi zamonda «boʻlmoq» (есть) feʼli qoʻyilmaydi: **Где туалет?** — «Hojatxona qayerda?» Shunchaki ikki soʻz.

## 5. Я хочу … va Можно …?

Biror narsa soʻrashning ikki asosiy yoʻli:

| Ruscha | Oʻzbekcha | Misol |
|---|---|---|
| **Я хочу …** | Men … xohlayman | **Я хочу** чай. **Я хочу** кофе. |
| **Можно …?** | … mumkinmi? / … boʻladimi? | **Можно** билет? **Можно** чай? |

**Можно?** bir oʻzi ham ishlatiladi: eshikni ochib kirayotganda — **Можно?** (Kirsam boʻladimi?)

**Yodda tuting:** **-а** bilan tugagan soʻz **хочу** va **можно** dan keyin **-у** ga oʻzgaradi:
- карта → **Можно карту?** (Karta bilan toʻlasam boʻladimi?)

✅ Можно карт**у**?
❌ Можно карт**а**?

## 6. Tushunmasangiz — mana shu iboralar yordam beradi

| Ruscha | Oʻzbekcha |
|---|---|
| **Я не понимаю.** | Men tushunmayapman. |
| **Повторите, пожалуйста.** | Takrorlang, iltimos. |
| **Медленнее, пожалуйста.** | Sekinroq (gapiring), iltimos. |
| **Я немного говорю по-русски.** | Men ruscha ozgina gapiraman. |

**не** — «emas», «-ma» degani. U feʼldan **oldin** keladi:
✅ Я **не** понимаю.
❌ Я понимаю **не**.

Bu iboralardan uyalmang — rus tilida gapiradigan odamlar ularni yaxshi tushunadi va sizga sekinroq gapirib beradi.

## 7. Buyruq feʼllari: Иди сюда! Подождите!

Ishda, doʻkonda, koʻchada eng koʻp eshitiladigan soʻzlar — buyruqlar. Boshliq yoki brigadir sizga ularni har kuni aytadi.

| Oʻzbekcha | **ты** (sen) | **вы** (siz) |
|---|---|---|
| Bu yerga kel(ing)! | **Иди сюда!** | **Идите сюда!** |
| Ber(ing) | **Дай** | **Дайте** |
| Olib kel(ing) | **Принеси** | **Принесите** |
| Kut(ing) | **Подожди** | **Подождите** |
| Yordam ber(ing) | **Помоги** | **Помогите** |
| Koʻrsat(ing) | **Покажи** | **Покажите** |

**Qoida juda oddiy:** «siz» shakli = «sen» shakli + **-те**.
дай → дай**те**, подожди → подожди**те**, покажи → покажи**те**.

Misollar:
- **Дайте**, пожалуйста, чай. — Choy bering, iltimos.
- **Покажите** паспорт. — Pasportni koʻrsating.
- **Подождите** минуту. — Bir daqiqa kuting.
- **Принеси** ключ. — Kalitni olib kel.

**Yodda tuting:**
1. Brigadir yoki tanish odam sizga **ты** bilan aytishi mumkin: «**Иди сюда!**». Lekin siz notanish odamga, kattalarga va boshliqqa doim **вы** shaklida gapiring: «**Подождите**, пожалуйста».
2. Buyruqqa **пожалуйста** qoʻshsangiz — iltimosga aylanadi: **Помогите, пожалуйста!**
3. Buyruqqa javob: **Хорошо!** — Xoʻp! / Yaxshi!

✅ Подождите, пожалуйста.
❌ Подождать, пожалуйста.
$theory$);


-- ============================================================
-- БЛОК 2. ТЕСТ ПО ГРАММАТИКЕ — 7 вопросов
-- ============================================================
INSERT INTO daily_grammar_mcqs
  (day_number, quiz_kind, sort_order, question_text, option_a, option_b, option_c, option_d, correct_index)
VALUES
(0,'rule',0,'Doʻkonda sotuvchi bilan qanday salomlashasiz?','Привет!','Пока!','Здравствуйте!','До свидания!',2),
(0,'rule',1,'Brigadir aytdi: «Иди сюда!» Bu nima degani?','U yerga bor!','Bu yerga kel!','Kut!','Olib kel!',1),
(0,'rule',2,'Boʻsh joyni toʻldiring: «Извините, ___ туалет?»','Что','Где','Сколько','Можно',1),
(0,'rule',3,'Notanish odamga ayting: «Kuting, iltimos».','Подожди, пожалуйста.','Подождать, пожалуйста.','Подождите, пожалуйста.','Подождём, пожалуйста.',2),
(0,'rule',4,'Boʻsh joyni toʻldiring: «Сколько ___ чай?»','есть','хочу','можно','стоит',3),
(0,'rule',5,'«Kechirasiz, men tushunmayapman» — qaysi gap toʻgʻri?','Извините, я понимаю не.','Извините, я не понимаю.','Спасибо, я не понимаю.','Пожалуйста, я понимаю.',1),
(0,'rule',6,'Boʻsh joyni toʻldiring: «Можно ___?» (карта)','карту','карта','карты','картой',0);


-- ============================================================
-- БЛОК 3. НАЙДИ ПАРУ — 10 пар (формы из грамматики)
-- ============================================================
INSERT INTO daily_grammar_matches
  (day_number, block_sort_order, pair_sort_order, left_text, right_text)
VALUES
(0,0,0,'Assalomu alaykum!','Здравствуйте!'),
(0,0,1,'Rahmat','Спасибо'),
(0,0,2,'Kechirasiz','Извините'),
(0,0,3,'Qayerda?','Где?'),
(0,0,4,'Qancha turadi?','Сколько стоит?'),
(0,0,5,'Men xohlayman','Я хочу'),
(0,0,6,'Mumkinmi?','Можно?'),
(0,0,7,'Men tushunmayapman','Я не понимаю'),
(0,0,8,'Bu yerga kel!','Иди сюда!'),
(0,0,9,'Kuting!','Подождите!');


-- ============================================================
-- БЛОК 4. СОСТАВЬ ПРЕДЛОЖЕНИЕ — 5 заданий
-- ============================================================
INSERT INTO daily_grammar_sentence_arrange
  (day_number, sort_order, prompt_lang, prompt_text, word_bank, answer_ru)
VALUES
(0,0,'uz','Kechirasiz, metro qayerda?',
   ARRAY['где','есть','извините','что','метро'],'Извините, где метро?'),
(0,1,'uz','Choy qancha turadi?',
   ARRAY['чай','где','сколько','есть','стоит'],'Сколько стоит чай?'),
(0,2,'uz','Bu yerga kel!',
   ARRAY['сюда','там','иди','где'],'Иди сюда!'),
(0,3,'uz','Kechirasiz, men tushunmayapman.',
   ARRAY['не','нет','понимаю','извините','я'],'Извините, я не понимаю.'),
(0,4,'uz','Kuting, iltimos.',
   ARRAY['подожди','пожалуйста','спасибо','подождите'],'Подождите, пожалуйста.');


-- ============================================================
-- БЛОК 5. СЛОВАРЬ — 6 слов (первая необходимость)
-- ============================================================
INSERT INTO daily_vocab_words (day_number, sort_order, word_uz, word_ru)
VALUES
(0,0,'ish','работа'),
(0,1,'doʻkon','магазин'),
(0,2,'suv','вода'),
(0,3,'non','хлеб'),
(0,4,'pul','деньги'),
(0,5,'bekat','остановка');


-- ============================================================
-- БЛОК 6. СЛОВОСОЧЕТАНИЯ — 6 тестов
-- ============================================================
INSERT INTO daily_phrase_mcqs
  (day_number, sort_order, phrase_ru, option_a, option_b, option_c, option_d, correct_index)
VALUES
(0,0,'где магазин?','doʻkon qayerda?','non qayerda?','doʻkon qancha turadi?','bekat qayerda?',0),
(0,1,'дайте воду, пожалуйста','suv ber','suv xohlayman','suv bering, iltimos','suv olib keling, iltimos',2),
(0,2,'сколько стоит хлеб?','non qayerda?','suv qancha turadi?','non qancha turadi?','men non xohlayman',2),
(0,3,'где остановка?','doʻkon qayerda?','ish qayerda?','bu bekatmi?','bekat qayerda?',3),
(0,4,'это работа?','bu ish','bu ishmi?','ish qayerda?','bu pulmi?',1),
(0,5,'принеси хлеб','non olib keling','non olib kel','non ber','non qayerda?',1);


-- ============================================================
-- БЛОК 7.1 ТЕКСТ
-- ============================================================
INSERT INTO daily_reading_passages (day_number, text_id, title, body_ru)
VALUES (0, 'kunlik-oqish-00', 'Первый день в Москве', $text$Меня зовут Бобур. Это мой первый день в Москве. Я немного говорю по-русски.

Вот магазин. Я говорю: «Здравствуйте! Я хочу воду и хлеб. Сколько стоит?»

Продавец говорит: «Подождите… Сто рублей». Я не понимаю. Я говорю: «Извините, я не понимаю. Повторите, пожалуйста. Медленнее».

Продавец говорит медленно: «Сто рублей». Вот деньги. «Спасибо!» — «Пожалуйста!»

Потом я спрашиваю: «Извините, где остановка?» Мужчина говорит: «Остановка там». — «Спасибо! До свидания!»

Вот остановка. Вот автобус. Я еду на работу.

На работе бригадир говорит: «Бобур, иди сюда! Помоги, пожалуйста. Дай молоток». Я говорю: «Хорошо. Вот молоток».

Русский язык трудный? Да, немного. Но «здравствуйте», «спасибо» и «извините» — это очень важные слова.$text$);


-- ============================================================
-- БЛОК 7.2 РАЗБОР СЛОВ ТЕКСТА
-- ============================================================
INSERT INTO daily_reading_lexemes (word_ru, translation_uz, text_id, word_ru_normalized, audio_ru)
VALUES
('Меня','meni','kunlik-oqish-00','меня',NULL),
('зовут','ismi … (chaqirishadi)','kunlik-oqish-00','зовут',NULL),
('Бобур','Bobur (erkak ismi)','kunlik-oqish-00','бобур',NULL),
('это','bu','kunlik-oqish-00','это',NULL),
('мой','mening','kunlik-oqish-00','мой',NULL),
('первый','birinchi','kunlik-oqish-00','первый',NULL),
('день','kun','kunlik-oqish-00','день',NULL),
('в','-da (ichida)','kunlik-oqish-00','в',NULL),
('Москве','Moskvada','kunlik-oqish-00','москве',NULL),
('я','men','kunlik-oqish-00','я',NULL),
('немного','ozgina, biroz','kunlik-oqish-00','немного',NULL),
('говорю','gapiraman, aytaman','kunlik-oqish-00','говорю',NULL),
('по-русски','ruscha','kunlik-oqish-00','по-русски',NULL),
('вот','mana','kunlik-oqish-00','вот',NULL),
('магазин','doʻkon','kunlik-oqish-00','магазин',NULL),
('Здравствуйте','Assalomu alaykum','kunlik-oqish-00','здравствуйте',NULL),
('хочу','xohlayman','kunlik-oqish-00','хочу',NULL),
('воду','suv (suvni)','kunlik-oqish-00','воду',NULL),
('и','va','kunlik-oqish-00','и',NULL),
('хлеб','non','kunlik-oqish-00','хлеб',NULL),
('сколько','qancha','kunlik-oqish-00','сколько',NULL),
('стоит','turadi (narxi)','kunlik-oqish-00','стоит',NULL),
('продавец','sotuvchi','kunlik-oqish-00','продавец',NULL),
('говорит','gapiradi, aytadi','kunlik-oqish-00','говорит',NULL),
('сто','yuz','kunlik-oqish-00','сто',NULL),
('рублей','rubl','kunlik-oqish-00','рублей',NULL),
('не','-ma, emas','kunlik-oqish-00','не',NULL),
('понимаю','tushunaman','kunlik-oqish-00','понимаю',NULL),
('извините','kechirasiz','kunlik-oqish-00','извините',NULL),
('повторите','takrorlang','kunlik-oqish-00','повторите',NULL),
('пожалуйста','iltimos; arzimaydi','kunlik-oqish-00','пожалуйста',NULL),
('медленнее','sekinroq','kunlik-oqish-00','медленнее',NULL),
('медленно','sekin','kunlik-oqish-00','медленно',NULL),
('деньги','pul','kunlik-oqish-00','деньги',NULL),
('спасибо','rahmat','kunlik-oqish-00','спасибо',NULL),
('потом','keyin','kunlik-oqish-00','потом',NULL),
('спрашиваю','soʻrayman','kunlik-oqish-00','спрашиваю',NULL),
('где','qayerda','kunlik-oqish-00','где',NULL),
('остановка','bekat','kunlik-oqish-00','остановка',NULL),
('мужчина','erkak kishi','kunlik-oqish-00','мужчина',NULL),
('там','u yerda','kunlik-oqish-00','там',NULL),
('до свидания','xayr','kunlik-oqish-00','до свидания',NULL),
('автобус','avtobus','kunlik-oqish-00','автобус',NULL),
('еду','(transportda) ketyapman','kunlik-oqish-00','еду',NULL),
('на','-ga','kunlik-oqish-00','на',NULL),
('работу','ishga','kunlik-oqish-00','работу',NULL),
('русский','rus','kunlik-oqish-00','русский',NULL),
('язык','til','kunlik-oqish-00','язык',NULL),
('трудный','qiyin','kunlik-oqish-00','трудный',NULL),
('да','ha','kunlik-oqish-00','да',NULL),
('но','lekin','kunlik-oqish-00','но',NULL),
('очень','juda','kunlik-oqish-00','очень',NULL),
('важные','muhim (koʻplikda)','kunlik-oqish-00','важные',NULL),
('слова','soʻzlar','kunlik-oqish-00','слова',NULL),
('подождите','kuting','kunlik-oqish-00','подождите',NULL),
('работе','ishda','kunlik-oqish-00','работе',NULL),
('бригадир','brigadir, usta boshligʻi','kunlik-oqish-00','бригадир',NULL),
('иди','bor; kel (sen)','kunlik-oqish-00','иди',NULL),
('сюда','bu yerga','kunlik-oqish-00','сюда',NULL),
('помоги','yordam ber (sen)','kunlik-oqish-00','помоги',NULL),
('дай','ber (sen)','kunlik-oqish-00','дай',NULL),
('молоток','bolgʻa','kunlik-oqish-00','молоток',NULL),
('хорошо','xoʻp, yaxshi','kunlik-oqish-00','хорошо',NULL);


-- ============================================================
-- БЛОК 7.3 ВОПРОСЫ ПО ТЕКСТУ — 6 тестов
-- ============================================================
INSERT INTO daily_text_questions
  (day_number, sort_order, question_ru, option_a, option_b, option_c, option_d, correct_index)
VALUES
(0,0,'Что говорит бригадир?','Бобур, до свидания!','Бобур, иди сюда!','Бобур, повторите!','Бобур, где метро?',1),
(0,1,'Что хочет Бобур?','Он хочет чай.','Он хочет воду и хлеб.','Он хочет кофе.','Он хочет билет.',1),
(0,2,'Сколько стоят вода и хлеб?','Десять рублей.','Тысяча рублей.','Сто рублей.','Пять рублей.',2),
(0,3,'Бобур не понимает. Что он говорит?','Пока!','Спасибо!','Привет!','Повторите, пожалуйста.',3),
(0,4,'Где остановка?','Остановка там.','Остановка — это магазин.','Остановка тут.','Остановка — это автобус.',0),
(0,5,'Куда едет Бобур?','В магазин.','На работу.','Домой.','В метро.',1);


-- ============================================================
-- БЛОК 8. ПЕРЕВОД — 5 фраз
-- ============================================================
INSERT INTO daily_practice_prompts (day_number, sort_order, uz_text)
VALUES
(0,0,'Assalomu alaykum! Men suv xohlayman.'),
(0,1,'Kechirasiz, bekat qayerda?'),
(0,2,'Non qancha turadi?'),
(0,3,'Men tushunmayapman. Takrorlang, iltimos.'),
(0,4,'Bu yerga keling! Yordam bering, iltimos.');


-- ============================================================
-- БЛОК 9. ГОВОРЕНИЕ — 6 реплик (связный диалог в магазине)
-- ============================================================
INSERT INTO daily_speaking_tasks (day_number, sort_order, prompt_ru, prompt_uz)
VALUES
(0,0,'Здравствуйте! Что вы хотите?','Salomlashing va «non bering, iltimos» deb ayting.'),
(0,1,'Хлеб. Что ещё?','Ayting: «suv ham bering, iltimos».'),
(0,2,'Двести рублей.','Tushunmaganingizni ayting va takrorlashni soʻrang.'),
(0,3,'Две-сти рублей.','Rahmat deng va karta bilan toʻlash mumkinmi, deb soʻrang.'),
(0,4,'Да, можно. Спасибо!','«Kechirasiz» deb, bekat qayerdaligini soʻrang.'),
(0,5,'Остановка там. До свидания!','Rahmat ayting va xayrlashing.');

COMMIT;
