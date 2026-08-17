import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { ArrowLeft, AtSign, Headphones, Lock, MoreVertical, Pencil, Send, Trash2, Users } from 'lucide-react';
import {
  getSavolJavobLiveState,
  getSavolJavobMessages,
  markSavolJavobRead,
  pingSavolJavobPresence,
  searchSavolJavobMembers,
  sendSavolJavobMessage,
  setSavolJavobTyping,
  getSavolJavobSummary,
  blockChatUser,
  unblockChatUser,
  editGroupMessage,
  deleteGroupMessage,
  type ChatBlock,
  type SavolJavobLiveState,
  type SavolJavobMember,
  type SavolJavobMessage,
} from '../../api/communityChat';
import { mentionToken, parseMentionParts } from '../../../shared/communityMentions';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

type Props = {
  onBack: () => void;
  /** Bloklangan odam faqat Support'ga yoza oladi — shu tugma o'sha chatni ochadi. */
  onOpenSupport?: () => void;
};

/** Yozuv maydonida tanlangan odam: matnda `@Ism Familiya` ko‘rinadi. */
type PickedMention = { name: string; userId: number };

/** Kursordan orqaga qarab faol `@...` so‘rovini topadi. */
function findActiveMention(
  value: string,
  caret: number,
  picked: PickedMention[]
): { start: number; query: string } | null {
  const before = value.slice(0, caret);
  const at = before.lastIndexOf('@');
  if (at === -1) return null;
  const prevChar = at > 0 ? before[at - 1] : '';
  if (prevChar && !/\s/.test(prevChar)) return null;

  const query = before.slice(at + 1);
  if (query.length > 32 || /[@\n]/.test(query)) return null;
  // Ism + familiya — ko‘pi bilan bitta bo‘sh joy.
  if ((query.match(/\s/g)?.length ?? 0) > 1) return null;
  // Allaqachon tanlangan odamdan keyin yozilgan matn uchun ro‘yxat ochilmasin.
  if (picked.some((m) => query.startsWith(`${m.name} `))) return null;
  return { start: at, query };
}

/** `@Ism Familiya` — faqat butun so‘z bo‘lsa tokenga aylantiriladi. */
function replaceMentionLabel(source: string, name: string, token: string): string {
  const needle = `@${name}`;
  let out = '';
  let index = 0;
  for (;;) {
    const found = source.indexOf(needle, index);
    if (found === -1) return out + source.slice(index);
    const prevChar = found > 0 ? source[found - 1] : '';
    const nextChar = source[found + needle.length] ?? '';
    const isWholeLabel =
      (!prevChar || /\s/.test(prevChar)) && (!nextChar || /[\s.,!?;:)\]]/.test(nextChar));
    out += source.slice(index, found) + (isWholeLabel ? token : needle);
    index = found + needle.length;
  }
}

/** Yuborishdan oldin tanlangan ismlarni `@[Ism](id)` tokeniga o‘giradi. */
function serializeMentions(value: string, picked: PickedMention[]): string {
  return [...picked]
    .sort((a, b) => b.name.length - a.name.length)
    .reduce(
      (acc, m) => replaceMentionLabel(acc, m.name, mentionToken(m.userId, m.name)),
      value
    );
}

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

function mentionsUser(content: string, userId: number): boolean {
  return parseMentionParts(content).some(
    (part) => part.type === 'mention' && part.userId === userId
  );
}

/**
 * XABARNI YON TOMONGA TORTIB BELGILASH.
 *
 * Telegram/WhatsApp dagi "javob berish" harakati: xabarni o'ngga bir oz
 * surasiz va qo'yib yuborasiz — o'sha odam yozuv maydonida `@Ism` bo'lib
 * belgilanadi. Ilgari buning uchun `@` yozib, ro'yxatdan izlab topish kerak
 * edi; suhbat tez ketayotganda bu uzoq va noqulay.
 *
 * Nima uchun Framer'ning `drag` i: u yo'nalishni O'ZI qulflaydi
 * (`dragDirectionLock`), ya'ni barmoq tikka harakatlansa ro'yxat odatdagidek
 * aylanadi va xabar qimirlamaydi. Qo'lda hisoblansa bu ikkalasi urishib
 * qolardi.
 *
 * Faqat O'NGGA suriladi va faqat BOSHQA odamning xabarida ishlaydi — o'zini
 * o'zi belgilashning ma'nosi yo'q.
 */
