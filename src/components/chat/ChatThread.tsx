/**
 * Chat suhbatining qayta ishlatiladigan bo'laklari: sarlavha, xabarlar ro'yxati, yozish maydoni.
 *
 * Telefondagi to'liq ekranli `ChatScreen` ham, ustoz kabinetining kompyuterdagi ikki
 * ustunli ko'rinishi ham aynan shu bo'laklardan yig'iladi — ko'rinish va xatti-harakat bir xil.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Loader2, MessageCircle, RotateCcw, Send } from 'lucide-react';

export type ChatBubbleMessage = {
  id: number;
  content: string;
  created_at: string;
  mine: boolean;
};

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** «Bugun», «Kecha», «12-noyabr» (boshqa yil bo'lsa yili bilan). */
export function uzChatDay(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return 'Bugun';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Kecha';
  const base = `${d.getDate()}-${UZ_MONTHS[d.getMonth()] ?? ''}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base}, ${d.getFullYear()}`;
}

/** «14:05» — qurilma vaqti bilan. */
export function chatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const dayKey = (iso: string) => new Date(iso).toDateString();

/* --------------------------------- Sarlavha --------------------------------- */

export function ChatHeader({
  title,
  subtitle,
  avatar,
  onBack,
  backLabel = 'Orqaga',
  safeTop = false,
}: {
  title: string;
  subtitle?: string;
  avatar?: ReactNode;
  /** Berilmasa ortga tugmasi chiqmaydi (kompyuterdagi ikki ustunli ko'rinish). */
  onBack?: () => void;
  backLabel?: string;
  /** Telefonda to'liq ekran — kamera "chuqurchasi" ostidan boshlansin. */
  safeTop?: boolean;
}) {
  return (
    <header
      className={`flex shrink-0 items-center gap-3 border-b border-app-border bg-app-surface px-3 py-2.5 sm:px-4 ${
        safeTop ? 'pt-[max(env(safe-area-inset-top,0px),10px)]' : ''
      }`}
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-app-text transition hover:bg-app-bg-muted active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : null}
      {avatar ? <span className="shrink-0">{avatar}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-black leading-tight text-app-text">{title}</span>
        {subtitle ? <span className="mt-0.5 block truncate text-xs font-semibold text-app-text-muted">{subtitle}</span> : null}
      </span>
    </header>
  );
}

/* ----------------------------- Xabarlar ro'yxati ---------------------------- */

/** Pastdan shuncha px ichida bo'lsa — foydalanuvchi "pastda" hisoblanadi va yangi xabarga suriladi. */
const NEAR_BOTTOM_PX = 140;

