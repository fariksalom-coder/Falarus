import { X } from 'lucide-react';

export type Currency = 'UZS' | 'RUB' | 'USD';

const OPTIONS: { value: Currency; label: string; sub: string }[] = [
  { value: 'UZS', label: "O'zbek so'mi", sub: 'UZS' },
  { value: 'RUB', label: 'Rossiya rubli', sub: 'RUB' },
  { value: 'USD', label: "AQSh dollari", sub: 'USD' },
];

type CurrencyModalProps = {
  onClose: () => void;
  onSelect: (currency: Currency) => void;
};

export default function CurrencyModal({ onClose, onSelect }: CurrencyModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 text-slate-500"
          aria-label="Yopish"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          To'lov valyutasini tanlang
        </h2>
        <p className="text-slate-600 text-sm mb-6">
          Qaysi valyutada to'lamoqchisiz?
        </p>
        <div className="flex flex-col gap-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onSelect(opt.value); onClose(); }}
              className="flex items-center gap-4 w-full rounded-xl border-2 border-slate-200 p-4 text-left hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
            >
              <span className="text-2xl">
                {opt.value === 'UZS' ? '🇺🇿' : opt.value === 'RUB' ? '🇷🇺' : '🇺🇸'}
              </span>
              <div>
                <span className="font-semibold text-slate-900 block">{opt.value} — {opt.label}</span>
                <span className="text-sm text-slate-500">{opt.sub}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