const SURISH_CHEGARASI = 52;
/**
 * Elastik koeffitsiyent: barmoq 52 px yursa, xabar shuncha emas, taxminan
 * yarmicha suriladi (rezinka ta'siri). Belgi ANIQ shu masofaga moslanadi —
 * aks holda chegaraga yetganda ham u yarim shaffof turib qolardi.
 */
const SURISH_ELASTIK = 0.55;
const SURISH_KORINISH = SURISH_CHEGARASI * SURISH_ELASTIK;

function SuriladiganXabar({
  onBelgila,
  children,
}: {
  onBelgila: () => void;
  children: ReactNode;
}) {
  const x = useMotionValue(0);
  // Belgi barmoq bilan birga chiqadi: yarim yo'lda ko'rinib, chegarada to'ladi.
  const belgiOpacity = useTransform(x, [0, SURISH_KORINISH], [0, 1]);
  const belgiScale = useTransform(x, [0, SURISH_KORINISH], [0.6, 1]);

  const tugadi = (_e: unknown, info: PanInfo) => {
    if (info.offset.x < SURISH_CHEGARASI) return;
    onBelgila();
    // Yengil tebranish — belgilangani barmoq bilan ham sezilsin.
    try {
      navigator.vibrate?.(12);
    } catch {
      /* qurilma qo'llamasa — e'tiborsiz */
    }
  };

  return (
    <div className="relative">
      <motion.span
        aria-hidden
        style={{ opacity: belgiOpacity, scale: belgiScale }}
        className="pointer-events-none absolute left-0 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#0EA5A5] text-white"
      >
        <AtSign className="h-4 w-4" aria-hidden />
      </motion.span>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: SURISH_ELASTIK }}
        dragMomentum={false}
        dragSnapToOrigin
        style={{ x }}
        onDragEnd={tugadi}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Surish faqat kerakli xabarlarda yoqiladi.
 *
 * O'zining xabari va o'qish rejimidagi (bloklangan) suhbat surilmaydi —
 * bunda tortish faqat chalg'itardi. Shart bajarilmasa xabar hech qanday
 * qo'shimcha qatlamsiz chiziladi.
 */
function MaybeSuriladigan({
  surilsin,
  onBelgila,
  children,
}: {
  surilsin: boolean;
  onBelgila: () => void;
  children: ReactNode;
}) {
  if (!surilsin) return <>{children}</>;
  return <SuriladiganXabar onBelgila={onBelgila}>{children}</SuriladiganXabar>;
}

/** Xabar matni: belgilangan odamlar ajratib ko‘rsatiladi. */
function MessageBody({
  content,
  mine,
  myUserId,
}: {
  content: string;
  mine: boolean;
  myUserId?: number;
}) {
  const parts = useMemo(() => parseMentionParts(content), [content]);
  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.type === 'text') return <span key={i}>{part.text}</span>;
        const aboutMe = part.userId === myUserId;
        const tone = aboutMe
          ? 'bg-[#FDE68A] text-[#78350F]'
          : mine
            ? 'bg-white/20 text-white'
            : 'bg-[#DBEAFE] text-[#1D4ED8]';
        return (
          <span key={i} className={`rounded-[6px] px-[3px] font-black ${tone}`}>
            @{part.name}
          </span>
        );
      })}
    </p>
  );
}

