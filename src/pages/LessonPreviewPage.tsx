import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, BookOpen, ListTodo } from 'lucide-react';
import * as accessApi from '../api/access';
import PaywallModal from '../components/PaywallModal';
import PendingPaymentModal from '../components/PendingPaymentModal';
import { usePaymentStatus } from '../hooks/usePaymentStatus';

export default function LessonPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [preview, setPreview] = useState<accessApi.LessonPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { hasPendingPayment } = usePaymentStatus();

  useEffect(() => {
    const lessonId = id ? parseInt(id, 10) : NaN;
    if (!token || Number.isNaN(lessonId)) {
      setLoading(false);
      return;
    }
    accessApi
      .getLessonPreview(token, lessonId)
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <p className="text-slate-600">Dars topilmadi</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-lg mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{preview.title}</h1>
          </div>
          <p className="text-slate-600 mb-4">{preview.description}</p>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ListTodo className="w-4 h-4" />
            <span>{preview.tasks_preview} ta mashq (preview)</span>
          </div>
          {preview.preview_words.length > 0 && (
            <div className="mt-4 p-3 bg-slate-50 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">So'zlar (namuna)</p>
              <ul className="space-y-1">
                {preview.preview_words.map((w, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="text-slate-800">{w.word}</span>
                    <span className="text-slate-600">{w.translation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-600" />
            To'liq kirish qulflangan
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            Bu dars {preview.tasks_preview} ta mashq va ko'proq materiallarni o'z ichiga oladi.
            Barcha darslar va so'zlarga kirish uchun tarifni sotib oling.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            🚀 To'liq kursni ochish
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-6 text-slate-600 hover:text-slate-900 text-sm"
        >
          ← Orqaga
        </button>
      </main>

      {modalOpen && hasPendingPayment && (
        <PendingPaymentModal onClose={() => setModalOpen(false)} />
      )}
      {modalOpen && !hasPendingPayment && (
        <PaywallModal onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
