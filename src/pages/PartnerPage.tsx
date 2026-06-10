import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, LogIn } from 'lucide-react';
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

type PageView = 'loading' | 'guest' | 'hub';

type OverlayView =
  | null
  | 'profile-form'
  | 'browse'
  | 'incoming'
  | 'outgoing'
  | 'admin-chat'
  | 'group-chat'
  | 'partner-chat';

export default function PartnerPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<PageView>('loading');
  const [overlay, setOverlay] = useState<OverlayView>(null);
  const [status, setStatus] = useState<PartnerStatus | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<number | null>(null);
  const loadingStatusRef = useRef(false);
  const inlineFormRef = useRef<HTMLDivElement>(null);

  const normalizeStatus = useCallback((s: PartnerStatus): PartnerStatus => {
    const matches = Array.isArray(s.matches) ? s.matches : [];
    const outgoingRequests = Array.isArray(s.outgoingRequests) ? s.outgoingRequests : [];
    return {
      ...s,
      matches,
      outgoingRequests,
      outgoingRequestsCount:
        typeof s.outgoingRequestsCount === 'number' ? s.outgoingRequestsCount : outgoingRequests.length,
    };
  }, []);

  const scrollToInlineForm = useCallback(() => {
    inlineFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const openAnketalar = useCallback(() => {
    if (!status) return;
    if (status.hasProfile) {
      setOverlay('browse');
      return;
    }
    scrollToInlineForm();
  }, [status, scrollToInlineForm]);

  const applyStatusToView = useCallback(
    (s: PartnerStatus, forceViewTransition = true) => {
      const normalized = normalizeStatus(s);
      setStatus(normalized);
      setActiveMatchId((prev) => {
        if (!normalized.matches.length) return null;
        if (prev && normalized.matches.some((m) => m.id === prev)) return prev;
        return normalized.matches[0].id;
      });

      if (!forceViewTransition) return;

      setView('hub');
    },
    [normalizeStatus]
  );

  const loadStatus = useCallback(
    async (forceViewTransition = true) => {
      if (!token || loadingStatusRef.current) return;
      loadingStatusRef.current = true;
      try {
        const s = await getPartnerStatus(token);
        if (user?.id) setCachedPartnerStatus(user.id, s);
        applyStatusToView(s, forceViewTransition);
      } catch {
        if (forceViewTransition) {
          setStatus(null);
          setView('hub');
        }
      } finally {
        loadingStatusRef.current = false;
      }
    },
    [token, user?.id, applyStatusToView]
  );

  useEffect(() => {
    if (!token) {
      setView('guest');
      setOverlay(null);
      return;
    }
    if (user?.id) {
      const cached = getCachedPartnerStatus(user.id);
      if (cached) applyStatusToView(cached, false);
    }
    void loadStatus(true);
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

  const shouldHideGlobalNav = overlay !== null;

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

  const hubActionButtons = status ? (
    <div className="grid grid-cols-3 gap-2">
      {(
        [
          { id: 'browse' as const, label: 'Anketalar', count: null, onClick: openAnketalar },
          {
            id: 'incoming' as const,
            label: 'Kiruvchi',
            count: incomingCount,
            onClick: () => setOverlay('incoming'),
          },
          {
            id: 'outgoing' as const,
            label: 'Chiquvchi',
            count: outgoingCount,
            onClick: () => setOverlay('outgoing'),
          },
        ] as const
      ).map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={action.onClick}
          className="rounded-2xl border border-slate-200/90 bg-white px-2 py-3 text-center shadow-sm transition-colors hover:bg-slate-50 active:scale-[0.98]"
        >
          <span className="block text-[12px] font-bold leading-tight text-slate-800 sm:text-[13px]">
            {action.label}
          </span>
          {action.count != null && action.count > 0 ? (
            <span className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
              {action.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  ) : null;

  const pageBackground = {
    backgroundColor: '#F8FAFC',
    backgroundImage: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2FF 40%, #F1F5F9 100%)',
  };

  return (
    <div className="min-h-screen pb-24" style={pageBackground}>
      <main
        className={
          overlay === 'partner-chat'
            ? 'mx-auto max-w-4xl px-0 py-0'
            : 'mx-auto max-w-lg px-4 py-4 sm:px-5 sm:py-5'
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
            <motion.div key="guest" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                  <LogIn className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-slate-900">Suhbat va sheriklar</h2>
                <p className="mt-2 text-sm text-slate-500">Chatlar, guruh va sherik topish uchun kiring</p>
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

          {view === 'hub' && status && (
            <motion.div key="hub" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Suhbat</h1>
                  <p className="mt-0.5 text-sm text-slate-500">Chatlar va sheriklar</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (status.hasProfile) {
                      setOverlay('profile-form');
                      return;
                    }
                    scrollToInlineForm();
                  }}
                  className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm"
                >
                  Anketa
                </button>
              </div>

              <PartnerChatsSection
                matches={status.matches}
                onOpenAdmin={() => setOverlay('admin-chat')}
                onOpenGroup={() => setOverlay('group-chat')}
                onOpenPartner={(matchId) => {
                  setActiveMatchId(matchId);
                  setOverlay('partner-chat');
                }}
              />

              {hubActionButtons}

              {!status.hasProfile ? (
                <div
                  ref={inlineFormRef}
                  className="mt-5 rounded-[24px] border border-blue-100 bg-white p-4 shadow-[0_14px_34px_rgba(148,163,184,0.12)] sm:p-5"
                >
                  <PartnerProfileForm
                    variant="create"
                    onSaved={() => void loadStatus(false)}
                  />
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {overlay === 'profile-form' && status?.hasProfile ? (
        <div className="fixed inset-0 z-40 overflow-y-auto pb-24" style={pageBackground}>
          <div className="mx-auto max-w-lg px-4 py-4 sm:px-5 sm:py-5">
            <PartnerProfileForm
              variant="edit"
              onSaved={() => {
                void loadStatus(false).then(() => setOverlay(null));
              }}
              onBack={() => setOverlay(null)}
            />
          </div>
        </div>
      ) : null}

      {overlay === 'browse' && status ? (
        <div className="fixed inset-0 z-40 overflow-y-auto pb-24" style={pageBackground}>
          <div className="mx-auto max-w-lg px-4 py-4 sm:px-5 sm:py-5">
            <div className="mb-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOverlay(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm"
                aria-label="Orqaga"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Anketalar</h1>
                <p className="text-sm text-slate-500">Sherik tanlang</p>
              </div>
            </div>
            <PartnerPeopleList
              onRequestSent={() => loadStatus()}
              incomingCount={incomingCount}
              outgoingCount={outgoingCount}
              initiallyRequestedIds={outgoingReceiverIds}
              onShowIncoming={() => setOverlay('incoming')}
              onShowOutgoing={() => setOverlay('outgoing')}
              showRequestNav={false}
              canSendRequests
            />
          </div>
        </div>
      ) : null}

      {overlay === 'incoming' ? (
        <div className="fixed inset-0 z-40 overflow-y-auto pb-24" style={pageBackground}>
          <div className="mx-auto max-w-lg px-4 py-4 sm:px-5 sm:py-5">
            <PartnerIncomingRequests
              onBack={() => setOverlay(null)}
              onAccepted={() => loadStatus()}
            />
          </div>
        </div>
      ) : null}

      {overlay === 'outgoing' ? (
        <div className="fixed inset-0 z-40 overflow-y-auto pb-24" style={pageBackground}>
          <div className="mx-auto max-w-lg px-4 py-4 sm:px-5 sm:py-5">
            <PartnerOutgoingRequests
              onBack={() => setOverlay(null)}
              onUpdated={() => loadStatus()}
            />
          </div>
        </div>
      ) : null}

      {overlay === 'partner-chat' && status && activeMatchId ? (
        <div className="fixed inset-0 z-40 bg-[#F8FAFC]">
          <PartnerChat
            match={status.matches.find((m) => m.id === activeMatchId) ?? status.matches[0]}
            onEnded={() => loadStatus()}
            onBack={() => setOverlay(null)}
          />
        </div>
      ) : null}

      {overlay === 'admin-chat' ? <PartnerAdminChat onBack={() => setOverlay(null)} /> : null}
      {overlay === 'group-chat' ? <SavolJavobChat onBack={() => setOverlay(null)} /> : null}
    </div>
  );
}
