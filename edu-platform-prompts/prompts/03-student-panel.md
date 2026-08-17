# 03 — O'quvchi paneli

## Ekranlar

### Bosh sahifa
- Salomlashuv + streak alangasi + bugungi XP
- **"Davom ettirish"** katta kartasi — oxirgi to'xtagan dars
- Bugungi jadval: keyingi jonli dars, taymer bilan
- Kunlik maqsad halqasi (masalan 20 daqiqa)
- Tavsiya: zaif mavzular bo'yicha 3 ta mashq
- Uyga vazifa eslatmasi (muddati yaqin bo'lsa)

### Darslar (fanlar)
- 9 ta fan kartasi, har biri o'z rangida, progress halqasi bilan
- Fan → mavzular daraxti (sinf bo'yicha), qulflangan/ochiq holat
- Mavzu → darslar ro'yxati (video / matn / interaktiv / test)

### Repetitorlar
- Katalog, filtr: fan, narx, reyting, vaqt, jins, tajriba
- Repetitor profili: video tanishtiruv, bio, sharhlar, jadval, "Band qilish"

### Testlar
- Amaliy testlar (mavzu bo'yicha)
- DTM mock imtihon (to'liq format, taymer)
- Natijalar tarixi va tahlil

### Statistika
- Haftalik/oylik faollik grafigi
- Fan bo'yicha kuchli/zaif mavzular xaritasi
- Testlar o'rtacha bali dinamikasi
- Umumiy o'qish vaqti

### Profil
- Ma'lumotlar, sinf, maqsad
- Yutuqlar (badge'lar)
- Obuna holati, to'lovlar tarixi
- Sozlamalar, bildirishnomalar, til

## Navigatsiya
Mobil bottom nav (5 ta): Bosh sahifa · Darslar · Repetitorlar · Testlar · Profil
Desktop: chap sidebar

## Qoidalar
- Har bir ekranda loading skeleton, empty state, error state
- Bosh sahifa 1 sekunddan kam vaqtda birinchi kontentni ko'rsatsin (prefetch + skeleton)
- Bir ekran — bir maqsad. Bosh sahifa "keyingi nima qilish kerak"ni bitta katta CTA bilan aytsin
