# 08 — Jonli dars xonasi

## Vazifa
LiveKit asosida video dars xonasi.

## Funksiyalar
- Video/audio (adaptiv sifat — sekin internetda audio ustuvor)
- Ekran ulashish
- **Interaktiv doska**: chizish, matn, shakl, formula (KaTeX), rasm joylash, sahifalar
- Chat (fayl yuborish bilan)
- Dars materiallari paneli (PDF, slayd)
- Yozib olish (ikkala tomon roziligi bilan), Supabase Storage'ga
- Taymer: qolgan vaqt, 5 daqiqa qolganda ogohlantirish
- "Qo'l ko'tarish", reaksiyalar

## Fanga xos vositalar
- Matematika/Fizika: formula editori, grafik chizuvchi (funksiya plotter), kalkulyator
- Kimyo: davriy jadval, molekula chizish
- Tillar: talaffuz yozib olish va taqqoslash
- Biologiya: rasm annotatsiya

## Texnik
- Room token server tomonda generatsiya, TTL 10 daqiqa, faqat booking egalari
- Ulanish uzilsa avtomatik qayta ulanish + holat tiklash
- Doska holati realtime sinxron (CRDT yoki server-authoritative)
- Dars tugagach: yozuv, doska snapshot'i, chat log dars kartasiga saqlanadi
- Sifat metrikalari yig'iladi (bitrate, packet loss)

## UX
- Kirishdan oldin qurilma tekshiruvi (kamera/mikrofon/internet)
- Mobilda: video kichik, doska katta (o'quvchi asosan doskaga qaraydi)
- Xato holati: "Internet sekin — video o'chirildi, audio davom etmoqda"
