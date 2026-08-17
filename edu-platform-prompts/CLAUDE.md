# EduUz — Online Repetitor & Ta'lim Platformasi

> Bu fayl loyihaning **asosiy konteksti**. Har bir yangi sessiyada Claude shu faylni birinchi o'qiydi.
> Modul promptlari `prompts/` papkasida. Har birini alohida ishga tushiring.
> Platforma nomini o'zgartirsangiz — butun faylda `EduUz` ni almashtiring.

---

## 1. ROL VA MINDSET

Sen **senior full-stack developer** va **expert UI/UX designer** (top 1% Silicon Valley darajasi).

- Har bir ekran **polished, intentional va delightful** bo'lishi shart
- Sifat mezoni: **Stripe, Linear, Notion, Duolingo, Raycast**
- Mobile-first, lekin desktop-perfect
- Auditoriya: **O'zbekistondagi 10–18 yoshli o'quvchilar, ularning ota-onalari va repetitorlar**
- Ko'pchilik foydalanuvchi **sekin internet** va **arzon Android telefon**da ishlaydi — performance muhim

### Ish tartibi
1. **Avval o'qi** — hech qachon ko'r-ko'rona tahrirlash yo'q
2. **Rejalashtir** — nima va nega qilayotganingni tushuntir
3. **Bitta narsani qil** — fokuslangan o'zgarish
4. **Tekshir** — `npx tsc --noEmit` va `npm run lint`
5. **Xulosa** — qisqa izoh

---

## 2. MAHSULOT MODELI

Ikki tomonlama marketplace + kontent platformasi:

| Qism | Tavsif |
|---|---|
| **Jonli repetitorlik** | O'quvchi repetitor tanlaydi → jadvaldan slot band qiladi → to'laydi → video darsda o'qiydi |
| **Mustaqil kurslar** | Video darslar, interaktiv mashqlar, testlar — repetitorsiz |
| **Test/Imtihon** | DTM/Milliy sertifikat formatidagi mock testlar, avtomatik baholash |
| **AI yordamchi** | Savol-javob, uyga vazifa tekshirish, tushuntirish |
| **Ota-ona nazorati** | Farzand progressi, davomat, to'lovlar |

### Fanlar (9 ta)
Matematika · Fizika · Ona tili · Adabiyot · Tarix · Kimyo · Biologiya · Ingliz tili · Rus tili

Har bir fan: 5–11-sinf darajalari + DTM tayyorgarlik moduli.

---

## 3. TECH STACK

| Qatlam | Texnologiya |
|---|---|
| Frontend | React 19 + TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| Animatsiya | Framer Motion (`motion/react`) |
| Routing | React Router v7 |
| State | Zustand (global) + React Context (auth/access) + TanStack Query (server state) |
| Forms | React Hook Form + Zod |
| Backend | Express.js + TypeScript |
| DB | Supabase (PostgreSQL) + Row Level Security |
| Cache / Queue | Redis (BullMQ jobs uchun) |
| Auth | Supabase Auth (JWT) + telefon raqam (SMS OTP) |
| Video dars | LiveKit (yoki Agora) — WebRTC |
| Fayl saqlash | Supabase Storage (video, rasm, PDF) |
| To'lov | Payme + Click + Uzum Bank |
| Realtime | Supabase Realtime (chat, notification) |
| Email/SMS | Resend + Eskiz.uz |
| Deploy | Vercel (frontend) + Railway/Fly.io (backend) + Supabase |
| Monitoring | Sentry + PostHog |

### Qat'iy qoidalar
- `any` ishlatilmaydi (asoslanmagan holda)
- Yangi kutubxona qo'shishdan oldin mavjud stack bilan qilinishi mumkinligini tekshir
- Server state uchun `useEffect + fetch` emas — **TanStack Query**
- Barcha API javoblar Zod bilan validatsiya qilinadi

---

## 4. LOYIHA STRUKTURASI

```
src/
  app/                    # Router, providers, global layout
  pages/
    auth/                 # Login, register, OTP, parol tiklash
    student/              # O'quvchi paneli
    tutor/                # Repetitor paneli
    parent/               # Ota-ona paneli
    admin/                # Admin paneli
    public/               # Landing, fan sahifalari, repetitor katalogi
  components/
    ui/                   # Button, Input, Card, Modal, Sheet, Toast... (primitivlar)
    layout/               # AppShell, BottomNav, Sidebar, Header
    shared/               # EmptyState, ErrorState, Skeleton, Paywall
  features/
    lessons/              # Jonli dars: room, whiteboard, chat
    courses/              # Kurs pleyeri, progress
    quiz/                 # Test engine
    booking/              # Jadval, slot band qilish
    payments/             # To'lov flow
    ai-tutor/             # AI chat
    gamification/         # XP, streak, badge, leaderboard
  hooks/
  context/
  api/                    # Frontend API client (typed)
  data/                   # Statik kontent (fan katalogi, sinf tuzilmasi)
  utils/
  types/

server/
  routes/
  controllers/
  services/               # Biznes logika
  repositories/           # DB so'rovlar
  middleware/             # auth, rbac, rateLimit, errorHandler
  jobs/                   # BullMQ workerlar
  integrations/           # payme, click, livekit, eskiz

shared/                   # Frontend + backend umumiy tiplar, Zod sxemalar
supabase/
  migrations/
  seed/
```

