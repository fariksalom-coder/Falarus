# Build reja — faza bo'yicha

> Hammasini birdan qurmang. Har faza oxirida ishlaydigan mahsulot bo'lsin.

---

## Faza 0 — Poydevor (1–2 hafta)
`00-setup.md` → `01-design-system.md` → `19-i18n-a11y.md`

**Natija**: bo'sh, lekin professional ko'rinadigan app shell + to'liq UI kutubxona + DB sxema.

---

## Faza 1 — MVP: bitta fan, mustaqil o'rganish (3–4 hafta)
`02-auth.md` → `03-student-panel.md` → `09-course-engine.md` → `10-quiz-engine.md`
+ `subjects/01-matematika.md` (faqat 9-sinf, 5 ta mavzu)

**Natija**: o'quvchi ro'yxatdan o'tadi, matematikadan dars ko'radi, test ishlaydi.
**Maqsad**: 20 ta real o'quvchida sinash. Fikr olish.

---

## Faza 2 — Repetitor tomoni (3–4 hafta)
`04-tutor-panel.md` → `07-booking.md` → `08-live-lesson.md` → `12-payments.md`

**Natija**: marketplace ishlaydi — o'quvchi repetitor topadi, to'laydi, jonli dars o'tadi.
**Maqsad**: 10 ta repetitor, 50 ta dars. Bu eng katta texnik risk — erta sinang.

---

## Faza 3 — To'liq ekotizim (4–6 hafta)
`05-parent-panel.md` → `06-admin-panel.md` → `11-assignments.md` → `15-notifications.md` → `17-search-catalog.md`

**Natija**: ota-ona nazorati, moderatsiya, uyga vazifa, bildirishnomalar.

---

## Faza 4 — Kontent kengaytirish (davomiy)
`subjects/` — qolgan 8 fan, sinf bo'yicha bosqichma-bosqich

**Tartib tavsiyasi** (talab bo'yicha):
1. Matematika (to'liq 5–11)
2. Ingliz tili
3. Fizika
4. Ona tili
5. Kimyo
6. Biologiya
7. Rus tili
8. Tarix
9. Adabiyot

**Muhim**: bitta fanni to'liq va sifatli qilish — 9 tasini yarim qilishdan yaxshi.

---

## Faza 5 — O'sish (3–4 hafta)
`13-ai-tutor.md` → `14-gamification.md` → `16-analytics.md` → `18-landing.md`

**Natija**: retention va konversiya vositalari, SEO trafik.

---

## Faza 6 — Barqarorlik (davomiy)
`20-testing-deploy.md`

Aslida bu **Faza 0 dan boshlab** parallel ketadi — alohida faza sifatida qoldirilmasin.

---

## Har fazada tekshirish ro'yxati

- [ ] `pnpm typecheck` va `pnpm lint` toza
- [ ] 375px va 1440px da tekshirildi, horizontal scroll yo'q
- [ ] Har ekranda loading / empty / error holatlari bor
- [ ] Sekin internetda (3G throttle) ishlaydi
- [ ] Klaviatura bilan navigatsiya ishlaydi
- [ ] Yangi matn `locales/uz.json` da, hardcode yo'q
- [ ] E2E test yozildi
- [ ] Real foydalanuvchida sinaldi
