import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import ChatMedia from './ChatMedia';
import ChatMediaComposer, { type ComposerRejim } from './ChatMediaComposer';
import MessageReactions from './MessageReactions';
import { ArrowLeft, AtSign, Clapperboard, Headphones, ImagePlus, Lock, Mic, MoreVertical, Pencil, Send, SmilePlus, Trash2, Users, Video, X } from 'lucide-react';
import {
  getSavolJavobLiveState,
  getSavolJavobMessages,
  markSavolJavobRead,
  pingSavolJavobPresence,
  searchSavolJavobMembers,
  sendSavolJavobMessage,
  sendSavolJavobMedia,
  toggleMessageReaction,
  getAvailableReactions,
  uploadReactionImage,
  type ReactionOption,
  addReactionEmoji,
  removeReactionEmoji,
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
import UserCard from './UserCard';

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
  /* Support ismga bosganda ochiladigan karta. Oddiy foydalanuvchida hech qachon. */
  const [karta, setKarta] = useState<number | null>(null);
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

  /*
   * MEDIA YUBORISH.
   *
   * Matnli xabar bilan bir xil oqim: yuborilgach ro'yxatga qo'shiladi va
   * pastga tushiriladi. Faqat bu yerda matn maydoni ham birga ketadi —
   * odam rasmga izoh yozgan bo'lishi mumkin.
   */
  const [mediaRejim, setMediaRejim] = useState<ComposerRejim | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const faylRef = useRef<HTMLInputElement | null>(null);

  async function mediaYubor(
    kind: 'image' | 'video' | 'voice' | 'video_note',
    file: Blob,
    fileName: string,
    ms?: number | null,
  ) {
    if (!token || yuklanmoqda) return;
    setYuklanmoqda(true);
    setError('');
    const izoh = text.trim() ? serializeMentions(text.trim(), pickedRef.current) : '';
    try {
      const created = await sendSavolJavobMedia(token, { kind, file, fileName, content: izoh, ms });
      stickToBottomRef.current = true;
      setMessages((prev) => [...prev, created]);
      setText('');
      pickedRef.current = [];
      void markSavolJavobRead(token).catch(() => {});
      void refreshLive();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadError'));
    } finally {
      setYuklanmoqda(false);
      setMediaRejim(null);
    }
  }

  /*
   * Taklif etiladigan emojilar serverdan keladi — support hisobi
   * ro'yxatni o'zgartirsa, deploy kutmasdan hammada yangilanadi.
   */
  const [emojilar, setEmojilar] = useState<ReactionOption[]>([]);
  const [emojiPanel, setEmojiPanel] = useState(false);
  const [yangiEmoji, setYangiEmoji] = useState('');
  const [emojiBand, setEmojiBand] = useState(false);
  const [rasmNomi, setRasmNomi] = useState('');
  const emojiFaylRef = useRef<HTMLInputElement | null>(null);

  async function rasmliEmojiQoshish(file: File) {
    if (!token || emojiBand) return;
    setEmojiBand(true);
    setError('');
    try {
      await uploadReactionImage(token, file, rasmNomi.trim());
      setRasmNomi('');
      await emojilarniYukla();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.loadError'));
    } finally {
      setEmojiBand(false);
    }
  }

  const emojilarniYukla = useCallback(async () => {
    if (!token) return;
    try {
      const r = await getAvailableReactions(token);
      setEmojilar(r.emojis ?? []);
    } catch {
      /* zaxira to'plam MessageReactions ichida */
    }
  }, [token]);

  useEffect(() => {
    void emojilarniYukla();
  }, [emojilarniYukla]);

  async function emojiQoshish() {
    const e = yangiEmoji.trim();
    if (!token || !e || emojiBand) return;
    setEmojiBand(true);
    setError('');
    try {
      await addReactionEmoji(token, e);
      setYangiEmoji('');
      await emojilarniYukla();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.loadError'));
    } finally {
      setEmojiBand(false);
    }
  }

  async function emojiOchirish(e: string) {
    if (!token || emojiBand) return;
    setEmojiBand(true);
    setError('');
    try {
      await removeReactionEmoji(token, e);
      await emojilarniYukla();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.loadError'));
    } finally {
      setEmojiBand(false);
    }
  }

  /*
   * REAKSIYA — darhol ko'rinadi, keyin server bilan solishtiriladi.
   *
   * Server javobini kutib turilsa, sekin tarmoqda tugma "o'lik" bo'lib
   * tuyulardi. Shuning uchun avval mahalliy holat o'zgaradi, javob
   * kelgach haqiqiy yig'ma bilan almashtiriladi. Xato bo'lsa — orqaga
   * qaytariladi.
   */
  async function reaksiyaBos(messageId: number, emoji: string) {
    if (!token) return;
    const oldingi = messages;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const hozir = m.reactions ?? [];
        const bor = hozir.find((r) => r.emoji === emoji);
        let yangi;
        if (bor?.meni) {
          yangi = hozir
            .map((r) => (r.emoji === emoji ? { ...r, soni: r.soni - 1, meni: false } : r))
            .filter((r) => r.soni > 0);
        } else if (bor) {
          yangi = hozir.map((r) => (r.emoji === emoji ? { ...r, soni: r.soni + 1, meni: true } : r));
        } else {
          yangi = [...hozir, { emoji, soni: 1, meni: true }];
        }
        return { ...m, reactions: yangi };
      }),
    );
    try {
      const javob = await toggleMessageReaction(token, messageId, emoji);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: javob.reactions } : m)),
      );
    } catch (e) {
      setMessages(oldingi);
      setError(e instanceof Error ? e.message : t('common.loadError'));
    }
  }

  /** Galereyadan tanlangan fayl — turi MIME bo'yicha aniqlanadi. */
  function faylTanlandi(f: File | null | undefined) {
    if (!f) return;
    const kind = f.type.startsWith('video/') ? 'video' : 'image';
    void mediaYubor(kind, f, f.name || (kind === 'video' ? 'video' : 'rasm'));
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
        {canModerate ? (
          <button
            type="button"
            onClick={() => setEmojiPanel(true)}
            className="order-last flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] bg-pmn-pill text-pmn-text ring-1 ring-pmn-border"
            aria-label="Reaksiya emojilarini boshqarish"
            title="Reaksiya emojilari"
          >
            <SmilePlus className="h-4 w-4" />
          </button>
        ) : null}
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
                    /*
                      Support uchun bu tugma (ma'lumot kartasi ochiladi),
                      qolganlar uchun oddiy `div`. Tugmani hammaga berib,
                      keyin bosilganda "ruxsat yo'q" deyish yomonroq
                      bo'lardi: bosiladigan ko'rinib turgan narsa
                      ishlamasligi kerak emas.
                    */
                    canModerate ? (
                      <button
                        type="button"
                        onClick={() => setKarta(msg.sender_user_id)}
                        aria-label={`${msg.sender_name} ma'lumotlari`}
                        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white transition-transform active:scale-90"
                        style={{ background: 'linear-gradient(145deg, #8B5CF6, #6D28D9)' }}
                      >
                        {initials || '?'}
                      </button>
                    ) : (
                      <div
                        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                        style={{ background: 'linear-gradient(145deg, #8B5CF6, #6D28D9)' }}
                      >
                        {initials || '?'}
                      </div>
                    )
                  ) : null}
                  <div className="max-w-[74%]">
                    {!mine ? (
                      canModerate ? (
                        <button
                          type="button"
                          onClick={() => setKarta(msg.sender_user_id)}
                          className="ml-1 mb-[3px] block text-[11px] font-extrabold text-[#A78BFA] underline decoration-dotted underline-offset-2"
                        >
                          {msg.sender_name}
                        </button>
                      ) : (
                        <p className="ml-1 mb-[3px] text-[11px] font-extrabold text-[#A78BFA]">
                          {msg.sender_name}
                        </p>
                      )
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
                        {/*
                          Rels kommentariyasi — oddiy xabar bilan bir joyda
                          turadi, shuning uchun qayerdan kelgani belgilanadi.
                          Aks holda suhbat kontekstsiz ko'rinardi.
                        */}
                        {msg.reel_id ? (
                          <span
                            className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-black uppercase tracking-wide ${
                              mine ? 'bg-white/20 text-white/85' : 'bg-[#8B5CF6]/12 text-[#6D28D9]'
                            }`}
                          >
                            <Clapperboard className="h-3 w-3" aria-hidden />
                            Rels
                          </span>
                        ) : null}
                        {msg.media_url && msg.media_kind ? (
                          <div className={msg.content ? 'mb-1.5' : ''}>
                            <ChatMedia
                              kind={msg.media_kind}
                              url={msg.media_url}
                              ms={msg.media_ms}
                              oziniki={mine}
                              ochirilgan={Boolean(msg.media_deleted_at)}
                            />
                          </div>
                        ) : null}
                        {msg.content ? (
                          <MessageBody content={msg.content} mine={mine} myUserId={user?.id} />
                        ) : null}
                        {msg.edited_at ? (
                          <span className={`ml-1 text-[10px] font-bold ${mine ? 'text-white/70' : 'text-app-text-muted'}`}>
                            (tahrirlangan)
                          </span>
                        ) : null}
                      </div>
                    </MaybeSuriladigan>
                    <div className={mine ? 'flex justify-end' : 'ml-1'}>
                      <MessageReactions
                        reactions={msg.reactions ?? []}
                        oziniki={mine}
                        emojilar={emojilar}
                        onToggle={(e) => void reaksiyaBos(msg.id, e)}
                      />
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
        <div className="mx-auto flex max-w-lg items-end gap-1.5">
          {/* Galereya — rasm va video. Bitta input, turi MIME bo'yicha ajratiladi. */}
          <input
            ref={faylRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              faylTanlandi(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => faylRef.current?.click()}
            disabled={yuklanmoqda}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-pmn-text-muted transition hover:bg-pmn-pill disabled:opacity-40"
            aria-label="Rasm yoki video"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setMediaRejim('video_note')}
            disabled={yuklanmoqda}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-pmn-text-muted transition hover:bg-pmn-pill disabled:opacity-40"
            aria-label="Dumaloq video xabar"
          >
            <Video className="h-5 w-5" />
          </button>
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
          {/*
            Matn bo'sh bo'lsa — mikrofon, yozilgan bo'lsa — yuborish.
            Telegram va WhatsApp'dagi xulq; ikkita alohida tugma joyni
            bekorga egallardi.
          */}
          {text.trim() ? (
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || yuklanmoqda}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0EA5A5] text-white shadow-md disabled:opacity-50"
              aria-label={t('common.send')}
            >
              <Send className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMediaRejim('voice')}
              disabled={yuklanmoqda}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0EA5A5] text-white shadow-md disabled:opacity-50"
              aria-label="Ovozli xabar"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
        )}
      </div>

      {/*
        SUPPORT: reaksiya emojilarini boshqarish.

        O'chirish faqat RO'YXATDAN olib tashlaydi — odamlar ilgari qo'ygan
        reaksiyalar joyida qoladi. Kamida bitta emoji qolishi shart, aks
        holda chatda reaksiya qo'yib bo'lmay qolardi.
      */}
      {emojiPanel && canModerate
        ? createPortal(
            <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center">
              <div className="w-full max-w-sm rounded-t-[24px] bg-pmn-card sm:rounded-[24px]">
                <div className="flex items-center justify-between border-b border-pmn-border px-5 py-3">
                  <span className="text-[14px] font-black text-pmn-text">Reaksiya emojilari</span>
                  <button
                    type="button"
                    onClick={() => setEmojiPanel(false)}
                    className="rounded-lg p-1.5 text-pmn-text-muted"
                    aria-label="Yopish"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {emojilar.map((o) => (
                      <span
                        key={o.emoji}
                        className="inline-flex items-center gap-1.5 rounded-full bg-pmn-pill px-2.5 py-1.5 ring-1 ring-pmn-border"
                        title={o.label || undefined}
                      >
                        {o.image_url ? (
                          <img
                            src={o.image_url}
                            alt={o.label || o.emoji}
                            className="h-[18px] w-[18px] object-contain"
                          />
                        ) : (
                          <span className="text-[18px] leading-none">{o.emoji}</span>
                        )}
                        <button
                          type="button"
                          disabled={emojiBand || emojilar.length <= 1}
                          onClick={() => void emojiOchirish(o.emoji)}
                          className="text-pmn-text-muted transition hover:text-red-600 disabled:opacity-30"
                          aria-label={`${o.label || o.emoji} ni o'chirish`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                    {emojilar.length === 0 ? (
                      <p className="text-[13px] text-pmn-text-muted">Ro'yxat bo'sh</p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <input
                      value={yangiEmoji}
                      onChange={(ev) => setYangiEmoji(ev.target.value)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter') {
                          ev.preventDefault();
                          void emojiQoshish();
                        }
                      }}
                      placeholder="Yangi emoji (masalan 🎉)"
                      maxLength={16}
                      className="min-w-0 flex-1 rounded-[12px] border border-pmn-border bg-pmn-bg px-3 py-2.5 text-[15px] text-pmn-text outline-none focus:border-[#0EA5A5]"
                    />
                    <button
                      type="button"
                      disabled={!yangiEmoji.trim() || emojiBand}
                      onClick={() => void emojiQoshish()}
                      className="shrink-0 rounded-[12px] bg-[#0EA5A5] px-4 py-2.5 text-[13.5px] font-black text-white disabled:opacity-40"
                    >
                      Qo'shish
                    </button>
                  </div>

                  {/* Galereyadan rasmli reaksiya. */}
                  <div className="mt-4 border-t border-pmn-border pt-4">
                    <p className="text-[12.5px] font-bold text-pmn-text">Rasmli reaksiya</p>
                    <input
                      ref={emojiFaylRef}
                      type="file"
                      accept="image/png,image/webp,image/jpeg,image/gif"
                      className="hidden"
                      onChange={(ev) => {
                        const f = ev.target.files?.[0];
                        ev.target.value = '';
                        if (f) void rasmliEmojiQoshish(f);
                      }}
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        value={rasmNomi}
                        onChange={(ev) => setRasmNomi(ev.target.value)}
                        placeholder="Nom (masalan falarus)"
                        maxLength={40}
                        className="min-w-0 flex-1 rounded-[12px] border border-pmn-border bg-pmn-bg px-3 py-2.5 text-[14px] text-pmn-text outline-none focus:border-[#0EA5A5]"
                      />
                      <button
                        type="button"
                        disabled={!rasmNomi.trim() || emojiBand}
                        onClick={() => emojiFaylRef.current?.click()}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-[12px] bg-pmn-pill px-3 py-2.5 text-[13px] font-black text-pmn-text ring-1 ring-pmn-border disabled:opacity-40"
                      >
                        <ImagePlus className="h-4 w-4" />
                        Rasm
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-pmn-text-muted">
                      PNG, WEBP, JPEG yoki GIF · 512 KB gacha · 128px ga kichraytiriladi
                    </p>
                  </div>

                  <p className="mt-3 text-[11.5px] leading-snug text-pmn-text-muted">
                    O'chirilgan reaksiya ro'yxatdan chiqadi, lekin ilgari qo'yilganlari
                    xabarlarda qolaveradi.
                  </p>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* Ovoz / dumaloq video yozish oynasi. */}
      {mediaRejim
        ? createPortal(
            <ChatMediaComposer
              rejim={mediaRejim}
              onYop={() => setMediaRejim(null)}
              onOvoz={(blob, ms) => void mediaYubor('voice', blob, 'ovoz.webm', ms)}
              onVideo={(blob, ms, mime) =>
                void mediaYubor('video_note', blob, mime.includes('mp4') ? 'video.mp4' : 'video.webm', ms)
              }
            />,
            document.body,
          )
        : null}

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

            {/*
              Menyudan ham kirish mumkin: ismga bosish kichik nishon,
              menyu esa allaqachon ochilgan bo'ladi va bu yerdan
              ma'lumotga o'tish tabiiyroq.
            */}
            <button
              type="button"
              onClick={() => {
                const kim = menyu.sender_user_id;
                setMenyu(null);
                setTahrir(null);
                setKarta(kim);
              }}
              className="mb-2 w-full rounded-[14px] bg-pmn-pill py-2.5 text-[13.5px] font-black text-pmn-text"
            >
              Ma'lumotlari
            </button>

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

      {/* Ma'lumot kartasi — faqat support ochadi. */}
      {karta != null ? <UserCard userId={karta} onClose={() => setKarta(null)} /> : null}
    </div>
  );

  return createPortal(content, document.body);
}
