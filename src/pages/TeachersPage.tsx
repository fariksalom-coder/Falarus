import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users } from 'lucide-react';
import { listTeachers, type TeacherProfile } from '../api/teachers';
import {
  formatTeacherExperience,
  formatTeacherPrice,
  teacherDisplayName,
  teacherInitials,
} from '../utils/teacherDisplay';

function TeacherAvatar({ teacher }: { teacher: TeacherProfile }) {
  const name = teacherDisplayName(teacher);
  if (teacher.avatar_url) {
    return (
      <img
        src={teacher.avatar_url}
        alt=""
        className="h-full w-full object-cover object-[center_35%]"
        decoding="async"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-black text-white">
      {teacherInitials(teacher)}
    </div>
  );
}

function TeacherCard({ teacher }: { teacher: TeacherProfile }) {
  const navigate = useNavigate();
  const name = teacherDisplayName(teacher);

  return (
    <article className="flex flex-col rounded-[16px] bg-white p-2 shadow-[0_6px_16px_rgba(15,23,42,0.1)]">
      <div className="aspect-[4/5] overflow-hidden rounded-[12px] bg-[#F1F5F9]">
        <TeacherAvatar teacher={teacher} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-1.5 pt-2.5">
        <h3 className="line-clamp-2 text-[15px] font-extrabold leading-tight text-[#0F172A]">{name}</h3>
        {teacher.headline ? (
          <p className="mt-1 line-clamp-2 text-[11px] font-medium text-[#64748B]">{teacher.headline}</p>
        ) : null}
        <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#334155]">
          <Users className="h-3.5 w-3.5 shrink-0 text-[#24459A]" aria-hidden />
          <span className="truncate">{formatTeacherExperience(teacher.experience_years, teacher.experience_months)}</span>
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#334155]">
          <Clock className="h-3.5 w-3.5 shrink-0 text-[#24459A]" aria-hidden />
          <span className="truncate">
            {formatTeacherPrice(teacher.monthly_course_price_amount, teacher.monthly_course_price_currency)}
          </span>
        </p>
        <button
          type="button"
          onClick={() => navigate(`/teachers/${teacher.user_id}`)}
          className="mt-3 flex h-9 w-full items-center justify-center rounded-full bg-[#24459A] text-[14px] font-extrabold text-white active:scale-[0.98]"
        >
          Batafsil
        </button>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF4FA] text-[#24459A]">
        <Users className="h-8 w-8" aria-hidden />
      </div>
      <h2 className="text-lg font-extrabold text-[#0F172A]">Hozircha o'qituvchilar yo'q</h2>
      <p className="mt-2 max-w-xs text-sm font-medium leading-relaxed text-[#64748B]">
        Faol o'qituvchilar ro'yxatga qo'shilganda ular shu yerda ikki ustunda ko'rinadi.
      </p>
    </div>
  );
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listTeachers()
      .then((rows) => mounted && setTeachers(rows))
      .catch((e: Error) => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-full bg-[#EEF4FA] px-4 pb-6 pt-2">
      <main className="mx-auto w-full max-w-[820px]">
        <header className="mb-5">
          <h1 className="text-[32px] font-black leading-tight tracking-tight text-[#0F172A] sm:text-[40px]">
            O'qituvchilar
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Rus tilini o'rgatuvchi o'qituvchilar ro'yxati
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#24459A] border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : teachers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {teachers.map((teacher) => (
              <TeacherCard key={teacher.user_id} teacher={teacher} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
