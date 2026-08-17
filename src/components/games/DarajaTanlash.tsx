/**
 * DarajaTanlash — o'yinlardagi daraja tanlash ro'yxati.
 *
 * NIMA UCHUN UMUMIY: «Fe'l ustasi» va «So'z zanjiri» darajani bir xil
 * tanlaydi, lekin ilgari har biri o'z tugmalarini alohida chizardi — o'lchami,
 * rangi va matni boshqacha edi. Endi ikkalasi shu komponentni ishlatadi:
 * yangi o'yin qo'shilsa ham tanlash bir xil ko'rinadi.
 *
 * A1/A2/B1/B2 KODLARI KO'RSATILMAYDI. O'quvchi CEFR kodini bilishi shart emas
 * va u hech narsani anglatmaydi; buning o'rniga daraja o'zbekcha nomlanadi va
 * ostida O'SHA DARAJADAGI so'z/fe'llardan namuna turadi — «bu daraja aynan
 * qanaqa so'zlar» degan savolga eng aniq javob shu.
 */
import { Check } from 'lucide-react';

export type DarajaVarianti = {
  /** Ichki kalit (A1/A2/…) — ekranda ko'rinmaydi. */
  kalit: string;
  /** Ekrandagi nom: «Boshlang'ich», «Asosiy» … */
  nom: string;
  /** Namunalar — o'sha darajadagi so'z yoki fe'llar. */
  namunalar: string[];
  /** O'ngdagi kichik yozuv: «240 fe'l», «1 240 so'z». */
  hajm: string;
};

export default function DarajaTanlash({
  variantlar,
  tanlangan,
  onTanla,
  rang,
  sarlavha = 'Daraja',
}: {
  variantlar: DarajaVarianti[];
  tanlangan: string;
  onTanla: (kalit: string) => void;
  /** O'yinning o'z rangi — tanlangan qator shu rangda yonadi. */
  rang: string;
  /** Ro'yxat tepasidagi yozuv: «Daraja» yoki «Zamon». */
  sarlavha?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[12px] font-black uppercase tracking-wide text-app-text-muted">
        {sarlavha}
      </p>
      <div className="space-y-2">
        {variantlar.map((v) => {
          const faol = v.kalit === tanlangan;
          return (
            <button
              key={v.kalit}
              type="button"
              onClick={() => onTanla(v.kalit)}
              aria-pressed={faol}
              className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition active:scale-[0.99] ${
                faol ? 'text-white' : 'bg-app-surface text-app-text ring-1 ring-app-border'
              }`}
              style={faol ? { background: rang, boxShadow: `0 12px 26px -12px ${rang}` } : undefined}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-black leading-tight">{v.nom}</span>
                {v.namunalar.length ? (
                  <span
                    className={`mt-0.5 block truncate text-[12.5px] font-semibold ${
                      faol ? 'text-white/80' : 'text-app-text-muted'
                    }`}
                  >
                    {v.namunalar.join(' · ')}
                  </span>
                ) : null}
              </span>

              <span
                className={`shrink-0 text-[11.5px] font-black ${
                  faol ? 'text-white/85' : 'text-app-text-muted'
                }`}
              >
                {v.hajm}
              </span>

              {/* Tanlangani belgisi — rangdan tashqari ikkinchi ishora (rang
                  ko'rmaydiganlar uchun ham ajralib tursin). */}
              <span
                aria-hidden
                className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${
                  faol ? 'bg-white/22' : 'bg-transparent ring-1 ring-app-border'
                }`}
              >
                {faol ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
