import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, LogIn, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getPartnerStatus,
  getCachedPartnerStatus,
  setCachedPartnerStatus,
  type PartnerStatus,
} from '../api/partner';
import PartnerProfileForm from '../components/partner/PartnerProfileForm';
import PartnerPeopleList from '../components/partner/PartnerPeopleList';
import PartnerIncomingRequests from '../components/partner/PartnerIncomingRequests';
import PartnerOutgoingRequests from '../components/partner/PartnerOutgoingRequests';
import PartnerChat from '../components/partner/PartnerChat';

type View = 'loading' | 'guest' | 'profile-form' | 'chat-list' | 'chat' | 'browse' | 'incoming' | 'outgoing';

export default function PartnerPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<View>('loading');
  const [status, setStatus] = useState<PartnerStatus | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<number | null>(null);
  const loadingStatusRef = useRef(false);

  const normalizeStatus = useCallback((s: PartnerStatus): PartnerStatus => {
    const matches = Array.isArray(s.matches) ? s.matches : [];
    const outgoingRequests = Array.isArray(s.outgoingRequests) ? s.outgoingRequests : [];
    return {
      ...s,
      matches,
      outgoingRequests,
      outgoingRequestsCount: typeof s.outgoingRequestsCount === 'number'
        ? s.outgoingRequestsCount
        : outgoingRequests.length,
    };
  }, []);

  const applyStatusToView = useCallback((s: PartnerStatus, forceViewTransition = true) => {
    const normalized = normalizeStatus(s);
    setStatus(normalized);
    setActiveMatchId((prev) => {
      if (!normalized.matches.length) return null;
      if (prev && normalized.matches.some((m) => m.id === prev)) return prev;
      return normalized.matches[0].id;
    });
    if (!forceViewTransition) {
      return;
    }
    if (!normalized.hasProfile) {
      setView('profile-form');
    } else if (normalized.matches.length > 0) {
      setView('chat-list');
    } else {
      setView('browse');
    }
  }, [normalizeStatus]);

  const loadStatus = useCallback(async (forceViewTransition = true) => {
    if (!token || loadingStatusRef.current) return;
    loadingStatusRef.current = true;
    try {
      const s = await getPartnerStatus(token);
      if (user?.id) setCachedPartnerStatus(user.id, s);
      applyStatusToView(s, forceViewTransition);
    } catch {
      if (forceViewTransition) {
        setStatus(null);
        setView('profile-form');
      }
    } finally {
      loadingStatusRef.current = false;
    }
  }, [token, user?.id, applyStatusToView]);

  useEffect(() => {
    if (!token) {
      setView('guest');
      return;
    }
    if (user?.id) {
      const cached = getCachedPartnerStatus(user.id);
      if (cached) applyStatusToView(cached);
    }
    loadStatus(true);
  }, [token, user?.id, loadStatus, applyStatusToView]);

  useEffect(() => {
    if (!token) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void loadStatus(false);
    }, 10000);
    return () => window.clearInterval(interval);
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

  const outgoingReceiverIds = status?.outgoingRequests?.map((r) => r.receiver_id) ?? [];
  const shouldHideGlobalNav =
    view === 'incoming' ||
    view === 'outgoing' ||
    (view === 'browse' && Boolean(status?.matches.length)) ||
    (view === 'profile-form' && Boolean(status?.hasProfile));

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('partner-nav-mode', {
        detail: { hideGlobalNav: shouldHideGlobalNav },
      })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent('partner-nav-mode', {
          detail: { hideGlobalNav: false },
        })
      );
    };
  }, [shouldHideGlobalNav]);

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
                  if (status?.matches.length) setView('chat-list');
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
              <div className="mx-auto mb-4 flex max-w-lg items-center justify-between gap-3">
                {status?.matches.length ? (
                  <button
                    type="button"
                    onClick={() => setView('chat-list')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Orqaga
                  </button>
                ) : (
                  <div />
                )}
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
                outgoingCount={status?.outgoingRequestsCount ?? 0}
                initiallyRequestedIds={outgoingReceiverIds}
                onShowIncoming={() => setView('incoming')}
                onShowOutgoing={() => setView('outgoing')}
                showRequestNav={!status?.matches.length}
                canSendRequests={true}
              />
            </motion.div>
          )}

          {view === 'chat-list' && status && status.matches.length > 0 && (
            <motion.div
              key="chat-list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-lg"
            >
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
                <h2 className="text-xl font-bold text-slate-900">Chatlar</h2>
                <p className="mt-1 text-sm text-slate-500">Sheriklaringiz bilan yozishmalar</p>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setView('browse')}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    Anketalar
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('incoming')}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    Kiruvchi ({status.incomingRequestsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('outgoing')}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                  >
                    Chiquvchi ({status.outgoingRequestsCount})
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {status.matches.map((match) => (
                    <button
                      key={match.id}
                      type="button"
                      onClick={() => {
                        setActiveMatchId(match.id);
                        setView('chat');
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                        {(match.partner_profile?.display_name ?? 'S')
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-slate-900">
                          {match.partner_profile?.display_name ?? 'Sherik'}
                        </p>
                        <p className="truncate text-sm text-slate-500">Chatni ochish</p>
                      </div>
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                    </button>
                  ))}
                </div>
              </div>
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
                  if (status?.matches.length) setView('chat-list');
                  else setView('browse');
                }}
                onAccepted={handleAccepted}
              />
            </motion.div>
          )}

          {view === 'outgoing' && (
            <motion.div
              key="outgoing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <PartnerOutgoingRequests
                onBack={() => {
                  if (status?.matches.length) setView('chat-list');
                  else setView('browse');
                }}
                onUpdated={loadStatus}
              />
            </motion.div>
          )}

          {view === 'chat' && status && activeMatchId && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PartnerChat
                match={status.matches.find((m) => m.id === activeMatchId) ?? status.matches[0]}
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
