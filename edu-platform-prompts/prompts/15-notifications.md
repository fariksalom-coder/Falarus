# 15 — Bildirishnomalar

## Kanallar
In-app · Web Push · SMS (Eskiz.uz) · Email (Resend) · Telegram bot (ixtiyoriy)

## Turlar
| Hodisa | Kanal | Kimga |
|---|---|---|
| Dars 24s/1s/10daq oldin | Push + SMS | O'quvchi, repetitor |
| Yangi band qilish so'rovi | Push | Repetitor |
| Band qilish tasdiqlandi/bekor | Push + SMS | Ikkalasi |
| Uyga vazifa berildi / muddati yaqin | Push | O'quvchi |
| Vazifa baholandi | Push | O'quvchi, ota-ona |
| Haftalik hisobot | Email | Ota-ona |
| To'lov muvaffaqiyatli/xato | Push + Email | To'lovchi |
| Streak xavf ostida | Push | O'quvchi |
| Repetitor arizasi natijasi | Push + SMS | Repetitor |

## Texnik
- Shablonlar DB da, admin paneldan tahrirlanadi, i18n bilan
- Navbat: BullMQ, retry + dead letter queue
- Foydalanuvchi har bir turni alohida o'chira oladi
- Quiet hours: 21:00–08:00 (shoshilinch bo'lmaganlar ertalabga suriladi)
- SMS faqat muhim hodisalarda (pullik)
- In-app markaz: o'qilgan/o'qilmagan, guruhlash
