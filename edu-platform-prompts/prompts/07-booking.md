# 07 — Jadval va dars band qilish

## Flow
1. O'quvchi repetitor profilida "Band qilish" bosadi
2. Kalendar: keyingi 14 kun, bo'sh slotlar (repetitor availability minus mavjud booking)
3. Slot tanlash → davomiylik (30/60/90 min) → mavzu/maqsad izohi
4. Narx hisoblanadi → to'lov
5. Tasdiq: ikkala tomonga SMS + push + kalendar (.ics) fayl

## Texnik
- Slot generatsiyasi server tomonda (client'ga ishonilmaydi)
- **Race condition**: slot band qilish DB transaction + unique constraint bilan himoyalanadi
- Timezone: hamma narsa UTC da saqlanadi, ko'rsatishda foydalanuvchi zonasiga o'giriladi
- Eslatma jobs: 24 soat oldin, 1 soat oldin, 10 daqiqa oldin
- Bekor qilish: >24s bepul, 2–24s 50%, <2s to'liq ushlab qolinadi
- Ko'chirish (reschedule): bir marta bepul
- No-show logikasi: 15 daqiqa kutiladi, keyin avtomatik belgilanadi

## UX
- Bo'sh slot yo'q bo'lsa — "Boshqa vaqt taklif qilish" tugmasi
- Takroriy dars: "Har hafta shu vaqtda" checkbox
- Band qilish 3 tapdan ko'p bo'lmasin
