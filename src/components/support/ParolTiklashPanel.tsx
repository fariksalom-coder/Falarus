import { useState } from 'react';
import { Check, Copy, KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import type { ParolTiklashNatija } from '../../api/parolTiklash';

/**
 * Parolni qo'lda tiklash oynasi — admin panelida ham, support hisobida ham
 * shu bitta komponent ishlatiladi.
 *
 * NEGA TASDIQ SO'RALADI: amal QAYTMAYDI — eski parol o'chadi va odam faqat
 * yangi parol bilan kira oladi. Xato bosilishdan saqlash uchun ikki qadam.
 *
 * NEGA PAROL EKRANDA: pochta ishlamaydi. Support telefonda turgan odamga
 * o'qib beradi. Shu sababli u faqat shu yerda ko'rinadi va sahifa
 * yangilansa yo'qoladi — hech qayerda saqlanmaydi.
 */

type Props = {
  /** Oldindan ma'lum telefon/email (admin foydalanuvchi sahifasida). */
  boshlangich?: string;
  /** `true` bo'lsa maydon tahrirlanmaydi — kim ekani allaqachon aniq. */
  qulf?: boolean;
  onTikla: (sorov: string) => Promise<ParolTiklashNatija>;
};

export default function ParolTiklashPanel({ boshlangich = '', qulf = false, onTikla }: Props) {
  const [sorov, setSorov] = useState(boshlangich);
  const [tasdiq, setTasdiq] = useState(false);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState('');
  const [natija, setNatija] = useState<ParolTiklashNatija | null>(null);
  const [nusxa, setNusxa] = useState(false);

  const tikla = async () => {
    setYuklanmoqda(true);
    setXato('');
    try {
      setNatija(await onTikla(sorov.trim()));
      setTasdiq(false);
    } catch (e) {
      setXato((e as Error).message);
    } finally {
      setYuklanmoqda(false);
    }
  };

  const nusxaOl = async () => {
    if (!natija) return;
    try {
      await navigator.clipboard.writeText(natija.parol);
      setNusxa(true);
      setTimeout(() => setNusxa(false), 2000);
    } catch {
      // Clipboard ruxsati yo'q bo'lsa parol baribir ekranda ko'rinib turibdi.
    }
  };

  if (natija) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-800">
          {natija.foydalanuvchi.ism} uchun yangi parol tayyor
        </p>
        <p className="mt-0.5 text-xs text-emerald-700">
          {natija.foydalanuvchi.telefon ?? natija.foydalanuvchi.email ?? `#${natija.foydalanuvchi.id}`}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 select-all rounded-xl bg-white px-3 py-2.5 text-[17px] font-bold tracking-wider text-slate-900 ring-1 ring-emerald-200">
            {natija.parol}
          </code>
          <button
            type="button"
            onClick={nusxaOl}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition active:scale-95"
            aria-label="Nusxa olish"
          >
            {nusxa ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
        <p className="mt-2.5 text-xs text-emerald-700">
          Parolni foydalanuvchiga ayting. Sahifa yangilansa u boshqa ko'rinmaydi.
        </p>
        <button
          type="button"
          onClick={() => {
            setNatija(null);
            if (!qulf) setSorov('');
          }}
          className="mt-3 text-xs font-semibold text-emerald-800 underline"
        >
          Yana bittasini tiklash
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">Parolni tiklash</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Yangi parol yaratiladi va shu yerda ko'rsatiladi. Foydalanuvchiga og'zaki ayting.
      </p>

      <input
        value={sorov}
        onChange={(e) => {
          setSorov(e.target.value);
          setTasdiq(false);
          setXato('');
        }}
        readOnly={qulf}
        placeholder="Telefon yoki email"
        inputMode="text"
        className="mt-3 min-h-[44px] w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 read-only:bg-slate-50"
      />

      {xato ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-red-600">
          <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" />
          {xato}
        </p>
      ) : null}

      {tasdiq ? (
        <div className="mt-3 rounded-xl bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">
            Eski parol o'chadi va foydalanuvchi faqat yangi parol bilan kira oladi. Davom etamizmi?
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={tikla}
              disabled={yuklanmoqda}
              className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
            >
              {yuklanmoqda ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Ha, tiklansin
            </button>
            <button
              type="button"
              onClick={() => setTasdiq(false)}
              className="min-h-[40px] rounded-xl px-4 text-sm font-semibold text-slate-600"
            >
              Bekor
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setTasdiq(true)}
          disabled={sorov.trim().length < 4}
          className="mt-3 min-h-[44px] w-full rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          Yangi parol yaratish
        </button>
      )}
    </div>
  );
}
