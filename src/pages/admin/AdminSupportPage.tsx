import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ImagePlus, Megaphone, MessageCircle, Send, X } from 'lucide-react';
import {
  getAdminHelpChats,
  getAdminHelpChatMessages,
  getHelpBroadcastPreview,
  markAdminHelpChatRead,
  postHelpBroadcast,
  sendAdminHelpChatImage,
  sendAdminHelpChatMessage,
  sendHelpDirectUserMessage,
  type AdminHelpChatListRow,
  type AdminHelpChatMessage,
  type HelpBroadcastFilter,
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

const BROADCAST_OPTIONS: { value: HelpBroadcastFilter; label: string; hint: string }[] = [
  { value: 'subscription_inactive', label: 'Obuna yo‘q / muddati tugagan', hint: '' },
  { value: 'subscription_active', label: 'Obuna faol', hint: '' },
  { value: 'kunlik_not_started', label: 'Kunlik rejani boshlamagan', hint: 'Hech qanday kun progressi yo‘q' },
  {
    value: 'kunlik_registered_week_stalled',
    label: '7+ kun oldin ro‘yxatdan o‘tgan, lekin kunlikni boshlamagan',
    hint: '',
  },
  { value: 'kunlik_day1_complete', label: '1-kun to‘liq tugagan', hint: '' },
  { value: 'kunlik_day1_incomplete', label: '1-kun boshlangan, lekin tugallanmagan', hint: '' },
  { value: 'all_users', label: 'Barcha (oxirgi 2500)', hint: 'confirm talab qilinadi' },
];

export default function AdminSupportPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [chats, setChats] = useState<AdminHelpChatListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AdminHelpChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [broadcastFilter, setBroadcastFilter] = useState<HelpBroadcastFilter>('subscription_inactive');
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastRecipientCount, setBroadcastRecipientCount] = useState<number | null>(null);
  const [broadcastPreviewLoading, setBroadcastPreviewLoading] = useState(false);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastConfirmAll, setBroadcastConfirmAll] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState('');

  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [composeUserId, setComposeUserId] = useState<number | null>(null);
  const [composeText, setComposeText] = useState('');
  const [composeSending, setComposeSending] = useState(false);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId]
  );

  const reloadChats = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAdminHelpChats();
      setChats(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadChats();
  }, [reloadChats]);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const raw = p.get('userId');
    const uid = raw ? Number(raw) : NaN;
    if (Number.isFinite(uid) && uid > 0) {
      setComposeUserId(uid);
      setComposeModalOpen(true);
      navigate({ pathname: location.pathname, search: '' }, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  useEffect(() => {
    setBroadcastConfirmAll(false);
    setBroadcastRecipientCount(null);
    setBroadcastResult('');
  }, [broadcastFilter]);

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

  async function loadBroadcastPreview() {
    setBroadcastPreviewLoading(true);
    setBroadcastResult('');
    try {
      const out = await getHelpBroadcastPreview(broadcastFilter);
      setBroadcastRecipientCount(out.count);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBroadcastPreviewLoading(false);
    }
  }

  async function handleBroadcastSend() {
    const body = broadcastText.trim();
    if (!body || broadcastSending) return;
    if (broadcastFilter === 'all_users' && !broadcastConfirmAll) {
      setError('«Barcha foydalanuvchilar» uchun tasdiqlash belgisini qo‘ying.');
      return;
    }
    setBroadcastSending(true);
    try {
      const out = await postHelpBroadcast({
        filter: broadcastFilter,
        content: body,
        confirm_broadcast: broadcastFilter === 'all_users' ? true : undefined,
      });
      setBroadcastResult(`Yuborildi: ${out.sent} / ${out.total}`);
      setBroadcastText('');
      setBroadcastRecipientCount(null);
      await reloadChats();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBroadcastSending(false);
    }
  }

  async function handleComposeSend() {
    if (!composeUserId || !composeText.trim() || composeSending) return;
    setComposeSending(true);
    try {
      const { chat_id } = await sendHelpDirectUserMessage(composeUserId, composeText.trim());
      setComposeModalOpen(false);
      setComposeUserId(null);
      setComposeText('');
      await reloadChats();
      setActiveChatId(chat_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setComposeSending(false);
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

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Megaphone className="h-4 w-4 text-blue-600" />
          Guruhga xabar (admin nomidan)
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Filtr bo‘yicha har bir foydalanuvchining yordam chatiga alohida xabar tushadi; javoblar shu sahifada ko‘rinadi.
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1 text-xs font-medium text-slate-600">
            Filtr
            <select
              value={broadcastFilter}
              onChange={(e) => setBroadcastFilter(e.target.value as HelpBroadcastFilter)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {BROADCAST_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadBroadcastPreview()}
              disabled={broadcastPreviewLoading}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {broadcastPreviewLoading ? 'Hisoblanmoqda...' : 'Qabul qiluvchilar soni'}
            </button>
            {broadcastRecipientCount !== null ? (
              <span className="text-sm text-slate-600">
                Taxminan: <strong className="text-slate-900">{broadcastRecipientCount}</strong>
              </span>
            ) : null}
          </div>
        </div>
        {broadcastFilter === 'all_users' ? (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={broadcastConfirmAll}
              onChange={(e) => setBroadcastConfirmAll(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Barcha foydalanuvchilarga yuborishni tasdiqlayman (cheklov: oxirgi 2500)
          </label>
        ) : null}
        <textarea
          value={broadcastText}
          onChange={(e) => setBroadcastText(e.target.value)}
          rows={3}
          placeholder="Guruhga yuboriladigan matn..."
          className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleBroadcastSend()}
            disabled={broadcastSending || !broadcastText.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {broadcastSending ? 'Yuborilmoqda...' : 'Guruhga yuborish'}
          </button>
          {broadcastResult ? <span className="text-sm text-green-700">{broadcastResult}</span> : null}
        </div>
      </div>

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

      {composeModalOpen && composeUserId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="compose-user-title"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setComposeModalOpen(false);
                setComposeUserId(null);
                setComposeText('');
              }}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Yopish"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 id="compose-user-title" className="pr-10 text-lg font-semibold text-slate-900">
              Foydalanuvchiga xabar
            </h2>
            <p className="mt-1 text-sm text-slate-500">ID: {composeUserId}</p>
            <textarea
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              rows={5}
              placeholder="Matn..."
              className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setComposeModalOpen(false);
                  setComposeUserId(null);
                  setComposeText('');
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => void handleComposeSend()}
                disabled={composeSending || !composeText.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {composeSending ? 'Yuborilmoqda...' : 'Yuborish'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
