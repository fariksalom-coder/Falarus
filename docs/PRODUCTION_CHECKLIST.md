# Production Checklist

## 1. Environment

1. Fill `.env` or Vercel env with:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `APP_TIMEZONE=Asia/Tashkent`
2. Run:
   ```bash
   npm run check:env
   ```

## 2. Database

1. Apply all migrations:
   ```bash
   npm run db:push
   ```
2. Verify critical tables and columns:
   ```bash
   npm run db:verify
   ```
3. If vocabulary tables are empty, seed them:
   ```bash
   npm run seed:vocabulary
   ```

## 3. Quality Gate

Run the local verification pipeline:

```bash
npm run verify
```

This runs:
- TypeScript check
- Unit tests
- Production build

## 4. Smoke Test

Provide either:
- `SMOKE_BEARER_TOKEN`

or:
- `SMOKE_BASE_URL`
- `SMOKE_EMAIL`
- `SMOKE_PASSWORD`

Then run:

```bash
npm run test:smoke
```

The smoke script checks:
- auth
- access
- lessons
- lesson preview
- vocabulary topics/subtopics/preview
- word groups/tasks/steps
- vocabulary progress
- daily word stats
