# Matematika kontent paketi — 1000 dars + 1000 test

5-sinfdan 11-sinfgacha + DTM moduli. Platformaga to'g'ridan-to'g'ri import qilish uchun JSON.

## Papka tuzilishi

```
schema/
  content.ts              Zod sxemalar (TypeScript) — barcha JSON shu sxemaga mos
curriculum/
  grade-05.json           110 dars
  grade-06.json           120 dars
  grade-07.json           140 dars
  grade-08.json           140 dars
  grade-09.json           150 dars
  grade-10.json           150 dars
  grade-11.json           130 dars
  dtm.json                 60 dars
                          ─────────────
                          1000 dars
lessons/
  m05-u06.json            To'liq yozilgan dars kontenti (namuna birlik)
questions/
  m05-u06.json            O'sha darslarning test savollari (namuna)
GENERATION.md             Qolgan kontentni partiyalab generatsiya qilish prompti
IMPORT.md                 Supabase'ga import qilish yo'riqnomasi
```

## Ikki qatlam

**1. Curriculum (o'quv reja)** — 1000 ta darsning to'liq skeleti:
id, sinf, bo'lim, sarlavha, qiyinlik, davomiylik, test savollari soni, prerequisite.
Bu qatlam **to'liq tayyor**.

**2. Content (kontent)** — har darsning nazariy matni, misollari, mashqlari va test savollari.
Bu qatlam partiyalab to'ldiriladi — `GENERATION.md` dagi prompt bilan.

Nega ikki qatlam: 1000 ta darsning to'liq matnini bir marta generatsiya qilib bo'lmaydi,
generatsiya qilinganda ham sifat past bo'ladi. Skelet — bu loyihaning eng qiyin qismi
(ketma-ketlik, prerequisite grafigi, qiyinlik taqsimoti) va u tayyor.
Kontentni esa partiyalab, tekshirib, sifatli to'ldirasiz.

## Test tizimi

Har bir darsga **1 ta test** biriktirilgan → jami **1000 ta test**.
Har testda `q` maydonida ko'rsatilgan miqdorda savol (o'rtacha 6, jami ~6000 savol banki).

Test o'tish bali: 70%. Har savolda tushuntirish majburiy.

## Import

`IMPORT.md` ga qarang. Qisqacha:
```bash
npx tsx scripts/import-content.ts --grade 5
```
