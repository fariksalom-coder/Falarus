# Деплой FalaRus.uz

## Как устроено

- **Фронтенд** (React + Vite) — деплой на **Vercel**.
- **Бэкенд** (Express) — деплой на Railway или Render; данные хранятся в **Supabase** (PostgreSQL).

---

## 0. Настройка Supabase (база данных)

1. Зайдите на [supabase.com](https://supabase.com), создайте аккаунт и **New Project**.
2. Укажите имя, пароль БД, регион. Дождитесь создания проекта.
3. В проекте: **SQL Editor** → **New query**. Скопируйте содержимое файла **`supabase/migrations/001_initial.sql`** и выполните запрос (Run). Далее применяйте миграции по порядку (в т.ч. `024_remove_legacy_progress_tables.sql`): прогресс уроков — в `lesson_task_results`, словарь — в `user_word_group_progress`.
4. **Settings** → **API**: скопируйте:
   - **Project URL** → это `SUPABASE_URL`
   - **service_role** (ключ под "Project API keys") → это `SUPABASE_SERVICE_ROLE_KEY` (держите в секрете).
5. В локальном проекте создайте файл **`.env`** (по образцу `.env.example`):
   - `SUPABASE_URL=https://xxxx.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=eyJ...`
   - при желании задайте `JWT_SECRET` для продакшена.

При первом запуске бэкенда уроки и упражнения подтянутся в Supabase из кода (seed), если таблица `lessons` пуста.

### Применение миграций через Supabase CLI

Для миграций после `001_initial.sql` (например `002_vocabulary_progress.sql`) можно использовать CLI:

1. Установите Supabase CLI (если ещё нет): `npm install -g supabase` или используйте `npx supabase`.
2. **Один раз** привяжите проект (нужны **Project ref** из URL дашборда и **пароль БД** из Settings → Database):
   ```bash
   npx supabase login
   npx supabase link --project-ref ВАШ_PROJECT_REF -p ВАШ_ПАРОЛЬ_БД
   ```
3. Применить миграции:
   ```bash
   npm run db:push
   ```
   или `npx supabase db push`.

Таблица `vocabulary_progress` больше не используется (см. `023_remove_vocabulary_progress.sql`); прогресс словаря — в `user_word_group_progress` и связанных таблицах.

---

## 1. Запуск сайта на Vercel (фронтенд + API)

В проекте есть папка **`api/`** — это Vercel Serverless Functions. На **Vercel Hobby** лимит **12 функций** на деплой: отдельные файлы под `vocabulary/`, `streak`, `admin/payments/...` убраны — всё это обрабатывает **`api/[...path].ts`** (в т.ч. весь **`/api/vocabulary/*`** через `routeVocabularyRequest`). Отдельно остаются только **`api/auth/[...path].ts`**, **`api/admin/[...path].ts`**, **`api/lessons/[...path].ts`**, **`api/user/[...path].ts`** — итого **5** функций, запас под лимит.

В **`vercel.json`**: редирект **`/api/activity/streak` → `/api/streak`**; в **`[...path].ts`** обрабатываются и **`/api/streak`**, и **`/api/activity/streak`**. SPA: **`/((?!api/).*) → /index.html`** (без исключения `/api/` POST уходит в `index.html` → **405**).

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → репозиторий `fariksalom-coder/Falarus`.
2. **Build Command:** `npm run build`, **Output Directory:** `dist`.
3. В **Environment Variables** добавьте (обязательно для API):
   - **`SUPABASE_URL`** — URL проекта Supabase (например `https://xxxx.supabase.co`).
   - **`SUPABASE_SERVICE_ROLE_KEY`** — секретный ключ **service_role** из Supabase (Settings → API → Project API keys).  
   **Имя переменной должно быть именно `SUPABASE_SERVICE_ROLE_KEY`** (не `SUPABASE_SERVICE_KEY` и не другое).  
   Без этих двух переменных API на Vercel будет падать с ошибкой (FUNCTION_INVOCATION_FAILED) или возвращать 500.
   При желании: `JWT_SECRET`, `CORS_ORIGIN`.
4. **`VITE_API_URL`** оставьте **пустым** — фронт ходит на тот же домен (`/api/...`).
5. **Deploy**.

После первого деплоя один раз откройте в браузере (чтобы заполнить уроки в БД):  
**`https://ВАШ-ПРОЕКТ.vercel.app/api/seed`**

---

## 1b. Вариант: фронт на Vercel, бэкенд отдельно (Railway/Render)

Если хотите оставить API на Express (Railway/Render), задайте в Vercel переменную **`VITE_API_URL`** = URL вашего бэкенда. Тогда запросы пойдут на бэкенд, а не на serverless-функции Vercel.

---

## 2. Запуск бэкенда (API)

Бэкенд подключается к Supabase по переменным `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY`.

### Вариант A: Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → `Falarus`.
2. **Start Command:** `npm start` (или `npx tsx server.ts`).
3. В **Variables** добавьте:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - при желании `JWT_SECRET`, `CORS_ORIGIN` (URL фронта на Vercel).
4. Скопируйте URL сервиса и укажите его в `VITE_API_URL` на Vercel, затем сделайте **Redeploy** фронта.

### Вариант B: Render

1. [render.com](https://render.com) → **New** → **Web Service** → репозиторий `Falarus`.
2. **Start Command:** `npm start`.
3. В **Environment** добавьте `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, при необходимости `JWT_SECRET` и `CORS_ORIGIN`.
4. URL сервиса укажите в `VITE_API_URL` на Vercel и пересоберите фронт.

---

## Кратко

| Где        | Что деплоится              | База данных   |
|-----------|----------------------------|---------------|
| **Vercel** | Фронт + API (папка `api/`) | **Supabase**  |
| **Railway / Render** (по желанию) | Express (server.ts) | **Supabase**  |

Рекомендуемый вариант: один проект на **Vercel** с переменными `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY`. После деплоя откройте `/api/seed` один раз для заполнения уроков.

## Production verification

После настройки env и миграций используйте готовые проверки:

```bash
npm run check:env
npm run db:verify
npm run verify
npm run test:smoke
```

Подробный порядок: [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md)
