# Falarus — 2026-09-07 server va kod tuzatishlari

Production server: **82.115.50.100**. Eski server: **82.115.50.76**.

## Bajarilgan ishlar

- fwupd va linux-firmware yangilandi; libfwupd/daemon nomuvofiqligi bartaraf etildi. Yangilanishlardan so‘ng APT upgradable ro‘yxati bo‘sh.
- SSH kalit orqali kirishga o‘tkazildi; parol bilan va root SSH kirishi yopildi, MaxAuthTries 3, X11 forwarding o‘chirildi. Yangi mustaqil SSH ulanishi va sudo tekshirildi.
- Ubuntu konsol paroli almashtirildi. Parol hisobotda yo‘q; lokal `.server-backups/20260907/console-password-20260907.txt` fayli 600 ruxsatda saqlangan. SSH kalit orqali ishlaydi.
- Backend 3001 porti localhost’ga bog‘landi. Prosody XMPP/HTTPS va JVB ichki HTTP interfeyslari localhost uchun sozlandi; tashqi Jitsi media UDP 10000 saqlandi.
- UFW’da eski IP’dan kirish va unga chiqish bloklandi.
- Deploy/tunnel/migratsiya/media skriptlarining standart serveri `scripts/lib/vps-config.sh` ga birlashtirildi: yangi IP ishlatiladi.
- Eski deploylardan qolgan ortiqcha kod fayllari serverning `backups/maintenance-20260907/retired-code` katalogiga arxivlandi. Joriy src/server/shared/scripts/tests kataloglari lokal loyiha bilan tenglashtirildi.
- React va React DOM type paketlari manifest/lock fayliga aniq qo‘shildi. TypeScript tekshiruv doirasi dastur, umumiy modullar, test va TS skriptlarga chegaralandi; build, backup va vaqtinchalik kataloglar chiqarildi.
- ServiceWorker update Promise xatolari ushlanadi, bir vaqtdagi takroriy tekshiruv cheklanadi, internet qaytganda qayta tekshiriladi. JS/CSS uchun HTML fallback olib tashlandi; faqat Falarus kesh versiyalari tozalanadi.
- Audio: AAC/ADTS MP3 deb yuborilmaydi; noma’lum formatsiz baytlar WebM deb taxmin qilinmaydi. MP4 va MIME nomuvofiqligi regressiya testi bilan tekshirildi.
- Gemini transport timeoutlari `TypeError.cause` / `AggregateError` ichida ham aniqlanadi. Balans tugashi va kalit xatolariga keraksiz retry qilinmaydi.
- Gemini kalitini faqat prefiksi bo‘yicha vaqtinchalik deb e’lon qiladigan noto‘g‘ri ogohlantirish olib tashlandi. Serverdagi model-list autentifikatsiya so‘rovi HTTP 200 qaytardi. [Google’ning kalit turlari haqidagi hujjati](https://ai.google.dev/gemini-api/docs/api-key).
- Build alohida katalogda tayyorlanib, Linux renameat2 orqali atomik almashtiriladi; oldingi build `dist.rollback` da qoladi. Yangi build fayllari eskirgan chunk tozalash qoidasiga tushmaydi.
- Nginx’dagi takroriy wasm yozuvi olib tashlandi; repo konfiguratsiyasi amaldagi WebSocket va uzoq API so‘rovlariga moslashtirildi, X-Forwarded-Proto qo‘shildi.
- Prosody’dagi eskirgan cross_domain_bosh sozlamasi mos http_cors_override bilan almashtirildi; konfiguratsiya testi o‘tdi. [Prosody CORS hujjati](https://prosody.im/doc/http#cross-domain-cors-support).
- Zaxiralash skriptidagi noto‘g‘ri yakuniy exit-status tuzatildi, maxfiy fayl ruxsatlari, flock, gzip/dump tekshiruvi va jurnal yozuvlari qo‘shildi.
- Kundalik DB zaxirasi stderr’ni yo‘qotadigan cron’dan systemd service/timer’ga o‘tkazildi; jadval 03:00 UTC. Bir martalik ishlatish muvaffaqiyatli.
- PM2 loglari uchun kunlik/20 MB rotatsiya, 7 nusxa va siqish sozlandi.
- npm audit topgan 5 ta paket ogohlantirishi uchun mos yangilanishlar qo‘llandi. Express 4.x doirasida yangilandi, Browserslist yangilandi; `qs >=6.16.0` va tsx uchun `esbuild 0.28.1` overrides orqali belgilandi. Override sababi: yuqori paketlar hali zaif transitive versiya diapazonini talab qiladi. Toza `npm ci` lokal va server staging’da **0 vulnerabilities** qaytardi.

## Tekshiruvlar

- Lokal typecheck va testlar o‘tdi; serverda **185 test, 31 suite, 0 failure**.
- Paket xavfsizligi yangilanishlaridan keyin ham server typecheck, 185 test va production build qayta muvaffaqiyatli bajarildi.
- Yakuniy production paketlari uchun to‘liq `npm audit` natijasi: info/low/moderate/high/critical/total **0**. PM2 qayta ishga tushirilgach sayt, API, ServiceWorker, Jitsi web va media tekshiruvlari HTTP 200; failed xizmatlar 0.
- Atomik buildning nashr/rollback va noto‘liq builddan himoya bo‘yicha 2 Python testi o‘tdi.
- Production Vite build muvaffaqiyatli. Ayrim JS chunklar 500 kB dan katta ekani haqida optimizatsiya ogohlantirishi mavjud; build xatosi emas.
- Nginx va SSH konfiguratsiya testlari o‘tdi.
- Asosiy va media sertifikatlar uchun `certbot renew --dry-run` muvaffaqiyatli.
- Alohida vaqtinchalik bazaga dump to‘liq tiklandi; 5 440 users yozuvi o‘qildi. Sinov bazasi keyin olib tashlandi; production baza qayta yozilmadi.
- Bazadagi 318 text/JSON/array ustunida eski server IP’si qidirildi: **0 moslik**.
- Deploydan keyin: `/` 200, `/api/health` 200, `/sw.js` 200, autentifikatsiyasiz `/api/user/me` 401, mavjud bo‘lmagan asset 404, `/.env` 403.
- Server qayta yuklandi: boot 13:11:18 UTC, kernel **6.8.0-139-generic**. `reboot-required` yo‘q, failed systemd xizmatlar soni 0.
- Rebootdan keyin Nginx, PM2, PostgreSQL, Prosody, Jicofo, JVB, Fail2Ban va SSH faol. Sayt/www/API/ServiceWorker/Jitsi/media hamda JVB health tekshiruvlari HTTP 200.
- TCP 3001, 5432, 5222, 5269, 5280, 5281, 8080, 8888 va 9090 faqat loopback interfeyslarida. Tashqi xizmatlar TCP 22/80/443/8443 va UDP 10000 bilan cheklangan. Eski IP bloklari rebootdan keyin ham mavjud.

## Zaxira va qaytish

O‘zgarishdan oldingi baza, kod va konfiguratsiya arxivlari serverda:
`/home/ubuntu/backups/maintenance-20260907/`.

Ularning lokal nusxasi `.server-backups/20260907/` da, Git va deploydan chiqarilgan. Bu katalog maxfiy konfiguratsiya va baza saqlaydi; ommaviy repozitoriyga joylanmaydi.

Tuzatilgan umumiy backup skripti 13:14 UTC da ishga tushirilib, barcha bosqichlarni muvaffaqiyatli tugatdi: `/home/ubuntu/backups/20260907-131415/` (baza + kod) va `/home/ubuntu/backups/media/20260907-131415/` (uploads, TTS keshisiz). Mavjud eski nusxalar bu tekshiruvda tozalanmadi. Bu snapshotlar hamda `/var/www/falarus-media` ning lokal nusxalari `.server-backups/20260907/after/` da; jami lokal zaxira taxminan 2.7 GiB. Tashqariga avtomatik davriy nusxalash hali sozlanmagan; bu bir martalik offsite nusxa.

Ko‘chirishdan keyingi checksum dry-run tekshiruvi farq topmadi. Yakuniy SSH/Nginx/Jitsi/Prosody/firewall konfiguratsiyasi ham `config-after.tar.gz` ko‘rinishida lokal saqlandi. Zaxira snapshoti paketlarning oxirgi xavfsizlik patchidan oldingi kodni saqlaydi; oxirgi `package.json` va lock fayli lokal loyiha va production katalogida mavjud.

Buildning oldingi nusxasi `/home/ubuntu/Falarus/dist.rollback` da. Kodni qaytarish uchun avval arxivni alohida katalogga ochib tekshirish, zarur fayllarni qaytarish va PM2’ni qayta ishga tushirish kerak. Baza restore ishlab turgan production bazaga avtomatik bajarilmaydi.

## Tashqi kirish talab qiladigan ishlar va chegaralar

1. `meet.falarus.uz` DNS yozuvi hali yo‘q. Authoritative NS: `dns1.airnet.uz`, `dns2.airnet.uz`. Panelda `A meet -> 82.115.50.100` qo‘shilib, DNS tarqalgach shu nomga TLS sertifikati va kerakli Nginx marshruti tayyorlanadi. Ilova hozir ishlaydigan `falarus.uz:8443` dan foydalanadi.
2. Eski serverning SSH porti timeout berdi. Undagi jarayonlar, cronlar, billing yoki VM o‘chirilgani tasdiqlanmadi. Yangi serverning unga tarmoq bog‘lanishi uzilgan; eski VM’ni provayder panelidan tekshirish/to‘xtatish uchun kirish kerak.
3. Tarixiy 52 payment_proof_url va 14 support_chat_messages.content yozuvida Supabase domeniga havolalar bor. Bu eski VPS IP’si emas; ular bu ishda ko‘chirilmagan yoki o‘zgartirilmagan.
4. Haqiqiy videoqo‘ng‘iroq, barcha foydalanuvchi oqimlari va katta yuklama sinovi bajarilmagan. Xizmat/HTTP tekshiruvlari hamda avtomatik testlar barcha yashirin xatolar yo‘qligiga kafolat bermaydi.
5. Prosody konfiguratsiyasi to‘g‘ri, ammo o‘rnatilgan Jitsi/Prosody to‘plami Lua 5.1 bo‘yicha eskirish ogohlantirishini chiqaradi. Interpreter almashtirish Jitsi modullari bilan moslik sinovini talab qiladi.
6. Yangi boot jurnalida virtual PCI hotplug `shpchp` uchun slot ro‘yxatdan o‘tkazish xabari bor (`error -16`). Ishlayotgan xizmatlarda nosozlik kuzatilmadi; virtual apparat drayverlari bu xabarni yashirish uchun o‘chirilmagan.
