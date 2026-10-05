import { Flag } from 'lucide-react';
import type { SupportCrmDayProgress } from '../../api/supportCrm';

const COURSE_TOTAL_DAYS = 182;

/** Support CRM list cards: which course day the student has reached. */
export default function CrmDayProgress({ current_day, completed_days }: SupportCrmDayProgress) {
  const finished = completed_days >= COURSE_TOTAL_DAYS;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#1D4ED8] ring-1 ring-blue-100"
      title={`Tugatgan kunlar: ${completed_days}/${COURSE_TOTAL_DAYS}`}
    >
      <Flag size={13} className="shrink-0" aria-hidden="true" />
      {finished ? 'Kurs tugagan' : `${current_day}-kun`}
      {!finished ? (
        <span className="font-medium text-[#1D4ED8]/70">
          · {completed_days}/{COURSE_TOTAL_DAYS} tugagan
        </span>
      ) : null}
    </span>
  );
}
