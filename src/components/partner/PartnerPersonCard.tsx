import { motion } from 'motion/react';
import { Send } from 'lucide-react';
import type { PartnerPerson } from '../../api/partner';

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'A1',
  elementary: 'A2',
  intermediate: 'B1',
  upper: 'B2',
  advanced: 'C1',
};

const GOAL_LABELS: Record<string, string> = {
  work: 'Ish',
  conversation: 'Suhbat',
};

type Props = {
  person: PartnerPerson;
  onSendRequest: (userId: number) => void;
  sending?: boolean;
};

export default function PartnerPersonCard({ person, onSendRequest, sending }: Props) {
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
      className="rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-bold text-slate-900">{person.display_name}</h3>
            <span className="shrink-0 text-sm text-slate-500">{person.age} yosh</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {LEVEL_LABELS[person.language_level] ?? person.language_level}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              {GOAL_LABELS[person.goal] ?? person.goal}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {person.gender === 'male' ? 'Erkak' : 'Ayol'}
            </span>
          </div>
          {person.about && (
            <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-slate-600">{person.about}</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSendRequest(person.user_id)}
        disabled={sending}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 text-sm font-bold text-white shadow-[0_6px_20px_rgba(37,99,235,0.25)] transition-all hover:shadow-[0_10px_28px_rgba(37,99,235,0.35)] disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        So'rov yuborish
      </button>
    </motion.div>
  );
}
