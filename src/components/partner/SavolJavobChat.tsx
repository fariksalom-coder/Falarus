import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Send, Users } from 'lucide-react';
import {
  getSavolJavobLiveState,
  getSavolJavobMessages,
  markSavolJavobRead,
  pingSavolJavobPresence,
  sendSavolJavobMessage,
  setSavolJavobTyping,
  type SavolJavobLiveState,
  type SavolJavobMessage,
} from '../../api/communityChat';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

type Props = {
  onBack: () => void;
};

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' });
}

function formatMembersLine(
  memberCount: number,
  onlineCount: number,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  return t('partner.membersOnline', { members: memberCount, online: onlineCount });
}

function formatTypingLine(
  names: string[],
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (names.length === 0) return '';
  if (names.length === 1) return t('partner.typingOne', { name: names[0] });
  if (names.length === 2) return t('partner.typingTwo', { first: names[0], second: names[1] });
  return t('partner.typingMany', { first: names[0], second: names[1] });
}

export default function SavolJavobChat({ onBack }: Props) {
  const { token, user } = useAuth();
  const { t } = useLocale();
  const [messages, setMessages] = useState<SavolJavobMessage[]>([]);
  const [live, setLive] = useState<SavolJavobLiveState>({
    member_count: 0,
    online_count: 0,
    typing_users: [],
  });
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingStopTimerRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const stickToBottomRef = useRef(true);
  const initialScrolledRef = useRef(false);

  const isNearBottom = useCallback((thresholdPx = 80) => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
  }, []);

  const scrollToEnd = useCallback((behavior: ScrollBehavior = 'smooth') => {
    endRef.current?.scrollIntoView({ behavior });
  }, []);

  const refreshLive = useCallback(async () => {
    if (!token) return;
    try {
      const state = await getSavolJavobLiveState(token);
      setLive(state);
    } catch {
      /* ignore polling errors */
    }
  }, [token]);

  const setTyping = useCallback(
    async (typing: boolean) => {
      if (!token) return;
      if (isTypingRef.current === typing) return;
      isTypingRef.current = typing;
      try {
        await setSavolJavobTyping(token, typing);
      } catch {
        /* ignore */
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    Promise.all([getSavolJavobMessages(token), getSavolJavobLiveState(token)])
      .then(([rows, state]) => {
        if (!mounted) return;
        setMessages(rows);
        setLive(state);
      })
      .catch((e: Error) => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false));
    void markSavolJavobRead(token).catch(() => {});
    void pingSavolJavobPresence(token).catch(() => {});

    const msgTimer = window.setInterval(() => {
      void getSavolJavobMessages(token)
        .then((rows) => mounted && setMessages(rows))
        .catch(() => {});
    }, 4000);

    const liveTimer = window.setInterval(() => {
      void refreshLive();
    }, 2500);

    const presenceTimer = window.setInterval(() => {
      void pingSavolJavobPresence(token).catch(() => {});
    }, 25_000);

    return () => {
      mounted = false;
      window.clearInterval(msgTimer);
      window.clearInterval(liveTimer);
      window.clearInterval(presenceTimer);
      if (typingStopTimerRef.current) window.clearTimeout(typingStopTimerRef.current);
      void setSavolJavobTyping(token, false).catch(() => {});
    };
  }, [token, refreshLive]);

  // First render → jump to bottom instantly. After that only scroll on new content
  // if the user is already near the bottom (stickToBottomRef tracks their intent).
  useEffect(() => {
    if (messages.length === 0) return;
    if (!initialScrolledRef.current) {
      initialScrolledRef.current = true;
      scrollToEnd('auto');
      return;
    }
    if (stickToBottomRef.current) scrollToEnd('smooth');
  }, [messages, scrollToEnd]);

  useEffect(() => {
    if (stickToBottomRef.current) scrollToEnd('smooth');
  }, [live.typing_users.length, scrollToEnd]);

  const handleScrollContainer = useCallback(() => {
    stickToBottomRef.current = isNearBottom();
  }, [isNearBottom]);

  function handleTextChange(value: string) {
    setText(value);
    if (!token) return;
    if (value.trim()) {
      void setTyping(true);
      if (typingStopTimerRef.current) window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = window.setTimeout(() => {
        void setTyping(false);
      }, 3500);
    } else {
      void setTyping(false);
    }
  }

  async function handleSend() {
    if (!token || !text.trim() || sending) return;
    const content = text.trim();
    setText('');
    void setTyping(false);
    setSending(true);
    setError('');
    try {
      const created = await sendSavolJavobMessage(token, content);
      // User just sent → always jump to bottom.
      stickToBottomRef.current = true;
      setMessages((prev) => [...prev, created]);
      void markSavolJavobRead(token).catch(() => {});
      void refreshLive();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadError'));
      setText(content);
    } finally {
      setSending(false);
    }
  }

  const typingLine = formatTypingLine(live.typing_users.map((u) => u.full_name), t);

  const content = (
    <div className="fixed inset-0 z-[60] flex flex-col bg-app-bg">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-app-border bg-app-surface px-3.5 pb-3 pt-[max(env(safe-area-inset-top,0px),12px)]">
        <button
          type="button"
          onClick={onBack}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-pmn-pill text-pmn-text ring-1 ring-pmn-border"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-[14px] text-white"
          style={{ background: 'linear-gradient(145deg, #0EA5A5, #0C7A7A)' }}
        >
          <Users className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold text-app-text">{t('partner.groupChat')}</p>
          <p className="text-[11.5px] font-bold text-[#35C06E]">
            {formatMembersLine(live.member_count, live.online_count, t)}
          </p>
        </div>
      </header>

      <div ref={scrollRef} onScroll={handleScrollContainer} className="flex-1 overflow-y-auto px-3.5 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#0EA5A5] border-t-transparent" />
          </div>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col gap-3">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-app-text-muted">
                {t('partner.groupFirstQuestion')}
              </p>
            ) : null}
            {messages.map((msg) => {
              const mine = msg.sender_user_id === user?.id;
              const initials = msg.sender_name
                ?.split(' ')
                .map((p) => p[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase();
              return (
                <div key={msg.id} className={mine ? 'flex justify-end' : 'flex items-end gap-2'}>
                  {!mine ? (
                    <div
                      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                      style={{ background: 'linear-gradient(145deg, #8B5CF6, #6D28D9)' }}
                    >
                      {initials || '?'}
                    </div>
                  ) : null}
                  <div className="max-w-[74%]">
                    {!mine ? (
                      <p className="ml-1 mb-[3px] text-[11px] font-extrabold text-[#A78BFA]">
                        {msg.sender_name}
                      </p>
                    ) : null}
                    <div
                      className={`px-[13px] py-[9px] text-[14px] font-semibold leading-[1.45] ${
                        mine
                          ? 'rounded-[16px] rounded-br-[5px] text-white'
                          : 'rounded-[16px] rounded-bl-[5px] ring-1 ring-pmn-border bg-pmn-pill text-pmn-text'
                      }`}
                      style={
                        mine
                          ? { background: 'linear-gradient(160deg, #3A6BE0, #1E3E9E)' }
                          : undefined
                      }
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    <p
                      className={`mt-[3px] text-[10px] font-bold ${
                        mine ? 'text-right text-[#6E86BE]' : 'ml-1 text-app-text-secondary'
                      }`}
                    >
                      {formatTime(msg.created_at)}
                      {mine ? ' ✓✓' : ''}
                    </p>
                  </div>
                </div>
              );
            })}
            {typingLine ? (
              <div className="flex items-center gap-2">
                <div
                  className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                  style={{ background: 'linear-gradient(145deg, #EC4899, #BE185D)' }}
                >
                  •••
                </div>
                <div className="rounded-[14px] ring-1 ring-pmn-border bg-pmn-pill px-3 py-2 text-[12px] font-bold text-[#5A5A5A]">
                  {typingLine}
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {error ? <p className="shrink-0 px-4 pb-1 text-center text-xs font-semibold text-[#F0656A]">{error}</p> : null}

      <div className="shrink-0 border-t border-app-border bg-app-surface px-3.5 py-2.5 pb-[max(env(safe-area-inset-bottom,0px),12px)]">
        <div className="mx-auto flex max-w-lg items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onBlur={() => void setTyping(false)}
            rows={1}
            placeholder={t('partner.groupQuestionPlaceholder')}
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-full border border-pmn-border bg-pmn-card px-4 py-3 text-[14px] font-semibold text-pmn-text placeholder:text-pmn-text-muted outline-none focus:border-[#3E63FF]"
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0EA5A5] text-white shadow-md disabled:opacity-50"
            aria-label={t('common.send')}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
