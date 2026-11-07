import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getTeacherChatMessages,
  sendTeacherChatMessage,
  type TeacherChatMessage,
} from '../api/teachers';
import { lastChatMessageId, mergeChatMessages } from '../../shared/teacherChat';

/** Ochiq chatda yangi xabarlarni tekshirish oralig'i. */
const POLL_MS = 4000;

/**
 * Ustoz ↔ o'quvchi chatining bitta suhbati: birinchi yuklash, har 4 soniyada faqat
 * YANGI xabarlarni olish (`after`), yuborish.
 *
 * - Polling faqat sahifa ko'rinib turganda ishlaydi; ilovaga qaytilganda darhol tekshiradi.
 * - Kursor (`after`) faqat serverdan OLINGAN xabarlar bo'yicha suriladi. Yuborilgan
 *   xabarning id'si kursorga qo'shilmaydi: aks holda suhbatdoshning shu orada kelgan,
 *   kichikroq id'li xabari o'tkazib yuborilardi.
 */
export function useTeacherChatThread(token: string | null | undefined, conversationId: number | null) {
  const [messages, setMessages] = useState<TeacherChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const cursorRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  /** Suhbat almashganda eski so'rov javobi yangi suhbatga tushmasin. */
  const sessionRef = useRef(0);

  const loadInitial = useCallback(async () => {
    if (!token || !conversationId) return;
    const session = ++sessionRef.current;
    setLoading(true);
    setLoadError('');
    try {
      const rows = await getTeacherChatMessages(token, conversationId);
      if (session !== sessionRef.current) return;
      cursorRef.current = lastChatMessageId(rows);
      setMessages(rows);
    } catch (e) {
      if (session === sessionRef.current) setLoadError(e instanceof Error ? e.message : 'Xabarlar yuklanmadi');
    } finally {
      if (session === sessionRef.current) setLoading(false);
    }
  }, [token, conversationId]);

  const poll = useCallback(async () => {
    if (!token || !conversationId || inFlightRef.current) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    const session = sessionRef.current;
    inFlightRef.current = true;
    try {
      // Kursor yo'q (bo'sh chat yoki birinchi yuklash xato) — eng yangilari olinadi.
      const rows = await getTeacherChatMessages(token, conversationId, cursorRef.current);
      if (session !== sessionRef.current) return;
      setLoadError('');
      setLoading(false);
      if (rows.length === 0) return;
      cursorRef.current = Math.max(cursorRef.current ?? 0, lastChatMessageId(rows) ?? 0);
      setMessages((prev) => mergeChatMessages(prev, rows));
    } catch {
      // Polling xatosi jim o'tadi — keyingi urinishda tiklanadi.
    } finally {
      inFlightRef.current = false;
    }
  }, [token, conversationId]);

  useEffect(() => {
    setMessages([]);
    cursorRef.current = null;
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!token || !conversationId) return;
    const id = window.setInterval(() => void poll(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, conversationId, poll]);

  /** `true` — yuborildi (yozuv maydoni tozalanadi), `false` — xato (matn saqlanadi). */
  const send = useCallback(
    async (content: string): Promise<boolean> => {
      const text = content.trim();
      if (!token || !conversationId || !text || sending) return false;
      setSending(true);
      setSendError('');
      try {
        const msg = await sendTeacherChatMessage(token, conversationId, text);
        setMessages((prev) => mergeChatMessages(prev, [msg]));
        return true;
      } catch (e) {
        setSendError(e instanceof Error ? e.message : 'Xabar yuborilmadi');
        return false;
      } finally {
        setSending(false);
      }
    },
    [token, conversationId, sending],
  );

  return { messages, loading, loadError, sendError, sending, send, retry: loadInitial };
}
