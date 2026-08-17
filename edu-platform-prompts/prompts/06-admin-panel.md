# 06 — Admin va moderator paneli

## Bo'limlar

### Overview
- DAU/MAU, yangi ro'yxatdan o'tganlar, konversiya, churn
- GMV, daromad, o'rtacha chek
- Jonli darslar soni, o'rtacha davomiylik

### Foydalanuvchilar
- Qidiruv, filtr, rol, holat
- Bloklash, rol berish, impersonate (log bilan)

### Repetitor moderatsiyasi
- Ariza navbati: hujjatlar, video, tajriba
- Tasdiqlash / rad etish (sabab bilan)
- Sifat monitoringi: past reyting, ko'p bekor qilish, shikoyatlar

### Kontent
- Fan / mavzu / dars / test CRUD
- Import: CSV yoki JSON orqali savollar bazasi
- Kontent moderatsiyasi (repetitor kurslari)
- Versiyalash va publish/unpublish

### Moliya
- Tranzaksiyalar, refund, chargeback
- Repetitor payout navbati va tasdiqlash
- Komissiya sozlamalari

### Shikoyatlar
- Report queue (dars, chat, sharh), qaror tarixi

### Tizim
- Feature flag'lar
- Narx va tarif rejalari
- Bildirishnoma shablonlari
- Audit log (kim, nima, qachon)

## Qoidalar
- Har bir destruktiv amal tasdiqlash dialogi + audit log talab qiladi
- Moderator moliya va tizim bo'limlarini ko'rmaydi
- Jadvallar: server-side pagination, sort, filtr, CSV eksport
- Admin panel desktop-first (lekin mobilda buzilmasin)
