# Interfeysning sekinlashishini tuzatish

## O‘zgarishlar

- MainLayout endi sahifa almashganda ikki katta sahifani parallel montaj qilmaydi, butun ekranni masshtablamaydi. Faqat faol sahifa mavjud.
- Katta fonlar `background-attachment: scroll` ishlatadi. Opaque sahifa ostida ayni fonni ikkinchi marta chizish olib tashlandi.
- Dekorativ SVG filtr va mobil navigatsiya/header blur yuklari kamaytirildi.
- Video hamda cheksiz dekorativ animatsiya standart holatda o‘chiq. Rasm va ranglar saqlanadi; foydalanuvchi tugma bilan animatsiyani yoqishi mumkin. Oldin qo‘lda yoqilgan tanlov saqlanadi.
- GameGate ichidagi StrictMode setup/cleanup paytida javob yo‘qolib, spinner qolib ketishi tuzatildi. Bitta o‘yin ochilishi uchun bitta so‘rov saqlanadi; kirish cheklovi o‘zgarmagan.

## O‘lchov

Mahalliy production build, Chrome, 390×950 ekran, CPU 4× sekinlashtirish. Har sahifada 3,5 soniyalik bir xil dasturiy skroll. Bu nazorat o‘lchovi, barcha jismoniy qurilmalardagi tezlik kafolati emas.

| Ko‘rsatkich | Oldin | Keyin |
| --- | ---: | ---: |
| Asosiy sahifa Paint yig‘indisi | 599 ms | 34 ms |
| Profil Paint yig‘indisi | 558 ms | 10 ms |
| Profil kadr oralig‘i p95 | 33,3 ms | 16,7 ms |
| Asosiy sahifa 34 ms dan sekin kadrlar | 1 | 0 |
| Profil 34 ms dan sekin kadrlar | 2 | 0 |

[Oldingi o‘lchov](performance-before.json) · [Keyingi o‘lchov](performance-after.json)

Server tekshiruvi paytida load average 0,06 / 0,19 / 0,17, foydalanish mumkin bo‘lgan RAM ~6,5 GB, swap ishlatilmagan, health javobi ~5 ms bo‘ldi. Bu health so‘rovi barcha autentifikatsiyalangan API so‘rovlari tezligini anglatmaydi.

## Tekshiruv

Mahalliy TypeScript va production build o‘tdi. Brauzerda StrictMode bilan o‘yin ochilishi, bir martalik kirish so‘rovi, kvota bloklashi, statik standart rejim, animatsiyani qo‘lda yoqish/to‘xtatish va navigatsiya paytida faqat bitta sahifa mavjudligi tekshirildi. Barcha oltita tekshiruv o‘tdi.

[Regressiya natijalari](performance-regressions.json). Test hisoblari va API javoblari namuna; haqiqiy foydalanuvchi kvotasi yoki ballari o‘zgartirilmagan.

Tuzatishdan keyin to‘rtta o‘yin, xarita va faol o‘ynash holatlari 375 hamda 1440 px da qayta tekshirildi: 16 holat o‘tdi. 390 px da tezlik o‘lchovi va navigatsiya regressiyalari bajarildi.

## Deploy

Tuzatishlar https://falarus.uz saytiga, 82.115.50.100 serveriga joylandi. Serverda TypeScript, 185 test (31 to‘plam) va atomik build muvaffaqiyatli. Yangi CSS hamda PWA v30 tashqi manzildan tekshirildi; API health sog‘lom.

Zaxira: `/home/ubuntu/backups/ui-performance-before-20260907.tar.gz`; oldingi build: `dist.rollback`. Oldindan mavjud katta JavaScript bo‘lagi haqidagi build ogohlantirishi saqlanadi.
