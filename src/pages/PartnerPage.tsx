import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Clock, Users, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cancelPartnerRequest, getPartnerStatus, type PartnerStatus } from '../api/partner';
import PartnerProfileForm from '../components/partner/PartnerProfileForm';
import PartnerPeopleList from '../components/partner/PartnerPeopleList';
import PartnerIncomingRequests from '../components/partner/PartnerIncomingRequests';
import PartnerChat from '../components/partner/PartnerChat';

type View = 'loading' | 'guest' | 'profile-form' | 'chat-list' | 'chat' | 'waiting' | 'browse' | 'incoming';

export default function PartnerPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<View>('loading');
  const [status, setStatus] = useState<PartnerStatus | null>(null);
  const [cancelingRequest, setCancelingRequest] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    try {
      const s = await getPartnerStatus(token);
      setStatus(s);

      if (!s.hasProfile) {
        setView('profile-form');
      } else if (s.match) {
        setView('chat-list');
      } else if (s.outgoingRequest) {
        setView('waiting');
      } else {
        setView('browse');
      }
    } catch {
      setStatus(null);
      setView('profile-form');
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setView('guest');
      return;
    }
    loadStatus();
  }, [token, loadStatus]);

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

  const handleCancelRequest = useCallback(async () => {
    if (!token || !status?.outgoingRequest?.id || cancelingRequest) return;
    setCancelingRequest(true);
    try {
      await cancelPartnerRequest(token, status.outgoingRequest.id);
      await loadStatus();
    } finally {
      setCancelingRequest(false);
    }
  }, [token, status?.outgoingRequest?.id, cancelingRequest, loadStatus]);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#F8FAFC',
        backgroundImage: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
      }}
    >
      <main
        className={
          view === 'chat'
            ? 'mx-auto max-w-4xl px-0 py-0 sm:px-0 sm:py-0'
            : 'mx-auto max-w-4xl px-4 py-6 sm:px-5 sm:py-8'
        }
      >
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

          {view === 'guest' && (
            <motion.div
              key="guest"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-md"
            >
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                  <LogIn className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-slate-900">Sherik bilan o‘rganish</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Sherik topish va chat uchun akkauntingizga kiring
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="mt-6 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3.5 text-base font-bold text-white shadow-[0_8px_24px_rgba(37,99,235,0.3)] transition-all hover:shadow-[0_12px_32px_rgba(37,99,235,0.4)]"
                >
                  Kirish
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
              <PartnerProfileForm
                onSaved={handleProfileSaved}
                onBack={status?.hasProfile ? () => {
                  if (status?.match) setView('chat-list');
                  else if (status?.outgoingRequest) setView('waiting');
                  else setView('browse');
                } : undefined}
              />
            </motion.div>
          )}

          {view === 'browse' && (
            <motion.div
              key="browse"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="mx-auto mb-4 flex max-w-lg justify-end">
                <button
                  type="button"
                  onClick={() => setView('profile-form')}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Anketani tahrirlash
                </button>
              </div>
              <PartnerPeopleList
                onRequestSent={handleRequestSent}
                incomingCount={status?.incomingRequestsCount ?? 0}
                onShowIncoming={() => setView('incoming')}
              />
            </motion.div>
          )}

          {view === 'chat-list' && status?.match && (
            <motion.div
              key="chat-list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-lg"
            >
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
                <h2 className="text-xl font-bold text-slate-900">Chatlar</h2>
                <p className="mt-1 text-sm text-slate-500">Sherigingiz bilan yozishmalar</p>

                <button
                  type="button"
                  onClick={() => setView('chat')}
                  className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                    {(status.match.partner_profile?.display_name ?? 'S')
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-900">
                      {status.match.partner_profile?.display_name ?? 'Sherik'}
                    </p>
                    <p className="truncate text-sm text-slate-500">Chatni ochish</p>
                  </div>
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                </button>
              </div>
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
                  Javob kutilmoqda. Sherik qabul qilgandan so'ng chat ochiladi.
                </p>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    So'rov yuborildi
                  </p>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {status.outgoingRequest?.receiver_profile?.display_name ?? `ID: ${status.outgoingRequest?.receiver_id ?? '-'}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Sherik javobini kutyapsiz
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelRequest}
                  disabled={cancelingRequest || !status.outgoingRequest}
                  className="mt-4 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelingRequest ? 'Bekor qilinmoqda...' : 'So\'rovni bekor qilish'}
                </button>
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
              <PartnerChat
                match={status.match}
                onEnded={handlePartnershipEnded}
                onBack={() => setView('chat-list')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
