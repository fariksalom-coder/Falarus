# FalaRus.uz — To'liq texnik tahlil

**Sana:** 2026-07-19
**Ko'lam:** ~77 000 satr TypeScript (`src/` 50 870, `server/` 18 100, `shared/`, `scripts/`, `db/migrations/` 142 ta SQL)

---

## Umumiy xulosa

Loyiha funksional jihatdan boy va katta: 62 marshrut, ~155 API endpoint, 4 ta to'lov integratsiyasi, admin panel, o'qituvchilar bozori, referal tizimi, geymifikatsiya. Arxitektura poydevori to'g'ri qo'yilgan (routes/services/repositories, lazy-loading, design token tizimi, i18n).

Muammo shundaki, **boshlangan refaktoringlar tugatilmagan**: `server.ts` hali ham 2 825 satr, Supabase'dan Postgres'ga ko'chish nomlarni tozalamagan, Zustand o'rnatilgan lekin ishlatilmagan, token tizimi yozilgan lekin 24% qo'llangan. Ustiga, **2 ta kritik xavfsizlik teshigi** bor va **testlar ishlamaydi**.

| Soha | Baho | Izoh |
|---|---|---|
| Xavfsizlik | **2/10** | 2 ta kritik, 6 ta yuqori darajali zaiflik |
| Backend arxitektura | 4/10 | Qatlamlash mavjud, lekin 46 handler `server.ts` ichida |
| Frontend arxitektura | 6/10 | Lazy-loading a'lo, lekin store yo'q, UI primitivlari yo'q |
| Kod sifati | 3/10 | `strict` o'chirilgan, server'da 304 ta `any` |
| Testlar | 1/10 | ~1% qamrov, 4 ta test fayl umuman ishlamaydi |
| Hujjatlar | 1/10 | Har bir deploy hujjati mavjud bo'lmagan infratuzilmani tasvirlaydi |
| Dizayn tizimi | 4/10 | Tokenlar zo'r, 982 ta hardcoded rang ularni buzadi |

---

## 1. KRITIK — darhol tuzatish kerak

### 1.1 Har qanday foydalanuvchi to'liq admin bo'la oladi

`server/middleware/adminAuth.ts:4,33`

```ts
const adminJwtSecretEnv = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;  // :4
const adminId = decoded.adminId ?? decoded.id;                                      // :33
```

Oddiy foydalanuvchi tokeni `jwt.sign({ id: user.id }, JWT_SECRET)` ko'rinishida imzolanadi (`server.ts:539, 606, 686, 773, 806, 858`). `ADMIN_JWT_SECRET` o'rnatilmagan bo'lsa (u `.env.example` va `scripts/check-env.mjs` da **yo'q**), middleware aynan o'sha sekret bilan tekshiradi va `decoded.id` ni admin ID sifatida qabul qiladi.

**Natija:** ro'yxatdan o'tgan istalgan odam o'z tokenini `/api/admin/*` ga yuborib — barcha foydalanuvchilar ro'yxati, to'lovlarni tasdiqlash/qaytarish, pul yechishni ma'qullash, narxlarni o'zgartirish huquqini oladi. DB'da `admins` jadvalida borligi umuman tekshirilmaydi.

**Tuzatish:**
```ts
// 1. fallback'ni olib tashlang
const secret = process.env.ADMIN_JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('ADMIN_JWT_SECRET required');
// 2. admin tokenlariga aniq claim qo'shing: jwt.sign({ adminId, role: 'admin' }, ...)
// 3. faqat decoded.role === 'admin' && decoded.adminId bo'lsa o'tkazing
// 4. admins jadvalidan mavjudligini tekshiring (LRU cache bilan)
```

### 1.2 Google Play xaridlari tekshirilmaydi — bepul premium

`server/services/storePurchasePayment.service.ts:231-241, 286`

```ts
const isApple = isAppleSource(verificationSource);
const appleVerification = isApple ? await verifyAppleReceipt(...) : null;
if (appleVerification && !appleVerification.ok) { /* rad etish */ }
// ...
status: 'approved',        // :286 — hech qanday tekshiruvsiz
```

