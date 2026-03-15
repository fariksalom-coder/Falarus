import { useNavigate } from 'react-router-dom';
import { X, Clock } from 'lucide-react';

type PendingPaymentModalProps = {
  onClose: () => void;
};

export default function PendingPaymentModal({ onClose }: PendingPaymentModalProps) {
  const navigate = useNavigate();

  const handleGoToProfile = () => {
    onClose();
    navigate('/profile');
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
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">To'lov tekshirilmoqda</h2>
        </div>
        <p className="text-slate-600 mb-6 whitespace-pre-line">
          Sizning to'lovingiz qabul qilindi va administrator tomonidan tekshirilmoqda.
          {'\n\n'}
          Tasdiqlangandan so'ng sizga barcha darslar va lug'at ochiladi.
        </p>
        <button
          type="button"
          onClick={handleGoToProfile}
          className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Profilga o'tish
        </button>
      </div>
    </div>
  );
}
