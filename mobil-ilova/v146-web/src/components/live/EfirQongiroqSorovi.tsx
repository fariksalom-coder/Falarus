import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BellRing, PhoneCall } from 'lucide-react';
import { pushObunaBol, pushQollabQuvvatlanadi } from '../../api/push';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

/**
 * BILDIRISHNOMA RUXSATI — ilova bo'ylab, bir marta so'raladigan oyna.
 *
 * NIMA UCHUN ALOHIDA OYNA: ruxsat ilgari faqat "Suhbat" bo'limidagi kichik
 * kartadan so'ralardi. Amalda u yergacha hech kim tushmadi — efir boshlanganda
 * yuboriladigan obunalar soni NOLGA teng bo'lib qoldi, ya'ni qo'ng'iroq
 * hech kimga bormadi. Brauzer ruxsatni faqat foydalanuvchi bosgandan keyin
 * beradi, shuning uchun so'rovni ko'rinadigan joyga chiqarish shart.
 *
 * QOIDALAR:
 *  - faqat tizimga kirgan va ruxsat hali so'ralmagan qurilmada;
 *  - "Keyinroq" bosilsa 3 kun bezovta qilinmaydi (butunlay yo'qolib
 *    ketmasin — odam fikrini o'zgartirishi mumkin);
 *  - ruxsat berilgach `PushObunaFon` uni jimgina yangilab turadi.
 */

const KEYINROQ_KALITI = 'efir_push_keyinroq_vaqti';
const KEYINROQ_MS = 3 * 24 * 60 * 60 * 1000;
/** Ilova ochilishi bilan emas — birinchi ekran chizilib bo'lgach chiqadi. */
const KECHIKISH_MS = 3500;

export default function EfirQongiroqSorovi() {
  const { token } = useAuth();
  const { t } = useLocale();
  const [korinsin, setKorinsin] = useState(false);
  const [band, setBand] = useState(false);

  useEffect(() => {
    if (!token || !pushQollabQuvvatlanadi()) return;
    if (Notification.permission !== 'default') return;
    try {
      const oxirgi = Number(localStorage.getItem(KEYINROQ_KALITI) ?? 0);
      if (oxirgi && Date.now() - oxirgi < KEYINROQ_MS) return;
    } catch {
      /* localStorage yopiq bo'lsa — ko'rsataveramiz */
    }
    const timer = window.setTimeout(() => setKorinsin(true), KECHIKISH_MS);
    return () => window.clearTimeout(timer);
  }, [token]);

  const keyinroq = () => {
    try {
      localStorage.setItem(KEYINROQ_KALITI, String(Date.now()));
    } catch {
      /* e'tiborsiz */
    }
    setKorinsin(false);
  };

  const ruxsatSora = async () => {
    if (!token) return;
    setBand(true);
    try {
      await pushObunaBol(token, true);
    } catch {
      /* rad etilsa ham oynani yopamiz — qayta bosishga majburlamaymiz */
    } finally {
      setBand(false);
      setKorinsin(false);
      // Rad etilgan bo'lsa ham qayta chiqmasin: brauzer ikkinchi imkon bermaydi.
      try {
        localStorage.setItem(KEYINROQ_KALITI, String(Date.now()));
      } catch {
        /* e'tiborsiz */
      }
    }
  };

  return (
    <AnimatePresence>
      {korinsin ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[75] flex items-end justify-center bg-black/45 px-4 pb-6 backdrop-blur-[2px] sm:items-center sm:pb-0"
          role="dialog"
          aria-modal="true"
          aria-label={t('liveStream.pushModalTitle')}
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="w-full max-w-[380px] rounded-[26px] bg-app-surface p-6 text-center shadow-[0_24px_60px_rgba(15,23,42,0.28)]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
          >
            <div className="relative mx-auto flex h-[86px] w-[86px] items-center justify-center">
              <motion.span
                className="absolute inset-0 rounded-full bg-app-primary/12"
                animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              />
              <span
                className="relative flex h-[68px] w-[68px] items-center justify-center rounded-[22px] text-white"
                style={{ background: 'linear-gradient(145deg, #3B82F6, #2563EB)' }}
              >
                <BellRing className="h-8 w-8" aria-hidden />
              </span>
            </div>

            <h2 className="mt-5 text-[19px] font-black leading-tight text-app-text">
              {t('liveStream.pushModalTitle')}
            </h2>
            <p className="mt-2 text-[13.5px] font-semibold leading-relaxed text-app-text-muted">
              {t('liveStream.pushModalBody')}
            </p>

            <button
              type="button"
              disabled={band}
              onClick={ruxsatSora}
              className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-app-primary text-[15px] font-black text-white shadow-[0_14px_30px_rgba(37,99,235,0.32)] transition active:scale-[0.98] disabled:opacity-60"
            >
              <PhoneCall className="h-[18px] w-[18px]" aria-hidden />
              {t('liveStream.pushAllow')}
            </button>
            <button
              type="button"
              onClick={keyinroq}
              className="mt-2 min-h-[44px] w-full rounded-2xl text-[13.5px] font-bold text-app-text-muted transition active:scale-[0.98]"
            >
              {t('liveStream.pushLater')}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
