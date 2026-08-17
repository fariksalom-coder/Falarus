# 17 — Qidiruv va katalog

## Repetitor katalogi
- Filtrlar: fan, sinf, narx oralig'i, reyting, tajriba, jins, dars vaqti, til (o'zbek/rus), online/offline
- Saralash: tavsiya etilgan, reyting, narx, tajriba
- Karta: foto, ism, fanlar, reyting, narx, "bugun bo'sh vaqti bor" belgisi
- Tavsiya algoritmi: o'quvchi sinfi + zaif fanlari + budjeti asosida

## Global qidiruv
- Bitta qidiruv maydoni: darslar, mavzular, repetitorlar, testlar, lug'at so'zlari
- Natijalar turlar bo'yicha guruhlanadi
- Fuzzy match (imlo xatosiga chidamli) — PostgreSQL `pg_trgm` yoki Meilisearch
- O'zbek lotin/kirill va rus tilida qidiruv ishlashi shart
- Oxirgi qidiruvlar, mashhur so'rovlar

## Texnik
- Debounce 300ms, server-side pagination
- Filtr holati URL da (ulashish mumkin)
- Bo'sh natija: quruq "Topilmadi" emas — o'xshash takliflar bilan