export default function SavolJavobChat({ onBack, onOpenSupport }: Props) {
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
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [mentionResults, setMentionResults] = useState<SavolJavobMember[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionAlert, setMentionAlert] = useState(false);
  /** O'qish rejimi (blok) va moderator huquqi — summariyadan keladi. */
  const [block, setBlock] = useState<ChatBlock | null>(null);
  const [canModerate, setCanModerate] = useState(false);
  /** Moderator menyusi ochilgan xabar. */
  const [menyu, setMenyu] = useState<SavolJavobMessage | null>(null);
  const [tahrir, setTahrir] = useState<{ id: number; matn: string } | null>(null);
  const [modBusy, setModBusy] = useState(false);
  const lastMentionIdRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingStopTimerRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const stickToBottomRef = useRef(true);
  const initialScrolledRef = useRef(false);
  const pickedRef = useRef<PickedMention[]>([]);
  const mentionCloseTimerRef = useRef<number | null>(null);

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
    void getSavolJavobSummary(token)
      .then((sum) => {
        if (!mounted) return;
        setBlock(sum.block ?? null);
        setCanModerate(sum.can_moderate === true);
      })
      .catch(() => {});

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
      if (mentionCloseTimerRef.current) window.clearTimeout(mentionCloseTimerRef.current);
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

  // Yuqoriga qarab o'qiyotganda kimdir sizni belgilasa — pastda ogohlantirish chiqadi.
  useEffect(() => {
    const myId = user?.id;
    if (myId == null || messages.length === 0) return;
    let latestId = 0;
    for (const msg of messages) {
      if (msg.sender_user_id !== myId && mentionsUser(msg.content, myId) && msg.id > latestId) {
        latestId = msg.id;
      }
    }
    if (latestId === 0 || latestId <= lastMentionIdRef.current) return;
    const isFirstLoad = lastMentionIdRef.current === 0;
    lastMentionIdRef.current = latestId;
    if (!isFirstLoad && !stickToBottomRef.current) setMentionAlert(true);
  }, [messages, user?.id]);

  const handleScrollContainer = useCallback(() => {
    stickToBottomRef.current = isNearBottom();
    if (stickToBottomRef.current) setMentionAlert(false);
  }, [isNearBottom]);

  // "@" so'rovi o'zgarganda ro'yxatni yangilaydi (tez yozishda ortiqcha so'rov bo'lmasin).
  useEffect(() => {
    if (!token || !mention) {
      setMentionResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchSavolJavobMembers(token, mention.query.trim(), controller.signal)
        .then((rows) => {
          setMentionResults(rows);
          setMentionIndex(0);
        })
        .catch(() => {});
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [token, mention]);

  const syncMention = useCallback((value: string, caret: number) => {
    setMention(findActiveMention(value, caret, pickedRef.current));
  }, []);

  const closeMention = useCallback(() => {
    if (mentionCloseTimerRef.current) window.clearTimeout(mentionCloseTimerRef.current);
    mentionCloseTimerRef.current = null;
    setMention(null);
    setMentionResults([]);
  }, []);

  const applyMention = useCallback(
    (member: SavolJavobMember) => {
      const active = mention;
      const el = textareaRef.current;
      if (!active || !el) return;
      const caret = el.selectionStart ?? text.length;
      const label = `@${member.full_name}`;
      const next = `${text.slice(0, active.start)}${label} ${text.slice(caret)}`;
      pickedRef.current = [
        ...pickedRef.current.filter((m) => m.name !== member.full_name),
        { name: member.full_name, userId: member.user_id },
      ];
      setText(next);
      closeMention();
      const caretAfter = active.start + label.length + 1;
      window.requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(caretAfter, caretAfter);
      });
    },
    [mention, text, closeMention]
  );

  /**
   * Xabar egasini yozuv maydonida belgilaydi (surish harakati chaqiradi).
   *
   * Belgi matnning BOSHIGA qo'yiladi: javob odatda "@Ism, ..." ko'rinishida
   * boshlanadi. `pickedRef` ga ham yoziladi — yuborishda `@Ism` haqiqiy
   * belgiga (`@[Ism](id)`) aylanishi uchun kalit shu ro'yxat.
   */
  const xabarniBelgila = useCallback(
    (msg: SavolJavobMessage) => {
      const ism = String(msg.sender_name ?? '').trim();
      if (!ism || msg.sender_user_id === user?.id) return;
      const yorliq = `@${ism}`;

      setText((oldingi) => {
        if (oldingi.includes(yorliq)) return oldingi;
        const qolgani = oldingi.trimStart();
        return qolgani ? `${yorliq} ${qolgani}` : `${yorliq} `;
      });
      pickedRef.current = [
        ...pickedRef.current.filter((m) => m.name !== ism),
        { name: ism, userId: msg.sender_user_id },
      ];

      window.requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        const oxir = el.value.length;
        el.setSelectionRange(oxir, oxir);
      });
    },
    [user?.id],
  );

  function handleTextChange(value: string, caret: number) {
    setText(value);
    syncMention(value, caret);
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
    const draft = text.trim();
    const content = serializeMentions(draft, pickedRef.current);
    setText('');
    pickedRef.current = [];
    closeMention();
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
      setText(draft);
    } finally {
      setSending(false);
    }
  }

  /** Moderator amallari — xabar menyusidan chaqiriladi. */
  async function modAmal(fn: () => Promise<void>) {
    if (!token) return;
    setModBusy(true);
    setError('');
    try {
      await fn();
      const rows = await getSavolJavobMessages(token);
      setMessages(rows);
      setMenyu(null);
      setTahrir(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadError'));
    } finally {
      setModBusy(false);
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
              const mentionsMe = !mine && user?.id != null && mentionsUser(msg.content, user.id);
              const initials = msg.sender_name
                ?.split(' ')
                .map((p) => p[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase();
              return (
                <div key={msg.id} className={`group ${mine ? 'flex justify-end' : 'flex items-end gap-2'}`}>
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
                    <MaybeSuriladigan
                      surilsin={!mine && !block}
                      onBelgila={() => xabarniBelgila(msg)}
                    >
                      <div
                        className={`px-[13px] py-[9px] text-[14px] font-semibold leading-[1.45] ${
                          mine
                            ? 'rounded-[16px] rounded-br-[5px] text-white'
                            : `rounded-[16px] rounded-bl-[5px] ring-1 bg-pmn-pill text-pmn-text ${
                                mentionsMe ? 'ring-[#F59E0B]' : 'ring-pmn-border'
                              }`
                        }`}
                        style={
                          mine
                            ? { background: 'linear-gradient(160deg, #3A6BE0, #1E3E9E)' }
                            : undefined
                        }
                      >
                        <MessageBody content={msg.content} mine={mine} myUserId={user?.id} />
                        {msg.edited_at ? (
                          <span className={`ml-1 text-[10px] font-bold ${mine ? 'text-white/70' : 'text-app-text-muted'}`}>
                            (tahrirlangan)
                          </span>
                        ) : null}
                      </div>
                    </MaybeSuriladigan>
                    <p
                      className={`mt-[3px] text-[10px] font-bold ${
                        mine ? 'text-right text-[#6E86BE]' : 'ml-1 text-app-text-secondary'
                      }`}
                    >
                      {formatTime(msg.created_at)}
                      {mine ? ' ✓✓' : ''}
                    </p>
                  </div>
                  {canModerate ? (
                    <button
                      type="button"
                      onClick={() => setMenyu(msg)}
                      className="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-app-text-muted transition hover:bg-pmn-pill"
                      aria-label="Moderatsiya"
                    >
                      <MoreVertical className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
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

      <div className="relative shrink-0 border-t border-app-border bg-app-surface px-3.5 py-2.5 pb-[max(env(safe-area-inset-bottom,0px),12px)]">
        {mentionAlert && !mention ? (
          <div className="absolute inset-x-3.5 bottom-full mb-2 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setMentionAlert(false);
                stickToBottomRef.current = true;
                scrollToEnd('smooth');
              }}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-black text-white shadow-[0_8px_20px_rgba(245,158,11,0.35)] transition active:scale-[0.97]"
              style={{ background: 'linear-gradient(150deg, #F59E0B, #D97706)' }}
            >
              <AtSign className="h-3.5 w-3.5" aria-hidden />
              {t('partner.mentionAlert')}
            </button>
          </div>
        ) : null}
        {mention ? (
          <div className="pointer-events-none absolute inset-x-3.5 bottom-full mb-2 flex justify-center">
            <div className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-[18px] border border-pmn-border bg-app-surface shadow-[0_14px_34px_rgba(148,163,184,0.28)]">
              <p className="flex items-center gap-1.5 border-b border-app-border px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.04em] text-app-text-muted">
                <AtSign className="h-3.5 w-3.5" aria-hidden />
                {t('partner.mentionTitle')}
              </p>
              {mentionResults.length === 0 ? (
                <p className="px-3.5 py-3 text-[13px] font-semibold text-app-text-muted">
                  {t('partner.mentionEmpty')}
                </p>
              ) : (
                <ul className="max-h-[min(224px,38vh)] overflow-y-auto overscroll-contain">
                  {mentionResults.map((member, i) => (
                    <li key={member.user_id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyMention(member)}
                        className={`flex min-h-[44px] w-full items-center gap-2.5 px-3.5 py-2 text-left transition ${
                          i === mentionIndex ? 'bg-pmn-pill' : 'bg-transparent'
                        }`}
                      >
                        <span
                          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                          style={{ background: 'linear-gradient(145deg, #8B5CF6, #6D28D9)' }}
                        >
                          {member.full_name.slice(0, 1).toUpperCase() || '?'}
                        </span>
                        <span className="truncate text-[14px] font-bold text-app-text">
                          {member.full_name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
        {block ? (
          /* O'QISH REJIMI — yozish yopiq, Support kanali ochiq. */
          <div className="mx-auto max-w-lg rounded-[18px] bg-[#FFF4F4] px-4 py-3 ring-1 ring-[#F6C9CB]">
            <p className="flex items-center gap-2 text-[13px] font-black text-[#B23A3F]">
              <Lock className="h-4 w-4 shrink-0" aria-hidden />
              Siz o'qish rejimidasiz
            </p>
            <p className="mt-1 text-[12.5px] font-semibold leading-[1.6] text-[#8A5A5C]">
              {block.reason ? `Sabab: ${block.reason}. ` : ''}
              {block.expires_at
                ? `Muddat: ${new Date(block.expires_at).toLocaleDateString('uz-UZ')} gacha. `
                : ''}
              Chatlarda yozolmaysiz, lekin o'qiy olasiz. Savolingiz bo'lsa Support'ga yozing.
            </p>
            <button
              type="button"
              onClick={() => {
                onBack();
                onOpenSupport?.();
              }}
              className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#0B2A6B] text-[13.5px] font-black text-white active:scale-[0.99]"
            >
              <Headphones className="h-4 w-4" aria-hidden />
              Support'ga yozish
            </button>
          </div>
        ) : (
        <div className="mx-auto flex max-w-lg items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
            onSelect={(e) => syncMention(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
            onBlur={() => {
              void setTyping(false);
              // Mobil brauzerlarda tanlash bosilganda blur oldin ishlaydi — ozgina kutamiz.
              mentionCloseTimerRef.current = window.setTimeout(closeMention, 150);
            }}
            rows={1}
            placeholder={t('partner.groupQuestionPlaceholder')}
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-full border border-pmn-border bg-pmn-card px-4 py-3 text-[14px] font-semibold text-pmn-text placeholder:text-pmn-text-muted outline-none focus:border-[#3E63FF]"
            onKeyDown={(e) => {
              if (mention && mentionResults.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setMentionIndex((i) => (i + 1) % mentionResults.length);
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setMentionIndex((i) => (i - 1 + mentionResults.length) % mentionResults.length);
                  return;
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  applyMention(mentionResults[mentionIndex] ?? mentionResults[0]);
                  return;
                }
              }
              if (mention && e.key === 'Escape') {
                e.preventDefault();
                closeMention();
                return;
              }
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
        )}
      </div>

      {/* Moderator menyusi — xabarni tahrirlash/o'chirish, muallifni bloklash. */}
      {menyu ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 px-4 pb-[max(env(safe-area-inset-bottom,0px),16px)]"
          onClick={() => {
            setMenyu(null);
            setTahrir(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-[22px] bg-app-surface p-4 shadow-[0_-10px_40px_rgba(15,23,42,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 text-[13px] font-black text-app-text">{menyu.sender_name}</p>
            <p className="mb-3 line-clamp-2 text-[12.5px] font-semibold text-app-text-muted">
              {menyu.content}
            </p>

            {tahrir ? (
              <>
                <textarea
                  value={tahrir.matn}
                  onChange={(e) => setTahrir({ ...tahrir, matn: e.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-[14px] border border-pmn-border bg-pmn-card px-3.5 py-2.5 text-[14px] font-semibold text-pmn-text outline-none focus:border-[#3E63FF]"
                />
                <button
                  type="button"
                  disabled={modBusy || !tahrir.matn.trim()}
                  onClick={() =>
                    void modAmal(() => editGroupMessage(token!, tahrir.id, tahrir.matn.trim()))
                  }
                  className="mt-2.5 min-h-[46px] w-full rounded-[14px] bg-app-primary text-[13.5px] font-black text-white disabled:opacity-60"
                >
                  {modBusy ? 'Saqlanmoqda…' : 'Saqlash'}
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setTahrir({ id: menyu.id, matn: menyu.content })}
                  className="flex min-h-[46px] w-full items-center gap-2.5 rounded-[14px] bg-pmn-pill px-4 text-[13.5px] font-bold text-app-text"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Xabarni tahrirlash
                </button>
                <button
                  type="button"
                  disabled={modBusy}
                  onClick={() => void modAmal(() => deleteGroupMessage(token!, menyu.id))}
                  className="flex min-h-[46px] w-full items-center gap-2.5 rounded-[14px] bg-[#FFF4F4] px-4 text-[13.5px] font-bold text-[#B23A3F] disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Xabarni o'chirish
                </button>
                {menyu.sender_user_id !== user?.id ? (
                  <>
                    <button
                      type="button"
                      disabled={modBusy}
                      onClick={() => {
                        const sabab = window.prompt('Bloklash sababi (ixtiyoriy):') ?? '';
                        const kun = window.prompt('Necha kunga? (bo\'sh qoldirsangiz — muddatsiz)') ?? '';
                        void modAmal(() =>
                          blockChatUser(token!, {
                            userId: menyu.sender_user_id,
                            reason: sabab.trim(),
                            days: kun.trim() ? Number(kun.trim()) : null,
                          }).then(() => undefined)
                        );
                      }}
                      className="flex min-h-[46px] w-full items-center gap-2.5 rounded-[14px] bg-[#FFF7E6] px-4 text-[13.5px] font-bold text-[#8A5A00] disabled:opacity-60"
                    >
                      <Lock className="h-4 w-4" aria-hidden />
                      Bloklash (o'qish rejimi)
                    </button>
                    <button
                      type="button"
                      disabled={modBusy}
                      onClick={() => void modAmal(() => unblockChatUser(token!, menyu.sender_user_id))}
                      className="flex min-h-[46px] w-full items-center gap-2.5 rounded-[14px] bg-[#F0FBF4] px-4 text-[13.5px] font-bold text-[#12813F] disabled:opacity-60"
                    >
                      <Users className="h-4 w-4" aria-hidden />
                      Blokdan chiqarish
                    </button>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );

  return createPortal(content, document.body);
}
