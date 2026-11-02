import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

/**
 * UpdateNotice — platforma e'loni.
 *
 * XALAQIT BERMASLIGI: bu modal yoki ekran ustida turuvchi qatlam EMAS. E'lon
 * sahifa kontentining eng tepasida, oddiy blok sifatida turadi — pastga
 * aylantirilsa ketadi, ustidagi tugmalarni to'smaydi va yopib qo'yilsa boshqa
 * ko'rinmaydi.
 *
 * MUDDATI: `TUGASH_VAQTI` kelgach e'lon o'z-o'zidan yo'qoladi, kodga qaytib
 * tegish shart emas. Vaqt foydalanuvchi qurilmasining soatiga qarab
 * tekshiriladi — e'lon uchun bu yetarli aniqlik.
 *
 * YANGI E'LON YOZISH: `SARLAVHA`, `MATN` va `TUGASH_VAQTI` ni yangilang,
 * `SAQLASH_KALITI` dagi raqamni ham oshiring — aks holda oldingi e'lonni
 * yopgan foydalanuvchilar yangisini ko'rmaydi.
 */
const SAQLASH_KALITI = 'falarus_elon_v2';

/** Shu vaqtdan keyin e'lon ko'rsatilmaydi (12 soat). */
const TUGASH_VAQTI = Date.parse('2026-08-10T05:30:00Z');

const SARLAVHA = "FalaRus sun'iy intellekti ishga tushdi";

const MATN =
  "Platformamizning o'z sun'iy intellektini to'liq ishga tushirdik. U " +
  "grammatika darslarini doskada tushuntiradi, savollaringizga javob beradi " +
  "va siz bilan ovozli suhbat quradi. Sinab ko'ring va fikringizni qoldiring — " +
  'bu biz uchun juda muhim.';

export default function UpdateNotice() {
  const [yopilgan, setYopilgan] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (Date.now() >= TUGASH_VAQTI) return true;
    try {
      return window.localStorage.getItem(SAQLASH_KALITI) === 'yopilgan';
    } catch {
      // Maxfiylik rejimida localStorage bloklangan bo'lishi mumkin — bunda
      // e'lon shunchaki har safar ko'rinadi, xatolik chiqarmaydi.
      return false;
    }
  });

  if (yopilgan) return null;

  const yop = () => {
    setYopilgan(true);
    try {
      window.localStorage.setItem(SAQLASH_KALITI, 'yopilgan');
    } catch {
      /* saqlab bo'lmasa ham e'lon shu seansda yopiladi */
    }
  };

  return (
    <div className="px-4 pt-3">
      <div className="flex items-start gap-3 rounded-[20px] border border-[#BFD7FE] bg-[#EFF5FF] px-3.5 py-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#DBEAFE] text-[#2563EB]">
          <Sparkles size={16} strokeWidth={2.4} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-snug text-[#14306B]">{SARLAVHA}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#3E5A93]">{MATN}</p>
        </div>

        <button
          type="button"
          onClick={yop}
          aria-label="E'lonni yopish"
          className="-mr-1.5 -mt-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#5B7BB8] transition active:scale-95"
        >
          <X size={17} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
