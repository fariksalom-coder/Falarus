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
import { useLocale } from '../../context/LocaleContext';

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
  embedded?: boolean;
};

export default function PartnerIncomingRequests({ onBack, onAccepted, embedded = false }: Props) {
  const { token } = useAuth();
  const { t } = useLocale();
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState('');

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
    setError('');
    try {
      await acceptRequest(token, id);
      onAccepted();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.loadError');
      if (message.toLowerCase().includes('allaqachon javob berilgan')) {
        onAccepted();
        return;
      }
      setError(message);
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
      {embedded ? (
        <div className="mb-1">
          <h2 className="text-lg font-bold text-app-text">{t('partner.incoming')}</h2>
          <p className="mt-0.5 text-sm text-app-text-muted">{t('partner.incomingSub')}</p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-app-border bg-app-surface text-app-text-muted transition-colors hover:bg-[var(--app-row-hover)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-app-text">{t('partner.incoming')}</h2>
            <p className="mt-0.5 text-sm text-app-text-muted">{t('partner.incomingSub')}</p>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B2A6B] border-t-transparent" />
        </div>
      )}

      {!loading && requests.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-16 text-center"
        >
          <Inbox className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-base font-semibold text-slate-500">{t('partner.noRequests')}</p>
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
              className="rounded-[24px] border border-app-border bg-app-surface p-5 shadow-app-card"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-lg font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-app-text">
                    {profile?.display_name ?? t('common.unknown')}
                  </h3>
                  {profile && (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <span className="rounded-full bg-app-icon-bg px-2.5 py-0.5 text-xs font-medium text-app-text-muted">
                        {t('partner.yearsOld', { age: profile.age })}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#071B5E]">
                        {LEVEL_LABELS[profile.language_level] ?? profile.language_level}
                      </span>
                    </div>
                  )}
                  {profile?.about && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-app-text-muted">
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
                  {t('partner.acceptRequest')}
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(req.id)}
                  disabled={isProcessing}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-sm font-bold text-app-text-muted transition-all hover:bg-[var(--app-row-hover)] disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  {t('partner.rejectRequest')}
                </button>
              </div>
            </motion.div>
          );
        })}
    </div>
  );
}
