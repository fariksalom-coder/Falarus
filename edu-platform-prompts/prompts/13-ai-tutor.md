# 13 — AI yordamchi

## Vazifa
Har bir fan uchun kontekstga ega AI o'qituvchi.

## Funksiyalar
- **Savol berish**: o'quvchi matn yoki rasm (masala fotosurati) yuboradi
- **Bosqichma-bosqich yechim**: darhol javob bermaydi — yo'naltiruvchi savollar beradi (Sokratik usul), o'quvchi so'rasa to'liq yechim
- **Tushuntirish**: "Buni oddiyroq tushuntir" tugmasi
- **Uyga vazifa yordamchisi**: javobni ko'chirib berish emas, tushunishga yordam
- **Til amaliyoti**: ingliz/rus tilida suhbat, xatolarni to'g'rilash, talaffuz baholash
- **Insho tekshirish**: ona tili/adabiyot/ingliz tili uchun struktura va grammatika bo'yicha izoh

## System prompt qoidalari
- Javob **o'zbek tilida** (til fanlaridan tashqari)
- Yosh guruhiga mos til: 5-sinf va 11-sinf uchun turlicha
- To'g'ridan-to'g'ri javob berish o'rniga yechim yo'lini o'rgatish
- Har javob oxirida tekshiruv savoli
- Fan kontekstidan tashqariga chiqmaslik
- Bilmasa tan olish, o'ylab topmaslik

## Texnik
- Kontekst: o'quvchi sinfi, joriy mavzu, oxirgi test natijalari, zaif mavzular
- Streaming javob
- Limit rejaga bog'liq, limit tugaganda yumshoq paywall
- Rasmdan masala o'qish: vision model
- Barcha suhbat saqlanadi (moderatsiya va xavfsizlik uchun)
- Xavfsizlik filtri: nomaqbul kontent bloklanadi, voyaga yetmaganlar rejimi

## UX
- Chat oynasi dars ichida ham ochiladi (yon panel)
- Tez tugmalar: "Tushunmadim" · "Misol ber" · "Yana mashq"
- Formula va kod to'g'ri render qilinadi
