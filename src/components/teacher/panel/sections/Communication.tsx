import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { motion } from 'motion/react';
import {
  getPanelReviews,
  getPanelStudents,
  markNotificationsRead,
  type PanelNotification,
  type ReviewsResponse,
} from '../../../../api/teacherPanel';
import { getTeacherConversations, type TeacherConversation } from '../../../../api/teachers';
import { useTeacherChatThread } from '../../../../hooks/useTeacherChatThread';
import ChatScreen from '../../../chat/ChatScreen';
import { ChatComposer, ChatHeader, ChatMessageList, type ChatBubbleMessage } from '../../../chat/ChatThread';
import { usePanel } from '../panelContext';
import { tpl } from '../lang';
import {
  Avatar,
  Card,
  Empty,
  ErrorNote,
  PageHead,
  Skeleton,
  Tag,
  fmtDate,
  fmtDateTime,
  fmtTime,
  tashkentDate,
  toneFor,
} from '../ui';

/* --------------------------------- Xabarlar --------------------------------- */

/** Ikki ustunli ko'rinish `lg` dan boshlab; undan torda — ro'yxat, so'ng to'liq ekranli chat. */
const LG_QUERY = '(min-width: 1024px)';
/** Ro'yxatdagi oxirgi xabar va o'qilmaganlar soni shu oraliqda yangilanadi. */
const LIST_POLL_MS = 20_000;
const DAY_MS = 86_400_000;

function useIsLg(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(LG_QUERY);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(LG_QUERY).matches,
    () => true
  );
}

