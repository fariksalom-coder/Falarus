# FalaRus — SEO audit & implementation report

## 1. Architecture discovered

| Area | Finding |
|------|---------|
| Framework | React 19 + Vite 6 SPA (CSR); no SSR/SSG |
| Routing | `react-router-dom` v7 — routes in `src/App.tsx` (guest vs authenticated branches) |
| Layout | `MainLayout` for authenticated main app; `LandingPage` for guests at `/` |
| Prior SEO | `index.html` injected via `vite.config.ts` (`seoInjectPlugin`): title, description, keywords file `seo-keywords.txt`, Organization + WebSite JSON-LD |
| Public assets | `public/robots.txt`, `public/sitemap.xml` |

**Implication:** Search engines that execute JavaScript receive per-route `<title>`, canonical, OG/Twitter, and extra JSON-LD from **`react-helmet-async`** (`GlobalSeo`). Crawlers without JS still see the built **`dist/index.html`** shell with global meta + Organization/WebSite schema.

---

## 2. What was implemented / improved

### Per-route SEO (SPA)

- **`src/seo/resolveRouteSeo.ts`** — Central mapping for priority URLs (landing vs home `/`, `/russian`, `/kurslar/patent`, `/kurslar/vnzh`, `/tariflar`, lessons, vocabulary, etc.) with target-oriented titles/descriptions (~50–65 / ~140–170 chars including brand suffix via `clipTitle` / `clipDescription`).
- **`src/seo/knownRoutes.ts`** — Regex/exact list aligned with `App.tsx` so unknown paths get **404-style SEO** (`noindex`) instead of indexing arbitrary URLs as generic landing.
- **`src/components/GlobalSeo.tsx`** — `Helmet`-based: `<title>`, `meta description`, `robots`, `canonical`, Open Graph (`og:*`), Twitter (`twitter:*`), optional verification meta (`VITE_GOOGLE_SITE_VERIFICATION`, `VITE_YANDEX_VERIFICATION`), default **`og:image`** / **`twitter:image`** (`/icons/icon-512.png`).
- **`src/pages/NotFoundPage.tsx`** — User-friendly 404 UI with internal links to patent/VNJ/tariffs (SEO navigation).

### Structured data (additional JSON-LD via Helmet)

For matching routes (when JS runs):

- **FAQPage** — Landing (`/` guest).
- **BreadcrumbList** — Several hubs (e.g. `/`, `/russian`, `/kurslar/...`).
- **Course** — `/kurslar/patent`, `/kurslar/vnzh`.
- **Product** — `/tariflar` (+ canonical merge for `/pricing`).

Organization + WebSite remain in **`index.html`** build injection (unchanged baseline).

### Analytics-ready

- **`src/components/AnalyticsScripts.tsx`** — Loads **GA4** when `VITE_GA_MEASUREMENT_ID` is set; **Yandex Metrika** when `VITE_YANDEX_METRIKA_ID` is set (loads `tag.js`, then `ym(init)`).

### Technical SEO

- **`public/robots.txt`** — `Disallow` for `/admin`, `/payment`, `/payment-history`, `/profile`.
- **`public/sitemap.xml`** — Added high-intent URLs (`/russian`, `/kurslar`, `/kurslar/patent`, `/kurslar/vnzh`, `/fossils`), `/auth` replaced by `/login`, duplicate **`/pricing`** entry removed (canonical is `/tariflar`).
- **`vercel.json`** — **301** redirects: `/pricing` → `/tariflar`, `/auth` → `/login`.
- **`index.html` + vite plugin** — Static **`og:image`** / **`twitter:image`** placeholders (`__OG_IMAGE_ESCAPED__`).

### Internal linking (minimal UI change)

- **`LandingPage.tsx`** — Compact nav strip with keyword-aligned links (register/login).
- **`CoursesPage.tsx`** — Footer-style nav linking `/russian`, `/kurslar/patent`, `/kurslar/vnzh`, `/tariflar`.
- **`CoursesPage.tsx`** — `loading="lazy"` + `decoding="async"` on course images.

