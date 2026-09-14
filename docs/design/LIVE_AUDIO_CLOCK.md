# Jonli savol-javob: asl AI audiosi bilan ijro tekshiruvi

2026-09-08. Jonli AI rejimi va panel ko‘rinishi saqlandi. O‘zgarishlar faqat PCM ijrosi, qurilma audio kontekstining ulashilishi va PWA versiyasiga tegishli.

## Tekshiruv va takrorlangan xato

Serverdagi ayni model/ovoz (`gemini-3.1-flash-live-preview`, `Leda`), ishlab turgan suhbat ko‘rsatmasi va funksiyasi bilan alohida sinov sessiyasi o‘tkazildi. AI savol berdi; “Меня зовут Азиз. Я из Ташкента.” degan sun’iy ovozli javob real vaqt paketlarida uzatildi, AI javobni tanib keyingi savolni berdi. Ilova foydalanuvchisi/progressi/kvota yozuvlari o‘zgartirilmadi.

Asl AI yozuvi: 15,960 soniya, 67 paket, `audio/pcm;rate=24000`, toq baytli paket yo‘q, amplituda kesilishi yo‘q (peak 0,852). Alohida multimodal audio tahlil asl yozuvda elektron shovqin aniqlamadi. Bu avtomatik audio tahlildir, jismoniy telefonda inson tinglovi emas.

Aynan shu yozuvning birinchi javobi Chrome OfflineAudioContext orqali ikki usulda ijro qilindi: amaldagi alohida AudioBuffer bo‘laklari va bitta uzluksiz AudioBuffer. Eski 48 kHz kontekstda bo‘lak chegaralarida qo‘shimcha sakrash takrorlandi: maksimal farq 0,184509, RMS farq 0,000333. Bu butun suhbatning 18% buzilgani degani emas: raqam bitta eng katta namuna farqidir; 0,01 dan katta farq 5 namunada kuzatildi.

## Tuzatish

- Chiquvchi PCM kabi 24 kHz AudioContext so‘raladi. Har bir tarmoq bo‘lagi alohida qayta namunalashdan o‘tmaydi; qurilma uzluksiz aralashgan chiqishni moslashtiradi.
- 24 kHz kontekst ochilmasa yoki boshqa chastota qaytsa, qayta namunalash bo‘laklar o‘rtasida oldingi namuna va fazani saqlaydi; buffer brauzer konteksti chastotasida yaratiladi.
- Jonli mikrofon va karnay bitta kontekst/soatdan foydalanadi. Mikrofon to‘xtashi umumiy kontekstni yopmaydi; sessiya yakunida ijro egasi yopadi.
- Hali navbatda ovoz bor paytda 15 ms chegarasi sabab sun’iy zaxira oralig‘i qo‘shilmaydi; zaxira haqiqiy bo‘shashdan keyin ishlaydi.

Tuzatilgan 24 kHz ijro bir xil asl PCM bilan qayta solishtirildi: maksimal farq 1,64e-13, RMS 6,10e-16, 0,01 dan katta farqli namuna 0. Demak ushbu sinovdagi qo‘shimcha bo‘lak chegarasi buzilishi yo‘qoldi.

## Dalillar va chegaralar

[Oldingi o‘lchov](live-pcm-before.json), [keyingi o‘lchov](live-pcm-after.json), [17 brauzer tekshiruvi](audio-clock-check.json).

`tests/pcmPlayback.test.ts`: 24/44,1/48 kHz, turlicha va bir namunali paketlar, asl namunalarning saqlanishi. Capture resampling, conversation audio va format testlari ham o‘tdi. TypeScript va production build o‘tdi.

17 brauzer tekshiruvi umumiy kontekst, capture to‘xtaganda playback saqlanishi, real MediaRecorder 15 soniyadan ortiq yozuvi, UI band bo‘lganda worklet paketlari, stale callback va oxirgi ovoz tugashini kutishni qamraydi.

Bu foydalanuvchining barcha jismoniy qurilmalaridagi shovqin manbasi to‘liq isbotlandi degani emas. Tekshiruvda ilovaning real PCM ijrosidagi takrorlanadigan xato aniqlanib tuzatildi. Sun’iy sinov ovozi ishlatildi; foydalanuvchi yozuvi olinmadi.

Auditda ko‘rsatma matnidagi “javobni kut” / “jim qolib kutma” qarama-qarshiligi ham qayd etildi. Ushbu audio tuzatishda serverdagi suhbat ko‘rsatmasi va jonli AI ishlash tartibi almashtirilmadi.

Format manbasi: [Gemini Live API audio formatlari](https://ai.google.dev/gemini-api/docs/live-api/capabilities).

## Qo‘shimcha haqiqiy suhbat va deploy

Sun’iy ruscha javob yangi umumiy 24 kHz brauzer kontekstidan mikrofonning haqiqiy AudioWorklet yo‘liga o‘tkazildi: 42 ta 100 ms PCM paketi olindi. Shu 16 kHz paketlar jonli AIga uzatildi. AI “Азиз” javobini tanidi, baholadi va keyingi savolni berdi; 16,311 soniyalik, 67 paketli javob olindi. Bu brauzer capture yo‘li → haqiqiy AI tekshiruvidir; ilova DBsi ishlatilmadi.

Server lint va build o‘tdi, versiya faollashtirildi. Ochiq saytda jonli AI dars moduli, qo‘lda tasdiqlash yo‘qligi, PWA v39 va health tekshirildi. To‘rtta joylangan fayl checksum bilan tekshirildi — farq yo‘q. Zaxira `/home/ubuntu/backups/audio-clock-before-20260908.tar.gz`, oldingi build `dist.rollback` da saqlangan.
