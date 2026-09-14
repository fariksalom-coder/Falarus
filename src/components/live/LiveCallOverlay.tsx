import { isConversationAudioActive, subscribeConversationAudio } from '../../utils/conversationAudio';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Phone, PhoneOff, Radio } from 'lucide-react';
import { efirniDarholTekshir, useLiveStreamState } from '../../hooks/useLiveStream';
import { useAccess } from '../../context/AccessContext';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

/**
 * JONLI EFIR QO'NG'IROG'I.
 *
 * Efir boshlanishi bilan butun ilova ustida telefon qo'ng'irog'iday to'liq
 * ekran chiqadi: yashil tugma — darhol efirga kirish, qizil — keyinroq.
 *
 * NIMA UCHUN BANNER YETARLI EMAS: banner faqat bosh sahifada, chat bandi esa
 * "Suhbat" bo'limida ko'rinadi. O'quvchi mashq qilib o'tirgan bo'lsa, efir
 * boshlanganini umuman sezmasdi va odam yig'ilmasdi.
 *
 * BIR MARTA: har efir uchun javob (kirdi yoki keyinroq dedi) brauzerda
 * saqlanadi — sahifa har almashganda qayta chiqib bezovta qilmaydi. Efir
 * baribir bannerda va chat ro'yxatida turadi, ya'ni keyin ham kirish mumkin.
 */

const JAVOB_KALITI = (id: number) => `efir_qongiroq_javob_${id}`;

/**
 * QO'NG'IROQ OHANGI — telefon jiringlashiga o'xshash, fayl yuklamasdan.
 *
 * Bir "jiringlash" = ikki tovushli takroriy signal (~1,4 s), keyin 2 s
 * jimlik — klassik qo'ng'iroq shu tartibda bo'ladi. Ovoz baland: bu xabar
 * emas, chaqiruv; cho'ntakdagi telefondan ham eshitilishi kerak.
 */
function useQongiroqOhangi(faol: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!faol) return;
    let toxtadi = false;
    let timer: number | null = null;

    const Ctx = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    ctxRef.current = ctx;
    void ctx.resume().catch(() => undefined);

    /*
     * Brauzer sahifaga tegilmagan bo'lsa ovozni bloklaydi. Bunday holatda
     * qo'ng'iroq jim qolib ketmasin: ekranga birinchi teginishda ohang
     * qayta yo'lga tushadi (tugmani bosish ham shu teginish hisoblanadi,
     * lekin ekranning istalgan joyi kifoya).
     */
    const uygot = () => void ctx.resume().catch(() => undefined);
    window.addEventListener('pointerdown', uygot, { passive: true });

    const signal = (chastota: number, boshlanish: number, davomiylik: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = chastota;
      // Yumshoq boshlanish va tugash — "chirt" etgan ovoz bo'lmasin.
      gain.gain.setValueAtTime(0.0001, boshlanish);
      gain.gain.exponentialRampToValueAtTime(0.34, boshlanish + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, boshlanish + davomiylik);
      osc.connect(gain).connect(ctx.destination);
      osc.start(boshlanish);
      osc.stop(boshlanish + davomiylik + 0.02);
    };

    /*
     * Ovoz CHEKSIZ jiringlamaydi. Haqiqiy qo'ng'iroq ham bir daqiqacha
     * chalinadi va jim bo'ladi: o'quvchi telefonini stolga qo'yib ketgan
     * bo'lsa, ilova soatlab signal berib turmasligi kerak. Ekranning o'zi
     * ochiq qoladi — kirmoqchi bo'lsa istagan payt bosadi.
     */
    const boshlanish = Date.now();
    const OVOZ_MUDDATI_MS = 60_000;
    const HALQA_MS = 3400;

    const takrorla = () => {
      if (toxtadi || ctx.state === 'closed') return;
      if (Date.now() - boshlanish > OVOZ_MUDDATI_MS) return;

      // Bir jiringlash: ikki tovush uch marta almashadi.
      const t = ctx.currentTime;
      for (let i = 0; i < 3; i += 1) {
        signal(1000, t + i * 0.44, 0.2);
        signal(800, t + i * 0.44 + 0.22, 0.2);
      }
      // Har jiringlashda tebranish ham — ovoz bloklangan bo'lsa sezilsin.
      try {
        navigator.vibrate?.([400, 180, 400, 180, 400]);
      } catch {
        /* qo'llab-quvvatlanmasa e'tiborsiz */
      }

      timer = window.setTimeout(takrorla, HALQA_MS);
    };
    takrorla();

    return () => {
      toxtadi = true;
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener('pointerdown', uygot);
      try {
        navigator.vibrate?.(0);
      } catch {
        /* e'tiborsiz */
      }
      void ctx.close().catch(() => undefined);
      ctxRef.current = null;
    };
  }, [faol]);
}

