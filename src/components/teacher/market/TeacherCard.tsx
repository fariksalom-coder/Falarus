/**
 * Katalog kartochkasi: surat, ism, baho va sharhlar soni, o'ngda narx (50 daqiqa uchun),
 * daraja + sertifikat + tajriba, 3–4 qatorli tanishtiruv, faol o'quvchilar va darslar soni.
 */
import { motion } from 'motion/react';
import { BookOpen, CalendarClock, Users } from 'lucide-react';
import { fmtSum } from '../../../api/teacherLessons';
import type { MarketTeacher } from '../../../api/teacherMarket';
import { LevelBadge, PathBadge, RatingLine, TeacherPhoto, experienceText, slotLabel, specLabel } from './parts';

/** Daraja, sertifikat, tajriba va yo'nalishlar (telefonda surat ostida, kompyuterda ism yonida). */
function Badges({ teacher, className }: { teacher: MarketTeacher; className: string }) {
  const exp = experienceText(teacher.experience_years);
  return (
    <div className={`flex-wrap gap-1.5 ${className}`}>
      <LevelBadge level={teacher.level} />
      <PathBadge certified={teacher.certified} />
      {exp && <span className="inline-flex items-center rounded-full bg-app-bg-subtle px-2 py-0.5 text-[11px] font-black text-app-text">{exp}</span>}
      {teacher.specializations.slice(0, 2).map((s) => <span key={s} className="inline-flex items-center rounded-full bg-app-icon-bg px-2 py-0.5 text-[11px] font-bold text-app-primary-deep">{specLabel(s)}</span>)}
    </div>
  );
}

export default function TeacherCard({ teacher, onOpen, onBook }: { teacher: MarketTeacher; onOpen: () => void; onBook: () => void }) {
  const name = `${teacher.first_name} ${teacher.last_name}`.trim();
  const next = teacher.free_slots[0];

  return (
    <motion.article layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="rounded-[24px] border border-app-border/70 bg-app-surface p-4 shadow-[0_14px_34px_rgba(148,163,184,0.12)] transition hover:shadow-[0_18px_44px_rgba(148,163,184,0.2)] sm:p-5">
      <button type="button" onClick={onOpen} className="block w-full text-left" aria-label={`${name} profili`}>
        <div className="flex gap-3.5 sm:gap-5">
          <TeacherPhoto url={teacher.avatar_url} name={name} className="h-[76px] w-[76px] rounded-2xl sm:h-[112px] sm:w-[112px]" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="line-clamp-2 min-w-0 text-[17px] font-black leading-tight text-app-text sm:text-xl">{name}</h3>
              <div className="shrink-0 text-right">
                <p className="text-[17px] font-black tabular-nums leading-tight text-app-text sm:text-xl">{teacher.price_uzs ? fmtSum(teacher.price_uzs) : '—'}</p>
                <p className="text-xs font-semibold text-app-text-muted">{teacher.lesson_minutes} daqiqa</p>
              </div>
            </div>
            <div className="mt-1"><RatingLine avg={teacher.rating_avg} count={teacher.rating_count} /></div>
            <Badges teacher={teacher} className="mt-2 hidden sm:flex" />
          </div>
        </div>
        <Badges teacher={teacher} className="mt-3 flex sm:hidden" />
      </button>

      {teacher.about && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-app-text-muted sm:line-clamp-4">{teacher.about}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-bold text-app-text">
        <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-app-primary" />{teacher.active_students} faol oʻquvchi</span>
        <span className="inline-flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-app-primary" />{teacher.lessons_done} dars oʻtgan</span>
        {next && <span className="inline-flex items-center gap-1.5 text-emerald-700"><CalendarClock className="h-4 w-4" />Eng yaqin: {slotLabel(next)}</span>}
      </div>

      <button type="button" onClick={onBook} disabled={!teacher.bookable}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-app-primary-deep text-[15px] font-black text-white shadow-app-soft transition hover:brightness-110 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none">
        {teacher.bookable ? 'Darsga yozilish' : 'Hozircha dars qabul qilmaydi'}
      </button>
    </motion.article>
  );
}
