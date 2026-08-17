# 09 — Kurs pleyeri va progress

## Vazifa
Mustaqil o'rganish uchun kurs tuzilmasi va pleyer.

## Tuzilma
`Fan → Sinf → Mavzu → Dars → Qadam`

Dars turlari: `video` · `matn` · `interaktiv mashq` · `test` · `amaliyot`

## Pleyer
- Video: HLS, tezlik boshqaruvi (0.75x–2x), subtitr (o'zbek), bo'limlar (chapters)
- Yon panel: dars ichidagi qadamlar, belgilangan holat
- Konspekt: dars ostida qisqa matn xulosa + formulalar
- Eslatma yozish (o'quvchi o'z izohini vaqt belgisi bilan qo'yadi)
- Keyingi/oldingi dars navigatsiyasi
- Avtomatik davom: 90% ko'rilsa dars tugallandi

## Progress
- Har bir dars: `not_started | in_progress | completed`
- Mavzu progressi = tugallangan darslar %
- Fan progressi = mavzular o'rtachasi
- Progress har 10 sekundda saqlanadi (debounce), offline bo'lsa navbatga qo'yiladi

## Adaptiv logika
- Mavzu oxiridagi testda 70% dan past bo'lsa — takrorlash darslari tavsiya qilinadi
- Spaced repetition: 1, 3, 7, 21 kunlik intervallarda takroriy mashq
- Zaif mavzular "Kuchaytirish" bo'limiga chiqadi

## Offline
- Yuklab olish (video + material), service worker, progress keyin sinxronlanadi
