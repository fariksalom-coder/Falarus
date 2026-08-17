# MUHIM: "Hisobni o'chirish" endpoint (Apple App Store talabi 5.1.1(v))

Bu endpoint server.ts da BO'LISHI SHART. Aks holda ilovadagi "Hisobni o'chirish"
tugmasi 404 qaytaradi va Apple ilovani RAD ETADI.

## Qayerga qo'shiladi
server.ts faylida, `app.post('/api/user/onboard', ...)` qatoridan OLDINGA quyidagini qo'ying:

```ts
  app.delete('/api/user/account', authenticate, async (req: any, res) => {
    const userId = Number(req.userId);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: 'Notoʻgʻri foydalanuvchi' });
    }
    try {
      // Barcha bogʻliq maʼlumotlar DB darajasida ON DELETE CASCADE/SET NULL orqali oʻchiriladi.
      const { error: delErr } = await supabase.from('users').delete().eq('id', userId);
      if (delErr) {
        console.error('[DELETE /api/user/account]', delErr);
        return res.status(500).json({ error: 'Hisobni oʻchirib boʻlmadi' });
      }
      return res.json({ success: true });
    } catch (e) {
      console.error('[DELETE /api/user/account]', e);
      return res.status(500).json({ error: 'Hisobni oʻchirib boʻlmadi' });
    }
  });
```

## MUHIM: bu o'zgarishni GitHub'ga commit + push qiling
(github.com/fariksalom-coder/Falarus, main branch) — shunda keyingi
deploy'larda ham qoladi. Faqat VPS'da to'g'ridan-to'g'ri tahrirlash YETARLI EMAS —
u qayta deploy'da o'chib ketadi.

## Tekshirish
curl -X DELETE http://localhost:3001/api/user/account
=> 401 chiqsa endpoint bor (to'g'ri). 404 chiqsa — YO'Q (muammo).
