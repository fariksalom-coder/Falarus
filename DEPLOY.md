# Деплой FalaRus.uz

## Как устроено

- **Фронтенд** (React + Vite) — деплой на **Vercel**.
- **Бэкенд** (Express) — деплой на Railway или Render; данные хранятся в **Supabase** (PostgreSQL).

---

## 0. Настройка Supabase (база данных)

1. Зайдите на [supabase.com](https://supabase.com), создайте аккаунт и **New Project**.
2. Укажите имя, пароль БД, регион. Дождитесь создания проекта.
3. В проекте: **SQL Editor** → **New query**. Скопируйте содержимое файла **`supabase/migrations/001_initial.sql`** и выполните запрос (Run). Так создадутся таблицы `users`, `lessons`, `exercises`, `vocabulary`, `user_progress`.
4. **Settings** → **API**: скопируйте:
   - **Project URL** → это `SUPABASE_URL`
   - **service_role** (ключ под "Project API keys") → это `SUPABASE_SERVICE_ROLE_KEY` (держите в секрете).
5. В локальном проекте создайте файл **`.env`** (по образцу `.env.example`):
   - `SUPABASE_URL=https://xxxx.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=eyJ...`
   - при желании задайте `JWT_SECRET` для продакшена.

При первом запуске бэкенда уроки и упражнения подтянутся в Supabase из кода (seed), если таблица `lessons` пуста.

---

## 1. Запуск сайта на Vercel (фронтенд)

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → репозиторий `fariksalom-coder/Falarus`.
2. **Build Command:** `npm run build`, **Output Directory:** `dist`.
3. В **Environment Variables** добавьте:
   - `VITE_API_URL` = `https://ВАШ-БЭКЕНД-URL` (без слэша в конце; после деплоя бэкенда).
4. **Deploy**.

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
| **Vercel** | Фронтенд (статика)          | —             |
| **Railway / Render** | Express-сервер (API) | **Supabase**  |

После настройки Supabase и деплоя бэкенда укажите URL бэкенда в `VITE_API_URL` на Vercel и задеплойте фронт заново.
