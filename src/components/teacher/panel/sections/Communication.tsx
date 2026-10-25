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
  toneFor,
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
        <section className="flex min-h-[480px] overflow-hidden rounded-[22px] border border-app-border bg-app-surface lg:min-h-[560px]">
          <ul className={`min-w-0 overflow-y-auto lg:w-[300px] lg:flex-none lg:border-r lg:border-app-bg-subtle ${active ? 'max-lg:hidden' : 'flex-1'}`}>
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={`flex w-full items-center gap-2.5 border-b border-app-bg-subtle p-3 text-left transition ${
                    c.id === activeId ? 'lg:bg-app-icon-bg' : 'hover:bg-[var(--app-row-hover)]'
                  }`}
                >
                  <Avatar name={nameOf(c)} size={44} tone={toneFor(nameOf(c))} />
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-1.5">
                      <b className="truncate text-[14px] text-app-text">{nameOf(c)}</b>
                      <span className="shrink-0 text-[12px] text-app-text-muted">
                        {c.last_message_at ? fmtTime(c.last_message_at) : ''}
                      </span>
                    </span>
                    <span className="block truncate text-[13px] text-app-text-muted">
                      {c.last_message_at ? fmtDate(c.last_message_at, lang) : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {active ? (
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2.5 border-b border-app-bg-subtle px-3.5 py-2.5">
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  aria-label={t.back}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-app-bg-muted text-[16px] font-extrabold text-app-text lg:hidden"
                >
                  ←
                </button>
                <Avatar name={nameOf(active)} size={40} tone={toneFor(nameOf(active))} />
                <b className="min-w-0 flex-1 truncate text-[14px] text-app-text">{nameOf(active)}</b>
              </div>

              <div className="flex max-h-[60vh] min-h-[320px] flex-1 flex-col gap-2 overflow-y-auto bg-[#F8FAFC] p-4 lg:max-h-none">
                {messages.map((m) => {
                  const mine = m.sender_user_id !== active.student_user_id;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[78%] rounded-[16px] px-3 py-2.5 text-[14px] leading-[1.5] ${
                          mine
                            ? 'rounded-br-[4px] bg-app-primary text-white'
                            : 'rounded-bl-[4px] border border-app-border bg-app-surface text-app-text'
                        }`}
                      >
                        {m.content}
                        <span className={`mt-0.5 block text-right text-[11px] ${mine ? 'text-[#CDEAE4]' : 'text-app-text-muted'}`}>
                          {fmtTime(m.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="flex gap-2 border-t border-app-bg-subtle p-2.5">
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
                  aria-label={t.messagePlaceholder}
                  className={`${inputClass} min-h-[46px]`}
                />
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={sending || !text.trim()}
                  className="min-h-[46px] shrink-0 rounded-[12px] bg-app-primary px-[18px] text-[14px] font-bold text-white transition hover:bg-app-primary-deep disabled:opacity-50"
                >
                  {t.send}
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden flex-1 items-center justify-center p-10 lg:flex">
              <p className="text-[14px] text-app-text-muted">{t.chooseChat}</p>
            </div>
          )}
        </section>
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
