/**
 * O'quvchi: ustoz bilan chat — to'liq ekranli `ChatScreen` + har 4 soniyada yangi xabarlar.
 * Yopilganda `TEACHER_CHAT_CLOSED_EVENT` yuboriladi: o'qilmaganlar belgichalari yangilansin.
 */
import { useCallback, useMemo } from 'react';
import ChatScreen from '../chat/ChatScreen';
import type { ChatBubbleMessage } from '../chat/ChatThread';
import { useTeacherChatThread } from '../../hooks/useTeacherChatThread';
import { TeacherPhoto } from './market/parts';

/** Chat yopildi — ro'yxatlar va "Chat" tab belgichasi qayta yuklansin. */
export const TEACHER_CHAT_CLOSED_EVENT = 'teacher-chat-closed';

export default function TeacherChatScreen({
  token,
  conversationId,
  currentUserId,
  title,
  avatarUrl = null,
  onClose,
}: {
  token: string;
  conversationId: number;
  currentUserId: number;
  title: string;
  avatarUrl?: string | null;
  onClose: () => void;
}) {
  const thread = useTeacherChatThread(token, conversationId);

  const bubbles = useMemo<ChatBubbleMessage[]>(
    () => thread.messages.map((m) => ({ id: m.id, content: m.content, created_at: m.created_at, mine: m.sender_user_id === currentUserId })),
    [thread.messages, currentUserId],
  );

  const handleClose = useCallback(() => {
    onClose();
    window.dispatchEvent(new Event(TEACHER_CHAT_CLOSED_EVENT));
  }, [onClose]);

  return (
    <ChatScreen
      title={title}
      subtitle="Ustoz"
      avatar={<TeacherPhoto url={avatarUrl} name={title} className="h-10 w-10 rounded-full [&_span]:text-sm" />}
      onClose={handleClose}
      messages={bubbles}
      loading={thread.loading}
      loadError={thread.loadError}
      onRetry={() => void thread.retry()}
      onSend={thread.send}
      sending={thread.sending}
      sendError={thread.sendError}
      labels={{ empty: 'Hali xabar yoʻq. Ustozga birinchi boʻlib yozing!' }}
    />
  );
}
