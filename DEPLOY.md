# Деплой FalaRus.uz

## Архитектура

- **Бэкенд:** Express (`server.ts`) — Node.js процесс на Railway или Render.
- **Фронтенд:** статика из `dist/` (`npm run build`) — раздаётся тем же Express в одном процессе (или отдельным CDN, если задан `VITE_API_URL`).
- **БД:** Supabase (PostgreSQL).
- **Кэш (опционально, но рекомендуется для прода):** Redis (через `REDIS_URL`).

Vercel **не используется**. Папка `api/` и `vercel.json` удалены — единая точка входа для прод-трафика теперь `server.ts`.

---

## 0. Supabase

1. Зайдите на [supabase.com](https://supabase.com), создайте **New Project**.
2. SQL Editor → New query → выполните **`supabase/migrations/001_initial.sql`** и далее по порядку все миграции до самой свежей (`118_...` на момент написания). Удобнее — через CLI:
   ```bash
   npx supabase login
   npx supabase link --project-ref ВАШ_PROJECT_REF -p ВАШ_ПАРОЛЬ_БД
   npm run db:push
   ```
3. Settings → API скопируйте:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (только сервер, в браузер не отдавать)

---

## 1. Бэкенд (Express)

### Вариант A: Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. **Start Command:** `npm start`.
3. Переменные окружения (Variables):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET` (минимум 32 символа)
   - `REDIS_URL` (рекомендуется — без него rate-limit и кэш работают локально для каждой реплики, не выдержат горизонтальный скейл)
   - Опционально: `CORS_ORIGIN`, `CLICK_*`, `MULTICARD_*`, `OPENAI_API_KEY`.

### Вариант B: Render

1. [render.com](https://render.com) → **New** → **Web Service**.
2. **Start Command:** `npm start`.
3. Env variables — те же, что выше.

---

## 2. Фронтенд

Express уже раздаёт `dist/` после `npm run build`. Если хотите отдельный CDN (Cloudflare Pages / static hosting) — задайте `VITE_API_URL` на URL бэкенда перед сборкой:

```bash
VITE_API_URL=https://api.falarus.uz npm run build
```

---

## 3. Cron

Раньше cron-задачи (`click-auto-pay`, `click-fiscal-retry`) описывались в `vercel.json`. После переезда — варианты:

- **Railway Cron** — отдельный сервис с расписанием.
- **Supabase pg_cron** — если задача можно выразить как SQL.
- **Внутри Express** через `node-cron` (надо добавить, см. `server/services/clickCardToken.service.ts` — функции `runClickAutoRenewalCron` уже готовы для вызова).

Проверьте по `git log` / `grep run.*Cron server.ts`, что эти cron'ы запускаются — на момент чистки они импортируются, но триггер вне Vercel не настроен.

---

## 4. Production verification

```bash
npm run check:env
npm run db:verify
npm run verify        # tsc + tests + build
npm run test:smoke    # smoke-тесты HTTP API
```

Подробнее: [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md).
