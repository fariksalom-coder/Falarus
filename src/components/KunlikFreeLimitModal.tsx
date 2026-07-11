import { useNavigate } from 'react-router-dom';
import { X, Crown } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';

type KunlikFreeLimitModalProps = {
  onClose: () => void;
};

export default function KunlikFreeLimitModal({ onClose }: KunlikFreeLimitModalProps) {
  const navigate = useNavigate();
  const { t } = useLocale();

  const openPricing = () => {
    onClose();
    navigate('/tariflar');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md rounded-[24px] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kunlik-free-limit-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
          aria-label={t('common.close')}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2">
            <Crown className="h-6 w-6 text-[#0B2A6B]" />
          </div>
          <h2 id="kunlik-free-limit-title" className="text-xl font-bold text-slate-900">
            {t('kunlik.freeLimitTitle')}
          </h2>
        </div>
        <p className="mb-6 text-[15px] leading-relaxed text-slate-600">{t('kunlik.freeLimitBody')}</p>
        <button
          type="button"
          onClick={openPricing}
          className="w-full rounded-2xl bg-[#0B2A6B] px-4 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(11,42,107,0.28)] transition-colors hover:bg-[#071B5E]"
        >
          {t('kunlik.chooseTariff')}
        </button>
      </div>
    </div>
  );
}
