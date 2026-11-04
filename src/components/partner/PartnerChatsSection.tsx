import { useEffect, useState } from 'react';
import { AtSign, Headphones, MessageCircle, Clapperboard } from 'lucide-react';
import { getHelpChats, type HelpChatListItem } from '../../api/help';
import {
  getSavolJavobSummary,
  PremiumRequiredError,
  type ChatGroup,
  type SavolJavobSummary,
} from '../../api/communityChat';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { GROUP_LOOK } from './SavolJavobChat';
import { resolveAssetUrl } from '../../api';
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

type GroupRowProps = {
  group: ChatGroup;
  title: string;
  /** Xulosa hali yuklanmagan bo'lsa ko'rinadigan matn. */
  fallback: string;
  summary: SavolJavobSummary | null;
  onOpen: () => void;
};

/** Guruh chati qatori — savol-javob va premium uchun bir xil. */
function GroupChatRow({ group, title, fallback, summary, onOpen }: GroupRowProps) {
  const { t } = useLocale();
  const look = GROUP_LOOK[group];
  const Icon = look.Icon;
  const mentions = Number(summary?.mention_count ?? 0);
  const unread = Number(summary?.unread_count ?? 0);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-[13px] rounded-[18px] bg-app-surface px-[14px] py-[13px] text-left shadow-[0_6px_14px_rgba(23,34,74,0.05)] transition hover:-translate-y-0.5 active:scale-[0.99]"
    >
      <div
        className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[16px] text-white"
        style={{ background: look.gradient }}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-[15px] font-black text-app-text">{title}</p>
          <span className="ml-2 shrink-0 text-[11px] font-bold text-[#A7B1C6]">
            {formatListTime(summary?.last_message?.created_at ?? null, t('common.today'))}
          </span>
        </div>
        {mentions > 0 ? (
          <p className="mt-[2px] flex items-center gap-1 truncate text-[12.5px] font-black text-[#B45309]">
            <AtSign className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t('partner.mentionAlert')}
          </p>
        ) : (
          <p className="mt-[2px] truncate text-[12.5px] font-semibold text-app-text-muted">
            {summary
              ? t('partner.membersOnline', {
                  members: summary.member_count,
                  online: summary.online_count,
                })
              : fallback}
          </p>
        )}
      </div>
      {mentions > 0 ? (
        <span
          className="inline-flex h-5 items-center justify-center gap-0.5 rounded-full px-1.5 text-[11px] font-black text-white"
          style={{ background: '#F59E0B' }}
        >
          <AtSign className="h-3 w-3" aria-hidden />
          {mentions}
        </span>
      ) : unread > 0 ? (
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black text-white"
          style={{ background: look.accent }}
        >
          {unread}
        </span>
      ) : null}
    </button>
  );
}

type Props = {
  matches: PartnerMatch[];
  onOpenAdmin: () => void;
  onOpenGroup: () => void;
  onOpenPremiumGroup: () => void;
  onOpenReels: () => void;
  onOpenPartner: (matchId: number) => void;
};

export default function PartnerChatsSection({
  matches,
  onOpenAdmin,
  onOpenGroup,
  onOpenPremiumGroup,
  onOpenReels,
  onOpenPartner,
}: Props) {
  const { token, user } = useAuth();
  const { t } = useLocale();
  const { access } = useAccess();
  const isPremium = access?.subscription_active === true;
  const [adminChat, setAdminChat] = useState<HelpChatListItem | null>(null);
  const [groupSummary, setGroupSummary] = useState<SavolJavobSummary | null>(null);
  const [premiumSummary, setPremiumSummary] = useState<SavolJavobSummary | null>(null);
  /** Server obunani tasdiqlamasa (masalan, muddati hozirgina tugagan) — qator yashiriladi. */
  const [premiumDenied, setPremiumDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  const helpLastSeenKey = user ? `help_last_seen_at_${user.id}` : null;
  const helpLastSeenMs = helpLastSeenKey
    ? new Date(localStorage.getItem(helpLastSeenKey) ?? 0).getTime()
    : 0;

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);

    const loadPremium = () => {
      if (!isPremium) return;
      void getSavolJavobSummary(token, 'premium')
        .then((summary) => {
          if (!mounted) return;
          setPremiumSummary(summary);
          setPremiumDenied(false);
        })
        .catch((e) => {
          if (mounted && e instanceof PremiumRequiredError) setPremiumDenied(true);
        });
    };

    const load = () =>
      Promise.all([getHelpChats(token), getSavolJavobSummary(token)]).then(([chats, summary]) => {
        if (!mounted) return;
        setAdminChat(chats[0] ?? null);
        setGroupSummary(summary);
      });

    load()
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    loadPremium();

    const timer = window.setInterval(() => {
      void load().catch(() => {});
      loadPremium();
    }, 12000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [token, isPremium]);

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

      <GroupChatRow
        group="savol-javob"
        title={t('partner.groupChat')}
        fallback={t('partner.groupFallback')}
        summary={groupSummary}
        onOpen={onOpenGroup}
      />

      {/* Premium guruh — faqat amaldagi obunasi borlarga ko'rinadi. */}
      {isPremium && !premiumDenied ? (
        <GroupChatRow
          group="premium"
          title={t('partner.premiumChat')}
          fallback={t('partner.premiumChatSub')}
          summary={premiumSummary}
          onOpen={onOpenPremiumGroup}
        />
      ) : null}

      {/* RELS — qisqa videolar lentasi. Savol-javob guruhidan keyin turadi. */}
      <button
        type="button"
        onClick={onOpenReels}
        className="flex items-center gap-[13px] rounded-[18px] bg-app-surface px-[14px] py-[13px] text-left shadow-[0_6px_14px_rgba(23,34,74,0.05)] transition hover:-translate-y-0.5 active:scale-[0.99]"
      >
        <div
          className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[16px] text-white"
          style={{ background: 'linear-gradient(145deg, #8B5CF6, #6D28D9)' }}
        >
          <Clapperboard className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-black text-app-text">Rels</p>
          <p className="mt-[2px] truncate text-[12.5px] font-semibold text-app-text-muted">
            Qisqa videolar — ko'ring va o'zingiznikini joylang
          </p>
        </div>
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
            {match.partner_profile?.avatar_url ? (
              <img
                src={resolveAssetUrl(match.partner_profile.avatar_url) ?? ''}
                alt=""
                className="h-[50px] w-[50px] shrink-0 rounded-[16px] object-cover"
                loading="lazy"
              />
            ) : (
              <div
                className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[16px] text-[15px] font-black text-white"
                style={{ background: gradients[idx % gradients.length] }}
              >
                {initials(name)}
              </div>
            )}
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
