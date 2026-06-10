import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Headphones, ImagePlus, Send } from 'lucide-react';
import {
  getHelpChats,
  getHelpChatMessages,
  markHelpChatRead,
  sendHelpChatImage,
  sendHelpChatMessage,
  type HelpChatMessage,
} from '../../api/help';
import { useAuth } from '../../context/AuthContext';
import { parseHelpImageMessage } from '../../utils/helpMessageContent';

type Props = {
  onBack: () => void;
};

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' });
}

export default function PartnerAdminChat({ onBack }: Props) {
  const { token, user } = useAuth();
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<HelpChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const helpLastSeenKey = user ? `help_last_seen_at_${user.id}` : null;

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    getHelpChats(token)
      .then((chats) => {
        if (!mounted) return;
        const id = chats[0]?.id ?? null;
        setChatId(id);
      })
      .catch((e: Error) => mounted && setError(e.message));
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !chatId || chatId < 0) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    getHelpChatMessages(token, chatId)
      .then((rows) => mounted && setMessages(rows))
      .catch((e: Error) => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false));

    void markHelpChatRead(token, chatId).catch(() => {});
    if (helpLastSeenKey) localStorage.setItem(helpLastSeenKey, new Date().toISOString());

    const timer = window.setInterval(() => {
      void getHelpChatMessages(token, chatId)
        .then((rows) => mounted && setMessages(rows))
        .catch(() => {});
    }, 4000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [token, chatId, helpLastSeenKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!token || !chatId || chatId < 0 || !text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      const created = await sendHelpChatMessage(token, chatId, content);
      setMessages((prev) => [...prev, created]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
      setText(content);
    } finally {
      setSending(false);
    }
  }

  async function handlePickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !token || !chatId || chatId < 0) return;
    setUploadingImage(true);
    try {
      const created = await sendHelpChatImage(token, chatId, file);
      setMessages((prev) => [...prev, created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rasm yuborilmadi');
    } finally {
      setUploadingImage(false);
    }
  }

  const content = (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#F3F4F8]">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 pb-3 pt-[max(env(safe-area-inset-top,0px),12px)]">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 via-blue-400 to-indigo-500 text-white">
          <Headphones className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">Admin</p>
          <p className="text-xs text-slate-500">Qo‘llab-quvvatlash</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="mx-auto max-w-lg space-y-3">
            {messages.map((msg) => {
              const mine = msg.sender_type === 'user';
              const media = parseHelpImageMessage(msg.content);
              return (
                <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                      mine ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-900'
                    }`}
                  >
                    {media.isImage ? (
                      <img src={media.imageUrl ?? ''} alt="" className="max-h-56 rounded-xl" />
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-[15px]">{msg.content}</p>
                    )}
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

      {error ? <p className="px-4 text-center text-xs text-red-600">{error}</p> : null}

      <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 pb-[max(env(safe-area-inset-bottom,0px),12px)]">
        <div className="mx-auto flex max-w-lg items-end gap-2">
          <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 text-slate-500">
            <ImagePlus className="h-5 w-5" />
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePickImage} disabled={uploadingImage} />
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            placeholder="Admin uchun xabar..."
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] outline-none focus:border-blue-400"
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
