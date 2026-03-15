import { useNavigate } from 'react-router-dom';
import { X, Lock } from 'lucide-react';

type PaywallModalProps = {
  onClose: () => void;
  title?: string;
  description?: string;
  buttonText?: string;
};

export default function PaywallModal({
  onClose,
  title = "🔒 Bu dars yopiq",
  description = `Kursni xarid qiling va quyidagi imkoniyatlarga ega bo'ling:
📚 100+ rus tili grammatika darslari
🧠 2600+ eng kerakli so'zlar
🎮 O'yin va mashqlar orqali oson o'rganish`,
  buttonText = "🚀 Kursni sotib olish",
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
        <p className="text-slate-600 mb-6 whitespace-pre-line">
          <strong className="font-bold text-slate-800">
            {description.split('\n')[0]}
          </strong>
          {'\n' + description.split('\n').slice(1).join('\n')}
        </p>
        <button
          type="button"
          onClick={handleOpenPricing}
          className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
