import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { AlertCircle, ArrowLeft, ImagePlus, MessageCircle, Send } from 'lucide-react';
import {
  getAdminHelpChats,
  getAdminHelpChatMessages,
  markAdminHelpChatRead,
  sendAdminHelpChatImage,
  sendAdminHelpChatMessage,
  type AdminHelpChatListRow,
  type AdminHelpChatMessage,
} from '../../api/admin';
import { parseHelpImageMessage } from '../../utils/helpMessageContent';

function fmt(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('uz');
}

function fmtListTime(date: string | null): string {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay
    ? d.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('uz');
}

function initialsFromName(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminSupportPage() {
  const [chats, setChats] = useState<AdminHelpChatListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AdminHelpChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId]
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getAdminHelpChats()
      .then((rows) => {
        if (!mounted) return;
        setChats(rows);
      })
      .catch((e: Error) => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeChatId) return;
    let mounted = true;
    setMessagesLoading(true);
    getAdminHelpChatMessages(activeChatId)
      .then((rows) => mounted && setMessages(rows))
      .catch((e: Error) => mounted && setError(e.message))
      .finally(() => mounted && setMessagesLoading(false));

    void markAdminHelpChatRead(activeChatId).catch(() => {});
    setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, unread_count: 0 } : c)));

    const timer = window.setInterval(() => {
      void getAdminHelpChatMessages(activeChatId)
        .then((rows) => mounted && setMessages(rows))
        .catch(() => {});
    }, 4000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [activeChatId]);

  async function handleSend() {
    if (!activeChatId || !text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      const created = await sendAdminHelpChatMessage(activeChatId, content);
      setMessages((prev) => [...prev, created]);
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? {
                ...c,
                last_message_at: created.created_at,
                last_message: {
                  id: created.id,
                  sender_type: created.sender_type,
                  content: created.content,
                  created_at: created.created_at,
                },
              }
            : c
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setSending(false);
    }
  }

  async function handlePickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeChatId) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Faqat JPG, PNG yoki WEBP ruxsat etiladi');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Rasm hajmi 4 MB dan oshmasligi kerak');
      return;
    }
    setUploadingImage(true);
    try {
      const created = await sendAdminHelpChatImage(activeChatId, file);
      setMessages((prev) => [...prev, created]);
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? {
                ...c,
                last_message_at: created.created_at,
                last_message: {
                  id: created.id,
                  sender_type: created.sender_type,
                  content: 'Rasm',
                  created_at: created.created_at,
                },
              }
            : c
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rasm yuborilmadi');
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-slate-800">Yozishmalar</h1>
      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="grid min-h-[740px] overflow-hidden rounded-xl border border-slate-200 bg-white">
        {!activeChat ? (
        <aside>
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Yozishmalar</div>
          {loading ? (
            <div className="p-4 text-sm text-slate-500">Yuklanmoqda...</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {chats.map((chat) => {
                const previewMedia = parseHelpImageMessage(chat.last_message?.content ?? '');
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => setActiveChatId(chat.id)}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
                      activeChatId === chat.id ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 via-blue-300 to-indigo-400 text-[12px] font-bold text-white">
                      {chat.user.name === '—' ? <MessageCircle className="h-5 w-5" /> : initialsFromName(chat.user.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{chat.user.name}</p>
                        <span className="shrink-0 text-[11px] text-slate-400">{fmtListTime(chat.last_message_at)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="line-clamp-1 text-xs text-slate-500">
                          {previewMedia.isImage ? 'Rasm' : (chat.last_message?.content ?? 'Xabar yo‘q')}
                        </p>
                        {chat.unread_count > 0 ? (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">
                            {chat.unread_count}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
              {!chats.length && <p className="p-4 text-center text-sm text-slate-500">Chatlar yo‘q</p>}
            </div>
          )}
        </aside>
        ) : null}

        {activeChat ? (
          <>
            <section className="flex min-w-0 flex-col">
              <div className="relative flex items-center justify-center border-b border-slate-200 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setActiveChatId(null)}
                  className="absolute left-4 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label="Orqaga"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-900">{activeChat.user.name}</p>
                  <p className="text-xs text-slate-500">{activeChat.user.email ?? '—'}</p>
                  <p className="text-xs text-slate-500">{activeChat.user.phone ?? '—'}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                {messagesLoading ? (
                  <p className="text-sm text-slate-500">Xabarlar yuklanmoqda...</p>
                ) : (
                  <div className="space-y-2.5">
                    {messages.map((msg) => {
                      const isAdmin = msg.sender_type === 'admin';
                      const media = parseHelpImageMessage(msg.content);
                      return (
                        <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${isAdmin ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-slate-50 text-slate-900'}`}>
                            {media.isImage && media.imageUrl ? (
                              <img
                                src={media.imageUrl}
                                alt="Chat image"
                                className="max-h-64 w-full rounded-xl object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            )}
                            <p className={`mt-1 text-[10px] ${isAdmin ? 'text-white/70' : 'text-slate-400'}`}>{fmt(msg.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                    {!messages.length && <p className="py-10 text-center text-sm text-slate-500">Yozishma hali boshlanmagan</p>}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 p-3">
                <div className="flex gap-2">
                  <label className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50">
                    <ImagePlus className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePickImage}
                      disabled={uploadingImage}
                    />
                  </label>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder="Javob yozing..."
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={sending || uploadingImage || !text.trim() || !activeChatId}
                    className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Yuborish
                  </button>
                </div>
              </div>
            </section>

          </>
        ) : null}

      </div>
    </div>
  );
}
