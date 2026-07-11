import { useEffect, useState } from 'react';
import { Headphones, MessageCircle, Users } from 'lucide-react';
import { getHelpChats, type HelpChatListItem } from '../../api/help';
import { getSavolJavobSummary, type SavolJavobSummary } from '../../api/communityChat';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import type { PartnerMatch } from '../../api/partner';

function formatListTime(date: string | null, todayLabel: string): string {
  if (!date) return '';
  const msgDate = new Date(date);
  const now = new Date();
  const sameDay =
    msgDate.getFullYear() === now.getFullYear() &&
    msgDate.getMonth() === now.getMonth() &&
    msgDate.getDate() === now.getDate();
  return sameDay ? todayLabel : msgDate.toLocaleDateString('uz');
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
  const { t } = useLocale();
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
    <section className="flex flex-col gap-[11px]">
      {/* Admin chat */}
      <button
        type="button"
        onClick={onOpenAdmin}
        className="flex items-center gap-[13px] rounded-[18px] bg-app-surface px-[14px] py-[13px] text-left shadow-[0_6px_14px_rgba(23,34,74,0.05)] transition hover:-translate-y-0.5 active:scale-[0.99]"
      >
        <div
          className="relative flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[16px] text-white"
          style={{ background: 'linear-gradient(145deg, #0B2A6B, #071B5E)' }}
        >
          <Headphones className="h-5 w-5" aria-hidden />
          <span
            className="absolute bottom-[1px] right-[1px] h-3 w-3 rounded-full border-2 border-white"
            style={{ background: '#18B45C' }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="truncate text-[15px] font-black text-app-text">{t('partner.adminChat')}</p>
            <span className="ml-2 shrink-0 text-[11px] font-bold text-[#A7B1C6]">
              {formatListTime(adminChat?.last_message_at ?? null, t('common.today'))}
            </span>
          </div>
          <p className="mt-[2px] truncate text-[12.5px] font-semibold text-app-text-muted">
            {adminChat?.last_message?.content ?? t('partner.adminPrompt')}
          </p>
        </div>
        {adminUnread ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0B2A6B] px-1.5 text-[11px] font-black text-white">
            {adminChat?.unread_count ? adminChat.unread_count : 1}
          </span>
        ) : null}
      </button>

      {/* Group chat */}
      <button
        type="button"
        onClick={onOpenGroup}
        className="flex items-center gap-[13px] rounded-[18px] bg-app-surface px-[14px] py-[13px] text-left shadow-[0_6px_14px_rgba(23,34,74,0.05)] transition hover:-translate-y-0.5 active:scale-[0.99]"
      >
        <div
          className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[16px] text-white"
          style={{ background: 'linear-gradient(145deg, #0EA5A5, #0C7A7A)' }}
        >
          <Users className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="truncate text-[15px] font-black text-app-text">{t('partner.groupChat')}</p>
            <span className="ml-2 shrink-0 text-[11px] font-bold text-[#A7B1C6]">
              {formatListTime(groupSummary?.last_message?.created_at ?? null, t('common.today'))}
            </span>
          </div>
          <p className="mt-[2px] truncate text-[12.5px] font-semibold text-app-text-muted">
            {groupSummary
              ? t('partner.membersOnline', {
                  members: groupSummary.member_count,
                  online: groupSummary.online_count,
                })
              : t('partner.groupFallback')}
          </p>
        </div>
        {Number(groupSummary?.unread_count ?? 0) > 0 ? (
          <span
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black text-white"
            style={{ background: '#0EA5A5' }}
          >
            {groupSummary!.unread_count}
          </span>
        ) : null}
      </button>

      {/* Partners heading */}
      {matches.length > 0 ? (
        <p className="mx-1 mt-2 text-[12px] font-black uppercase tracking-[0.04em] text-app-text-muted">
          {t('partner.partnersLabel') || 'SHERIKLAR'}
        </p>
      ) : null}

      {matches.map((match, idx) => {
        const name = match.partner_profile?.display_name ?? t('common.user');
        const gradients = [
          'linear-gradient(145deg, #8B5CF6, #6D28D9)',
          'linear-gradient(145deg, #F59E0B, #D97706)',
          'linear-gradient(145deg, #0EA5A5, #0C7A7A)',
          'linear-gradient(145deg, #0B2A6B, #071B5E)',
        ];
        return (
          <button
            key={match.id}
            type="button"
            onClick={() => onOpenPartner(match.id)}
            className="flex items-center gap-[13px] rounded-[18px] bg-app-surface px-[14px] py-[13px] text-left shadow-[0_6px_14px_rgba(23,34,74,0.05)] transition hover:-translate-y-0.5 active:scale-[0.99]"
          >
            <div
              className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[16px] text-[15px] font-black text-white"
              style={{ background: gradients[idx % gradients.length] }}
            >
              {initials(name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-black text-app-text">{name}</p>
              <p className="mt-[2px] truncate text-[12.5px] font-semibold text-app-text-muted">
                {t('partner.partnerChat')}
              </p>
            </div>
            <MessageCircle className="h-5 w-5 shrink-0 text-app-primary" aria-hidden />
          </button>
        );
      })}

      {!matches.length && !loading ? (
        <p className="rounded-[18px] bg-app-surface px-4 py-4 text-center text-sm font-medium text-app-text-muted shadow-[0_6px_14px_rgba(23,34,74,0.05)]">
          {t('partner.chatSoon')}
        </p>
      ) : null}
    </section>
  );
}