**Feature-based bo'l** — bitta feature'ning komponent/hook/api'si bir papkada.

---

## 5. FOYDALANUVCHI ROLLARI (RBAC)

| Rol | Huquqlar |
|---|---|
| `student` | Kurs ko'rish, dars band qilish, test topshirish, AI chat |
| `tutor` | Profil, jadval, dars o'tkazish, uyga vazifa berish, o'quvchi progressi |
| `parent` | Farzand(lar) progressi, to'lov, repetitor bilan aloqa |
| `moderator` | Kontent tekshirish, repetitor arizasini ko'rib chiqish, shikoyatlar |
| `admin` | To'liq kirish, moliya, analytics, tizim sozlamalari |

Bir user bir nechta rolga ega bo'lishi mumkin (masalan tutor + parent). RBAC middleware'da tekshiriladi, RLS bilan DB darajasida dublikat himoya.

---

## 6. MA'LUMOTLAR MODELI (asosiy jadvallar)

```
users              id, phone, email, full_name, avatar_url, roles[], locale, created_at
students           user_id, grade, region, target_exam, parent_id
tutors             user_id, bio, subjects[], hourly_price, rating, is_verified,
                   experience_years, video_intro_url, status
parents            user_id
subjects           id, slug, name_uz, name_ru, icon, color, order
topics             id, subject_id, grade, title, order, parent_topic_id
lessons            id, topic_id, type(video|text|interactive), content, duration, order
courses            id, subject_id, grade, title, description, price, is_free, tutor_id
enrollments        student_id, course_id, progress_pct, started_at, completed_at
lesson_progress    student_id, lesson_id, status, watched_seconds, completed_at

availability       tutor_id, weekday, start_time, end_time, timezone
bookings           id, student_id, tutor_id, subject_id, starts_at, duration_min,
                   status(pending|confirmed|completed|cancelled|no_show), price, room_id
live_sessions      booking_id, room_id, started_at, ended_at, recording_url, notes

quizzes            id, subject_id, topic_id, grade, type(practice|mock_dtm|placement),
                   time_limit_sec, pass_score
questions          id, quiz_id, type(single|multi|input|match|order), body, media_url,
                   options jsonb, correct jsonb, explanation, difficulty(1-5), points
quiz_attempts      id, student_id, quiz_id, started_at, submitted_at, score, answers jsonb

assignments        id, tutor_id, student_id, title, description, due_at, attachments[]
submissions        assignment_id, student_id, content, files[], grade, feedback, graded_at

payments           id, user_id, amount, provider(payme|click|uzum), status,
                   entity_type(booking|course|subscription), entity_id, external_id
subscriptions      user_id, plan(free|standard|premium), started_at, expires_at, autorenew
tutor_payouts      tutor_id, period, gross, commission, net, status

xp_events          student_id, source, amount, created_at
streaks            student_id, current, longest, last_active_date
badges / user_badges
reviews            tutor_id, student_id, booking_id, rating, text, created_at
notifications      user_id, type, payload jsonb, read_at
```

Barcha jadvallarda `created_at`, `updated_at`. Soft delete kerak joyda `deleted_at`.

---

## 7. DESIGN SYSTEM

### Ranglar
```
Primary        #2563EB   (blue-600)
Primary Light  #3B82F6
Primary Dark   #1D4ED8
Success        #22A552
Warning        #F59E0B
Error          #EF4444
Background     #F8FAFC
Card           #FFFFFF
Border         #E2E8F0
Text           #0F172A
Text Muted     #64748B
```

### Fan ranglari (har fan o'z identiteti)
```
Matematika  #2563EB    Fizika      #7C3AED
Ona tili    #059669    Adabiyot    #DB2777
Tarix       #B45309    Kimyo       #0891B2
Biologiya   #16A34A    Ingliz tili #DC2626
Rus tili    #4F46E5
```

### Spacing
`xs 4 · sm 8 · md 16 · lg 24 · xl 32 · 2xl 48`

### Radius
Cards `24px` · Buttons `16px` · Small `8–12px`

### Shadows
```
Card    0 14px 34px rgba(148,163,184,0.12)
Active  0 18px 44px rgba(37,99,235,0.28)
```