### Env typings

- **`src/vite-env.d.ts`** — Optional `VITE_GA_MEASUREMENT_ID`, `VITE_YANDEX_METRIKA_ID`, `VITE_GOOGLE_SITE_VERIFICATION`, `VITE_YANDEX_VERIFICATION`.

---

## 3. Pages / route patterns optimized (canonical SEO definition)

Priority keyword URLs explicitly tuned:

- `/` (landing vs authenticated home — different titles via auth flag)
- `/login`, `/register`
- `/russian`, `/russian/grammar`, `/russian/speaking`
- `/kurslar`, `/kurslar/patent`, `/kurslar/patent/*`, `/kurslar/vnzh`, `/kurslar/vnzh/*`
- `/tariflar`, `/pricing` (canonical → `/tariflar`)
- `/vocabulary`, `/vocabulary/*`, `/lesson-*`, grammar task URLs under `/lesson-*`
- `/fossils`, `/fossils/checkout` (checkout `noindex`)
- `/payment`, `/payment-history`, `/profile*`, `/invite`, `/preview/*`, `/admin/*`, `/help*` — mostly **`noindex`** where appropriate

Dynamic vocabulary / lesson variants fall back to sensible generic titles.

---

## 4. Errors / risks addressed

| Issue | Mitigation |
|-------|------------|
| Duplicate `/pricing` vs `/tariflar` | 301 redirect + canonical + single sitemap URL |
| Arbitrary URLs indexed as normal pages | Unknown routes → `noindex` + 404 page |
| Missing OG image in static shell | Default OG/Twitter image in HTML + Helmet |
| GA/Yandex not wired | Env-driven loaders without breaking builds |

---

## 5. What to improve next (recommended)

1. **SSR or pre-render** critical landing/marketing URLs for bots that poorly execute JS (optional migration or Prerender.io-style service).
2. **HTTP 404 status** for unknown paths requires edge/server logic (currently SPA returns `index.html` with 200 — standard Vercel SPA limitation unless configured otherwise).
3. **Per-environment canonical host** (`www` vs apex) — confirm DNS preference and add redirect at registrar/Vercel.
4. **Lighthouse CI** on deploy — measure real **LCP / CLS / INP** (lazy images alone do not guarantee scores).
5. **Structured data**: extend `Course` with `hasCourseInstance`, pricing ties when stable prices exist in UI.

---

## 6. Estimated SEO score

Automated **“SEO score”** depends on Lighthouse/PageSpeed runs against production with real URLs and indexing state.

Expected improvements vs baseline SPA:

- Meta uniqueness & canonical hygiene: **strong improvement**.
- Crawl directives (`robots`, `noindex` on private flows): **strong improvement**.
- Performance bundle size unchanged materially — **performance score** requires Lighthouse measurement after deploy.

Run locally after deploy:

```bash
npx lighthouse https://www.falarus.uz --only-categories=seo,performance,best-practices --output html --output-path ./lighthouse-report.html
```

---

## 7. Changed files (inventory)

New:

- `src/seo/constants.ts`
- `src/seo/resolveRouteSeo.ts`
- `src/seo/knownRoutes.ts`
- `src/components/GlobalSeo.tsx`
- `src/components/AnalyticsScripts.tsx`
- `src/pages/NotFoundPage.tsx`
- `SEO_REPORT.md`

Modified:

- `package.json` / lockfile (`react-helmet-async`)
- `src/App.tsx`
- `src/pages/LandingPage.tsx`
- `src/pages/CoursesPage.tsx`
- `vite.config.ts`
- `index.html`
- `src/vite-env.d.ts`
- `public/robots.txt`
- `public/sitemap.xml`
- `vercel.json`

Dependencies unchanged besides **`react-helmet-async`**.
