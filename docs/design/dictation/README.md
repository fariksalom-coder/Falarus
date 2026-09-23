# Проверка «Диктанта»

Визуальная основа — существующие GamesPage, MainLayout и административная оболочка FalaRus. Новых UI-библиотек нет. Фон — отдельный CSS-компонент GameBackground; анимация отключается при prefers-reduced-motion. Нет загрузки фонового видео или полного набора MP3 в браузер.

Проверены:
- темы на 390×844 и 1440×1000;
- игровой экран, правильный и неправильный ответы, результат на 390×844;
- уменьшенная высота 390×480 для сценария открытой клавиатуры: поле и кнопка проверки остаются доступны;
- клавиша Enter, автофокус, реальное проигрывание MP3 и повтор после ошибки;
- два правильных ответа → combo ×2; три ошибки → 0 жизней и итоговый экран;
- 5 уникальных заданий → 5/50 (10%), «Повторить ошибки» → 3 задания;
- создание темы/слова, difficulty=5, загрузка MP3, прослушивание и инвалидирование аудио при изменении RU текста;
- статистика ошибок, отказ 401 без токена пользователя и администратора;
- горизонтального переполнения и Runtime.exceptionThrown в завершённых сценариях нет.

Снимки: topics-mobile.png, topics-desktop.png, game-mobile.png, correct-mobile.png, wrong-mobile.png, result-mobile.png, keyboard-height.png, admin-desktop.png, admin-mobile.png.

Это эмуляция размеров в Chrome; проверка физических устройств iOS/Android не проводилась. Локальный QA использует настоящие MP3 темы «Банк», отдельный in-memory PostgreSQL и синтетическую авторизацию. Production-профили и результаты пользователей в ходе этого теста не менялись.

Production API verification completed; evidence: `production-check.json`. All 1000 MP3 paths exist, 20×50 content split verified, authenticated gameplay and review passed using a disposable profile. Its database records were removed after the test. Public routes return 200; unauthorized game/admin API requests return 401.