export function ChatMessageList({
  messages,
  loading,
  error,
  onRetry,
  emptyText = 'Hali xabar yoʻq. Birinchi boʻlib yozing!',
  retryLabel = 'Qayta urinish',
  formatTime = chatTime,
  formatDay = uzChatDay,
  scrollSignal = 0,
}: {
  messages: ChatBubbleMessage[];
  loading: boolean;
  error?: string;
  onRetry?: () => void;
  emptyText?: string;
  retryLabel?: string;
  formatTime?: (iso: string) => string;
  formatDay?: (iso: string) => string;
  /** O'zgarganda ro'yxat pastga suriladi (klaviatura ochilishi, yozish maydoniga fokus). */
  scrollSignal?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  /** Birinchi to'plamdagi xabarlar animatsiyasiz chiqadi — faqat yangi kelganlari "suzib" chiqadi. */
  const firstBatchMaxIdRef = useRef<number | null>(null);
  const prevCountRef = useRef(0);

  if (firstBatchMaxIdRef.current === null && !loading) {
    firstBatchMaxIdRef.current = messages.length ? messages[messages.length - 1].id : 0;
  }

  const toBottom = (smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    nearBottomRef.current = true;
  };

  useLayoutEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = messages.length;
    if (messages.length === 0) return;
    if (prev === 0) return toBottom(false);
    if (messages.length > prev && (nearBottomRef.current || messages[messages.length - 1].mine)) toBottom(true);
  }, [messages]);

  useEffect(() => {
    if (scrollSignal) toBottom(false);
  }, [scrollSignal]);

  return (
    <div
      ref={scrollRef}
      onScroll={(e) => {
        const el = e.currentTarget;
        nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      }}
      className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-app-bg-muted px-3 py-3 sm:px-5"
      aria-live="polite"
    >
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-end">
        {loading && messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-16" aria-busy="true">
            <Loader2 className="h-7 w-7 animate-spin text-app-primary-deep" />
          </div>
        ) : error && messages.length === 0 ? (
          <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="max-w-xs text-sm font-semibold text-app-danger">{error}</p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="flex h-11 items-center gap-2 rounded-2xl border border-app-border bg-app-surface px-4 text-sm font-bold text-app-text transition hover:bg-app-row-hover active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4" /> {retryLabel}
              </button>
            ) : null}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-icon-bg text-app-primary-deep">
              <MessageCircle className="h-7 w-7" />
            </span>
            <p className="max-w-xs text-sm font-semibold text-app-text-muted">{emptyText}</p>
          </div>
        ) : (
          <ol className="flex flex-col">
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
              const grouped = !newDay && prev?.mine === m.mine;
              const animate = firstBatchMaxIdRef.current !== null && m.id > firstBatchMaxIdRef.current;
              return (
                <li key={m.id} className={grouped ? 'mt-1' : 'mt-3 first:mt-0'}>
                  {newDay ? (
                    <div className="mb-3 flex justify-center">
                      <span className="rounded-full bg-app-surface px-3 py-1 text-[11px] font-bold text-app-text-muted ring-1 ring-app-border">
                        {formatDay(m.created_at)}
                      </span>
                    </div>
                  ) : null}
                  <motion.div
                    initial={animate ? { opacity: 0, y: 8 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-[20px] px-3.5 py-2 text-[15px] leading-[1.45] shadow-[0_1px_2px_rgba(15,23,42,0.06)] sm:max-w-[72%] ${
                        m.mine
                          ? `bg-app-primary-deep text-white ${grouped ? '' : 'rounded-br-md'}`
                          : `bg-app-surface text-app-text ring-1 ring-app-border ${grouped ? '' : 'rounded-bl-md'}`
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={`mt-0.5 text-right text-[10.5px] tabular-nums ${m.mine ? 'text-white/65' : 'text-app-text-secondary'}`}>
                        {formatTime(m.created_at)}
                      </p>
                    </div>
                  </motion.div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Yozish maydoni ------------------------------ */

/** Yozish maydonining eng katta balandligi — undan keyin ichida suriladi. */
const COMPOSER_MAX_PX = 140;

/** Sensorli ekranda Enter — yangi qator (klaviaturada alohida "yuborish" tugmasi bor). */
function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

export function ChatComposer({
  onSend,
  sending,
  error,
  placeholder = 'Xabar yozing…',
  sendLabel = 'Yuborish',
  onFocus,
  bottomInset = 'none',
  autoFocus = false,
}: {
  /** `true` qaytsa matn tozalanadi; `false` — xato, matn saqlanadi. */
  onSend: (text: string) => Promise<boolean>;
  sending: boolean;
  error?: string;
  placeholder?: string;
  sendLabel?: string;
  onFocus?: () => void;
  /** `safe` — telefonda pastki "uy" chizig'i uchun joy; `keyboard` — klaviatura ochiq, joy kerak emas. */
  bottomInset?: 'safe' | 'keyboard' | 'none';
  autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_PX)}px`;
  }, [text]);

  const submit = async () => {
    const content = text.trim();
    if (!content || sending) return;
    const ok = await onSend(content);
    if (ok) setText((current) => (current.trim() === content ? '' : current));
    // Telefonda klaviatura yopilib qolmasin — fokus maydonda qoladi.
    areaRef.current?.focus();
  };

  const padBottom =
    bottomInset === 'safe' ? 'max(10px, env(safe-area-inset-bottom, 0px))' : bottomInset === 'keyboard' ? '6px' : undefined;

  return (
    <div className="shrink-0 border-t border-app-border bg-app-surface px-3 pt-2.5 pb-2.5 sm:px-4" style={padBottom ? { paddingBottom: padBottom } : undefined}>
      {error ? (
        <p role="alert" className="mx-auto mb-2 max-w-2xl rounded-xl bg-app-danger-bg px-3 py-2 text-xs font-semibold text-app-danger">
          {error}
        </p>
      ) : null}
      <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
        <textarea
          ref={areaRef}
          value={text}
          rows={1}
          autoFocus={autoFocus}
          onChange={(e) => setText(e.target.value)}
          onFocus={onFocus}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing || isTouchDevice()) return;
            e.preventDefault();
            void submit();
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          enterKeyHint="send"
          className="min-h-[46px] flex-1 resize-none rounded-[22px] border border-app-border bg-app-bg-muted px-4 py-[11px] text-base leading-[1.4] text-app-text outline-none transition placeholder:text-app-text-secondary focus:border-app-primary focus:bg-app-surface focus:ring-2 focus:ring-app-primary/15"
        />
        <button
          type="button"
          // Bosilganda textarea fokusni yo'qotmasin — aks holda telefonda klaviatura yopilib, tugma "qochadi".
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void submit()}
          disabled={sending || !text.trim()}
          aria-label={sendLabel}
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-app-primary-deep text-white shadow-[0_6px_16px_rgba(37,99,235,0.28)] transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:shadow-none"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
