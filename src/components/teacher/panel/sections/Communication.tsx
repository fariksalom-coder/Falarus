import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  getPanelReviews,
  getPanelStudents,
  markNotificationsRead,
  type PanelNotification,
  type ReviewsResponse,
} from '../../../../api/teacherPanel';
import {
  getTeacherChatMessages,
  getTeacherConversations,
  sendTeacherChatMessage,
  type TeacherChatMessage,
  type TeacherConversation,
} from '../../../../api/teachers';
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
  inputClass,
} from '../ui';

/* --------------------------------- Xabarlar --------------------------------- */

export default function Messages() {
  const { token, t, lang } = usePanel();
  const [conversations, setConversations] = useState<TeacherConversation[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<TeacherChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getTeacherConversations(token), getPanelStudents(token, 'all')])
      .then(([convos, students]) => {
        if (!alive) return;
        setConversations(convos);
        const map: Record<number, string> = {};
        for (const s of students.students) map[s.user_id] = s.name;
        setNames(map);
        setActiveId((id) => id ?? convos[0]?.id ?? null);
      })
      .catch((e: Error) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token]);

  const loadMessages = useCallback(
    async (id: number) => {
      try {
        setMessages(await getTeacherChatMessages(token, id));
      } catch (e) {
        setErr(e instanceof Error ? e.message : t.errorGeneric);
      }
    },
    [token, t.errorGeneric]
  );

  useEffect(() => {
    if (activeId) void loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const send = async () => {
    if (!activeId || !text.trim()) return;
    setSending(true);
    try {
      await sendTeacherChatMessage(token, activeId, text.trim());
      setText('');
      await loadMessages(activeId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Skeleton rows={3} />;

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const nameOf = (c: TeacherConversation) => names[c.student_user_id] ?? `#${c.student_user_id}`;

  return (
    <div>
      <PageHead title={t.messagesTitle} subtitle={t.messagesHint} />
      {err ? <ErrorNote text={err} /> : null}

      {conversations.length === 0 ? (
        <Empty text={t.messagesEmpty} hint={t.messagesHint} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          <Card className={`p-2 ${active ? 'max-lg:hidden' : ''}`}>
            <ul>
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className={`flex w-full items-center gap-3 rounded-[14px] p-3 text-left transition ${
                      c.id === activeId ? 'bg-[#F1EFFE]' : 'hover:bg-[#FAFAFE]'
                    }`}
                  >
                    <Avatar name={nameOf(c)} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-[#171A3D]">
                        {nameOf(c)}
                      </span>
                      <span className="block text-[11.5px] text-[#8A8CAE]">
                        {c.last_message_at ? fmtDateTime(c.last_message_at, lang) : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {active ? (
            <Card className="flex h-[62vh] flex-col lg:h-[600px]">
              <div className="flex items-center gap-3 border-b border-[#F1F0FA] p-4">
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="text-[13px] font-medium text-[#6E7191] lg:hidden"
                >
                  ←
                </button>
                <Avatar name={nameOf(active)} size={36} />
                <p className="text-[14px] font-semibold text-[#171A3D]">{nameOf(active)}</p>
              </div>

              <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
                {messages.map((m) => {
                  const mine = m.sender_user_id !== active.student_user_id;
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-[14px] px-3.5 py-2.5 text-[13px] leading-[1.55] ${
                        mine
                          ? 'ml-auto rounded-br-[4px] bg-[#4B3BE4] text-white'
                          : 'rounded-bl-[4px] bg-[#F5F5FB] text-[#171A3D]'
                      }`}
                    >
                      {m.content}
                      <span className={`mt-1 block text-[10.5px] ${mine ? 'text-white/60' : 'text-[#A0A1BC]'}`}>
                        {fmtTime(m.created_at)}
                      </span>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="flex gap-2 border-t border-[#F1F0FA] p-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder={t.messagePlaceholder}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={sending || !text.trim()}
                  className="min-h-[44px] shrink-0 rounded-[12px] bg-[#4B3BE4] px-4 text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  {t.send}
                </button>
              </div>
            </Card>
          ) : (
            <Card className="hidden items-center justify-center p-10 lg:flex">
              <p className="text-[13px] text-[#8A8CAE]">{t.chooseChat}</p>
            </Card>
          )}
        </div>
      )}
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
      <PageHead
        title={t.reviewsTitle}
        subtitle={
          data && data.rating_count > 0
            ? `★ ${data.rating_avg} · ${tpl(t.reviewsCount, { n: data.rating_count })}`
            : t.reviewsHint
        }
      />
      {err ? <ErrorNote text={err} /> : null}

      {!data || data.reviews.length === 0 ? (
        <Empty text={t.reviewsEmpty} hint={t.reviewsHint} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <Card className="p-5">
            <p className="text-[32px] font-semibold text-[#171A3D]">{data.rating_avg}</p>
            <p className="text-[14px] text-[#E6B33E]">{'★'.repeat(Math.round(data.rating_avg))}</p>
            <ul className="mt-3 space-y-1.5">
              {[5, 4, 3, 2, 1].map((n) => (
                <li key={n} className="flex items-center gap-2 text-[12px] text-[#6E7191]">
                  <span className="w-3">{n}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#F0EFF8]">
                    <span
                      className="block h-full rounded-full bg-[#E6B33E]"
                      style={{ width: `${((data.breakdown[String(n)] ?? 0) / max) * 100}%` }}
                    />
                  </span>
                  <span className="w-5 text-right">{data.breakdown[String(n)] ?? 0}</span>
                </li>
              ))}
            </ul>
          </Card>

          <ul className="space-y-3">
            {data.reviews.map((r) => (
              <li key={r.id}>
                <Card className="p-5">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.student_name} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-[#171A3D]">
                        {r.student_name}
                      </p>
                      <p className="text-[11.5px] text-[#A0A1BC]">{fmtDate(r.created_at, lang)}</p>
                    </div>
                    <span className="text-[13px] text-[#E6B33E]">{'★'.repeat(Math.round(r.rating))}</span>
                  </div>
                  {r.opinion || r.what_liked ? (
                    <p className="mt-2.5 text-[12.5px] leading-[1.7] text-[#5B5E86]">
                      {r.opinion || r.what_liked}
                    </p>
                  ) : null}
                  {r.what_was_missing ? (
                    <p className="mt-1.5 text-[12.5px] leading-[1.7] text-[#8A8CAE]">
                      {t.reviewMissing}: {r.what_was_missing}
                    </p>
                  ) : null}
                  {r.enrolled_monthly_course != null ? (
                    <span className="mt-2.5 inline-block">
                      <Tag tone={r.enrolled_monthly_course ? 'green' : 'grey'}>
                        {r.enrolled_monthly_course ? t.reviewEnrolled : t.reviewNotEnrolled}
                      </Tag>
                    </span>
                  ) : null}
                </Card>
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
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(14,16,45,0.32)]" onClick={onClose}>
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[400px] flex-col gap-4 overflow-y-auto bg-white p-5 pt-[max(env(safe-area-inset-top,0px),20px)]"
      >
        <div className="flex items-center justify-between">
          <p className="text-[18px] font-semibold text-[#171A3D]">{t.notifications}</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5FB] text-[#3E4166]"
            aria-label={t.close}
          >
            ✕
          </button>
        </div>

        {notifications.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[#8A8CAE]">{t.notificationsEmpty}</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() =>
                void markNotificationsRead(token)
                  .then(onRead)
                  .catch(() => undefined)
              }
              className="self-start text-[12.5px] font-semibold text-[#4B3BE4]"
            >
              {t.markAllRead}
            </button>
            <ul className="space-y-2.5">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`flex gap-3 rounded-[14px] border border-[#F1F0FA] p-3.5 ${
                    n.read_at ? 'bg-white' : 'bg-[#FAFAFE]'
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      n.read_at ? 'bg-[#D9D8EC]' : 'bg-[#4B3BE4]'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#171A3D]">{n.title}</p>
                    <p className="mt-1 text-[12.5px] leading-[1.6] text-[#6E7191]">{n.body}</p>
                    <p className="mt-1.5 text-[11px] text-[#A0A1BC]">
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