Faqat Apple cheki serverda tekshiriladi. Klient `verification_source: "google_play"` va ixtiyoriy `purchase_id` yuborsa — `appleVerification` `null` bo'ladi, tekshiruv o'tkazib yuboriladi, yozuv darhol `approved` bo'lib kiritiladi va `activateApprovedPayment` (`:316`) obunani beradi. Repo'da `androidpublisher` yoki Play Developer API kodi umuman yo'q.

**Tuzatish:** Google Play Developer API orqali `purchaseToken` ni tekshiring; verifikatori yo'q har qanday `verification_source` ni rad eting (allowlist, denylist emas).

---

## 2. YUQORI darajali xavfsizlik

| # | Muammo | Joy | Tuzatish |
|---|---|---|---|
| 2.1 | Admin login'da rate limit yo'q — brute force | `server/routes/adminRoutes.ts:61` | `authRateLimiter` qo'shing (user login'da bor: `server.ts:634`) |
| 2.2 | `X-Forwarded-For` spoofing rate limit'ni chetlab o'tadi | `server/lib/rateLimit.ts:125-131` | `req.ip` ishlating (`trust proxy` allaqachon yoqilgan) |
| 2.3 | Parol tiklash — token yo'q, parol darhol almashtiriladi | `server/services/passwordReset.service.ts:48-55` | Bir martalik, muddatli token yuboring; parolni faqat token ishlatilganda o'zgartiring |
| 2.4 | To'lov endpointlarida rate limit yo'q | `paymentRoutes.ts:83, 231, 272, 496` | Har biriga `pay:<nom>:${userId}` bucket |
| 2.5 | `/api/help/*` barcha limitlardan ozod (4MB upload ham) | `server.ts:327-329` | Alohida yuqori shiftli limiter |
| 2.6 | JWT `localStorage` da + CSP faqat prod'da | `AuthContext.tsx:140`, `server.ts:282,357` | `HttpOnly; Secure; SameSite` cookie + CSRF; CSP hamma muhitda |

**O'rta:** wildcard CORS default (`server.ts:339`) · 7 kunlik token, refresh/revoke yo'q (`server.ts:111`) · bcrypt cost 10 (6 joyda) · MD5 imzo `===` bilan solishtiriladi, `timingSafeEqual` emas (`shared/clickPayments.ts:212`, `shared/multicardPayments.ts:134`) · to'lov cheklari **public** bucket'da taxmin qilinadigan yo'l bilan (`paymentRoutes.ts:399-404`) · upload validatsiyasi faqat klient MIME'ga ishonadi.

