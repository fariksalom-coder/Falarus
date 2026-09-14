# UI ranglarining birlashtirilishi

Oldingi versiya ranglari sust va profil/kabinetlar orasida nomuvofiq ekani haqidagi fikr asosida yangilandi.

- `src/styles/platform-theme.css` barcha rollar uchun yakuniy rang manbasi: to‘yingan ko‘k #2457D6, bir xil #123689 → #2457D6 → #3979EF gradient, ko‘kimtir fon, oq karta va oltin urg‘u.
- Profilning alohida qora-ko‘k/krem, ВНЖ yashil, grammatika binafsha va o‘qish yalpiz rang tokenlari umumiy palitraga bog‘landi. To‘g‘ri/noto‘g‘ri javob status ranglari saqlandi.
- O‘quvchi, ustoz va admin navigatsiyasi bir gradient; umumiy sarlavha bloklari bir xil; o‘yin tugmalari ko‘k, kartalari ko‘k chiziqli.
- Kurslar, profil, kunlik xarita va patent hero bloklari ham shu gradientdan foydalanadi.
- Yorug‘ va tungi rejimda asosiy brend rangi bir xil qoladi, fon va matn moslashadi.
- Mobil/desktop 14 sahifa holati: overflow, error boundary va Runtime xatosi yo‘q. Admin menyusi/parol tugmasi tekshirildi. Natija: `unified-color-check.json`.
- Yangi CSS tokenlari deklaratsiyalar bilan tekshirildi. TypeScript va build muvaffaqiyatli. PWA v25.
- Zaxira: `/home/ubuntu/backups/ui-color-before-20260907.tar.gz`; build `dist.rollback` saqlangan holda almashtiriladi.

Bu rang va taqdimot qatlamining yangilanishi; API, darslar, to‘lov va ruxsat mantiqi o‘zgartirilmadi.

Deploy yakunlandi. Ommaviy HTML/CSS 200, API health ok, CSS ichida yagona platforma mavzusi mavjud, service worker v25. Manba fayllarini checksum bilan solishtirishda farq topilmadi. Tungi rejimdagi qo‘shimcha 4 ekran tekshiruvida ham overflow/crash/Runtime xatosi kuzatilmadi.
