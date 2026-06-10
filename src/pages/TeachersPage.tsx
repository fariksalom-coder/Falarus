import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Clock, Search, Users } from 'lucide-react';

export const TEACHERS = [
  {
    id: 'asrorbek-xalilov',
    name: 'Asrorbek Xalilov',
    cardName: 'Abror Shavkatov',
    image: '/landing/teacher.png',
    duration: '3 Months',
    experience: '2 years',
  },
  {
    id: 'abror-shavkatov',
    name: 'Abror Shavkatov',
    cardName: 'Abror Shavkatov',
    image: '/landing/teacher.png',
    duration: '3 Months',
    experience: '2 years',
  },
  {
    id: 'aziz-rustamov',
    name: 'Aziz Rustamov',
    cardName: 'Abror Shavkatov',
    image: '/landing/teacher.png',
    duration: '3 Months',
    experience: '2 years',
  },
  {
    id: 'sardor-karimov',
    name: 'Sardor Karimov',
    cardName: 'Abror Shavkatov',
    image: '/landing/teacher.png',
    duration: '3 Months',
    experience: '2 years',
  },
] as const;

export type TeacherView = (typeof TEACHERS)[number];

function TopStatus() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-[50px] items-center gap-1.5 rounded-full bg-[#CFE4FA] py-1 pl-1.5 pr-3 text-[#0F172A]">
        <img
          src="/app-mobile/images/home/avatar.png"
          alt=""
          className="h-9 w-9 rounded-full object-cover object-[center_38%]"
          decoding="async"
        />
        <span className="text-2xl font-black leading-none">1</span>
        <span className="text-[25px] leading-none">🔥</span>
      </div>
      <Bell className="h-8 w-8 fill-[#24459A] text-[#24459A]" aria-hidden />
    </div>
  );
}

function TeacherCard({ teacher }: { teacher: TeacherView }) {
  const navigate = useNavigate();

  return (
    <article className="w-[222px] shrink-0 rounded-[14px] bg-white p-2 shadow-[0_6px_10px_rgba(15,23,42,0.22)]">
      <div className="overflow-hidden rounded-[12px] bg-[#F7F7F7]">
        <img
          src={teacher.image}
          alt=""
          className="h-[158px] w-full object-cover object-[center_35%]"
          decoding="async"
        />
      </div>
      <div className="px-2 pt-3">
        <h3 className="truncate text-[21px] font-black leading-tight text-[#0F172A]">
          {teacher.cardName}
        </h3>
        <p className="mt-2 flex items-center gap-1.5 text-[15px] font-black leading-none text-[#0F172A]">
          <span className="flex h-[17px] w-[17px] items-center justify-center rounded-full bg-[#24459A] text-white">
            <Clock className="h-[11px] w-[11px]" aria-hidden />
          </span>
          Duration: {teacher.duration}
        </p>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] font-bold leading-none text-[#4B4B4B]">
          <Users className="h-4 w-4 fill-[#24459A] text-[#24459A]" aria-hidden />
          Experience: {teacher.experience}
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate(`/teachers/${teacher.id}`)}
        className="mt-3 flex h-[37px] w-full items-center justify-center rounded-full bg-[#24459A] text-[17px] font-black text-white"
      >
        See more
      </button>
    </article>
  );
}

function TeacherSection({ title, showMore = true }: { title: string; showMore?: boolean }) {
  const teachers = useMemo(() => [...TEACHERS, ...TEACHERS.slice(0, 2)], []);

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-[26px] font-black leading-none text-[#0F172A]">{title}</h2>
        {showMore ? (
          <button type="button" className="shrink-0 text-[20px] font-extrabold text-[#24459A]">
            See more
          </button>
        ) : null}
      </div>
      <div className="-mx-1 flex gap-5 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {teachers.map((teacher, index) => (
          <TeacherCard key={`${teacher.id}-${index}`} teacher={teacher} />
        ))}
      </div>
    </section>
  );
}

export default function TeachersPage() {
  return (
    <div className="min-h-screen bg-[#EEF4FA] pb-[88px]">
      <main className="mx-auto w-full max-w-[820px] px-9 pt-[118px]">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-[56px] font-black leading-none tracking-tight text-[#0F172A]">
            Teachers
          </h1>
          <TopStatus />
        </header>

        <label className="mt-8 flex h-[53px] items-center gap-4 rounded-lg bg-[#DDDDE0] px-4 text-[#4B4B4B]">
          <Search className="h-7 w-7 shrink-0" aria-hidden />
          <input
            type="search"
            placeholder="Search teachers..."
            className="min-w-0 flex-1 bg-transparent text-[18px] font-bold outline-none placeholder:text-[#4B4B4B]"
          />
        </label>

        <TeacherSection title="TOP teachers" />
        <TeacherSection title="Recommended Teachers" />
      </main>
    </div>
  );
}
