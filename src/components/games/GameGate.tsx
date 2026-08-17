import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Lock, Sparkles } from 'lucide-react';
import { startGamePlay, type GameQuota } from '../../api/games';
import { useAuth } from '../../context/AuthContext';

/**
 * O'YIN ESHIGI.
 *
 * To'lov qilmagan o'quvchi o'yinlarni jami 3 marta ochadi. Har ochilish
 * SERVERGA yoziladi (brauzer xotirasini tozalash bilan chetlab o'tib
 * bo'lmasin), chek tugagach o'yin o'rniga to'lov ekrani chiqadi.
 *
 * Premium o'quvchida hech qanday chek yo'q — u to'g'ridan-to'g'ri o'ynaydi.
 */
export default function GameGate({ game, children }: { game: string; children: ReactNode }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [quota, setQuota] = useState<GameQuota | null>(null);
  const [xato, setXato] = useState('');
  // Bitta ochilish — bitta yozuv (React qayta chizsa ham takrorlanmasin).
  const yozildi = useRef(false);

  useEffect(() => {
    if (!token || yozildi.current) return;
    yozildi.current = true;
    let alive = true;
    startGamePlay(token, game)
      .then((q) => alive && setQuota(q))
      .catch((e: Error) => {
        // Server javob bermasa o'yinni yopib qo'ymaymiz — dars ham, o'yin ham
        // to'xtab qolgandan ko'ra ochiq qolgani yaxshi.
        if (alive) {
          setXato(e.message);
          setQuota({ premium: false, used: 0, limit: 3, allowed: true });
        }
      });
    return () => {
      alive = false;
    };
  }, [token, game]);

  if (!quota) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-app-border border-t-app-primary" />
      </div>
    );
  }

  if (quota.allowed) {
    return (
      <>
        {/* Nechta bepul urinish qolganini eslatib turamiz. */}
        {!quota.premium ? (
          <div className="mx-auto mb-3 flex max-w-[520px] items-center justify-center gap-2 rounded-2xl bg-[#FFF7E6] px-4 py-2 text-[12.5px] font-bold text-[#8A5A00]">
            <Sparkles className="h-4 w-4" aria-hidden />
            Bepul o‘yin: {quota.used} / {quota.limit}
          </div>
        ) : null}
        {children}
        {xato ? null : null}
      </>
    );
  }

  return (
    <div className="mx-auto max-w-[520px] px-4 py-10 text-center">
      <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-app-icon-bg">
        <Lock className="h-7 w-7 text-app-primary-deep" aria-hidden />
      </span>
      <h1 className="text-[22px] font-black text-app-text">Bepul o‘yinlar tugadi</h1>
      <p className="mx-auto mt-2 max-w-[420px] text-[14px] leading-[1.7] text-app-text-muted">
        Siz {quota.limit} ta bepul o‘yindan foydalandingiz. O‘yinlarni cheksiz o‘ynash uchun
        premiumni sotib oling — darslar, lug‘at va barcha o‘yinlar ochiladi.
      </p>

      <button
        type="button"
        onClick={() => navigate('/tariflar')}
        className="mt-6 min-h-[54px] w-full rounded-2xl bg-app-primary text-[15px] font-black text-white transition active:scale-[0.98]"
      >
        Premium sotib olish
      </button>
      <button
        type="button"
        onClick={() => navigate('/games')}
        className="mt-2.5 min-h-[48px] w-full rounded-2xl bg-app-surface text-[14px] font-bold text-app-text ring-1 ring-app-border"
      >
        O‘yinlarga qaytish
      </button>

      <p className="mt-5 flex items-center justify-center gap-2 text-[12.5px] font-semibold text-app-text-secondary">
        <Gamepad2 className="h-4 w-4" aria-hidden />
        Premiumda barcha o‘yinlar cheksiz
      </p>
    </div>
  );
}
