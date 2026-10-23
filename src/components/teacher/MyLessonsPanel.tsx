/**
 * O'quvchi: «Mening darslarim». Tepada keyingi dars — qancha vaqt qolgani, «Darsga kirish»
 * (xona 10 daqiqa oldin ochiladi) va «Ustozga yozish». Pastda boshqa darslar: to'lanmagan
 * bronni to'lash, bekor qilish, dars bo'lmasa xabar berish, o'tgan darsni baholash.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, Loader2, MessageCircle, Star, Video, X } from 'lucide-react';
import { LESSON_STATUS_LABEL, canCancel, canDispute } from '../../../shared/teacherLessons';
import { cancelLesson, disputeLesson, fmtSum, roomOpen, type TeacherLesson } from '../../api/teacherLessons';
import { openTeacherChat } from '../../api/teacherMarket';
import { openRahmatCheckout } from '../../api/rahmat';
import { useAuth } from '../../context/AuthContext';
import TeacherChatModal from './TeacherChatModal';
import ReviewDialog from './market/ReviewDialog';
import { TeacherPhoto, fullDate, hm } from './market/parts';

const ACTIVE = new Set(['paid', 'disputed']);
const teacherName = (l: TeacherLesson) => `${l.teacher_first_name ?? ''} ${l.teacher_last_name ?? ''}`.trim() || 'Ustoz';

/** «2 kun 3 soat», «1 soat 15 daqiqa», «12 daqiqa». */
function untilText(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d) return `${d} kun${h ? ` ${h} soat` : ''}`;
  if (h) return `${h} soat${m ? ` ${m} daqiqa` : ''}`;
  return `${m} daqiqa`;
}

