import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, BookOpen, Clock, MapPin, Users } from 'lucide-react';
import { TEACHERS } from './TeachersPage';

const REVIEWS = [
  {
    name: 'James Earl',
    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod',
  },
  {
    name: 'James Earl',
    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod',
  },
] as const;

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

export default function TeacherProfilePage() {
  const navigate = useNavigate();
  const { teacherId } = useParams();
  const teacher = useMemo(
    () => TEACHERS.find((item) => item.id === teacherId) ?? TEACHERS[0],
    [teacherId],
  );

  return (
    <div className="min-h-screen bg-[#EEF4FA] pb-[88px]">
      <main className="mx-auto w-full max-w-[820px] pt-[84px]">
        <header className="flex items-center justify-between px-9">
          <button
            type="button"
            onClick={() => navigate('/teachers')}
            className="flex h-16 w-16 items-center justify-center rounded-[15px] border border-[#C8DCF3] bg-white/20 text-[#0F172A]"
            aria-label="Back"
          >
            <ArrowLeft className="h-8 w-8" aria-hidden />
          </button>
          <TopStatus />
        </header>

        <section className="mt-[72px] grid grid-cols-[1fr_1fr] items-center gap-9 px-9">
          <div className="overflow-hidden rounded-[15px] bg-white shadow-[0_6px_10px_rgba(15,23,42,0.22)]">
            <img
              src={teacher.image}
              alt=""
              className="h-[296px] w-full object-cover object-[center_35%]"
              decoding="async"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-[34px] font-black leading-tight text-[#0F172A]">
              {teacher.name}
            </h1>
            <div className="mt-5 space-y-4 text-[18px] font-bold text-[#4B4B4B]">
              <p className="flex items-center gap-3">
                <Users className="h-6 w-6 fill-[#24459A] text-[#24459A]" aria-hidden />
                Experience: 2 years 3 month
              </p>
              <p className="flex items-center gap-3">
                <Clock className="h-6 w-6 fill-[#24459A] text-[#24459A]" aria-hidden />
                Age: 37
              </p>
              <p className="flex items-center gap-3">
                <MapPin className="h-6 w-6 fill-[#24459A] text-[#24459A]" aria-hidden />
                Region: Samarkand
              </p>
              <p className="flex items-center gap-3">
                <BookOpen className="h-6 w-6 fill-[#24459A] text-[#24459A]" aria-hidden />
                Teaching: Online/Offline
              </p>
            </div>
          </div>
        </section>

        <div className="px-9">
          <button
            type="button"
            className="mt-[35px] flex h-20 w-full items-center justify-center rounded-full bg-[#24459A] text-[28px] font-black text-white"
          >
            Join Telegram Group
          </button>
        </div>

        <section className="mt-8 bg-[#EEF4FA] px-9 pb-8 pt-8">
          <h2 className="text-[34px] font-black leading-none text-[#0F172A]">Student Reviews</h2>
          <div className="-mx-1 mt-7 flex gap-5 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {REVIEWS.map((review, index) => (
              <article
                key={`${review.name}-${index}`}
                className="w-[445px] shrink-0 rounded-[14px] bg-white px-6 py-5 shadow-[0_6px_10px_rgba(15,23,42,0.18)]"
              >
                <div className="flex items-center gap-5">
                  <h3 className="text-[26px] font-black leading-none text-[#0F172A]">{review.name}</h3>
                  <span className="text-[27px] leading-none text-[#F8B719]">★★★★★</span>
                </div>
                <p className="mt-4 text-[17px] font-semibold leading-5 text-[#4B4B4B]">{review.text}</p>
              </article>
            ))}
          </div>

          <article className="mt-7 rounded-[14px] bg-white px-6 py-6 shadow-[0_6px_10px_rgba(15,23,42,0.18)]">
            <h2 className="text-[34px] font-black leading-none text-[#0F172A]">About me</h2>
            <p className="mt-7 text-[22px] font-medium leading-[1.32] text-[#4B4B4B]">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
              ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
              ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
              reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
