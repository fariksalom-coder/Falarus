import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import { useAccess } from '../../context/AccessContext';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

/**
 * Obuna muddati tugayotgani haqidagi eslatma.
 *
 * NEGA AVTO-TO'LOV EMAS: odam kursni tugatgan yoki davom ettirmaslikka
 * qaror qilgan bo'lishi mumkin — kartadan so'roqsiz pul yechilmaydi. Uning
 * o'rniga muddat yaqinlashganda shu banner chiqadi va qaror odamda qoladi.
 *
 * NEGA PUSH YETMAYDI: push obunasi ~195 kishida bor (foydalanuvchilarning
 * 4%). Banner esa ilovani ochgan HAR KIMGA ko'rinadi, hech qanday ruxsat
 * talab qilmaydi. Push — qo'shimcha kanal, asosiysi shu.
 *
 * MATN NEGA SHU YERDA: umumiy i18n kataloglari (`shared/i18n/catalog/*`)
 * prod va lokal o'rtasida farq qiladi; ularga tegish keraksiz xavf tug'diradi.
 * Bu yerda faqat to'rt qator matn, tanilmagan til `uz` ga tushadi.
 */

const MATNLAR = {
  uz: {
    tugadi: 'Obunangiz tugadi',
    tugadiIzoh: 'Darslarni davom ettirish uchun obunani yangilang. Progressingiz saqlanib turibdi.',
    qoldi: (kun: number) => (kun === 1 ? 'Obunangiz ertaga tugaydi' : `Obunangizga ${kun} kun qoldi`),
    qoldiIzoh: 'Darslaringiz uzilib qolmasligi uchun obunani yangilab qo‘ying.',
    tugma: 'Obunani yangilash',
  },
  ru: {
    tugadi: 'Подписка закончилась',
    tugadiIzoh: 'Чтобы продолжить занятия, продлите подписку. Ваш прогресс сохранён.',
    qoldi: (kun: number) => (kun === 1 ? 'Подписка заканчивается завтра' : `До конца подписки ${kun} дн.`),
    qoldiIzoh: 'Продлите подписку, чтобы занятия не прервались.',
    tugma: 'Продлить подписку',
  },
  en: {
    tugadi: 'Your subscription has ended',
    tugadiIzoh: 'Renew to continue your lessons. Your progress is saved.',
    qoldi: (kun: number) => (kun === 1 ? 'Your subscription ends tomorrow' : `${kun} days left on your subscription`),
    qoldiIzoh: 'Renew now so your lessons are not interrupted.',
    tugma: 'Renew subscription',
  },
} as const;

/** Necha kundan keyin tugaydi. Manfiy — allaqachon tugagan. */
function qolganKun(expiresAt: string): number | null {
  const end = new Date(expiresAt);
  if (!Number.isFinite(end.getTime())) return null;
  const bugun = new Date();
  const kunMs = 24 * 60 * 60 * 1000;
  // Sana bo'yicha (soat emas): "ertaga tugaydi" kun chegarasi bilan hisoblansin.
  const endKun = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const bugunKun = Date.UTC(bugun.getFullYear(), bugun.getMonth(), bugun.getDate());
  return Math.round((endKun - bugunKun) / kunMs);
}

/** Necha kun qolganda eslatma ko'rina boshlaydi. */
const KORINISH_CHEGARASI = 7;

export default function ObunaMuddatBanner() {
  const { token } = useAuth();
  const { access } = useAccess();
  const { locale } = useLocale();
  const navigate = useNavigate();

  const matn = MATNLAR[locale as keyof typeof MATNLAR] ?? MATNLAR.uz;

  const holat = useMemo(() => {
    if (!token) return null;
    if (access?.golden) return null;
    const expiresAt = access?.subscription_expires_at;
    if (!expiresAt) return null;
    const kun = qolganKun(expiresAt);
    if (kun == null) return null;
    if (kun < 0) return { tugagan: true, kun: 0 };
    if (kun <= KORINISH_CHEGARASI) return { tugagan: false, kun };
    return null;
  }, [token, access?.golden, access?.subscription_expires_at]);

  if (!holat) return null;

  const tugagan = holat.tugagan;

  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-[24px] border p-4 ${
        tugagan
          ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
          : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
      }`}
      role="status"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          tugagan ? 'bg-red-100 dark:bg-red-500/20' : 'bg-amber-100 dark:bg-amber-500/20'
        }`}
      >
        {tugagan ? (
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-300" />
        ) : (
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[15px] font-bold ${
            tugagan ? 'text-red-800 dark:text-red-200' : 'text-amber-900 dark:text-amber-100'
          }`}
        >
          {tugagan ? matn.tugadi : matn.qoldi(holat.kun)}
        </p>
        <p
          className={`mt-0.5 text-[13px] ${
            tugagan ? 'text-red-700/90 dark:text-red-300/90' : 'text-amber-800/90 dark:text-amber-200/90'
          }`}
        >
          {tugagan ? matn.tugadiIzoh : matn.qoldiIzoh}
        </p>
        <button
          type="button"
          onClick={() => navigate('/tariflar')}
          className={`mt-3 min-h-[44px] w-full rounded-2xl px-4 text-[14px] font-bold text-white transition active:scale-[0.98] sm:w-auto ${
            tugagan ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {matn.tugma}
        </button>
      </div>
    </div>
  );
}
