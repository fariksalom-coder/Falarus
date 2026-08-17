# Qolgan kontentni generatsiya qilish

1000 ta darsning skeleti tayyor. Endi har bir dars uchun kontent va test yoziladi.
Buni **partiyalab** qiling — bir sessiyada bitta bo'lim (10–18 dars).

---

## Ish tartibi

1. `curriculum/grade-XX.json` dan bitta bo'limni (unit) tanlang
2. Quyidagi promptni Claude'ga bering, `{...}` larni to'ldiring
3. Chiqqan JSON ni `lessons/` va `questions/` ga saqlang
4. Tekshiruv ro'yxatidan o'tkazing
5. Keyingi bo'limga o'ting

---

## PROMPT — dars kontenti

```
Sen O'zbekistonda 20 yil ishlagan tajribali matematika o'qituvchisisan.
{SINF}-sinf o'quvchilari uchun dars kontenti yozasan.

Kontekst fayllari:
- schema/content.ts — LessonContent Zod sxemasi, javob shu sxemaga TO'LIQ mos bo'lishi shart
- lessons/m05-u06-namuna.json — sifat va uslub etaloni, shunga o'xshash yoz
- curriculum/grade-{SINF}.json — dars ro'yxati

Vazifa: "{BO'LIM NOMI}" bo'limidagi quyidagi darslar uchun to'liq kontent yoz:
{DARSLAR RO'YXATI — id va sarlavha}

Har bir dars uchun majburiy:
1. "why" — bitta jumla: bu dars nima uchun kerak, REAL HAYOTDAN misol bilan.
   Quruq "bu mavzuni bilish kerak" emas.
2. "blocks" — kamida:
   - 1 ta "intro" (hayotiy vaziyatdan boshlanadi)
   - 1–2 ta "theory" (sodda til, {SINF}-sinf darajasida)
   - kerak bo'lsa "formula" (LaTeX)
   - 2–3 ta "example" — har biri bosqichma-bosqich steps bilan
   - kamida 1 ta "mistake" — o'quvchilar aynan shu mavzuda qiladigan REAL xato va to'g'rilash
   - 3–4 ta "drill" — mustaqil mashq, javob va hint bilan
3. "summary" — aniq 3 ta xulosa

Til va uslub:
- O'zbek tili (lotin). {SINF}-sinf o'quvchisi tushunadigan darajada.
- Ismlar o'zbekcha: Alisher, Dilnoza, Bobur, Nodira
- Kontekst mahalliy: so'm, non, tandir, avtobus, Toshkent–Samarqand yo'li
- Formulalar LaTeX da, $ ... $ ichida
- Hech qanday emoji yo'q

Qat'iy taqiq:
- Boshqa darslikdan matn ko'chirish
- Tekshirilmagan formula yoki fakt
- "Bu oson" / "bu qiyin" turidagi baholovchi gaplar

Javob: faqat JSON massiv, boshqa matnsiz.
```

---

## PROMPT — test savollari

```
Sen matematika bo'yicha test tuzuvchi metodistsan.

Kontekst fayllari:
- schema/content.ts — Quiz va Question Zod sxemalari
- questions/m05-u06-namuna.json — sifat etaloni
- lessons/{FAYL}.json — savollar shu darslar kontentiga asoslanadi

Vazifa: quyidagi darslar uchun test tuz:
{DARSLAR RO'YXATI — id, sarlavha, q (savollar soni)}

Har bir test uchun:
- curriculum dagi "q" maydonida ko'rsatilgan miqdorda savol
- Qiyinlik taqsimoti: 40% oson (d=1-2), 40% o'rta (d=3), 20% qiyin (d=4-5)
- Savol turlari aralash bo'lsin: single, multi, input, match, order, fill_blank
  Faqat single ishlatish — sifatsiz test belgisi.
- Kamida 1 ta savol o'sha mavzudagi TIPIK XATOga qaratilgan bo'lsin
  (chalg'ituvchi variantlar real xatolardan olinsin, tasodifiy sonlar emas)
- Kamida 1 ta matnli masala

Har bir savolda MAJBURIY:
- "explanation" — nega bu javob to'g'ri VA nega boshqalari noto'g'ri.
  Faqat "chunki formula shunday" emas — mantiqni tushuntir.
- "tags" — mavzu teglari (zaif joylarni aniqlash uchun)
- "d" — qiyinlik 1–5

Texnik talablar:
- Formulalar LaTeX da, $ ... $ ichida
- input turida "correct" massiv: barcha qabul qilinadigan yozilishlar
  (masalan ["0.5", "0,5", "1/2"])
- Raqamli javobda kerak bo'lsa "tolerance" qo'y
- To'g'ri javob variantlar orasida tasodifiy joyda bo'lsin (hammasi A bo'lmasin)

Javob: faqat JSON massiv, boshqa matnsiz.
```

---

## Har partiyadan keyin tekshiruv

- [ ] JSON `schema/content.ts` sxemasiga mos (Zod bilan validatsiya qiling)
- [ ] Har bir `lessonId` `curriculum/` dagi mavjud id ga to'g'ri keladi
- [ ] Savollar soni curriculum dagi `q` ga teng
- [ ] Har bir savolda `explanation` bor va u mazmunli (10 belgidan uzun)
- [ ] Matematik javoblar **qo'lda tekshirilgan** — bu eng muhim qadam
- [ ] LaTeX to'g'ri render bo'ladi
- [ ] To'g'ri javoblar tasodifiy taqsimlangan
- [ ] Bir necha savolni real o'quvchida sinab ko'ring

**Ogohlantirish**: AI generatsiya qilgan matematik javoblarda xato bo'lishi mumkin.
Har bir partiyani chiqargandan keyin javoblarni albatta tekshiring —
ayniqsa hisob-kitob talab qiladigan savollarda. Bir o'qituvchi bir bo'limni
30–40 daqiqada tekshirib chiqadi.

---

## Tavsiya etilgan tartib

Hammasini birdan emas — talab bo'yicha:

1. 9-sinf (attestatsiya) → 11-sinf + DTM (eng ko'p to'lov qiladigan auditoriya)
2. 5–6 sinf (eng ko'p foydalanuvchi)
3. 7–8 sinf
4. 10-sinf

Bir bo'limni to'liq va sifatli tugatib, keyingisiga o'ting.