export default function MyLessonsPanel({ token, rows, reload, onFindTeacher }: {
  token: string; rows: TeacherLesson[] | null; reload: () => void; onFindTeacher: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [chat, setChat] = useState<{ id: number; title: string } | null>(null);
  const [review, setReview] = useState<TeacherLesson | null>(null);

  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(id); }, []);

  const { upcoming, pending, past } = useMemo(() => {
    const list = rows ?? [];
    return {
      upcoming: list.filter((l) => ACTIVE.has(l.status) && l.join.closesAt > now).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
      pending: list.filter((l) => l.status === 'pending_payment' && new Date(l.starts_at).getTime() > now),
      past: list.filter((l) => !(ACTIVE.has(l.status) && l.join.closesAt > now) && l.status !== 'pending_payment'),
    };
  }, [rows, now]);

  const act = async (id: number, fn: () => Promise<unknown>) => {
    setBusy(id); setError('');
    try { await fn(); reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Xatolik'); } finally { setBusy(null); }
  };
  const openChat = (l: TeacherLesson) => act(l.id, async () => {
    const r = await openTeacherChat(token, l.teacher_user_id);
    setChat({ id: r.conversation_id, title: teacherName(l) });
  });

  if (!rows) return <div className="h-40 animate-pulse rounded-[24px] bg-app-surface" aria-busy="true" />;
  if (!rows.length) {
    return (
      <section className="flex flex-col items-center rounded-[24px] border border-dashed border-app-border bg-app-surface px-6 py-12 text-center shadow-app-soft">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-icon-bg text-app-primary-deep"><CalendarClock className="h-7 w-7" /></span>
        <p className="mt-3 text-lg font-black text-app-text">Hali darsingiz yoʻq</p>
        <p className="mt-1 max-w-xs text-sm text-app-text-muted">Ustozni tanlang, qulay vaqtni belgilang va toʻlang — dars shu yerda paydo boʻladi.</p>
        <button type="button" onClick={onFindTeacher} className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-app-primary-deep px-6 text-[15px] font-black text-white active:scale-[0.98]">Ustoz tanlash</button>
      </section>
    );
  }

  const next = upcoming[0];
  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-2xl bg-app-danger-bg px-3 py-2 text-sm font-semibold text-app-danger">{error}</p>}

      {next && (() => {
        const open = roomOpen(next, now);
        const started = now >= new Date(next.starts_at).getTime();
        return (
          <section className="overflow-hidden rounded-[24px] text-white shadow-[0_18px_44px_rgba(37,99,235,0.28)]" style={{ background: 'var(--app-brand-gradient)' }}>
            <div className="p-5">
              <p className="text-xs font-black uppercase tracking-wider text-white/70">Keyingi dars</p>
              <div className="mt-3 flex items-center gap-3">
                <TeacherPhoto url={next.teacher_avatar_url ?? null} name={teacherName(next)} className="h-14 w-14 rounded-2xl ring-2 ring-white/30" />
                <div className="min-w-0">
                  <p className="truncate text-lg font-black">{teacherName(next)}</p>
                  <p className="text-sm font-semibold text-white/80">{fullDate(next.starts_at)} · {hm(new Date(next.starts_at))}–{hm(new Date(next.ends_at))}</p>
                </div>
              </div>
              <p className="mt-4 text-[28px] font-black leading-none">{started ? 'Dars davom etmoqda' : `${untilText(new Date(next.starts_at).getTime() - now)}dan keyin`}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-black/10 p-3">
              <button type="button" disabled={!open} onClick={() => navigate(`/dars/l/${next.id}`)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-[14px] font-black text-slate-900 transition active:scale-[0.98] disabled:bg-white/25 disabled:text-white/80">
                <Video className="h-4 w-4" />{open ? 'Darsga kirish' : '10 daqiqa oldin ochiladi'}
              </button>
              <button type="button" disabled={busy === next.id} onClick={() => void openChat(next)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/15 px-3 text-[14px] font-black text-white ring-1 ring-white/30 transition hover:bg-white/25 active:scale-[0.98]">
                {busy === next.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}Ustozga yozish
              </button>
            </div>
            {canCancel(next.status, next.starts_at, now) && (
              <button type="button" disabled={busy === next.id}
                onClick={() => window.confirm('Darsni bekor qilasizmi? Toʻlov qaytariladi.') && void act(next.id, () => cancelLesson(token, next.id, ''))}
                className="flex min-h-11 w-full items-center justify-center bg-black/10 text-[13px] font-bold text-white/80 hover:text-white">
                Darsni bekor qilish
              </button>
            )}
          </section>
        );
      })()}

      {[...pending, ...upcoming.slice(1)].length > 0 && (
        <section className="overflow-hidden rounded-[24px] border border-app-border bg-app-surface shadow-app-soft">
          <h2 className="border-b border-app-border px-4 py-3 text-[15px] font-black text-app-text">Rejadagi darslar</h2>
          <ul className="divide-y divide-app-border">
            {[...pending, ...upcoming.slice(1)].map((l) => (
              <LessonRow key={l.id} l={l}>
                {l.status === 'pending_payment' ? (
                  <button type="button" disabled={busy === l.id} onClick={() => void act(l.id, () => openRahmatCheckout({ token, productCode: 'teacher_lesson', lessonId: l.id }))}
                    className="inline-flex min-h-11 items-center rounded-xl bg-app-primary-deep px-4 text-[13px] font-black text-white">Toʻlash — {fmtSum(l.price_uzs)}</button>
                ) : (
                  <button type="button" disabled={busy === l.id} onClick={() => void openChat(l)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-app-border px-3 text-[13px] font-bold text-app-text"><MessageCircle className="h-4 w-4" />Ustozga yozish</button>
                )}
                {canCancel(l.status, l.starts_at, now) && (
                  <button type="button" disabled={busy === l.id}
                    onClick={() => window.confirm(l.status === 'paid' ? 'Darsni bekor qilasizmi? Toʻlov qaytariladi.' : 'Bronni bekor qilasizmi?') && void act(l.id, () => cancelLesson(token, l.id, ''))}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] font-bold text-app-text-muted hover:bg-app-bg-subtle"><X className="h-4 w-4" />Bekor qilish</button>
                )}
              </LessonRow>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="overflow-hidden rounded-[24px] border border-app-border bg-app-surface shadow-app-soft">
          <h2 className="border-b border-app-border px-4 py-3 text-[15px] font-black text-app-text">Oʻtgan darslar</h2>
          <ul className="divide-y divide-app-border">
            {past.map((l) => {
              const ended = l.status === 'completed' || (l.status === 'paid' && new Date(l.ends_at).getTime() <= now);
              return (
                <LessonRow key={l.id} l={l}>
                  {ended && (l.my_review_overall != null ? (
                    <span className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-bold text-app-text-muted"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />Bahoyingiz: {Number(l.my_review_overall).toFixed(1).replace('.', ',')}</span>
                  ) : (
                    <button type="button" onClick={() => setReview(l)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-amber-50 px-3 text-[13px] font-black text-amber-800"><Star className="h-4 w-4" />Baho qoldirish</button>
                  ))}
                  {canDispute(l.status, l.starts_at, l.ends_at, now) && (
                    <button type="button" disabled={busy === l.id}
                      onClick={() => { const r = window.prompt('Nima boʻldi? (masalan: ustoz kelmadi)'); if (r) void act(l.id, () => disputeLesson(token, l.id, r)); }}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-amber-300 px-3 text-[13px] font-bold text-amber-800"><AlertTriangle className="h-4 w-4" />Dars boʻlmadi</button>
                  )}
                  {(l.status === 'completed' || l.status === 'paid') && (
                    <button type="button" disabled={busy === l.id} onClick={() => void openChat(l)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] font-bold text-app-text hover:bg-app-bg-subtle"><MessageCircle className="h-4 w-4" />Yozish</button>
                  )}
                </LessonRow>
              );
            })}
          </ul>
        </section>
      )}

      {chat && user && <TeacherChatModal token={token} conversationId={chat.id} currentUserId={user.id} title={chat.title} onClose={() => setChat(null)} />}
      {review && <ReviewDialog token={token} lessonId={review.id} teacherName={teacherName(review)} onClose={() => setReview(null)} onDone={() => { setReview(null); reload(); }} />}
    </div>
  );
}

function LessonRow({ l, children }: { l: TeacherLesson; children: React.ReactNode }) {
  const tone = l.status === 'completed' ? 'bg-emerald-50 text-emerald-800' : l.status === 'paid' ? 'bg-sky-50 text-sky-800'
    : l.status === 'pending_payment' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700';
  return (
    <li className="p-4">
      <div className="flex items-start gap-3">
        <TeacherPhoto url={l.teacher_avatar_url ?? null} name={teacherName(l)} className="h-11 w-11 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-app-text">{teacherName(l)}</p>
          <p className="text-sm text-app-text-muted">{fullDate(l.starts_at)} · {hm(new Date(l.starts_at))} · {fmtSum(l.price_uzs)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-black ${tone}`}>
          {LESSON_STATUS_LABEL[l.status].uz}{l.refund_due && !l.refunded_at ? ' · qaytariladi' : ''}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 pl-14">{children}</div>
    </li>
  );
}
