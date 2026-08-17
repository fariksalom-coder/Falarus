-- 160: 86 va 97-kunlarning yetishmayotgan kontenti.
--
-- Audit ko'rsatdi: 182 kundan IKKITASIDA ibora testi, matn savollari va
-- gapirish topshiriqlari umuman yo'q edi — o'quvchi bu kunlarda lug'atning
-- 4-vazifasiga, o'qish savollariga va gapirish blokiga kira olmasdi.
--
-- Kontent kunning O'Z materialidan olingan:
--   86-kun — "Сравнительная степень: простая форма" + Moskva/Toshkent matni;
--   97-kun — "НСВ/СВ: отрицание и модальные слова" + "Опоздание" matni.
--
-- To'g'ri javob o'rni ataylab aylanadi (0,1,2,3,…): bir xil joyda tursa
-- o'quvchi matnni o'qimasdan taxmin qilishni o'rganib qoladi.

BEGIN;

DELETE FROM daily_phrase_mcqs   WHERE day_number IN (86, 97);
DELETE FROM daily_text_questions WHERE day_number IN (86, 97);
DELETE FROM daily_speaking_tasks WHERE day_number IN (86, 97);

-- ─────────────────────────── 86-kun: iboralar ───────────────────────────
INSERT INTO daily_phrase_mcqs (day_number, sort_order, phrase_ru, option_a, option_b, option_c, option_d, correct_index) VALUES
(86, 0, 'Москва старее Ташкента', 'Moskva Toshkentdan eskiroq', 'Moskva Toshkentdan kattaroq', 'Moskva Toshkentdan yangiroq', 'Moskva Toshkentdan uzoqroq', 0),
(86, 1, 'Ташкент зеленее', 'Toshkent tinchroq', 'Toshkent yashilroq', 'Toshkent issiqroq', 'Toshkent kengroq', 1),
(86, 2, 'Улицы шире', 'Koʻchalar uzunroq', 'Koʻchalar tozaroq', 'Koʻchalar kengroq', 'Koʻchalar torroq', 2),
(86, 3, 'Переулки уже', 'Tor koʻchalar uzunroq', 'Tor koʻchalar kengroq', 'Tor koʻchalar tinchroq', 'Tor koʻchalar torroq', 3),
(86, 4, 'Метро глубже', 'Metro chuqurroq', 'Metro chiroyliroq', 'Metro tezroq', 'Metro arzonroq', 0),
(86, 5, 'Поезда новее', 'Poyezdlar tezroq', 'Poyezdlar yangiroq', 'Poyezdlar kattaroq', 'Poyezdlar kamroq', 1),
(86, 6, 'Погода теплее', 'Ob-havo sovuqroq', 'Ob-havo yomonroq', 'Ob-havo issiqroq', 'Ob-havo quruqroq', 2),
(86, 7, 'Люди добрее', 'Odamlar tezroq', 'Odamlar koʻproq', 'Odamlar jiddiyroq', 'Odamlar mehribonroq', 3),
(86, 8, 'Город шумнее', 'Shahar shovqinliroq', 'Shahar kattaroq', 'Shahar qadimiyroq', 'Shahar chiroyliroq', 0),
(86, 9, 'Здесь спокойнее', 'Bu yerda qiziqroq', 'Bu yerda tinchroq', 'Bu yerda issiqroq', 'Bu yerda arzonroq', 1);

-- ────────────────────── 86-kun: matn savollari ──────────────────────────
INSERT INTO daily_text_questions (day_number, sort_order, question_ru, option_a, option_b, option_c, option_d, correct_index) VALUES
(86, 0, 'Какой город старее?', 'Москва.', 'Ташкент.', 'Оба одинаковые.', 'В тексте не сказано.', 0),
(86, 1, 'Какой город зеленее?', 'Москва.', 'Ташкент.', 'Ни один.', 'Оба одинаковые.', 1),
(86, 2, 'Какие улицы в Москве?', 'Короче.', 'Уже.', 'Шире.', 'Тише.', 2),
(86, 3, 'Какое метро в Москве?', 'Новее и дешевле.', 'Меньше и тише.', 'Старее и уже.', 'Красивее и глубже.', 3),
(86, 4, 'Где поезда новее?', 'В Ташкенте.', 'В Москве.', 'В обоих городах.', 'В тексте не сказано.', 0),
(86, 5, 'Где погода теплее?', 'В Москве.', 'В Ташкенте.', 'Одинаково.', 'Зимой в Москве.', 1),
(86, 6, 'Какие жители Ташкента?', 'Более деловые.', 'Более быстрые.', 'Добрее и гостеприимнее.', 'Строже.', 2),
(86, 7, 'Какие москвичи?', 'Спокойнее.', 'Тише.', 'Добрее.', 'Более деловые и быстрые.', 3),
(86, 8, 'Какой город шумнее?', 'Москва.', 'Ташкент.', 'Оба тихие.', 'В тексте не сказано.', 0),
(86, 9, 'Почему трудно выбрать лучший город?', 'Потому что автор живёт в Москве.', 'Потому что у каждого есть свои плюсы и минусы.', 'Потому что города одинаковые.', 'Потому что автор не был в Ташкенте.', 1);

-- ────────────────────────── 86-kun: gapirish ────────────────────────────
INSERT INTO daily_speaking_tasks (day_number, sort_order, prompt_ru, prompt_uz) VALUES
(86, 0, 'Какой город больше: Москва или Ташкент?', 'Solishtiring: «Москва больше Ташкента».'),
(86, 1, 'Где погода теплее?', 'Ayting: «В Ташкенте теплее, чем в Москве».'),
(86, 2, 'Какое метро красивее?', 'Ayting: «Метро в Москве красивее и глубже».'),
(86, 3, 'Ваш город тише или шумнее Москвы?', 'Oʻz shahringizni solishtiring: тише / шумнее.'),
(86, 4, 'Что лучше: жить в большом городе или в маленьком?', 'Ayting: «лучше» yoki «хуже» soʻzini ishlating.'),
(86, 5, 'Какой город вам нравится больше и почему?', 'Ikki-uch gap ayting: qiyoslash shakllarini ishlating.');

