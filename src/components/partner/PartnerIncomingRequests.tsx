import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, X, Inbox } from 'lucide-react';
import {
  getIncomingRequests,
  acceptRequest,
  rejectRequest,
  type PartnerRequest,
} from '../../api/partner';
import { useAuth } from '../../context/AuthContext';

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'A1',
  elementary: 'A2',
  intermediate: 'B1',
  upper: 'B2',
  advanced: 'C1',
};

type Props = {
  onBack: () => void;
  onAccepted: () => void;
};

export default function PartnerIncomingRequests({ onBack, onAccepted }: Props) {
  const { token } = useAuth();
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getIncomingRequests(token)
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async (id: number) => {
    if (!token) return;
    setProcessingId(id);
    try {
      await acceptRequest(token, id);
      onAccepted();
    } catch {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!token) return;
    setProcessingId(id);
    try {
      await rejectRequest(token, id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {}
    setProcessingId(null);
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
          <h2 className="text-xl font-bold text-slate-900">Kiruvchi so'rovlar</h2>
          <p className="mt-0.5 text-sm text-slate-500">Sizga yuborilgan naparniklik so'rovlari</p>
        </div>
      </div>

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
          <Inbox className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-base font-semibold text-slate-500">Hozircha so'rovlar yo'q</p>
        </motion.div>
      )}

      {!loading &&
        requests.map((req) => {
          const profile = req.sender_profile;
          const initials = (profile?.display_name ?? '?')
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          const isProcessing = processingId === req.id;

          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-lg font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-slate-900">
                    {profile?.display_name ?? 'Noma\'lum'}
                  </h3>
                  {profile && (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        {profile.age} yosh
                      </span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        {LEVEL_LABELS[profile.language_level] ?? profile.language_level}
                      </span>
                    </div>
                  )}
                  {profile?.about && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                      {profile.about}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleAccept(req.id)}
                  disabled={isProcessing}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-[0_6px_20px_rgba(34,165,82,0.25)] transition-all hover:bg-emerald-600 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Qabul qilish
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(req.id)}
                  disabled={isProcessing}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Rad etish
                </button>
              </div>
            </motion.div>
          );
        })}
    </div>
  );
}
