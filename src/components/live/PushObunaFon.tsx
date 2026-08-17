import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { pushObunaBol, pushQollabQuvvatlanadi } from '../../api/push';

/**
 * PUSH OBUNASINI FONDA TIKLAYDI — ko'rinadigan qismi yo'q.
 *
 * Nima uchun kerak: brauzer obunasi (`PushSubscription`) abadiy emas —
 * kalit yangilanganda, brauzer yangilanganda yoki qurilma uzoq ishlatilmay
 * turganda bekor bo'ladi. O'shanda ruxsat BERILGANICHA qoladi, lekin
 * serverdagi manzil o'lik bo'lib qoladi va efir xabari yetib bormaydi.
 * Shuning uchun ilova ochilganda obuna jimgina qayta yoziladi.
 *
 * RUXSAT SO'RALMAYDI (`soralsin: false`). Brauzer so'rovni faqat foydalanuvchi
 * harakatidan keyin qabul qiladi; sahifa ochilishida so'ralsa, u avtomatik
 * rad etiladi va IKKINCHI imkon berilmaydi — ya'ni bildirishnomalar o'sha
 * qurilmada butunlay yopiladi. Ruxsat profildagi tugma orqali so'raladi.
 */
export default function PushObunaFon() {
  const { token } = useAuth();

  useEffect(() => {
    if (!token || !pushQollabQuvvatlanadi()) return;
    if (Notification.permission !== 'granted') return;
    // Xatolik bo'lsa jim o'tamiz: bu fon ishi, foydalanuvchiga aytadigan
    // gap yo'q va ilova ishiga xalaqit bermasligi kerak.
    void pushObunaBol(token, false).catch(() => undefined);
  }, [token]);

  return null;
}
