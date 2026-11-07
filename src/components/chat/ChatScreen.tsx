/**
 * TO'LIQ EKRANLI CHAT — telefonda butun ekranni egallaydi (pastki menyuni ham yopadi),
 * kompyuterda markazdagi katta oyna.
 *
 * - Ekran klaviaturasi ochilganda konteyner `visualViewport` ga moslanadi (`useChatLayout`),
 *   yozish maydoni klaviatura ustida qoladi.
 * - Qurilmaning "ortga" tugmasi va Escape chatni yopadi (ilovadan chiqmaydi): tarixga bitta
 *   yozuv qo'yiladi (`useQurilmaOrqaga`), nativ ilova esa `role="dialog"` ga Escape yuboradi.
 * - `document.body` ga portal: sahifa o'tish qatlami yangi stacking context yaratadi, ichida
 *   qolsa pastki menyu ostida ko'rinardi.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useChatLayout } from '../../hooks/useChatLayout';
import { useQurilmaOrqaga } from '../../hooks/useQurilmaOrqaga';
import { ChatComposer, ChatHeader, ChatMessageList, type ChatBubbleMessage } from './ChatThread';

/** Kompyuterda: butun oyna, ichida markazlashgan panel. */
const DESKTOP_STYLE = { top: 0, left: 0, right: 0, bottom: 0 } as const;

export type ChatScreenProps = {
  title: string;
  subtitle?: string;
  avatar?: ReactNode;
  onClose: () => void;
  messages: ChatBubbleMessage[];
  loading: boolean;
  loadError?: string;
  onRetry?: () => void;
  onSend: (text: string) => Promise<boolean>;
  sending: boolean;
  sendError?: string;
  labels?: {
    back?: string;
    send?: string;
    placeholder?: string;
    empty?: string;
    retry?: string;
  };
  formatTime?: (iso: string) => string;
  formatDay?: (iso: string) => string;
};

export default function ChatScreen({
  title,
  subtitle,
  avatar,
  onClose,
  messages,
  loading,
  loadError,
  onRetry,
  onSend,
  sending,
  sendError,
  labels = {},
  formatTime,
  formatDay,
}: ChatScreenProps) {
  const layout = useChatLayout(DESKTOP_STYLE);
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrollSignal, setScrollSignal] = useState(0);

  const closeViaHistory = useQurilmaOrqaga(true, onClose);
  /*
   * Nativ "ortga": bootstrap avval Escape yuboradi, 60 ms dan keyin oyna hali turgan bo'lsa
   * "Orqaga" tugmasini bosadi. Ikkinchi chaqiruv yana `history.back()` qilib sahifadan
   * chiqarib yubormasligi uchun yopish faqat bir marta bajariladi.
   */
  const closingRef = useRef(false);
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    closeViaHistory();
  }, [closeViaHistory]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      requestClose();
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [requestClose]);

  // Klaviatura ochildi/yopildi — oxirgi xabar ko'rinib tursin.
  useEffect(() => {
    setScrollSignal((n) => n + 1);
  }, [layout.vpHeight]);

  const screen = (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed z-[100] flex sm:items-center sm:justify-center sm:bg-[rgba(15,23,42,0.45)] sm:p-6"
      style={layout.containerStyle}
    >
      <motion.div
        initial={layout.isDesktop ? { opacity: 0, y: 16, scale: 0.98 } : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        className="flex h-full w-full flex-col overflow-hidden bg-app-surface sm:h-[min(760px,100%)] sm:max-w-2xl sm:rounded-[24px] sm:shadow-[0_24px_60px_rgba(15,23,42,0.28)]"
      >
        <ChatHeader
          title={title}
          subtitle={subtitle}
          avatar={avatar}
          onBack={requestClose}
          backLabel={labels.back}
          safeTop={!layout.isDesktop}
        />
        <ChatMessageList
          messages={messages}
          loading={loading}
          error={loadError}
          onRetry={onRetry}
          emptyText={labels.empty}
          retryLabel={labels.retry}
          formatTime={formatTime}
          formatDay={formatDay}
          scrollSignal={scrollSignal}
        />
        <ChatComposer
          onSend={onSend}
          sending={sending}
          error={sendError}
          placeholder={labels.placeholder}
          sendLabel={labels.send}
          onFocus={() => window.setTimeout(() => setScrollSignal((n) => n + 1), 250)}
          bottomInset={layout.isDesktop ? 'none' : layout.keyboardOpen ? 'keyboard' : 'safe'}
          autoFocus={layout.isDesktop}
        />
      </motion.div>
    </div>
  );

  return createPortal(screen, document.body);
}
