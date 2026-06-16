import { motion } from 'motion/react';
import { Send } from 'lucide-react';
import type { PartnerPerson } from '../../api/partner';
import { useLocale } from '../../context/LocaleContext';

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'A1',
  elementary: 'A2',
  intermediate: 'B1',
  upper: 'B2',
  advanced: 'C1',
};

type Props = {
  person: PartnerPerson;
  onSendRequest: (userId: number) => void;
  sending?: boolean;
  requested?: boolean;
  canSendRequest?: boolean;
};

export default function PartnerPersonCard({
  person,
  onSendRequest,
  sending,
  requested,
  canSendRequest = true,
}: Props) {
  const { t } = useLocale();
  const initials = person.display_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[24px] border border-app-border bg-app-surface p-5 shadow-app-card"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-bold text-app-text">{person.display_name}</h3>
            <span className="shrink-0 text-sm text-app-text-muted">{t('partner.yearsOld', { age: person.age })}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              {LEVEL_LABELS[person.language_level] ?? person.language_level}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              {person.goal === 'work'
                ? t('partner.goalWork')
                : person.goal === 'conversation'
                  ? t('partner.goalConversation')
                  : person.goal}
            </span>
            <span className="rounded-full bg-app-icon-bg px-2.5 py-0.5 text-xs font-medium text-app-text-muted">
              {person.gender === 'male' ? t('partner.male') : t('partner.female')}
            </span>
          </div>
          {person.about && (
            <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-app-text-muted">{person.about}</p>
          )}
        </div>
      </div>

      {canSendRequest && (
        <button
          type="button"
          onClick={() => onSendRequest(person.user_id)}
          disabled={sending || requested}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 text-sm font-bold text-white shadow-[0_6px_20px_rgba(37,99,235,0.25)] transition-all hover:shadow-[0_10px_28px_rgba(37,99,235,0.35)] disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {requested ? t('partner.requestSent') : t('partner.sendRequest')}
        </button>
      )}
    </motion.div>
  );
}
