import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, SendHorizontal, X } from 'lucide-react';
import { cancelPartnerRequest, getOutgoingRequests, type PartnerRequest } from '../../api/partner';
import { useAuth } from '../../context/AuthContext';

type Props = {
  onBack: () => void;
  onUpdated: () => void;
};

export default function PartnerOutgoingRequests({ onBack, onUpdated }: Props) {
  const { token } = useAuth();
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    getOutgoingRequests(token)
      .then(setRequests)
      .catch(() => setError('Chiquvchi so\'rovlarni yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleCancel = async (requestId: number) => {
    if (!token) return;
    setCancelingId(requestId);
    setError('');
    try {
      await cancelPartnerRequest(token, requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Chiquvchi so'rovlar</h2>
          <p className="mt-0.5 text-sm text-slate-500">Siz yuborgan sheriklik so'rovlari</p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      )}

      {!loading && requests.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-16 text-center"
        >
          <SendHorizontal className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-base font-semibold text-slate-500">Chiquvchi so'rovlar yo'q</p>
        </motion.div>
      )}

      {!loading &&
        requests.map((req) => {
          const profile = req.receiver_profile;
          const initials = (profile?.display_name ?? '?')
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          const isCanceling = cancelingId === req.id;

          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-lg font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-slate-900">
                    {profile?.display_name ?? `ID: ${req.receiver_id}`}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">Javob kutilmoqda</p>
                  {profile?.about && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{profile.about}</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCancel(req.id)}
                disabled={isCanceling}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                {isCanceling ? 'Bekor qilinmoqda...' : 'So\'rovni bekor qilish'}
              </button>
            </motion.div>
          );
        })}
    </div>
  );
}
