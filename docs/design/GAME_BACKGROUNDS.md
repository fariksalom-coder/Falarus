# To‘rtta o‘yin uchun alohida fonlar

Tanlangan ko‘k-binafsha-moviy ranglar saqlanadi. Har bir o‘yin alohida SVG kompozitsiyasi va yorug‘lik tusiga ega:

- **So‘zni yig‘ing:** harf kataklari va yo‘nalish chiziqlari. Ichki o‘yin, xarita va yakun ekraniga qo‘llangan.
- **So‘z savati:** savat, so‘z kartalari va tushish yo‘nalishlari. O‘yin maydonida qorong‘i, past kontrastli ko‘rinish ishlatiladi.
- **So‘z zanjiri:** bog‘langan bo‘g‘inlar va davom etuvchi chiziqlar.
- **Fe’l ustasi:** harakat silueti, vaqt halqasi va zamon bosqichlari. Mavjud o‘yin videosi saqlangan.

Katalogdagi o‘yin kartalarida ham shu o‘yinlarning fon motivlari ko‘rinadi. Dekorativ qatlamlar bosish yoki sudrash hodisalarini tutmaydi. O‘yin qoidalari, ball hisoblash va kirish cheklovlari o‘zgartirilmagan.

## Tekshiruv

Mahalliy TypeScript va production build o‘tdi. Brauzer tekshiruvlari tayyor production buildda, haqiqiy hisoblar o‘rniga API namunalari bilan bajarildi. Bepul urinishlar yoki haqiqiy natijalar serverga yozilmadi.

375, 390 va 1440 px: to‘rtta o‘yin, harf xaritasi hamda savat, zanjir va fe’l o‘yinlarining faol holatlari tekshirildi; xato yoki gorizontal chiqish aniqlanmadi.

[Harf o‘yini](game-letters-375.png) · [Savat maydoni](game-basket-playing-375.png) · [Zanjir](game-chain-playing-375.png) · [Fe’l ustasi](game-verbs-playing-375.png)

[375 px natijalar](game-worlds-check-375.json) · [390 px natijalar](game-worlds-check-390.json)

[1440 px natijalar](game-worlds-check-1440.json). Jami 24 holat muvaffaqiyatli tekshirildi.

## Deploy

Yangilanish https://falarus.uz saytiga, 82.115.50.100 serveriga joylandi. Server TypeScript va atomik build tekshiruvlari o‘tdi. To‘rtta yangi SVG HTTP 200 bilan ochiladi; yangi CSS, PWA v29 va API health tekshirildi. Manba fayllari server bilan checksum bo‘yicha mos.

To‘rtta SVG jami 5.8 KB. Zaxira: `/home/ubuntu/backups/ui-game-worlds-before-20260907.tar.gz`; oldingi yig‘ma: `dist.rollback`. Mavjud katta JavaScript bo‘lagi haqidagi build ogohlantirishi saqlanadi.
