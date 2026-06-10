import { Navigate, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Copy, LockKeyhole, Mail, MapPin, Phone, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function shortUserId(id: number | undefined): string {
  return id ? `id_${String(id).padStart(7, '0')}` : 'id_0000000';
}

function profileRegion(): string {
  return 'Samarqand';
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.accountType === 'teacher') {
    return <Navigate to="/teacher-cabinet" replace />;
  }

  const userId = shortUserId(user?.id);
  const email = user?.email || "Email qo'shilmagan";
  const phone = user?.phone || "Telefon qo'shilmagan";

  async function copyId() {
    try {
      await navigator.clipboard.writeText(userId);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="min-h-screen bg-[#EEF4FA] pb-[88px]">
      <main className="mx-auto w-full max-w-[440px]">
        <header className="flex h-[114px] items-center justify-between bg-white px-4 pt-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-[15px] border border-[#C8DCF3] bg-white text-[#0F172A]"
            aria-label="Ortga"
          >
            <ChevronLeft className="h-7 w-7" aria-hidden />
          </button>
          <h1 className="text-[25px] font-black leading-none text-[#0F172A]">Hisob sozlamalari</h1>
          <button
            type="button"
            onClick={() => navigate('/profile/settings')}
            className="text-[15px] font-bold text-[#1D5BFF]"
          >
            Tahrirlash
          </button>
        </header>

        <section className="space-y-7 px-4 pt-7">
          <article className="rounded-[14px] bg-white px-5 py-6 shadow-[4px_4px_10px_rgba(0,0,0,0.18)]">
            <h2 className="text-[24px] font-black leading-none text-[#0F172A]">Profil ma'lumotlari</h2>

            <div className="mt-8 space-y-3">
              <FieldLabel>ID</FieldLabel>
              <div className="flex h-[43px] items-center justify-between rounded-[8px] border border-[#A0A0A0] bg-[#DDDDE0] px-3">
                <span className="min-w-0 truncate text-[18px] font-bold text-[#9D9D9D]">{userId}</span>
                <button type="button" onClick={copyId} className="text-[#4B4B4B]" aria-label="ID nusxalash">
                  <Copy className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/profile/settings')}
              className="mt-8 w-full text-left"
            >
              <FieldLabel>Hudud</FieldLabel>
              <div className="mt-3 flex h-[43px] items-center justify-between rounded-[8px] border border-[#A0A0A0] bg-white px-3">
                <span className="text-[18px] font-semibold text-[#0F172A]">{profileRegion()}</span>
                <ChevronRight className="h-6 w-6 text-[#4B4B4B]" aria-hidden />
              </div>
            </button>
          </article>

          <article className="rounded-[14px] bg-white px-5 py-6 shadow-[4px_4px_10px_rgba(0,0,0,0.18)]">
            <h2 className="text-[24px] font-black leading-none text-[#0F172A]">Aloqa va xavfsizlik</h2>

            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>Email</FieldLabel>
                <button type="button" onClick={() => navigate('/profile/settings')} className="text-[16px] font-medium text-[#1D5BFF]">
                  o'zgartirish
                </button>
              </div>
              <ReadonlyValue icon={<Mail className="h-5 w-5" aria-hidden />} value={email} />
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>Telefon raqami</FieldLabel>
                <button type="button" onClick={() => navigate('/profile/settings')} className="text-[16px] font-medium text-[#1D5BFF]">
                  o'zgartirish
                </button>
              </div>
              <ReadonlyValue icon={<Phone className="h-5 w-5" aria-hidden />} value={phone} />
            </div>

            <button
              type="button"
              onClick={() => navigate('/profile/settings')}
              className="mt-8 flex w-full items-center justify-between border-t border-[#A0A0A0] pt-5 text-left"
            >
              <span className="flex items-center gap-3 text-[18px] font-black text-[#0F172A]">
                <LockKeyhole className="h-5 w-5" aria-hidden />
                Parolni almashtirish
              </span>
              <ChevronRight className="h-6 w-6 text-[#4B4B4B]" aria-hidden />
            </button>
          </article>

          <button
            type="button"
            className="flex h-[43px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#A22929] text-[18px] font-black text-white"
          >
            <Trash2 className="h-5 w-5" aria-hidden />
            Hisobni o'chirish
          </button>
        </section>
      </main>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[16px] font-bold text-[#4B4B4B]">{children}</p>;
}

function ReadonlyValue({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex h-[43px] items-center gap-2 rounded-[8px] border border-[#A0A0A0] bg-white px-3">
      <span className="shrink-0 text-[#9D9D9D]">{icon}</span>
      <span className="min-w-0 truncate text-[17px] font-bold text-[#9D9D9D]">{value}</span>
    </div>
  );
}
