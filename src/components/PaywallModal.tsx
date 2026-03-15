import { useNavigate } from 'react-router-dom';
import { X, Lock } from 'lucide-react';

type PaywallModalProps = {
  onClose: () => void;
  title?: string;
  description?: string;
  buttonText?: string;
  previewLabel?: string;
  onPreview?: () => void;
};

export default function PaywallModal({
  onClose,
  title = "🔒 Bu dars faqat obuna bo'lganlar uchun",
  description = "Barcha darslar, so'zlar va mashqlarga kirish uchun tarifni sotib oling. Rus tilini cheklovsiz o'rganing.",
  buttonText = '🚀 Barcha darslarni ochish',
  previewLabel,
  onPreview,
}: PaywallModalProps) {
  const navigate = useNavigate();

  const handleOpenPricing = () => {
    onClose();
    navigate('/tariflar');
  };

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
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-xl">
            <Lock className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        </div>
        <p className="text-slate-600 mb-6">{description}</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleOpenPricing}
            className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            {buttonText}
          </button>
          {onPreview && previewLabel && (
            <button
              type="button"
              onClick={() => { onPreview(); }}
              className="w-full py-2 px-4 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50"
            >
              {previewLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
