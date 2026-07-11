import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, Inbox } from 'lucide-react';
import { getPartnerPeople, sendPartnerRequest, type PartnerPerson } from '../../api/partner';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import PartnerPersonCard from './PartnerPersonCard';

type Props = {
  onRequestSent: () => void;
  incomingCount: number;
  outgoingCount: number;
  initiallyRequestedIds?: number[];
  onShowIncoming: () => void;
  onShowOutgoing: () => void;
  showRequestNav?: boolean;
  canSendRequests?: boolean;
  embedded?: boolean;
};

export default function PartnerPeopleList({
  onRequestSent,
  incomingCount,
  outgoingCount,
  initiallyRequestedIds = [],
  onShowIncoming,
  onShowOutgoing,
  showRequestNav = true,
  canSendRequests = true,
  embedded = false,
}: Props) {
  const { token } = useAuth();
  const { t } = useLocale();
  const [people, setPeople] = useState<PartnerPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<number | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<number>>(new Set(initiallyRequestedIds));
  const [error, setError] = useState('');

  useEffect(() => {
    setRequestedIds(new Set(initiallyRequestedIds));
  }, [initiallyRequestedIds]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getPartnerPeople(token)
      .then(setPeople)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleSendRequest = async (userId: number) => {
    if (!token) return;
    setSendingTo(userId);
    setError('');
    try {
      await sendPartnerRequest(token, userId);
      setRequestedIds((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
      onRequestSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.loadError'));
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center justify-between gap-2">
        {!embedded ? (
          <div>
            <h2 className="text-xl font-bold text-app-text">{t('partner.profiles')}</h2>
            <p className="mt-0.5 text-sm text-app-text-muted">{t('partner.profilesSub')}</p>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-app-text">{t('partner.profiles')}</h2>
            <p className="mt-0.5 text-sm text-app-text-muted">{t('partner.profilesSub')}</p>
          </div>
        )}
        {showRequestNav && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onShowIncoming}
              className="relative flex items-center gap-1.5 rounded-2xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-[#071B5E] transition-colors hover:bg-blue-100"
            >
              <Inbox className="h-4 w-4" />
              {t('partner.incoming')}
              {incomingCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0B2A6B] text-xs font-bold text-white">
                  {incomingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onShowOutgoing}
              className="relative flex items-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
            >
              {t('partner.outgoing')}
              {outgoingCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-bold text-white">
                  {outgoingCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B2A6B] border-t-transparent" />
        </div>
      )}

      {!loading && people.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-16 text-center"
        >
          <Users className="h-12 w-12 text-app-icon-fg" />
          <p className="mt-3 text-base font-semibold text-app-text-muted">{t('partner.noProfiles')}</p>
          <p className="mt-1 text-sm text-app-text-secondary">{t('partner.noProfilesSub')}</p>
        </motion.div>
      )}

      {!loading && people.length > 0 && (
        <div className="space-y-4">
          {people.map((person) => (
            <PartnerPersonCard
              key={person.user_id}
              person={person}
              onSendRequest={handleSendRequest}
              sending={sendingTo === person.user_id}
              requested={requestedIds.has(person.user_id)}
              canSendRequest={canSendRequests}
            />
          ))}
        </div>
      )}
    </div>
  );
}
