import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Clock, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { getPartnerStatus, type PartnerStatus } from '../api/partner';
import PartnerProfileForm from '../components/partner/PartnerProfileForm';
import PartnerPeopleList from '../components/partner/PartnerPeopleList';
import PartnerIncomingRequests from '../components/partner/PartnerIncomingRequests';
import PartnerChat from '../components/partner/PartnerChat';

type View = 'loading' | 'paywall' | 'profile-form' | 'chat' | 'waiting' | 'browse' | 'incoming';

export default function PartnerPage() {
  const { token } = useAuth();
  const { access, accessLoaded } = useAccess();
  const navigate = useNavigate();

  const [view, setView] = useState<View>('loading');
  const [status, setStatus] = useState<PartnerStatus | null>(null);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    try {
      const s = await getPartnerStatus(token);
      setStatus(s);

      if (!s.hasProfile) {
        setView('profile-form');
      } else if (s.match) {
        setView('chat');
      } else if (s.outgoingRequest) {
        setView('waiting');
      } else {
        setView('browse');
      }
    } catch {
      setView('browse');
    }
  }, [token]);

  useEffect(() => {
    if (!accessLoaded) return;
    if (!access?.subscription_active) {
      setView('paywall');
      return;
    }
    loadStatus();
  }, [accessLoaded, access?.subscription_active, loadStatus]);

  const handleProfileSaved = () => {
    loadStatus();
  };

  const handleRequestSent = () => {
    loadStatus();
  };

  const handleAccepted = () => {
    loadStatus();
  };

  const handlePartnershipEnded = () => {
    loadStatus();
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#F8FAFC',
        backgroundImage: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
      }}
    >
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-5 sm:py-8">
        {view !== 'chat' && view !== 'incoming' && (
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[2rem]">
              Naparnik
            </h1>
            <p className="mt-1 text-sm text-slate-500">Rus tilini birga o'rganing</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-20"
            >
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </motion.div>
          )}

          {view === 'paywall' && (
            <motion.div
              key="paywall"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-md"
            >
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                  <Lock className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-slate-900">
                  Naparnik funksiyasidan foydalanish uchun obuna kerak
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Obuna orqali naparnik topish, suhbat qilish va tilni birga o'rganish imkoniyatiga ega bo'lasiz
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/tariflar')}
                  className="mt-6 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3.5 text-base font-bold text-white shadow-[0_8px_24px_rgba(37,99,235,0.3)] transition-all hover:shadow-[0_12px_32px_rgba(37,99,235,0.4)]"
                >
                  Obunani olish
                </button>
              </div>
            </motion.div>
          )}

          {view === 'profile-form' && (
            <motion.div
              key="profile-form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <PartnerProfileForm onSaved={handleProfileSaved} />
            </motion.div>
          )}

          {view === 'browse' && status && (
            <motion.div
              key="browse"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <PartnerPeopleList
                onRequestSent={handleRequestSent}
                incomingCount={status.incomingRequestsCount}
                onShowIncoming={() => setView('incoming')}
              />
            </motion.div>
          )}

          {view === 'waiting' && status && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-md"
            >
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
                  <Clock className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-slate-900">So'rov yuborildi</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Javob kutilmoqda. Naparnik qabul qilgandan so'ng chat ochiladi.
                </p>
              </div>

              {status.incomingRequestsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setView('incoming')}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3.5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100"
                >
                  <Users className="h-4 w-4" />
                  Kiruvchi so'rovlar ({status.incomingRequestsCount})
                </button>
              )}
            </motion.div>
          )}

          {view === 'incoming' && (
            <motion.div
              key="incoming"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <PartnerIncomingRequests
                onBack={() => {
                  if (status?.outgoingRequest) setView('waiting');
                  else setView('browse');
                }}
                onAccepted={handleAccepted}
              />
            </motion.div>
          )}

          {view === 'chat' && status?.match && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PartnerChat match={status.match} onEnded={handlePartnershipEnded} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
