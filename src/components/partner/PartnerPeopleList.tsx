import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, Inbox } from 'lucide-react';
import { getPartnerPeople, sendPartnerRequest, type PartnerPerson } from '../../api/partner';
import { useAuth } from '../../context/AuthContext';
import PartnerPersonCard from './PartnerPersonCard';

type Props = {
  onRequestSent: () => void;
  incomingCount: number;
  onShowIncoming: () => void;
};

export default function PartnerPeopleList({ onRequestSent, incomingCount, onShowIncoming }: Props) {
  const { token } = useAuth();
  const [people, setPeople] = useState<PartnerPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<number | null>(null);
  const [error, setError] = useState('');

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
      onRequestSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Odamlar</h2>
          <p className="mt-0.5 text-sm text-slate-500">Sherik tanlang</p>
        </div>
        {incomingCount > 0 && (
          <button
            type="button"
            onClick={onShowIncoming}
            className="relative flex items-center gap-1.5 rounded-2xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <Inbox className="h-4 w-4" />
            Kiruvchi
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {incomingCount}
            </span>
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      )}

      {!loading && people.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-16 text-center"
        >
          <Users className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-base font-semibold text-slate-500">Hozircha odamlar yo'q</p>
          <p className="mt-1 text-sm text-slate-400">Yangi foydalanuvchilar tez orada paydo bo'ladi</p>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