export default function LiveCallOverlay() {
  const { live } = useLiveStreamState();
  const { access } = useAccess();
  const { user } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [javobBerilgan, setJavobBerilgan] = useState<number | null>(null);

  const efirId = live?.id ?? null;

  /*
   * Push kelgan zahoti ekranni ko'taramiz. Service worker (`sw.js` v22) push
   * kelganda ochiq oynalarga xabar yuboradi — shu xabar bo'lmasa qo'ng'iroq
   * keyingi tekshiruvgacha (25 s) kutib turardi, ya'ni bildirishnoma kelib,
   * ilova esa jim turardi.
   */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const xabar = (e: MessageEvent) => {
      if ((e.data as { turi?: string } | null)?.turi === 'efir-qongiroq') efirniDarholTekshir();
    };
    navigator.serviceWorker.addEventListener('message', xabar);
    return () => navigator.serviceWorker.removeEventListener('message', xabar);
  }, []);

  // Bu efirga ilgari javob berilganmi (boshqa sahifada yoki qayta yuklashdan oldin).
  useEffect(() => {
    if (efirId == null) return;
    try {
      if (localStorage.getItem(JAVOB_KALITI(efirId))) setJavobBerilgan(efirId);
    } catch {
      /* localStorage yopiq bo'lsa — har safar ko'rsatamiz, zarari yo'q */
    }
  }, [efirId]);

  /*
   * Kimga ko'rsatiladi:
   *  - efir jonli va foydalanuvchi tizimga kirgan;
   *  - u SUPPORT emas (efirni o'zi olib boradi, o'ziga qo'ng'iroq qilmaymiz);
   *  - efir sahifasida turmagan (u allaqachon xonada);
   *  - bu efirga hali javob bermagan.
   */
  const spokenLesson = useSyncExternalStore(subscribeConversationAudio, isConversationAudioActive, () => false);
  const korsatilsin =
    !spokenLesson &&
    Boolean(live) &&
    Boolean(user) &&
    !access?.golden &&
    !pathname.startsWith('/jonli-efir') &&
    javobBerilgan !== efirId;

  useQongiroqOhangi(korsatilsin);

  const javobYoz = (qiymat: 'kirdi' | 'keyinroq') => {
    if (efirId == null) return;
    try {
      localStorage.setItem(JAVOB_KALITI(efirId), qiymat);
    } catch {
      /* e'tiborsiz */
    }
    setJavobBerilgan(efirId);
  };

  return (
    <AnimatePresence>
      {korsatilsin && live ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-between px-6 py-10"
          style={{
            background:
              'radial-gradient(120% 80% at 50% 0%, #123A8F 0%, #0B2A6B 55%, #071B5E 100%)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 40px)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label={t('liveStream.callTitle')}
        >
          {/* ------------------------------ Yuqori ------------------------------ */}
          <div className="flex flex-col items-center text-center">
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black tracking-wide text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F87171]" />
              {t('liveStream.badge')}
            </span>
            <p className="mt-5 text-[13px] font-semibold text-white/70">
              {t('liveStream.callTitle')}
            </p>
            <h2 className="mt-1 max-w-[280px] text-[22px] font-black leading-tight text-white">
              {live.title}
            </h2>
          </div>

          {/* ------------------------------ O'rta ------------------------------- */}
          <div className="relative flex h-[132px] w-[132px] items-center justify-center">
            {/* Qo'ng'iroq to'lqinlari */}
            <motion.span
              className="absolute inset-0 rounded-full bg-white/10"
              animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.span
              className="absolute inset-0 rounded-full bg-white/10"
              animate={{ scale: [1, 1.6, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
            />
            <span className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-white/15">
              <Radio className="h-11 w-11 text-white" aria-hidden />
            </span>
          </div>

          {/* ------------------------------ Pastki ------------------------------ */}
          <div className="flex w-full max-w-[320px] items-center justify-between">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => javobYoz('keyinroq')}
                aria-label={t('liveStream.callDecline')}
                className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#E11D48] text-white shadow-[0_12px_30px_rgba(225,29,72,0.45)] transition active:scale-[0.94]"
              >
                <PhoneOff className="h-7 w-7" />
              </button>
              <span className="text-[12px] font-bold text-white/70">
                {t('liveStream.callDecline')}
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <motion.button
                type="button"
                onClick={() => {
                  javobYoz('kirdi');
                  navigate('/jonli-efir');
                }}
                aria-label={t('liveStream.callJoin')}
                className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#22A552] text-white shadow-[0_12px_30px_rgba(34,165,82,0.5)] transition active:scale-[0.94]"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Phone className="h-7 w-7" />
              </motion.button>
              <span className="text-[12px] font-black text-white">
                {t('liveStream.callJoin')}
              </span>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
