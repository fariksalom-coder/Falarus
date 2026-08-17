# Fanlar uchun umumiy qoidalar

> Har bir fan promptidan **oldin** shu faylni o'qi. Bu 9 tasiga ham tegishli.

## Har bir fan uchun yetkazma

1. **Mavzular daraxti** — 5-sinfdan 11-sinfgacha, O'zbekiston Xalq ta'limi vazirligi dasturiga mos
2. **Har mavzu uchun**:
   - Qisqa nazariy dars (matn + formulalar/misollar)
   - Video dars stsenariysi (5–12 daqiqa)
   - 3–5 ta interaktiv mashq
   - 10–20 savolli mavzu testi
   - Umumiy xatolar ro'yxati ("bu yerda o'quvchilar odatda nimada adashadi")
3. **DTM moduli** — o'sha fan DTM/Milliy sertifikat formatidagi savollar banki
4. **Fan uchun maxsus UI vositalari** (quyida har fanda alohida)
5. **Prerequisite grafigi** — qaysi mavzu qaysisidan keyin o'rganiladi

## Kontent sifati mezoni
- Til: **o'zbek tili** (til fanlaridan tashqari), 5-sinf uchun sodda, 11-sinf uchun akademik
- Har bir tushuncha **real hayotdan misol** bilan tushuntiriladi
- Quruq ta'rif emas — "nima uchun kerak" javobi bilan boshlanadi
- Har bir test savolida **tushuntirish majburiy**
- Kontent versiyalanadi, manba ko'rsatiladi

## Ma'lumot formati
Kontent `src/data/subjects/{slug}/` da JSON sifatida yoki Supabase'da saqlanadi.
Sxema `shared/schemas/content.ts` da Zod bilan belgilanadi:

```ts
Topic   { id, subjectId, grade, title, order, prerequisites[], objectives[] }
Lesson  { id, topicId, type, title, body, media[], duration, order }
Question{ id, topicId, type, body, media, options[], correct, explanation,
          difficulty, tags[], source }
```

## Nima qilinmaydi
- ❌ Boshqa darslik/saytdan matn ko'chirish (mualliflik huquqi)
- ❌ Tekshirilmagan fakt yoki formula
- ❌ Bir mavzuga 30 daqiqadan uzun video
- ❌ Kontentni faqat matn bilan berish — har mavzuda vizual bo'lsin
