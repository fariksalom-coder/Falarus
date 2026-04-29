import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { ArrowLeft, ImagePlus, MessageCircle, Send } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getHelpChats,
  getHelpChatMessages,
  markHelpChatRead,
  sendHelpChatImage,
  sendHelpChatMessage,
  type HelpChatListItem,
  type HelpChatMessage,
} from '../api/help';
import { parseHelpImageMessage } from '../utils/helpMessageContent';

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' });
}

function formatListTime(date: string | null): string {
  if (!date) return '';
  const msgDate = new Date(date);
  const now = new Date();
  const sameDay =
    msgDate.getFullYear() === now.getFullYear() &&
    msgDate.getMonth() === now.getMonth() &&
    msgDate.getDate() === now.getDate();
  return sameDay ? 'Bugun' : msgDate.toLocaleDateString('uz');
}

export default function HelpPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { chatId: chatIdParam } = useParams<{ chatId?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chats, setChats] = useState<HelpChatListItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<HelpChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const routeChatId = chatIdParam ? Number(chatIdParam) : null;
  const openedChatId = Number.isFinite(routeChatId) ? routeChatId : null;

  const helpLastSeenKey = user ? `help_last_seen_at_${user.id}` : null;

  const activeChat = useMemo(
    () => chats.find((c) => c.id === (openedChatId ?? activeChatId)) ?? null,
    [chats, activeChatId, openedChatId]
  );
  const helpLastSeenMs = useMemo(() => {
    if (!helpLastSeenKey) return 0;
    const raw = localStorage.getItem(helpLastSeenKey);
    return raw ? new Date(raw).getTime() : 0;
  }, [helpLastSeenKey, chats.length, openedChatId]);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    getHelpChats(token)
      .then((rows) => {
        if (!mounted) return;
        setChats(rows);
        if (rows[0]?.id) setActiveChatId((prev) => prev ?? rows[0].id);
      })
      .catch((e: Error) => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    const targetChatId = openedChatId;
    if (!token || !targetChatId) return;
    let mounted = true;
    setMessagesLoading(true);
    getHelpChatMessages(token, targetChatId)
      .then((rows) => {
        if (!mounted) return;
        setMessages(rows);
      })
      .catch((e: Error) => mounted && setError(e.message))
      .finally(() => mounted && setMessagesLoading(false));

    void markHelpChatRead(token, targetChatId).catch(() => {});
    if (helpLastSeenKey) {
      localStorage.setItem(helpLastSeenKey, new Date().toISOString());
    }
    setChats((prev) => prev.map((c) => (c.id === targetChatId ? { ...c, unread_count: 0 } : c)));

    const timer = window.setInterval(() => {
      void getHelpChatMessages(token, targetChatId)
        .then((rows) => mounted && setMessages(rows))
        .catch(() => {});
    }, 4000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [token, openedChatId, helpLastSeenKey]);

  async function handleSend() {
    const targetChatId = openedChatId ?? activeChatId;
    if (!token || !targetChatId || !text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      const created = await sendHelpChatMessage(token, targetChatId, content);
      setMessages((prev) => [...prev, created]);
      setChats((prev) =>
        prev.map((c) =>
          c.id === targetChatId
            ? {
                ...c,
                last_message_at: created.created_at,
                last_message: {
                  id: created.id,
                  content: created.content,
                  sender_type: created.sender_type,
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
    const targetChatId = openedChatId ?? activeChatId;
    if (!file || !token || !targetChatId) return;
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
      const created = await sendHelpChatImage(token, targetChatId, file);
      setMessages((prev) => [...prev, created]);
      setChats((prev) =>
        prev.map((c) =>
          c.id === targetChatId
            ? {
                ...c,
                last_message_at: created.created_at,
                last_message: {
                  id: created.id,
                  content: 'Rasm',
                  sender_type: created.sender_type,
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
    <div className="min-h-screen bg-[#F3F4F8]">
      <main className="mx-auto max-w-3xl">
        {!openedChatId ? (
          <section className="min-h-[calc(100dvh-86px)] bg-[#F3F4F8]">
            <div className="border-b border-slate-200 bg-white px-5 pb-4 pt-5">
              <h1 className="text-[35px] font-bold tracking-tight text-slate-900">Yozishmalar</h1>
            </div>
            {loading ? (
              <div className="px-5 py-6 text-sm text-slate-500">Yuklanmoqda...</div>
            ) : (
              <div className="divide-y divide-slate-200 border-b border-slate-200 bg-white">
                {chats.map((chat) => {
                  const previewMedia = parseHelpImageMessage(chat.last_message?.content ?? '');
                  const unreadByCounter = Number(chat.unread_count ?? 0) > 0;
                  const unreadByLastMessage =
                    chat.last_message?.sender_type === 'admin' &&
                    new Date(chat.last_message.created_at).getTime() > helpLastSeenMs;
                  const showUnread = unreadByCounter || unreadByLastMessage;
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => {
                        setActiveChatId(chat.id);
                        navigate(`/help/${chat.id}`);
                      }}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 via-blue-300 to-indigo-400 text-white shadow-[0_6px_18px_rgba(59,130,246,0.25)]">
                        <MessageCircle className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[22px] font-semibold text-slate-900">Admin</p>
                        <p className="truncate text-[17px] text-slate-500">
                          {previewMedia.isImage ? 'Rasm' : (chat.last_message?.content ?? '')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[17px] font-medium text-slate-500">{formatListTime(chat.last_message_at)}</span>
                        {showUnread ? (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[11px] font-bold text-white">
                            {chat.unread_count > 0 ? chat.unread_count : 1}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
                {!chats.length && <p className="px-5 py-8 text-center text-sm text-slate-500">Hozircha chat yo‘q</p>}
              </div>
            )}
            {error ? <p className="px-5 py-2 text-xs text-red-600">{error}</p> : null}
          </section>
        ) : (
          <section className="flex min-h-screen flex-col bg-[#F3F4F8]">
            <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 pb-3 pt-3">
              <button
                type="button"
                onClick={() => navigate('/help')}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 via-blue-300 to-indigo-400 text-white">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">Admin</p>
                <p className="text-xs text-slate-500">{activeChat?.status === 'open' ? 'Onlayn' : 'Yopiq'}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {messagesLoading ? (
                <div className="py-8 text-center text-sm text-slate-500">Xabarlar yuklanmoqda...</div>
              ) : (
                <div className="mx-auto max-w-2xl space-y-2.5">
                  {messages.map((msg) => {
                    const isMine = msg.sender_type === 'user';
                    const media = parseHelpImageMessage(msg.content);
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-[0.92rem] ${
                            isMine
                              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                              : 'border border-slate-200 bg-white text-slate-900'
                          }`}
                        >
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
                          <p className={`mt-1 text-[10px] ${isMine ? 'text-white/70' : 'text-slate-400'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {!messages.length && (
                    <p className="py-12 text-center text-sm text-slate-500">Muammoingizni yozing, admin javob beradi.</p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white px-4 py-3">
              <div className="mx-auto flex max-w-2xl gap-2">
                <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50">
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
                  placeholder="Muammo yoki savolingizni yozing..."
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || uploadingImage || !text.trim()}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {error ? <p className="mx-auto mt-2 max-w-2xl text-xs text-red-600">{error}</p> : null}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

