# 00 — Loyiha skeleti va tooling

> Avval `CLAUDE.md` ni to'liq o'qi. Keyin quyidagini bajar.

## Vazifa
EduUz monorepo skeletini nol'dan qur.

## Bajariladigan ishlar

1. **Repo tuzilishi**
   - Vite + React 19 + TypeScript (strict) frontend
   - Express + TypeScript backend (`server/`)
   - `shared/` — frontend va backend ishlatadigan Zod sxemalar va tiplar
   - pnpm workspaces

2. **Tooling**
   - ESLint (typescript-eslint, react-hooks, jsx-a11y) + Prettier
   - Husky + lint-staged: commit oldidan `tsc --noEmit` va lint
   - Vitest + Testing Library (unit), Playwright (e2e)
   - `.env.example` barcha kerakli o'zgaruvchilar bilan (secret'siz)

3. **Tailwind v4 sozlash**
   - `CLAUDE.md` §7 dagi barcha ranglar, spacing, radius, shadow'ni CSS o'zgaruvchi sifatida `src/styles/tokens.css` ga yoz
   - 9 ta fan rangi `--subject-math` kabi token sifatida
   - Inter fontini o'zini-o'zi host qil (Google CDN'ga bog'lanmasin — O'zbekistonda sekin)

4. **App shell**
   - React Router v7, aniq route tree: `src/app/routes.tsx`
   - Barcha route lazy
   - `AppShell`: mobilda bottom nav, desktopda sidebar
   - Providers: QueryClient, AuthContext, ThemeProvider, Toaster
   - `ErrorBoundary` + global error sahifasi

5. **Supabase**
   - `supabase/migrations/0001_init.sql` — `CLAUDE.md` §6 dagi barcha jadvallar
   - Har bir jadvalga RLS policy
   - `supabase/seed/` — 9 ta fan, sinf tuzilmasi, demo user'lar

6. **API client**
   - `src/api/client.ts` — typed fetch wrapper, auth header, xato normalizatsiya
   - Har bir endpoint uchun Zod response sxema

## Tekshirish
- `pnpm typecheck` va `pnpm lint` toza
- `pnpm dev` ishga tushadi, bo'sh app shell 375px va 1440px da to'g'ri ko'rinadi
- `supabase db reset` migration'larni xatosiz qo'llaydi