**Yaxshi ishlangan (tekshirildi, muammo yo'q):** Click/Multicard webhook imzolari tekshiriladi, summa server tomonda solishtiriladi, replay himoyasi bor, narxlar hech qachon klientdan olinmaydi, IDOR yo'q (hamma joyda `req.userId`), `dangerouslySetInnerHTML` yo'q, klient kodida sekret yo'q, social auth `aud`/`iss`/`email_verified` ni to'g'ri tekshiradi.

---

## 3. Backend arxitektura

### 3.1 `server.ts` — 2 825 satr

`server/routes/`, `controllers/`, `services/`, `repositories/` papkalari mavjud, lekin **46 ta endpoint hali ham `startServer()` funksiyasi ichida**. Hech narsa eksport qilinmaydi → unit-test yozib bo'lmaydi.

- `server.ts:1634-1922` — `GET /api/leaderboard` bitta handler'da **289 satr**, 4 ta davr shoxobchasi + legacy fallback'lar. `leaderboard.service.ts` mavjud, lekin bitta joyda ishlatiladi.
- `server.ts:2246` va `2472` — `/api/partner` va `/api/speaking` `app.use` catch-all sifatida, `req.url` qo'lda parse qilinadi. Express routing butunlay chetlab o'tiladi.
- **`server.ts:2253-2466` — 214 satr o'lik kod.** `:2251` da `return` bor, undan keyingi hamma narsa hech qachon bajarilmaydi. Bu `partner.service.ts` ning eskirgan nusxasi va **unda IDOR bor** (`:2450` — `chat_messages` egalik tekshiruvisiz). Xavfli: kimdir partner chatni "tuzatmoqchi" bo'lsa, noto'g'ri nusxani tahrirlaydi.

### 3.2 Ma'lumotlar qatlami — 3 ta abstraksiya, biri o'lik

- `server/lib/db.ts:56` — Kysely instance **hech qayerda import qilinmaydi**. `db-types.ts` (391 satr generated) + `kysely` + `kysely-codegen` — to'liq o'lik yuk.
- `server/lib/postgresFacade.ts` (790 satr) — haqiqiy qatlam. Bu qo'lda yozilgan **PostgREST emulyatori**: Supabase'dan ko'chishda 1 049 ta `supabase.from().select().eq()` chaqiruvini qayta yozmaslik uchun.
- `createDatabaseClient.ts` va `dbFacadeClient.ts` — deyarli bir xil dublikat.

**Nomlash muammosi:** `dbFacadeClient.ts:25` `supabase` deb nomlangan Proxy'ni eksport qiladi. **65 faylda 1 049 ta "supabase"** (server.ts'da 187, adminController'da 121). Har bir so'rov go'yo Supabase'ga ketayotgandek o'qiladi. Yangi dasturchi birinchi satrdanoq adashadi.

**SQL injection:** qiymatlar to'g'ri parametrlangan, lekin 3 ta xom interpolyatsiya yo'li bor — `postgresFacade.ts:163` (`.is()` operatori), `:478-481` (LIMIT/OFFSET), `:743` (rpc argument nomlari). Bugun hamma chaqiruvchi konstanta uzatadi, ya'ni hozircha ekspluatatsiya qilib bo'lmaydi — lekin hech narsa buni majburlamaydi.

### 3.3 Ishlash muammolari (N+1)

- **`leaderboard.service.ts:145-156`** — eng yomoni. `recalculateRanks` **barcha** qatorlarni oladi (limit yo'q) va **har bir foydalanuvchi uchun alohida `UPDATE`** ni ketma-ket kutadi. Har 5 daqiqada, har bir replikada. 100k foydalanuvchida = 100k round-trip. Kerak: bitta `UPDATE ... FROM (SELECT RANK() OVER ...)`. Kod izohida (`:133`) aynan shu yozilgan, lekin amalga oshirilmagan.
- `adminRoutes.ts:69-89` — `recompute-xp` barcha foydalanuvchilarni sinxron HTTP so'rovda aylanadi.
- `adminController.ts:68` — har bir broadcast preview'da butun `user_kunlik_day_progress` jadvalini xotiraga tortadi.
- `server.ts:1651` — `/api/leaderboard?period=all` bitta javobda **2 000 ta to'liq user qatori** qaytaradi.
- `vocabularyRepository.ts:13-21` — klassik N+1, holbuki `:29` da batch versiyasi yonma-yon turibdi.

**Concurrency bug:** `kunlikProgressRoutes.ts:105-137` — SELECT → JS'da merge → upsert, tranzaksiyasiz. Ikki parallel PATCH bir-birini yo'q qiladi.

### 3.4 Infratuzilma ishonchsizligi

- `redis.ts:21` — `client.on('error', () => {})`. **Barcha Redis xatolari abadiy o'chiriladi.**
- `rateLimit.ts:82-85` — Redis xatosida per-process Map'ga tushadi → N replikada limit jimgina N×180/min bo'ladi (va 1-band tufayli hech kim bilmaydi).
- `cronScheduler.ts:42-47` — lock olinmasa `true` (baribir ishga tushir) qaytaradi. `runClickAutoRenewalCron` **haqiqiy kartalardan pul yechadi**. Redis beqaror bo'lsa, har bir replika to'lovni bir vaqtda bajaradi.
- `leaderboardCron.service.ts:22` — `setInterval`, lock'siz.
- **Express error middleware umuman yo'q.** `adminRoutes.ts` dagi ~48 handler `.catch(next)` qiladi → hammasi Express'ning standart handler'iga tushadi: loglanmaydi, `NODE_ENV !== 'production'` da stack trace chiqadi.
- `server.ts:2819-2825` — `uncaughtException` `console.error` bilan yutiladi, `process.exit` yo'q. Jarayon buzilgan holatda ishlashda davom etadi.

### 3.5 Eng katta server fayllar

| Satr | Fayl |
|---|---|
| 2 825 | `server.ts` |
| 1 920 | `server/controllers/adminController.ts` |
| 947 | `server/services/clickCardToken.service.ts` |
| 873 | `server/routes/teacherRoutes.ts` |
| 812 | `server/routes/paymentRoutes.ts` |
| 790 | `server/lib/postgresFacade.ts` |

---

## 4. Frontend arxitektura

### 4.1 Yaxshi ishlangan

`src/routeModules.tsx` — `import.meta.glob` + `lazy()` cache + hover prefetch (`ROUTE_PRELOAD_MAP:67-97`). 47 ta sahifadan deyarli hammasi lazy. Bu professional daraja.

### 4.2 Error boundary umuman yo'q

`src/` bo'ylab `componentDidCatch`/`ErrorBoundary` — **0 ta natija**. `main.tsx:20` da service worker ro'yxatdan o'tadi. Deploy'dan keyin eskirgan SW eski chunk hash'ini so'rasa → **oq ekran**, tiklanish yo'q. Bu frontend'dagi eng jiddiy topilma.

### 4.3 Zustand — o'lik dependency

`package.json:70` da `zustand@^5.0.12` bor. `src/` bo'ylab `zustand` yoki `create(` — **0 ta natija**. CLAUDE.md:76 ("State: Zustand + React Context") noto'g'ri.

O'rniga 9 ta context `App.tsx:145-168` da 8 qavat ichma-ich. **`AuthContext.tsx:182` va `AccessContext.tsx:99` da provider qiymati `useMemo` qilinmagan** → har render'da yangi obyekt → `useAuth()` ni ishlatadigan har bir sahifa qayta render bo'ladi.

### 4.4 So'rovlar bo'roni

`utils/requestCache.ts` (TTL + in-flight dedupe) to'g'ri yozilgan, lekin **24 ta API modulidan atigi 3 tasi** ishlatadi. Qolgan 21 tasi xom `fetch` — jami 91 ta `fetch(` chaqiruvi.

Eng yomoni — `useKunlikProgress` (`hooks/useKunlikProgress.ts`, 130 satr) har chaqiruvda mustaqil `useState` + `useEffect`:

- **`DailyKunSectionPage.tsx` — bitta sahifa yuklanishida 5 ta bir xil GET** (gate `:45` + `:139, 579, 648, 734`)
- `DailyVocabTestPage`, `DailyVocabPairsPage`, `DailyGrammarMatchPage`, `DailyGrammarRuleMcqPage`, `DailyGrammarSentenceArrangePage`, `DailyVocabTanishishPage` — har birida 2 ta
- Har safar **182 kunlik butun progress jadvali** tortiladi

Ustiga `api/kunlikProgress.ts:64` — server massiv qaytarsa, keyin `fetchDailyPracticePromptCounts` ni **ketma-ket** kutadi (`Promise.all` emas).

**Jim xatolar:** `fetchKunlikProgress:53-82` har qanday xatoda `{rows: []}` qaytaradi → foydalanuvchi xato o'rniga "0 progress" ko'radi, yangi akkauntdan farqlanmaydi. `patchKunlikDayProgress:96` fire-and-forget → **progress yozuvlari jimgina yo'qolishi mumkin**. `AccessContext.tsx:69` — `/api/access` yiqilsa `defaultAccess` ga tushadi → **pul to'lagan foydalanuvchi paywall ko'radi**.

### 4.5 UI primitivlari yo'q

`src/components/ui/` mavjud emas. Yo'q: `Button`, `Card`, `Input`, `Modal`, `Badge`, `Spinner`, `EmptyState`.

- **80 faylda 266 ta xom `<button>` tegi**
- 6 ta mustaqil modal implementatsiyasi (`PaywallModal`, `KunlikFreeLimitModal`, `LanguagePickerModal`, `CurrencyModal`, `AchievementUnlockModal`, `PWAInstallPrompt`) — umumiy backdrop/escape logikasi yo'q
- 4 xil spinner dizayni + `src/pages/` da 36 ta inline `animate-spin`
- `clsx` va `tailwind-merge` ikkalasi ham o'rnatilgan, lekin `cn()` helper yo'q — narxini to'lab, foydasini olmaydi

Istisno: `components/auth/` (13 ta komponent) — `AuthTextField`, `AuthButton`, `AuthPageScaffold` va h.k. Bu aynan qolgan ilova nusxa olishi kerak bo'lgan namuna.

### 4.6 Dizayn tizimi — 24% qo'llangan

`src/index.css` (678 satr) juda yaxshi token tizimini beradi: `--app-*` + `--pmn-*`, to'liq `.dark` bloki (`:95+`).

| Ko'rsatkich | Soni |
|---|---|
| `bg-app-*` / `text-app-*` / `border-app-*` token ishlatilishi | **315** (44 faylda) |
| `.tsx` da hardcoded `#RRGGBB` | **982** (84 faylda) |
| `rounded-[Npx]` ixtiyoriy qiymatlar | **326** |
| `shadow-[...]` ixtiyoriy qiymatlar | **236** |

**982 ta hardcoded rangning har biri — dark mode bug.** Ilova `.dark` mavzuni jo'natadi, lekin bu sahifalar unga javob bermaydi. Eng yomonlari: `LandingPage.tsx` (88), `PatentCourseVariantPage.tsx` (78), `VnzhCourseTaskPage.tsx` (44), `DailyKunSectionPage.tsx` (39).

**CLAUDE.md dizayn bo'limi noto'g'ri.** Hujjatda `Primary: #2563EB`, aslida `--app-primary: #0B2A6B` (to'q ko'k). `#2563EB` butun `src/` da atigi **1 marta** uchraydi. `Background: #F8FAFC` deyilgan, aslida `#FFFFFF`. Shadow qiymatlari ham mos emas. **Bu hujjatga qarab kod yozgan har kim noto'g'ri rang jo'natadi** — jumladan AI assistentlar.

Radiuslar shkalada emas: 28px, 24px, 22px, 20px, 16px, 15px va `rounded-[13px]` (`DailyVocabPairsPage.tsx:218`). 13px — bu dizayn qarori emas.

### 4.7 Holatlar qamrovi

60 sahifadan **38 tasida** loading/error state, **22 tasida** spinner markup bor.

Fetch qiladi lekin hech qanday loading ko'rsatkichi yo'q: `HomePage.tsx` (629 satr), `StatistikaPage.tsx` (738), `CoursesPage`, `GamesPage`, `WordSwipeMapPage`, `PaymentHistoryPage`, `HelpPage`, `VnzhCoursePage`, `PatentCoursePage`, `AdminUsersPage`, `AdminPaymentsPage`, `AdminClickLogsPage`, `AdminReferralsPage`.

**Empty state tushunchasi deyarli yo'q.** `EmptyState` komponenti yo'q; bo'sh ro'yxatlar yalang'och `<div>`. Battari — `DailyVocabTestPage.tsx:64-66` 0 qator natijani `setError()` deb belgilaydi, ya'ni "hali kontent yo'q" ni xato sifatida ko'rsatadi.

### 4.8 Dublikat kod — so'zma-so'z

`DailyVocabTestPage.tsx:1-50` va `DailyVocabPairsPage.tsx:1-55` — import nomidan tashqari **bayt-bayt bir xil**. `load` callback'i 3 faylda aynan bir xil. `window.addEventListener('daily-vocab-progress', ...)` bloki kamida 5 faylda takrorlanadi — bu store yo'qligi tufayli qo'lda qurilgan global event bus.

Kerakli ekstraksiya aniq va yozilmagan: `useDailyCourseDay(dayNumber)` → `{entries, loading, error}` 6 fayldan ~40 satrdan o'chiradi **va** so'rov bo'ronini bir vaqtda hal qiladi.

### 4.9 Eng katta frontend fayllar

| Satr | Fayl |
|---|---|
| 6 809 | `src/data/patentExamData.ts` |
| 3 532 | `src/data/vocabularyContent.ts` |
| 1 632 | `src/pages/LandingPage.tsx` |
| 1 155 | `src/pages/VnzhCourseTaskPage.tsx` |
| 869 | `src/pages/DailyKunSectionPage.tsx` (ichida 6 ta komponent, 3 tasi alohida `useKunlikProgress()` chaqiradi) |
| 855 | `src/pages/PatentCourseVariantPage.tsx` |
| 786 | `src/pages/TeacherCabinetPage.tsx` |
| 738 | `src/pages/StatistikaPage.tsx` |

**Bundle riski:** `patentExamData.ts` (6 809 satr) `PatentCoursePage.tsx:4` va `PatentCourseVariantPage.tsx:16` tomonidan statik import qilinadi → Rollup uni umumiy chunk'ga ko'taradi. Bu API ortida turishi kerak bo'lgan statik kontent (`api/patentResults.ts` allaqachon bor). Shuningdek `intl-tel-input` + `libphonenumber-js` login/register sahifasida — birinchi bo'yoq yo'lida.

---

## 5. Kod sifati

### 5.1 `strict` yoqilmagan

`tsconfig.json` (26 satr) da **`strict` yo'q, `noImplicitAny` yo'q, `strictNullChecks` yo'q**. `skipLibCheck: true`.

CLAUDE.md:60 aytadi: *"TypeScript strict — no `any` unless absolutely necessary"*. Bu shunchaki **noto'g'ri**. `npm run lint` = `tsc --noEmit` non-strict kompilyatorda ishlaydi. ESLint konfiguratsiyasi ham yo'q (garchi kodda `eslint-disable` izohlari bo'lsa ham).

### 5.2 `any` taqsimoti

| Joy | Soni |
|---|---|
| `src/**` | **5 satr / 4 fayl** — toza |
| `server/**` | **304 satr / 26 fayl** |
| ↳ `adminController.ts` | 114 |
| ↳ `teacherRoutes.ts` | 44 |
| ↳ `paymentRoutes.ts` | 27 |
| ↳ `types/dbClient.ts` | 26 — **DB tip kontrakti o'zi `any`**, ya'ni undan keyingi hamma narsa konstruktiv ravishda tipsiz |

Frontend haqiqatan toza. Pul va admin yo'li esa yo'q.

### 5.3 Testlar buzilgan

17 fayl, 817 satr — ~77 000 satrga nisbatan **~1%**.

**4 tasi umuman ishlamaydi:**
- `tests/kunlikDayAccess.test.ts`, `tests/kunlikProgressMerge.test.ts`, `tests/sentenceArrangeAnswer.test.ts` → `import { describe } from 'vitest'`, lekin **vitest `package.json` da yo'q** (runner: `node --import tsx --test`)
- `tests/vocabDailyStatsClamp.test.ts` → `../shared/vocabDailyStatsClamp.ts` importi, **bu fayl mavjud emas**

Ya'ni `npm run test` — va demak `npm run verify`, ya'ni `docs/PRODUCTION_CHECKLIST.md` dagi rasmiy production gate — **o'tmaydi**.

**Testsiz qolgan kritik yo'llar (hammasi):** barcha to'lov integratsiyalari (~2 900 satr: karta tokenlari, avto-yangilanish, fiskalizatsiya, Multicard), auth/JWT, parol tiklash, social auth, `postgresFacade.ts` (790 satr — har bir so'rov shu yerdan o'tadi), adminController (1 920), obuna berish, referal to'lovlari.

### 5.4 O'lik kod

- **~3 900 satr dars kontenti faqat CLI skriptdan yetib boradi.** `lessonOneTasks.ts`…`lessonTenTasks.ts` (3 742 satr) → `unifiedLessonVazifaRegistry.ts` → `scripts/verify_lesson_task_inventory.ts`. `App.tsx` da birorta dars sahifasi marshruti yo'q. `lessonSix`…`lessonTen` (2 449 satr) da umuman iste'molchi yo'q.
- **7 ta tashlab ketilgan Python skript** — patent import arxeologiyasi (`add_patent_variants_12_16.py` 435 satr, `extract_q16_images.py` — nomida bitta savol raqami kodlangan). Natija allaqachon `patentExamData.ts` da commit qilingan.
- **`scripts/generated/lesson_tasks_inventory.json` — 43 782 satr** commit qilingan generated artefakt. `.gitignore` ga kirishi kerak.
- `src/task1_asana_board_youtube.md` va `src/task2_calendar_youtube.md` — frontend source ichida loyiha boshqaruv qaydlari.
- `scripts/oneoff/rollback_fariksalom_full_progress.sql` — `.gitignore:26` uni "aniq foydalanuvchi email va ma'lumotlarini o'z ichiga oladi" deb istisno qiladi, lekin fayl diskda qolgan.

**Qatlam buzilishi:** `server/services/grammarCatalog.service.ts:3` va `lessonProgressSnapshot.service.ts:2` — `import { LESSONS } from '../../src/data/lessonsList.js'`. Backend frontend source'iga kirib boradi, `.ts` fayl uchun `.js` kengaytmasi bilan. `server.ts:1991` esa xuddi shu narsani `.ts` bilan qiladi.

### 5.5 Kontent ikki xil quvurda

`src/data/**` = **~16 900 satr**, ya'ni **frontend source'ning 33%i statik kontent**.

Ayni paytda `db/migrations/` da ~80 ta migratsiya sof kontent insert'lari (`062_kunlik_day_07_content.sql`, `105_kunlik_days_171_175_cases_review.sql`…).

Natija: "kunlik" kursi DB'da (SQL migratsiya yozib tahrirlanadi), patent/VNZh/lug'at esa TS'da. **Ikki bir-biriga mos kelmaydigan kontent quvuri, ikkalasida ham CMS yo'q.** Patent savolidagi bitta xatoni tuzatish — frontend rebuild + redeploy. Kunlik kunidagi xato — 132-migratsiya yozish.

`shared/i18n/catalog/` — 11 til, 3 505 satr. `uz.ts` 661 satr, ammo `tk/hi/ky/kk/tg` aynan **112 satrdan** — ya'ni ~17% qamrovli stub tarjimalar, lekin production'ga jo'natilgan.

### 5.6 Reproduktsiya qilinmaydigan build

- `.gitignore:34-35` — `public/courses/patent` va `public/courses/vnzh` ignore qilingan, izoh: *"worktree-local symlinks — paths are absolute to dev host"*. **Build bitta odamning mashinasidagi symlink'larga bog'liq.** Boshqa hech kim kurs sahifalarini qura olmaydi.
- **`mobile/` katalogi repo'da yo'q** (`.gitignore:1`). Lekin unga bog'liq: 4 ta npm skript (`mobile:build:aab` va h.k.), 2 ta batafsil hujjat, `scripts/export-i18n-to-mobile.mjs` (115 satr), backend'da `socialAuth.service.ts` (286 satr) native oqim uchun, `public/app-mobile/` ikonkalari. Flutter ilovasi bor (yoki bo'lgan), ataylab versiya nazoratidan tashqarida. **Muallif ketsa — mobil ilova yo'qoladi.**

---

## 6. Hujjatlar bilan nomuvofiqlik

| Da'vo | Joy | Haqiqat |
|---|---|---|
| "Database: Supabase" | `CLAUDE.md:78` | `pg` Pool + o'z-o'zi hostlangan Postgres |
| "Deploy: Vercel + Supabase" | `CLAUDE.md:80` | VPS (`scripts/vps-deploy.sh`). DEPLOY.md o'zi "Vercel не используется" deydi |
| "TypeScript strict" | `CLAUDE.md:60` | tsconfig'da `strict` yo'q |
| "State: Zustand" | `CLAUDE.md:76` | Zustand 0 marta ishlatilgan |
| "Primary: #2563EB" | `CLAUDE.md` | Haqiqiy: `#0B2A6B` |
| `src/features/` | `CLAUDE.md:86-102` | Bunday katalog yo'q |
| "Backend на Railway или Render" | `DEPLOY.md:5,29-46` | Ikkalasi ham emas — VPS. 17 satr sof fantastika |
| "supabase/migrations/001…118" | `DEPLOY.md:17` | Yo'l `db/migrations/`, oxirgisi `131_` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `DEPLOY.md:24-25`, `PRODUCTION_CHECKLIST.md:5-7`, `README.md:17` | Kerak: `DATABASE_URL` |
| "cron tashqarida sozlanmagan, grep qiling" | `DEPLOY.md:68` | `node-cron` dependency va `cronScheduler.ts` mavjud — hujjat o'z kodini bilmaydi |
| `mobile/lib/theme/`, `mobile/ios/Runner.xcworkspace` | `docs/mobile-social-auth-setup.md`, `docs/TZ_Profile_Settings_Mobile.md` | `mobile/` mavjud emas |
| README hali ham AI Studio shabloni | `README.md:1-9` | — |
| `"name": "react-example"` | `package.json:2` | — |

**To'rt xil platforma (Supabase, Vercel, Railway, Render) uchta hujjatda tasvirlangan; haqiqiy javob (VPS) hech qayerda yozilmagan.** DEPLOY.md bo'yicha ishlagan yangi muhandis Supabase loyihasi yaratadi va hech narsa olmaydi.

Buning sababi 3.2-bandda: **kod ham yolg'on gapiradi** (`supabase` deb nomlangan Postgres facade, 1 049 ta havola), shuning uchun hujjatlarning noto'g'riligini hech kim sezmagan.

---

## 7. Tavsiya etilgan yo'l xaritasi

### Hafta 1 — to'xtatib turib tuzatish

1. `adminAuth.ts` — `?? decoded.id` fallback'ini olib tashlash, alohida `ADMIN_JWT_SECRET` majburiy qilish, `role: 'admin'` claim (§1.1)
2. Google Play verifikatsiyasi yoki `google_play` manbasini vaqtincha to'liq bloklash (§1.2)
3. Admin login'ga `authRateLimiter`, to'lov endpointlariga per-user limit (§2.1, 2.4)
4. `rateLimit.ts` da `req.ip` ga o'tish (§2.2)
5. Parol tiklashni tokenli oqimga o'tkazish (§2.3)
6. `redis.ts:21` — xatolarni loglash; `cronScheduler.ts:42` — lock olinmasa **ishga tushirmaslik** (§3.4)
7. `server.ts:2253-2466` o'lik kodni o'chirish (IDOR nusxasi bilan birga)

### Hafta 2 — barqarorlik

8. Global Express error middleware + `src/` ga `ErrorBoundary` (§3.4, §4.2)
9. Buzilgan 4 ta testni tuzatish → `npm run verify` yashil bo'lsin
10. `leaderboard.service.ts:145` ni bitta `UPDATE ... RANK() OVER` ga (§3.3)
11. `AuthContext`/`AccessContext` provider qiymatlarini `useMemo` + metodlarni `useCallback`
12. `useKunlikProgress` ni `cachedRequest` ga o'rash yoki Zustand store'ga ko'chirish — 5 ta ortiqcha so'rov yo'qoladi (§4.4)

### Oy 1 — qarzni to'lash

13. `tsconfig` da `strict: true` yoqib, `server/types/dbClient.ts` dan boshlab bosqichma-bosqich tiplash
14. `server.ts` dagi 46 handler'ni `server/routes/` ga ko'chirish (namuna allaqachon 12 marta ishlatilgan)
15. `supabase` → `db` global rename (mexanik, lekin katta ta'sir)
16. `src/components/ui/` + `cn()` helper yaratish; `components/auth/` namunasini kengaytirish (§4.5)
17. `useDailyCourseDay` hook'ini ajratish → 6 fayldan dublikatni o'chirish (§4.8)
18. CLAUDE.md, DEPLOY.md, README.md, PRODUCTION_CHECKLIST.md ni haqiqatga moslashtirish — **avval buni**, chunki AI assistentlar shu hujjatlarga qarab kod yozadi
19. To'lov servislariga integratsiya testlari

### Kelajak

20. Kontent uchun yagona quvur (CMS yoki hech bo'lmaganda hammasini DB'ga) — §5.5
21. `patentExamData.ts` ni API ortiga chiqarish (bundle)
22. 982 ta hardcoded rangni tokenlarga ko'chirish (dark mode ishlashi uchun)
23. `mobile/` ni versiya nazoratiga kiritish yoki uning izlarini repo'dan tozalash
24. Symlink bog'liqligini yo'q qilib, build'ni reproduktsiya qilinadigan qilish
