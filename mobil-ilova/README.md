# Мобильное приложение FalaRus (Google Play)

Исходники версии, которая сейчас опубликована в Play Market: **versionCode 146, versionName 13.10.26.5**, `com.falarus.mobile`.
Это нужно, чтобы видеть, какой код реально стоит у пользователей приложения, и решать, что можно сделать с сервера без новой версии, а что требует новой сборки.

## Что где лежит

| Папка | Что это |
|---|---|
| `android-v146/` | Нативный Android-проект Capacitor 7 (Gradle, `MainActivity`, плагины `NotificationSettingsPlugin`, `TelegramInvite`, манифест, иконки). |
| `v146-web/` | Веб-код (`src/`, `shared/`, `vite.config.ts`, `capacitor.config.ts`, `package.json`), из которого собрана версия 146. Именно он зашит внутрь приложения. |
| `play-market/` | Скрипт сборки `build-v146.ps1`, заметки к выпуску 146, ответ для проверки Google, картинки для страницы в магазине (`store-listing/`). |

## Чего здесь нет — и не должно быть

Репозиторий публичный. Сюда **не кладём**:
- `keystore.properties` и `.jks` (ключ подписи и пароли). Без них нельзя выпустить обновление, храните их отдельно и с резервной копией. Шаблон: `android-v146/keystore.properties.example`.
- готовые `.aab` / `.apk`, JDK (`.build-tools`), папки `build/`, `.gradle/`, `.idea/`, `local.properties`;
- `app/src/main/assets/public/` — это собранный веб (`dist`), его заново кладёт `npx cap sync android`.

## Что важно знать для анализа

- Веб-часть **зашита в приложение** (`webDir: 'dist'`, без `server.url`), автообновление `initAutoUpdate()` в нативном приложении выключено. Значит, любые изменения экранов (`src/`) попадают к пользователям Play Market только с новой версией.
- Без новой версии меняется только то, что приходит с сервера через API: содержание уроков и заданий, правильные ответы и их проверка на сервере (например, перевод вслух), тарифы и доступ, чат, рейтинг.
- В версии 146 **нет** нативных push-уведомлений (FCM): нет `@capacitor/push-notifications` и `src/native/pushNotifications.ts`. Уведомления в закрытое приложение заработают только после новой сборки с Firebase.
- Чтобы будущие исправления экранов доходили без магазина, в следующую сборку можно добавить загрузку веб-части по воздуху (например, Capgo). Это одно обновление через магазин, дальше — с сервера.
- Сравнить, что изменилось на сайте после сборки 146: `git diff --no-index mobil-ilova/v146-web/src src`.

## Как собрать новую версию

Сборка 146 делалась скриптом `play-market/build-v146.ps1` (Windows, Java 21, Gradle 8.11.1):
1. `vite build` — собрать веб в `dist/`;
2. `npx cap sync android` — скопировать `dist/` в `android/app/src/main/assets/public`;
3. в `android/` — `gradle assembleRelease bundleRelease`; подпись берётся из `keystore.properties`.

Перед новой сборкой поднимите `versionCode` и `versionName` в `android-v146/app/build.gradle`.