### Tipografiya
- Font: Inter (lotin) + system fallback
- Scale: 12 / 14 / 16 / 18 / 20 / 24 / 32 / 40
- Sarlavhalar: `font-semibold` yoki `font-bold`, tracking-tight

### Komponent qoidalari
- Har bir interaktiv element: hover, focus-visible, active, disabled holatlari
- Tap feedback: `whileTap={{ scale: 0.97 }}`
- Entrance: fade + slide-up, spring physics, 200–300ms
- Touch target minimum **44×44px**
- 375px (iPhone SE) va 390px da tekshiriladi, horizontal scroll bo'lmasin
- Notch uchun safe-area inset

### Har bir ekranda majburiy
`loading` · `empty` · `error` · `success` holatlari. Bittasi ham tashlab ketilmaydi.

---

## 8. TIL VA KONTENT

- **Interfeys tili: O'zbek (lotin)** — asosiy. Rus tili va ingliz tili — ikkinchi darajali (i18n bilan)
- Barcha UI matn `src/locales/uz.json` da, hardcode qilinmaydi
- Xato xabarlari o'zbekcha va **inson tilida**: "Internet yo'q" emas, "Internetga ulanmadi. Qayta urinib ko'ring"
- Fan kontenti o'sha fan tilida (rus tili darsi — ruscha, ingliz tili — inglizcha)
- Sana/vaqt: Toshkent vaqti (UTC+5), o'zbekcha format
- Pul: so'm, `1 250 000 so'm` formatida

### UI leksikon (o'zbek)
```
Bosh sahifa · Darslar · Repetitorlar · Testlar · Lug'at · Statistika · Profil
Band qilish · Jadval · Uyga vazifa · Baho · To'lov · Sozlamalar
Davom ettirish · Boshlash · Tugatish · Bekor qilish · Saqlash
```

---

## 9. PERFORMANCE BUDJETI

- LCP < 2.5s (3G da)
- Asosiy bundle < 200KB gzip
- Har bir route lazy-loaded
- Rasm: WebP/AVIF, `loading="lazy"`, responsive srcset
- Video: HLS adaptiv bitrate
- Ro'yxatlar 50+ element bo'lsa — virtualizatsiya
- Offline: kurs materiallari service worker bilan keshlanadi

---

## 10. XAVFSIZLIK

- Barcha input server tomonda Zod bilan validatsiya
- Supabase RLS har bir jadvalda yoqilgan
- Rate limiting: auth 5/min, API 100/min
- To'lov callback'lari imzo bilan tekshiriladi
- Video dars room token'lari qisqa muddatli (TTL 10 min)
- Voyaga yetmaganlar: repetitor–o'quvchi shaxsiy chat log qilinadi, ota-ona ko'ra oladi
- Hech qanday secret client bundle'ga tushmaydi

---

## 11. QILMASLIK KERAK

- ❌ `any` (asossiz)
- ❌ Mavjud stack bilan hal bo'ladigan narsaga yangi kutubxona
- ❌ UI yaxshilash deb ishlayotgan funksiyani buzish
- ❌ Og'ir, sekin animatsiya
- ❌ Kod izohlarida emoji
- ❌ Mavjud faylni tahrirlash yetarli bo'lganda yangi fayl yaratish
- ❌ So'ralmasa git'ga push qilish
- ❌ Mock/fake data'ni production kodda qoldirish

---

## 12. MODUL PROMPTLARI

`prompts/` papkasidagi tartib:

```
00-setup.md                 Loyiha skeleti, tooling, design tokens
01-design-system.md         UI primitivlar kutubxonasi
02-auth.md                  Ro'yxat, kirish, OTP, rol tanlash, onboarding
03-student-panel.md         O'quvchi paneli
04-tutor-panel.md           Repetitor paneli
05-parent-panel.md          Ota-ona paneli
06-admin-panel.md           Admin paneli
07-booking.md               Jadval va dars band qilish
08-live-lesson.md           Video dars xonasi, doska, chat
09-course-engine.md         Kurs pleyeri va progress
10-quiz-engine.md           Test engine va DTM mock
11-assignments.md           Uyga vazifa va baholash
12-payments.md              To'lov, obuna, repetitor payout
13-ai-tutor.md              AI yordamchi
14-gamification.md          XP, streak, badge, leaderboard
15-notifications.md         Push, SMS, email, in-app
16-analytics.md             O'quvchi va biznes analitikasi
17-search-catalog.md        Repetitor/kurs qidiruv va filtr
18-landing.md               Public marketing sahifalar
19-i18n-a11y.md             Tarjima va accessibility
20-testing-deploy.md        Test, CI/CD, monitoring

subjects/                   9 ta fan uchun kontent promptlari
BUILD-PLAN.md               Faza bo'yicha ketma-ketlik
```
