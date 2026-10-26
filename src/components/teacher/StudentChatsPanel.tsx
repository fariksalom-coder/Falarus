/**
 * O'quvchi: «Chat» — ustozlar bilan yozishmalar bitta joyda. Har bir ustoz — bitta qator
 * (oxirgi xabar, vaqti, o'qilmaganlar soni); bosilsa chat oynasi ochiladi.
 * Chat birinchi dars to'langandan keyin paydo bo'ladi (server shunda ochadi).
 */
import { useCallback, useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { getTeacherConversations, type TeacherConversation } from '../../api/teachers';
import { useAuth } from '../../context/AuthContext';
import TeacherChatModal from './TeacherChatModal';
import { TeacherPhoto } from './market/parts';

/** Bugun — soat, shu hafta — kun nomi, undan oldin — sana. */
function whenText(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  if (now.getTime() - d.getTime() < 6 * 86_400_000) return d.toLocaleDateString('uz-UZ', { weekday: 'short' });
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
}

export default function StudentChatsPanel({ token, onUnread, onFindTeacher }: {
  token: string;
  /** Tab belgichasi uchun: jami o'qilmagan xabarlar. */
  onUnread?: (n: number) => void;
  onFindTeacher: () => void;
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<TeacherConversation[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<TeacherConversation | null>(null);

  const load = useCallback(() => {
    getTeacherConversations(token)
      .then((list) => {
        // Faqat o'quvchi sifatidagi chatlar (ustoz hisobida o'z o'quvchilari kabinetda).
        const mine = list.filter((c) => c.student_user_id === user?.id);
        setRows(mine);
        setError('');
        onUnread?.(mine.reduce((n, c) => n + (c.unread ?? 0), 0));
      })
      .catch((e: Error) => { setError(e.message); setRows((r) => r ?? []); });
  }, [token, user?.id, onUnread]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (!rows) return <div className="h-40 animate-pulse rounded-[24px] bg-app-surface" aria-busy="true" />;

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-2xl bg-app-danger-bg px-3 py-2 text-sm font-semibold text-app-danger">{error}</p>}
      {rows.length === 0 ? (
        <section className="flex flex-col items-center rounded-[24px] border border-dashed border-app-border bg-app-surface px-6 py-12 text-center shadow-app-soft">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-icon-bg text-app-primary-deep"><MessageCircle className="h-7 w-7" /></span>
          <p className="mt-3 text-lg font-black text-app-text">Hali chat yoʻq</p>
          <p className="mt-1 max-w-xs text-sm text-app-text-muted">Ustoz bilan chat birinchi dars toʻlangandan keyin shu yerda ochiladi.</p>
          <button type="button" onClick={onFindTeacher} className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-app-primary-deep px-6 text-[15px] font-black text-white active:scale-[0.98]">Ustoz tanlash</button>
        </section>
      ) : (
        <ul className="overflow-hidden rounded-[24px] border border-app-border bg-app-surface shadow-app-soft">
          {rows.map((c) => {
            const unread = c.unread ?? 0;
            const name = c.teacher_name || 'Ustoz';
            return (
              <li key={c.id} className="border-b border-app-border last:border-b-0">
                <button type="button" onClick={() => setOpen(c)}
                  className="flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-app-row-hover active:bg-app-bg-subtle">
                  <TeacherPhoto url={c.teacher_avatar_url ?? null} name={name} className="h-12 w-12 shrink-0 rounded-2xl" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-black text-app-text">{name}</span>
                      <span className={`shrink-0 text-xs font-semibold ${unread ? 'text-app-primary-deep' : 'text-app-text-secondary'}`}>{whenText(c.last_message?.created_at ?? c.last_message_at)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${unread ? 'font-bold text-app-text' : 'text-app-text-muted'}`}>
                        {c.last_message ? `${c.last_message.mine ? 'Siz: ' : ''}${c.last_message.content}` : 'Ustozga birinchi boʻlib yozing'}
                      </span>
                      {unread > 0 && (
                        <span className="flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full bg-app-primary-deep px-1.5 text-xs font-black tabular-nums text-white">{unread > 99 ? '99+' : unread}</span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && user && (
        <TeacherChatModal token={token} conversationId={open.id} currentUserId={user.id} title={open.teacher_name || 'Ustoz'}
          onClose={() => { setOpen(null); load(); }} />
      )}
    </div>
  );
}
