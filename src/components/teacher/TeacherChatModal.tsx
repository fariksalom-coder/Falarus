import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X } from 'lucide-react';
import {
  getTeacherChatMessages,
  sendTeacherChatMessage,
  type TeacherChatMessage,
} from '../../api/teachers';

/** O'qituvchi ↔ o'quvchi ichki chat oynasi (modal). Har 5s da yangi xabarlarni tekshiradi. */
export default function TeacherChatModal({
  token,
  conversationId,
  currentUserId,
  title,
  onClose,
}: {
  token: string;
  conversationId: number;
  currentUserId: number;
  title: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<TeacherChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load(scroll = false) {
    try {
      const rows = await getTeacherChatMessages(token, conversationId);
      setMessages(rows);
      if (scroll) requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xabarlar yuklanmadi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
    const id = window.setInterval(() => void load(false), 5000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError('');
    try {
      const msg = await sendTeacherChatMessage(token, conversationId, content);
      setMessages((prev) => [...prev, msg]);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xabar yuborilmadi');
    } finally {
      setSending(false);
    }
  }

  /**
   * PORTAL — modal `document.body` ga chiqariladi.
   *
   * Sabab: sahifa `position:absolute; z-index:2` bo'lgan o'tish (transition)
   * qatlami ichida turadi. U yangi stacking context yaratadi, shuning uchun
   * modalning z-index'i qanchalik katta bo'lmasin, o'sha qatlam ichida qolib,
   * `z-50` dagi pastki menyu ostida ko'rinardi — natijada xabar yozish maydoni
   * menyu bilan to'silib qolgan edi.
   */
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="flex h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] bg-app-surface shadow-app-elevated sm:h-[70vh] sm:rounded-[24px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" style={{ background: 'var(--app-brand-gradient)' }}>
            <p className="truncate font-black">{title}</p>
            <button type="button" onClick={onClose} aria-label="Yopish" className="rounded-full bg-white/15 p-1.5 transition hover:bg-white/25">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-2 overflow-y-auto bg-app-bg-muted px-4 py-4">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-app-primary-deep border-t-transparent" />
              </div>
            ) : messages.length === 0 ? (
              <p className="mt-6 text-center text-sm font-medium text-app-text-muted">
                Hali xabar yo'q. Birinchi bo'lib yozing!
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.sender_user_id === currentUserId;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                        mine
                          ? 'rounded-br-md bg-app-primary-deep text-white'
                          : 'rounded-bl-md bg-app-surface text-app-text ring-1 ring-app-border'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-app-text-secondary'}`}>
                        {new Date(m.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {error ? (
            <p className="bg-app-danger-bg px-4 py-2 text-xs font-semibold text-app-danger">{error}</p>
          ) : null}

          {/* Composer */}
          <div className="flex items-end gap-2 border-t border-app-border bg-app-surface p-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              rows={1}
              placeholder="Xabar yozing..."
              className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none transition placeholder:text-app-text-secondary focus:border-app-primary focus:ring-2 focus:ring-app-primary/15"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !text.trim()}
              aria-label="Yuborish"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-primary-deep text-white transition active:scale-95 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
