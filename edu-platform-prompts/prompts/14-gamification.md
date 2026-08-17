# 14 — Gamifikatsiya

> Duolingo darajasidagi motivatsiya tizimi, lekin bolani manipulyatsiya qilmaydigan.

## Elementlar
- **XP**: dars tugatish, test o'tish, vazifa topshirish, jonli darsda qatnashish
- **Streak**: ketma-ket faol kunlar, alanga ikonkasi. "Streak muzlatish" (oyiga 2 marta)
- **Darajalar**: XP asosida, har darajada yangi avatar/tema ochiladi
- **Badge'lar**: "Birinchi 5 ta dars", "Matematika ustasi", "30 kun streak", "Mock imtihon 80+"
- **Leaderboard**: haftalik, sinf/maktab/viloyat bo'yicha, ixtiyoriy qatnashish
- **Kunlik maqsad**: o'quvchi o'zi tanlaydi (10/20/30 daqiqa)
- **Vazifalar (quests)**: haftalik 3 ta topshiriq, mukofot XP

## Qoidalar
- Streak yo'qolganda ayblovchi til ishlatilmaydi — qo'llab-quvvatlovchi
- Leaderboard'dan chiqish imkoni bo'lsin (bosim his qilmaslik uchun)
- Push bildirishnomalar kuniga 2 tadan oshmasin, 21:00 dan keyin yo'q
- Vaqt sarflashni emas, **o'zlashtirish**ni mukofotlash

## Animatsiya
- XP olish: raqam ko'tarilib, progress bar to'lishi (spring)
- Badge olish: konfetti + modal (bir marta, keyin arxivda)
- Streak: alanga pulsatsiyasi
- Barchasi `prefers-reduced-motion` ni hurmat qiladi