export default function Messages() {
  const { token, t, lang } = usePanel();
  const isLg = useIsLg();
  const [conversations, setConversations] = useState<TeacherConversation[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const thread = useTeacherChatThread(token, activeId);

  const loadConversations = useCallback(
    () =>
      getTeacherConversations(token)
        .then((convos) => {
          setConversations(convos);
          setErr('');
          return convos;
        })
        .catch((e: Error) => {
          setErr(e.message);
          return null;
        }),
    [token]
  );

  useEffect(() => {
    let alive = true;
    Promise.all([loadConversations(), getPanelStudents(token, 'all').catch(() => null)])
      .then(([convos, students]) => {
        if (!alive) return;
        const map: Record<number, string> = {};
        for (const s of students?.students ?? []) map[s.user_id] = s.name;
        setNames(map);
        // Kompyuterda birinchi yozishma darhol ochiladi; telefonda avval ro'yxat ko'rinadi.
        if (window.matchMedia(LG_QUERY).matches) setActiveId((id) => id ?? convos?.[0]?.id ?? null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token, loadConversations]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadConversations();
    }, LIST_POLL_MS);
    return () => window.clearInterval(id);
  }, [loadConversations]);

  // Ochiq yozishmada yangi xabar — ro'yxatdagi oxirgi xabar va vaqt ham darhol yangilansin.
  const lastMessage = thread.messages[thread.messages.length - 1];
  useEffect(() => {
    if (!activeId || !lastMessage || Number(lastMessage.conversation_id) !== activeId) return;
    setConversations((list) =>
      list.map((c) =>
        c.id === activeId
          ? {
              ...c,
              unread: 0,
              last_message_at: lastMessage.created_at,
              last_message: {
                content: lastMessage.content.slice(0, 140),
                mine: lastMessage.sender_user_id !== c.student_user_id,
                created_at: lastMessage.created_at,
              },
            }
          : c
      )
    );
  }, [activeId, lastMessage]);

  const open = (id: number) => {
    setActiveId(id);
    setConversations((list) => list.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  };

  const closeThread = useCallback(() => {
    setActiveId(null);
    void loadConversations();
  }, [loadConversations]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const nameOf = (c: TeacherConversation) => c.student_name || names[c.student_user_id] || t.studentRole;

  const bubbles = useMemo<ChatBubbleMessage[]>(
    () =>
      active
        ? thread.messages.map((m) => ({
            id: m.id,
            content: m.content,
            created_at: m.created_at,
            mine: m.sender_user_id !== active.student_user_id,
          }))
        : [],
    [thread.messages, active]
  );

  const formatDay = useCallback(
    (iso: string) => {
      const day = tashkentDate(iso);
      if (day === tashkentDate()) return t.today;
      if (day === tashkentDate(new Date(Date.now() - DAY_MS))) return t.chatYesterday;
      return fmtDate(iso, lang);
    },
    [t, lang]
  );
  /** Ro'yxatdagi vaqt: bugun — soat, aks holda sana. */
  const listTime = (iso: string | null | undefined) =>
    !iso ? '' : tashkentDate(iso) === tashkentDate() ? fmtTime(iso) : fmtDate(iso, lang);

  if (loading) return <Skeleton rows={3} />;

  const activeName = active ? nameOf(active) : '';
  const activeAvatar = active ? (
    <Avatar name={activeName} size={40} url={active.student_avatar_url ?? null} tone={toneFor(activeName)} />
  ) : null;

  return (
    <div>
      <PageHead title={t.messagesTitle} subtitle={t.messagesHint} />
      {err ? <ErrorNote text={err} /> : null}

      {conversations.length === 0 ? (
        <Empty text={t.messagesEmpty} hint={t.messagesHint} />
      ) : (
        <section className="flex overflow-hidden rounded-[22px] border border-app-border bg-app-surface lg:h-[min(720px,calc(100dvh-220px))] lg:min-h-[480px]">
          <ul className="min-w-0 flex-1 overflow-y-auto lg:w-[320px] lg:flex-none lg:border-r lg:border-app-bg-subtle">
            {conversations.map((c) => {
              const selected = isLg && c.id === activeId;
              const unread = c.id === activeId ? 0 : (c.unread ?? 0);
              const name = nameOf(c);
              const preview = c.last_message
                ? `${c.last_message.mine ? t.chatYouPrefix : ''}${c.last_message.content}`
                : t.chatNoMessagesYet;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => open(c.id)}
                    aria-current={selected ? 'true' : undefined}
                    className={`flex min-h-[72px] w-full items-center gap-3 border-b border-app-bg-subtle px-3.5 py-3 text-left transition active:bg-app-bg-subtle ${
                      selected ? 'bg-app-icon-bg' : 'hover:bg-[var(--app-row-hover)]'
                    }`}
                  >
                    <Avatar name={name} size={46} url={c.student_avatar_url ?? null} tone={toneFor(name)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <b className="truncate text-[15px] text-app-text">{name}</b>
                        <span className={`shrink-0 text-[12px] font-semibold ${unread ? 'text-app-primary' : 'text-app-text-muted'}`}>
                          {listTime(c.last_message?.created_at ?? c.last_message_at)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className={`truncate text-[13.5px] ${unread ? 'font-bold text-app-text' : 'text-app-text-muted'}`}>{preview}</span>
                        {unread > 0 ? (
                          <span className="flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full bg-app-primary px-1.5 text-[12px] font-extrabold tabular-nums text-white">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {isLg ? (
            active ? (
              <div className="flex min-w-0 flex-1 flex-col">
                <ChatHeader title={activeName} subtitle={t.studentRole} avatar={activeAvatar} />
                <ChatMessageList
                  key={active.id}
                  messages={bubbles}
                  loading={thread.loading}
                  error={thread.loadError}
                  onRetry={() => void thread.retry()}
                  emptyText={t.chatThreadEmpty}
                  retryLabel={t.retry}
                  formatTime={fmtTime}
                  formatDay={formatDay}
                />
                <ChatComposer
                  key={`composer-${active.id}`}
                  onSend={thread.send}
                  sending={thread.sending}
                  error={thread.sendError}
                  placeholder={t.messagePlaceholder}
                  sendLabel={t.send}
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-10">
                <p className="text-[14px] text-app-text-muted">{t.chooseChat}</p>
              </div>
            )
          ) : null}
        </section>
      )}

      {!isLg && active ? (
        <ChatScreen
          key={active.id}
          title={activeName}
          subtitle={t.studentRole}
          avatar={activeAvatar}
          onClose={closeThread}
          messages={bubbles}
          loading={thread.loading}
          loadError={thread.loadError}
          onRetry={() => void thread.retry()}
          onSend={thread.send}
          sending={thread.sending}
          sendError={thread.sendError}
          labels={{ back: t.back, send: t.send, placeholder: t.messagePlaceholder, empty: t.chatThreadEmpty, retry: t.retry }}
          formatTime={fmtTime}
          formatDay={formatDay}
        />
      ) : null}
    </div>
  );
}

/* --------------------------------- Sharhlar --------------------------------- */

export function Reviews() {
  const { token, t, lang } = usePanel();
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    getPanelReviews(token)
      .then((r) => alive && setData(r))
      .catch((e: Error) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token]);

  const max = useMemo(
    () => Math.max(1, ...Object.values(data?.breakdown ?? {}).map(Number)),
    [data]
  );

  if (loading) return <Skeleton rows={3} />;

  return (
    <div>
      <PageHead title={t.reviewsTitle} subtitle={t.reviewsHint} />
      {err ? <ErrorNote text={err} /> : null}

      {!data || data.reviews.length === 0 ? (
        <Empty text={t.reviewsEmpty} hint={t.reviewsHint} />
      ) : (
        <div className="flex flex-col gap-4">
          <Card as="section" className="flex flex-wrap items-center gap-6 p-5">
            <div>
              <p className="text-[44px] font-extrabold leading-none text-app-text">{data.rating_avg.toLocaleString('ru-RU')}</p>
              <p className="mt-1 text-[18px] tracking-[2px] text-[#B45309]">{'★'.repeat(Math.round(data.rating_avg))}</p>
              <p className="mt-0.5 text-[13px] text-app-text-muted">{tpl(t.reviewsCount, { n: data.rating_count })}</p>
            </div>
            <ul className="flex min-w-0 flex-[1_1_240px] flex-col gap-1.5">
              {[5, 4, 3, 2, 1].map((n) => (
                <li key={n} className="flex items-center gap-2.5 text-[13px]">
                  <span className="w-6 font-bold text-app-text">{n}★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-app-bg-subtle">
                    <span
                      className="block h-full rounded-full bg-[#F59E0B]"
                      style={{ width: `${((data.breakdown[String(n)] ?? 0) / max) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 text-right text-app-text-muted">{data.breakdown[String(n)] ?? 0}</span>
                </li>
              ))}
            </ul>
          </Card>

          <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">
            {data.reviews.map((r) => (
              <li key={r.id}>
                <article className="flex h-full flex-col gap-2.5 rounded-[20px] border border-app-border bg-app-surface p-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.student_name} size={40} tone={toneFor(r.student_name)} />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[14px] text-app-text">{r.student_name}</b>
                      <span className="text-[12px] text-app-text-muted">{fmtDate(r.created_at, lang)}</span>
                    </span>
                    <span className="shrink-0 font-extrabold text-[#B45309]">
                      {'★'.repeat(Math.round(r.rating))}
                      <span className="text-[#CBD5E1]">{'★'.repeat(Math.max(0, 5 - Math.round(r.rating)))}</span>
                    </span>
                  </div>
                  {r.what_liked || r.opinion ? (
                    <p className="text-[14px] leading-[1.55] text-app-text">
                      <b className="text-[#166534]">{t.reviewLiked}:</b> {r.what_liked || r.opinion}
                    </p>
                  ) : null}
                  {r.what_was_missing ? (
                    <p className="text-[14px] leading-[1.55] text-app-text">
                      <b className="text-[#92400E]">{t.reviewMissing}:</b> {r.what_was_missing}
                    </p>
                  ) : null}
                  {r.enrolled_monthly_course != null ? (
                    <span className="mt-auto">
                      <Tag tone={r.enrolled_monthly_course ? 'green' : 'grey'}>
                        {r.enrolled_monthly_course ? t.reviewEnrolled : t.reviewNotEnrolled}
                      </Tag>
                    </span>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Bildirishnomalar ----------------------------- */

export function NotificationsDrawer({
  notifications,
  onClose,
  onRead,
}: {
  notifications: PanelNotification[];
  onClose: () => void;
  onRead: () => void;
}) {
  const { token, t, lang } = usePanel();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(15,23,42,0.4)]" onClick={onClose}>
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        aria-label={t.notifications}
        className="flex h-full w-full max-w-[400px] flex-col gap-1.5 overflow-y-auto bg-app-surface p-[18px] pt-[max(env(safe-area-inset-top,0px),18px)]"
      >
        <div className="flex items-center justify-between">
          <p className="text-[18px] font-extrabold text-app-text">{t.notifications}</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F1F4F7] text-app-text"
            aria-label={t.close}
          >
            ✕
          </button>
        </div>

        {notifications.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-app-text-muted">{t.notificationsEmpty}</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() =>
                void markNotificationsRead(token)
                  .then(onRead)
                  .catch(() => undefined)
              }
              className="min-h-[40px] self-start text-[14px] font-bold text-app-primary"
            >
              {t.markAllRead}
            </button>
            <ul className="flex flex-col gap-0.5">
              {notifications.map((n) => (
                <li key={n.id} className={`flex gap-2.5 rounded-[14px] p-3 ${n.read_at ? '' : 'bg-[#F0FAF8]'}`}>
                  <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : 'bg-app-primary'}`} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-app-text">{n.title}</p>
                    {n.body ? <p className="mt-0.5 text-[13.5px] leading-[1.5] text-app-text-secondary">{n.body}</p> : null}
                    <p className="mt-1 text-[12px] text-app-text-muted">
                      {fmtDateTime(n.created_at, lang)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </motion.aside>
    </div>
  );
}
