import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { motion } from 'motion/react';
import { getLiveStreamState, type LiveStreamState } from '../../api/liveStream';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

/**
 * Bosh sahifadagi "JONLI" banner.
 *
 * Efir bo'lmasa HECH NARSA chizmaydi — bosh sahifa bo'sh joy bilan
 * to'lib ketmasin.
 *
 * Nima uchun so'rov takrorlanadi: efirni support istalgan paytda boshlaydi,
 * talaba esa bosh sahifani ochiq qoldirib ketgan bo'lishi mumkin. Har
 * daqiqada bir marta tekshirish yetarli va serverga sezilarli yuk bermaydi
 * (so'rov bitta qatorni o'qiydi).
 */

const TEKSHIRISH_ORALIGI_MS = 60_000;

export default function LiveStreamBanner() {
  const { token } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [state, setState] = useState<LiveStreamState | null>(null);

  useEffect(() => {
    if (!token) return;
    let bekor = false;

    const yukla = async () => {
      try {
        const d = await getLiveStreamState(token);
        if (!bekor) setState(d);
      } catch {
        // Banner qo'shimcha imkoniyat: yuklanmasa jim o'tamiz.
      }
    };

    void yukla();
    const timer = setInterval(() => void yukla(), TEKSHIRISH_ORALIGI_MS);
    return () => {
      bekor = true;
      clearInterval(timer);
    };
  }, [token]);

  const live = state?.live ?? null;
  if (!live) return null;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => navigate('/jonli-efir')}
      className="mb-4 flex w-full items-center gap-3 rounded-[20px] bg-gradient-to-r from-[#E11D48] to-[#F43F5E] p-4 text-left shadow-[0_14px_34px_rgba(225,29,72,0.28)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
        <Radio className="h-5 w-5 text-white" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-black tracking-wide text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            {t('liveStream.badge')}
          </span>
        </span>
        <span className="mt-1 block truncate text-[15px] font-bold text-white">{live.title}</span>
      </span>
      <span className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-[#E11D48]">
        {t('liveStream.join')}
      </span>
    </motion.button>
  );
}
