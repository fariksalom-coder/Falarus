# Savol-javob va gapirish audio tuzatishi

2026-09-08. Koddagi aniqlangan sabablar: gapirish yozuvining 15 soniyalik limiti, reset/unmount va kechikkan mikrofon ruxsati o‘rtasidagi resurs poygasi, asosiy UI oqimida PCM qayta ishlanishi, bo‘laklar orasida resampling holatining yo‘qolishi va eski audio tugashi hodisasining yangi navbatga ta’siri.

- Gapirish, qo‘shimcha gapirish va doska javoblari uchun 60 soniya. Boshqa recorder iste’molchilarida oldingi 15 soniya saqlanadi.
- Har yozuv o‘z oqimi, bo‘laklari va taymerlariga egalik qiladi. Yakuniy `dataavailable` kutiladi; bekor qilingan yozuv natijasi qaytmaydi. Meter 10 Hz, uning xatosi ovoz yozuvini to‘xtatmaydi.
- Mikrofon aks-sado va shovqin bostirishni so‘raydi. Jonli PCM AudioWorklet’da 100 ms paketlarga aylanadi; eski brauzerlar uchun fallback saqlanadi. Namuna ulushi bo‘laklar orasida saqlanadi.
- Ijro 300 ms zaxira bilan boshlanadi; uzilishdan keyin zaxira 600 ms gacha ko‘tariladi. Toq bayt keyingi bo‘lakka saqlanadi. Eski tugash hodisasi yangi ovozni to‘xtatmaydi.
- Unmount, kvota va ulanish xatosida resurslar yopiladi. Oddiy suhbat yakuni kelgan ovoz ijrosini kutadi. Texnik uzilish dars tugadi deb belgilanmaydi; yozib-yuborish rejimiga o‘tiladi. Sekin WebSocket’da paketlar cheksiz yig‘ilmaydi.

## Tekshiruv

TypeScript va production build. `tests/pcmResampler.test.ts` 16/24/44.1/48 kHz uchun davomiylik, bo‘lak chegarasi va amplitudani tekshiradi; mavjud audio format testi ham o‘tdi.

[15 brauzer tekshiruvi](audio-fix-check.json): ikki marta start, 15 soniyadan uzoq haqiqiy MediaRecorder yozuvi va dekodlangan uzunligi, yakuniy blob, stream yopilishi, reset poygasi, kechikkan mikrofon ruxsati, haqiqiy worklet va 350 ms UI band bo‘lganda PCM davomiyligi, toq PCM baytlar, ijro zaxirasi, eski callback, yakuniy ovoz tugashini kutish.

Sinovda sun’iy 440 Hz ovoz ishlatildi, foydalanuvchi hisobi yoki pulli AI sessiyasi ochilmadi. Haqiqiy telefon mikrofoni/karnayi, akustik shovqin va mobil tarmoq bilan tinglab tekshirish bajarilmagan.

Brauzer API asoslari: [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet), [MediaRecorder stop hodisasi](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/stop_event).

## Deploy

Server lint va build o‘tdi, yangi versiya faollashtirildi. Amaldagi kunlik dars moduli yangi workletga ulangan; worklet HTTP 200 va JavaScript MIME bilan keladi, PWA v35 va API health tekshiruvi o‘tdi. To‘qqizta joylangan fayl checksum bilan solishtirildi, farq yo‘q. Oldingi fayllar `/home/ubuntu/backups/audio-fix-before-20260908.tar.gz`, oldingi build `dist.rollback` da saqlandi.

## Savol-javobda ovozlarni ajratish

Foydalanuvchi 5-bo‘limda shovqinli signallar davom etayotganini bildirdi. Yangi himoya: savol-javob audio resursini egallaganda efir qo‘ng‘irog‘i/oynasi kechiktiriladi, boshqa effect signallari chalinmaydi, avval chalinayotgan effect konteksti yopiladi. Darsdan chiqilgach odatiy xabarlar qaytadi.

Jonli suhbatda ustozning kelgan ovozi ijro qilinayotganda mikrofon paketi 100 ms jim PCM bilan almashtiriladi. Ijro tugashidan keyin 400 ms akustik qoldiq uchun tanaffus bor. So‘ng foydalanuvchi javobi avtomatik uzatiladi. Bu ataylab navbatli suhbat: ustoz gapini ovoz bilan bo‘lish o‘rniga savol tugashini kutish kerak; interfeysda bu ko‘rsatiladi. Tarmoq/kvota va 60 soniyalik yozuv mantiqi saqlanadi.

`tests/conversationAudio.test.ts`: chalinayotgan ovoz va akustik qoldiq jim PCMga almashtirilishi, 3200 baytlik paket formati, keyin nutq tiklanishi, bir nechta audio egasi bilan to‘g‘ri cleanup, suhbatda effect AudioContext ochilmasligi tekshirildi. PCM va format testlari, TypeScript va local build o‘tdi.

Bu himoyalar akustik qayta kirish va ilova signallarini cheklaydi. Foydalanuvchi eshitgan shovqinning audio namunasi olinmagan, uning yagona manbasi tasdiqlangan deb hisoblanmaydi.

Ovozlarni ajratish serverga joylandi: server lint/build o‘tdi, amaldagi dars modulida navbatli suhbat matni va umumiy modulda jim PCM himoyasi bor. HTTP 200, PWA v36 va API health tekshiruvlari o‘tdi. Zaxira: `/home/ubuntu/backups/audio-isolation-before-20260908.tar.gz` va `dist.rollback`.
