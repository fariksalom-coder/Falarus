import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn } from 'lucide-react';
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
import PartnerChatsSection from '../components/partner/PartnerChatsSection';
import PartnerAdminChat from '../components/partner/PartnerAdminChat';
import SavolJavobChat from '../components/partner/SavolJavobChat';

type HubTab = 'anketas' | 'incoming' | 'outgoing';
type View = 'loading' | 'guest' | 'profile-form' | 'hub' | 'admin-chat' | 'group-chat' | 'partner-chat';

export default function PartnerPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<View>('loading');
  const [hubTab, setHubTab] = useState<HubTab>('anketas');
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
    if (!forceViewTransition) return;
    if (!normalized.hasProfile) {
      setView('profile-form');
    } else {
      setView('hub');
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
      if (cached) applyStatusToView(cached, false);
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

  const outgoingReceiverIds = status?.outgoingRequests?.map((r) => r.receiver_id) ?? [];

  const shouldHideGlobalNav =
    view === 'admin-chat' ||
    view === 'group-chat' ||
    view === 'partner-chat' ||
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

  const incomingCount = status?.incomingRequestsCount ?? 0;
  const outgoingCount = status?.outgoingRequestsCount ?? 0;

  return (
    <div
      className="min-h-screen pb-24"
      style={{
        backgroundColor: '#F8FAFC',
        backgroundImage: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2FF 55%, #F1F5F9 100%)',
      }}
    >
      <main
        className={
          view === 'partner-chat'
            ? 'mx-auto max-w-4xl px-0 py-0'
            : 'mx-auto max-w-lg px-4 py-5 sm:px-5 sm:py-6'
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
            >
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                  <LogIn className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-slate-900">Suhbat va sheriklar</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Chatlar, guruh va sherik topish uchun kiring
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="mt-6 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3.5 text-base font-bold text-white shadow-[0_8px_24px_rgba(37,99,235,0.3)]"
                >
                  Kirish
                </button>
              </div>
            </motion.div>
          )}

          {view === 'profile-form' && (
            <motion.div key="profile-form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <PartnerProfileForm
                onSaved={() => loadStatus()}
                onBack={status?.hasProfile ? () => setView('hub') : undefined}
              />
            </motion.div>
          )}

          {view === 'hub' && status && (
            <motion.div key="hub" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Suhbat</h1>
                  <p className="mt-0.5 text-sm text-slate-500">Sheriklar, guruh va admin</p>
                </div>
                <button
                  type="button"
                  onClick={() => setView('profile-form')}
                  className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm"
                >
                  Anketa
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-sm">
                {(
                  [
                    { id: 'anketas' as const, label: 'Anketalar' },
                    { id: 'incoming' as const, label: `Kiruvchi (${incomingCount})` },
                    { id: 'outgoing' as const, label: `Chiquvchi (${outgoingCount})` },
                  ] as const
                ).map((tab) => {
                  const active = hubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setHubTab(tab.id)}
                      className={`rounded-xl px-2 py-2.5 text-center text-[12px] font-bold leading-tight transition-colors sm:text-[13px] ${
                        active
                          ? 'bg-blue-600 text-white shadow-[0_6px_16px_rgba(37,99,235,0.28)]'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                {hubTab === 'anketas' ? (
                  <PartnerPeopleList
                    onRequestSent={() => loadStatus()}
                    incomingCount={incomingCount}
                    outgoingCount={outgoingCount}
                    initiallyRequestedIds={outgoingReceiverIds}
                    onShowIncoming={() => setHubTab('incoming')}
                    onShowOutgoing={() => setHubTab('outgoing')}
                    showRequestNav={false}
                    canSendRequests
                    embedded
                  />
                ) : null}
                {hubTab === 'incoming' ? (
                  <PartnerIncomingRequests
                    embedded
                    onBack={() => setHubTab('anketas')}
                    onAccepted={() => loadStatus()}
                  />
                ) : null}
                {hubTab === 'outgoing' ? (
                  <PartnerOutgoingRequests
                    embedded
                    onBack={() => setHubTab('anketas')}
                    onUpdated={() => loadStatus()}
                  />
                ) : null}
              </div>

              <PartnerChatsSection
                matches={status.matches}
                onOpenAdmin={() => setView('admin-chat')}
                onOpenGroup={() => setView('group-chat')}
                onOpenPartner={(matchId) => {
                  setActiveMatchId(matchId);
                  setView('partner-chat');
                }}
              />
            </motion.div>
          )}

          {view === 'partner-chat' && status && activeMatchId && (
            <motion.div key="partner-chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PartnerChat
                match={status.matches.find((m) => m.id === activeMatchId) ?? status.matches[0]}
                onEnded={() => loadStatus()}
                onBack={() => setView('hub')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {view === 'admin-chat' ? <PartnerAdminChat onBack={() => setView('hub')} /> : null}
      {view === 'group-chat' ? <SavolJavobChat onBack={() => setView('hub')} /> : null}
    </div>
  );
}
