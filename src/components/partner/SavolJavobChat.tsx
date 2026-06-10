import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Send, Users } from 'lucide-react';
import {
  getSavolJavobMessages,
  markSavolJavobRead,
  sendSavolJavobMessage,
  type SavolJavobMessage,
} from '../../api/communityChat';
import { useAuth } from '../../context/AuthContext';

type Props = {
  onBack: () => void;
};

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' });
}

export default function SavolJavobChat({ onBack }: Props) {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<SavolJavobMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const scrollToEnd = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    getSavolJavobMessages(token)
      .then((rows) => mounted && setMessages(rows))
      .catch((e: Error) => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false));
    void markSavolJavobRead(token).catch(() => {});

    const timer = window.setInterval(() => {
      void getSavolJavobMessages(token)
        .then((rows) => mounted && setMessages(rows))
        .catch(() => {});
    }, 4000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [token]);

  useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd]);

  async function handleSend() {
    if (!token || !text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    setError('');
    try {
      const created = await sendSavolJavobMessage(token, content);
      setMessages((prev) => [...prev, created]);
      void markSavolJavobRead(token).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
      setText(content);
    } finally {
      setSending(false);
    }
  }

  const content = (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#EEF2FF]">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white px-4 pb-3 pt-[max(env(safe-area-inset-top,0px),12px)] shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md">
          <Users className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold text-slate-900">SAVOL-JAVOB</p>
          <p className="text-xs font-medium text-violet-600">Umumiy guruh · hammaga ochiq</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          </div>
        ) : (
          <div className="mx-auto max-w-lg space-y-3">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Birinchi savolni yozing — barcha foydalanuvchilar ko‘radi
              </p>
            ) : null}
            {messages.map((msg) => {
              const mine = msg.sender_user_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                      mine
                        ? 'rounded-br-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                        : 'rounded-bl-md border border-slate-200/80 bg-white text-slate-900'
                    }`}
                  >
                    {!mine ? (
                      <p className="mb-1 text-[11px] font-bold text-violet-600">{msg.sender_name}</p>
                    ) : null}
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{msg.content}</p>
                    <p className={`mt-1 text-[10px] ${mine ? 'text-blue-100' : 'text-slate-400'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {error ? <p className="shrink-0 px-4 pb-1 text-center text-xs text-red-600">{error}</p> : null}

      <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 pb-[max(env(safe-area-inset-bottom,0px),12px)]">
        <div className="mx-auto flex max-w-lg items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            placeholder="Savolingizni yozing..."
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!text.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md disabled:opacity-50"
            aria-label="Yuborish"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
