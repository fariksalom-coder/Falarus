import { useEffect, useState } from 'react';
import { Headphones, MessageCircle, Users } from 'lucide-react';
import { getHelpChats, type HelpChatListItem } from '../../api/help';
import { getSavolJavobSummary, type SavolJavobSummary } from '../../api/communityChat';
import { useAuth } from '../../context/AuthContext';
import type { PartnerMatch } from '../../api/partner';

function formatListTime(date: string | null): string {
  if (!date) return '';
  const msgDate = new Date(date);
  const now = new Date();
  const sameDay =
    msgDate.getFullYear() === now.getFullYear() &&
    msgDate.getMonth() === now.getMonth() &&
    msgDate.getDate() === now.getDate();
  return sameDay ? 'Bugun' : msgDate.toLocaleDateString('uz');
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type Props = {
  matches: PartnerMatch[];
  onOpenAdmin: () => void;
  onOpenGroup: () => void;
  onOpenPartner: (matchId: number) => void;
};

export default function PartnerChatsSection({ matches, onOpenAdmin, onOpenGroup, onOpenPartner }: Props) {
  const { token, user } = useAuth();
  const [adminChat, setAdminChat] = useState<HelpChatListItem | null>(null);
  const [groupSummary, setGroupSummary] = useState<SavolJavobSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const helpLastSeenKey = user ? `help_last_seen_at_${user.id}` : null;
  const helpLastSeenMs = helpLastSeenKey
    ? new Date(localStorage.getItem(helpLastSeenKey) ?? 0).getTime()
    : 0;

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    Promise.all([getHelpChats(token), getSavolJavobSummary(token)])
      .then(([chats, summary]) => {
        if (!mounted) return;
        setAdminChat(chats[0] ?? null);
        setGroupSummary(summary);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));

    const timer = window.setInterval(() => {
      void Promise.all([getHelpChats(token), getSavolJavobSummary(token)])
        .then(([chats, summary]) => {
          if (!mounted) return;
          setAdminChat(chats[0] ?? null);
          setGroupSummary(summary);
        })
        .catch(() => {});
    }, 12000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [token]);

  const adminUnread =
    adminChat &&
    (Number(adminChat.unread_count ?? 0) > 0 ||
      (adminChat.last_message?.sender_type === 'admin' &&
        new Date(adminChat.last_message.created_at).getTime() > helpLastSeenMs));

  return (
    <section>
      <div className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
        <button
          type="button"
          onClick={onOpenAdmin}
          className="flex w-full items-center gap-3 border-b border-slate-100 px-3.5 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)]">
            <Headphones className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-slate-900">Admin bilan chat</p>
            <p className="truncate text-sm text-slate-500">
              {adminChat?.last_message?.content ?? 'Savolingizni yozing — javob beramiz'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-medium text-slate-400">
              {formatListTime(adminChat?.last_message_at ?? null)}
            </span>
            {adminUnread ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">
                {adminChat?.unread_count ? adminChat.unread_count : 1}
              </span>
            ) : null}
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenGroup}
          className="flex w-full items-center gap-3 border-b border-slate-100 px-3.5 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-[0_8px_20px_rgba(124,58,237,0.28)]">
            <Users className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-slate-900">SAVOL-JAVOB</p>
            <p className="truncate text-sm text-slate-500">
              {groupSummary
                ? `${groupSummary.member_count.toLocaleString('uz-UZ')} a'zo · ${groupSummary.online_count.toLocaleString('uz-UZ')} onlayn`
                : 'Umumiy guruh — savol va javoblar'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-medium text-slate-400">
              {formatListTime(groupSummary?.last_message?.created_at ?? null)}
            </span>
            {Number(groupSummary?.unread_count ?? 0) > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1.5 text-[11px] font-bold text-white">
                {groupSummary!.unread_count}
              </span>
            ) : null}
          </div>
        </button>

        {matches.map((match) => {
          const name = match.partner_profile?.display_name ?? 'Sherik';
          return (
            <button
              key={match.id}
              type="button"
              onClick={() => onOpenPartner(match.id)}
              className="flex w-full items-center gap-3 border-b border-slate-100 px-3.5 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 active:bg-slate-100"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                {initials(name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-slate-900">{name}</p>
                <p className="truncate text-sm text-slate-500">Sherik bilan yozishma</p>
              </div>
              <MessageCircle className="h-5 w-5 shrink-0 text-blue-600" aria-hidden />
            </button>
          );
        })}

        {!matches.length && !loading ? (
          <p className="px-4 py-4 text-center text-sm text-slate-500">
            Sherik topilganda shu yerda shaxsiy chat paydo bo‘ladi
          </p>
        ) : null}
      </div>
    </section>
  );
}
