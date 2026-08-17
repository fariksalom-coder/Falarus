# Matematika kontenti (5–11 sinf + DTM)

O'zbek tilidagi matematika dars kontenti uchun sxema, kurikulum va darslar.

## Struktura

```
math-content/
  schema/
    content.ts             Zod sxemasi — LessonContent, Curriculum
    questions.ts           Zod sxemasi — test va ochiq savollar
  curriculum/
    grade-5.json ... grade-11.json   Bo'limlar va darslar ro'yxati
    dtm.json                          DTM blok bo'yicha tayyorgarlik xaritasi
  lessons/
    m05-u06-namuna.json    Sifat va uslub etaloni
    m05-u06.json           Bo'limning qolgan darslari
  questions/
    grade-5.json           100 ta savol (50 test + 50 ochiq)
  scripts/validate.ts      Barcha JSON fayllarni sxemaga tekshiradi
```

## Identifikator tizimi

| Daraja | Format | Misol |
|---|---|---|
| Bo'lim | `m{sinf}-u{bolim}` | `m05-u06` |
| Dars | `m{sinf}-u{bolim}-l{dars}` | `m05-u06-l02` |
| DTM bloki | `dtm-b{NN}` | `dtm-b03` |
| DTM mavzusi | `dtm-b{NN}-t{NN}` | `dtm-b03-t02` |

## Har bir dars uchun majburiy tarkib

Sxema quyidagilarni majburlaydi:

- `why` — bitta jumla, real hayotdan misol bilan
- birinchi blok `intro` bo'lishi shart
- kamida 1 ta `theory` (ko'pi bilan 3 ta)
- kamida 2 ta `example`, har biri `steps` bilan
- kamida 1 ta `mistake` — real xato, sababi va to'g'rilash
- 3–6 ta `drill` — `answer`, `hint`, `level` (1/2/3) bilan
- `summary` — aniq 3 ta xulosa

Sxema shuningdek emoji, baholovchi gaplar (`oson`, `qiyin`) va lotin matni
ichiga tushib qolgan begona alifbo harflarini rad etadi — kirill `turса`
("tursa" o'rniga), turkcha `Suriş` ("Surish" o'rniga) kabi xatolar ko'z bilan
ilg'anmaydi, shuning uchun sxema darajasida to'xtatiladi.

## Savollar bankasi

`questions/grade-5.json` — 100 ta savol, har bo'limdan 10 tadan:

- **test** — 4 ta variant (A/B/C/D), to'g'ri javob va bosqichma-bosqich yechim
- **open** — ochiq javobli masala, javob va bosqichma-bosqich yechim

Har bir savolda `unitId` (qaysi bo'limga tegishli), `topic`, `level` (1–3) va
`dtm` belgisi bor. Variantlar takrorlanmasligi sxema darajasida tekshiriladi.

## Tekshirish

```bash
npx tsx math-content/scripts/validate.ts
```

Skript quyidagilarni tekshiradi: sxemaga moslik, dars id takrorlanmasligi,
har bir dars kurikulumda e'lon qilinganligi, `prerequisites` mavjudligi.
Oxirida qancha dars yozilgani va qancha qolgani ko'rsatiladi.

## Uslub qoidalari

- O'zbek tili (lotin), tegishli sinf darajasida
- Ismlar: Alisher, Dilnoza, Bobur, Nodira
- Kontekst: so'm, non, tandir, avtobus, Toshkent–Samarqand yo'li
- Formulalar LaTeX da, `$ ... $` ichida
- Emoji yo'q, baholovchi gaplar yo'q, boshqa darsliklardan ko'chirma yo'q

## Holat

5-sinf kurikulumi **B. Q. Xaydarov, "Matematika 5", 2020, 3-nashr** darsligining
bob va mavzu tartibiga moslashtirilgan. Darslikdan faqat mavzular tarkibi va
ketma-ketligi olingan, matn ko'chirilmagan — barcha kontent original.

| Sinf | Bo'lim | Dars (e'lon) | Dars (yozilgan) | Savol |
|---|---|---|---|---|
| 5 | 8 | 100 | 27 | 100 |
| 6 | 9 | 48 | 0 | 0 |
| 7 | 11 | 48 | 0 | 0 |
| 8 | 9 | 45 | 0 | 0 |
| 9 | 10 | 45 | 0 | 0 |
| 10 | 9 | 42 | 0 | 0 |
| 11 | 10 | 46 | 0 | 0 |

### 5-sinf darslari bo'limlar kesimida

| Bo'lim | Nomi | Manba | Dars | Yozilgan |
|---|---|---|---|---|
| m05-u01 | I bob. Natural sonlarni qo'shish va ayirish | 1-qism | 15 | 11 |
| m05-u02 | II bob. Ko'paytirish va bo'lish | 1-qism | 17 | 8 |
| m05-u03 | III bob. Matnli masalalarni yechish | 1-qism | 11 | 1 |
| m05-u04 | IV bob. Geometrik shakllar | 1-qism | 10 | 0 |
| m05-u05 | V bob. Ulushlar va oddiy kasrlar | 2-qism | 12 | 7 |
| m05-u06 | VI bob. O'nli kasrlar | 2-qism | 14 | 0 |
| m05-u07 | VII bob. O'rtacha qiymat va foiz | 2-qism | 12 | 0 |
| m05-u08 | VIII bob. Yakuniy takrorlash | 2-qism | 9 | 0 |

u01–u04 rasmiy darslikning 1-qismiga (36 mavzu) aniq mos keladi.
u05–u08 vaqtinchalik — 2-qism PDF si kelganda aniqlashtiriladi.

### Fayl va dars mosligi

Qayta tuzilishdan keyin fayl nomlari bo'limlarga bir-bir mos kelmaydi.
Validator faylni emas, `id` maydonini asos qiladi.

| Fayl | Ichidagi darslar |
|---|---|
| `lessons/m05-u01.json` | u01: l01–l04, l07–l09, l15 |
| `lessons/m05-u02.json` | u01: l10–l12; u02: l01–l05, l09, l11, l17; u03: l01 |
| `lessons/m05-u06.json` | u05: l01, l03–l07 |
| `lessons/m05-u06-namuna.json` | u05: l02 — uslub etaloni hamda shu darsning yagona nusxasi |

### Ochiq savollar

Quyidagi savollar 5-sinf dasturida hozircha mos bo'limga ega emas va
2-qism kelganda qayta joylashtiriladi:

- `q05-083`, `q05-089` — sanash qoidalari
- `q05-084`, `q05-090` — hodisa ehtimoli
- `q05-042`, `q05-046` — ar va gektar
- `q05-045`, `q05-048` — jism hajmi
