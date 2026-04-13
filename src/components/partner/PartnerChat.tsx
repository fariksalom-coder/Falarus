import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Send, LogOut, ArrowLeft } from 'lucide-react';
import {
  getChatMessages,
  sendChatMessage,
  endPartnership,
  type PartnerMatch,
  type ChatMessage,
} from '../../api/partner';
import { useAuth } from '../../context/AuthContext';
import { usePartnerRealtimeChat } from '../../hooks/usePartnerRealtimeChat';
import { isRealtimeEnabled } from '../../lib/supabaseClient';

type Props = {
  match: PartnerMatch;
  onEnded: () => void;
  onBack?: () => void;
};

const SM_BREAKPOINT = 640;
const NAV_BAR_HEIGHT = 79;

function useVisualViewport() {
  const [dims, setDims] = useState(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    return {
      height: vv?.height ?? window.innerHeight,
      offsetTop: vv?.offsetTop ?? 0,
      isDesktop: typeof window !== 'undefined' ? window.innerWidth >= SM_BREAKPOINT : true,
    };
  });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () =>
      setDims({
        height: vv.height,
        offsetTop: vv.offsetTop,
        isDesktop: window.innerWidth >= SM_BREAKPOINT,
      });
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return dims;
}

export default function PartnerChat({ match, onEnded, onBack }: Props) {
  const { token, user } = useAuth();
  const userId = user?.id;
  const partner = match.partner_profile;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { realtimeMessages, markSeen } = usePartnerRealtimeChat(match.id);
  const vp = useVisualViewport();

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getChatMessages(token, match.id)
      .then((msgs) => {
        setMessages(msgs);
        markSeen(msgs.map((m) => m.id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, match.id]);

  useEffect(() => {
    if (!token || isRealtimeEnabled) return;
    const interval = setInterval(() => {
      void getChatMessages(token, match.id)
        .then((msgs) => {
          setMessages(msgs);
          markSeen(msgs.map((m) => m.id));
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [token, match.id, markSeen]);

  const allMessages = useMemo(() => {
    const map = new Map<number, ChatMessage>();
    for (const m of messages) map.set(m.id, m);
    for (const m of realtimeMessages) map.set(m.id, m);
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [messages, realtimeMessages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [allMessages.length, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [vp.height, scrollToBottom]);

  const handleSend = async () => {
    if (!token || !text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      const msg = await sendChatMessage(token, match.id, content);
      markSeen([msg.id]);
      setMessages((prev) => [...prev, msg]);
    } catch {}
    setSending(false);
  };

  const handleEnd = async () => {
    if (!token) return;
    setEnding(true);
    try {
      await endPartnership(token);
      onEnded();
    } catch {
      setEnding(false);
    }
  };

  const initials = (partner?.display_name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const topOffset = vp.isDesktop ? NAV_BAR_HEIGHT : vp.offsetTop;
  const chatHeight = vp.isDesktop ? vp.height - NAV_BAR_HEIGHT : vp.height;

  const chat = (
    <div
      className="fixed inset-x-0 z-[60] flex flex-col bg-[#F8FAFC]"
      style={{ top: topOffset, height: chatHeight }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200/80 bg-[#F8FAFC] px-4 pb-3 pt-3 max-sm:pt-[max(env(safe-area-inset-top,0px),12px)] sm:px-5">
        {onBack && (
          <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-slate-900">{partner?.display_name ?? 'Sherik'}</p>
          <p className="text-xs text-slate-500">Sherigingiz</p>
        </div>
        <button
          type="button"
          onClick={() => setShowEndConfirm(true)}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
        >
          <LogOut className="h-3.5 w-3.5" />
          Tugatish
        </button>
      </div>

      {/* Messages — scrollable middle */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 sm:px-5"
      >
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        )}
        {!loading && allMessages.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-sm text-slate-400">Birinchi xabarni yuboring!</p>
          </div>
        )}
        <div className="mx-auto max-w-lg space-y-2.5">
          {allMessages.map((msg) => {
            const isMine = msg.sender_id === userId;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[0.9rem] leading-relaxed ${
                    isMine
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                      : 'border border-slate-200 bg-white text-slate-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`mt-1 text-[10px] ${isMine ? 'text-white/60' : 'text-slate-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input — fixed bottom composer */}
      <div className="shrink-0 border-t border-slate-200/80 bg-[#F8FAFC] px-4 pb-2 pt-2 sm:px-5">
        <div className="mx-auto flex w-full max-w-lg gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            onFocus={scrollToBottom}
            placeholder="Xabar yozing..."
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[0.95rem] text-slate-900 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] transition-all hover:bg-blue-700 disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* End confirmation modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-slate-900">Sheriklikni tugatish</h3>
            <p className="mt-2 text-sm text-slate-600">
              Haqiqatan ham sheriklikni tugatmoqchimisiz? Chat tarixi saqlanadi, lekin siz yangi sherik qidirishingiz mumkin.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleEnd}
                disabled={ending}
                className="flex-1 rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {ending ? 'Tugatilmoqda...' : 'Tugatish'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );

  return createPortal(chat, document.body);
}