-- ─────────────────────────── 97-kun: iboralar ───────────────────────────
INSERT INTO daily_phrase_mcqs (day_number, sort_order, phrase_ru, option_a, option_b, option_c, option_d, correct_index) VALUES
(97, 0, 'Я не читал эту книгу', 'Men bu kitobni umuman oʻqimaganman', 'Men kitobni oʻqib tugatmadim', 'Men kitobni oʻqiyapman', 'Men kitobni oʻqiyman', 0),
(97, 1, 'Я не прочитал книгу', 'Men kitobni umuman ochmadim', 'Men kitobni oʻqib tugatmadim', 'Men kitobni oʻqidim', 'Men kitobni yozmadim', 1),
(97, 2, 'Я не буду это делать', 'Men buni qilib boʻldim', 'Men buni qildim', 'Men bu ish bilan shugʻullanmayman', 'Men buni bir marta qilaman', 2),
(97, 3, 'Я не сделаю это', 'Men buni qilyapman', 'Men buni qilardim', 'Men buni qilaman', 'Men buni qilmayman (bajarmayman)', 3),
(97, 4, 'Нужно делать каждый день', 'Har kuni qilib turish kerak', 'Bir marta qilib qoʻyish kerak', 'Qilish shart emas', 'Hech qachon qilmaslik kerak', 0),
(97, 5, 'Нужно сделать сегодня', 'Bugun qilib turish kerak', 'Bugun qilib bitirish kerak', 'Bugun qilmaslik kerak', 'Ertaga qilish kerak', 1),
(97, 6, 'Здесь нельзя курить', 'Bu yerda chekish mumkin', 'Bu yerda chekish kerak', 'Bu yerda chekish mumkin emas', 'Bu yerda chekish bepul', 2),
(97, 7, 'Нельзя опоздать', 'Kechikish mumkin', 'Kechikish kerak', 'Kechikish yaxshi', 'Kechikish mumkin emas', 3),
(97, 8, 'Я не успел на поезд', 'Poyezdga ulgurmadim', 'Poyezdga chiqdim', 'Poyezdni kutdim', 'Poyezd kechikdi', 0),
(97, 9, 'Мне удалось прийти вовремя', 'Men kechikdim', 'Men oʻz vaqtida kelishga muvaffaq boʻldim', 'Men umuman kelmadim', 'Men kelmoqchi edim', 1);

-- ────────────────────── 97-kun: matn savollari ──────────────────────────
INSERT INTO daily_text_questions (day_number, sort_order, question_ru, option_a, option_b, option_c, option_d, correct_index) VALUES
(97, 0, 'На что автор опоздал вчера?', 'На поезд.', 'На работу.', 'На урок.', 'На самолёт.', 0),
(97, 1, 'Почему он не успел на вокзал?', 'Потому что было холодно.', 'Потому что долго собирался.', 'Потому что не было такси.', 'Потому что забыл билет.', 1),
(97, 2, 'Что случилось, когда он пришёл?', 'Поезд ещё стоял.', 'Поезд опоздал.', 'Поезд уже ушёл.', 'Поезд отменили.', 2),
(97, 3, 'Опаздывал ли он на поезд раньше?', 'Да, часто.', 'Да, один раз.', 'Иногда.', 'Нет, никогда.', 3),
(97, 4, 'Что он чувствовал?', 'Ему было очень обидно.', 'Ему было смешно.', 'Ему было всё равно.', 'Он был рад.', 0),
(97, 5, 'Что он решил?', 'Больше не ездить на поезде.', 'Больше не опаздывать.', 'Купить машину.', 'Вставать позже.', 1),
(97, 6, 'Во сколько он встал сегодня?', 'Позже на час.', 'В то же время.', 'На час раньше.', 'Он не вставал.', 2),
(97, 7, 'На какой поезд он успел сегодня?', 'На вечерний.', 'На ночной.', 'На дневной.', 'На утренний.', 3),
(97, 8, 'Какой вывод он сделал?', 'Не нужно откладывать дела на потом.', 'Нужно спать дольше.', 'Поезда всегда опаздывают.', 'Вокзал слишком далеко.', 0),
(97, 9, 'Что происходит теперь?', 'Он иногда опаздывает.', 'Он всегда успевает и никогда не опаздывает.', 'Он больше не ездит.', 'Он опоздал ещё раз.', 1);

-- ────────────────────────── 97-kun: gapirish ────────────────────────────
INSERT INTO daily_speaking_tasks (day_number, sort_order, prompt_ru, prompt_uz) VALUES
(97, 0, 'Вы читали эту книгу?', 'Inkor bilan javob bering: «Нет, я не читал».'),
(97, 1, 'Вы прочитали книгу до конца?', 'Ayting: «Нет, я не прочитал» — tugatmaganingizni bildiring.'),
(97, 2, 'Что нужно делать каждый день?', 'Ayting: «Нужно делать…» — НСВ shaklini ishlating.'),
(97, 3, 'Что нужно сделать сегодня?', 'Ayting: «Нужно сделать…» — СВ shaklini ishlating.'),
(97, 4, 'Вы успели на поезд?', 'Ayting: «Я не успел» yoki «Я успел».'),
(97, 5, 'Что нельзя делать на уроке?', 'Ayting: «Нельзя…» bilan ikki misol keltiring.');

COMMIT;
