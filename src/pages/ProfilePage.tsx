import { useState, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  Crown,
  Globe2,
  LogOut,
  Moon,
  Pencil,
  Type,
  UserCircle,
  Users,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  if (user?.accountType === 'teacher') {
    return <Navigate to="/teacher-cabinet" replace />;
  }

  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Foydalanuvchi';

  function handleLogout() {
    logout();
    navigate('/auth');
  }

  return (
    <div className="min-h-screen bg-[#EEF4FA] pb-[88px]">
      <main className="mx-auto w-full max-w-[440px] px-4 pt-[76px]">
        <h1 className="text-[55px] font-black leading-none tracking-tight text-[#0F172A]">Profil</h1>

        <section className="mt-[52px] flex flex-col items-center">
          <img
            src="/app-mobile/images/home/avatar.png"
            alt=""
            className="h-[97px] w-[97px] rounded-full object-cover object-[center_38%]"
            decoding="async"
          />
          <h2 className="mt-5 text-[29px] font-black leading-none text-[#0F172A]">{fullName}</h2>

          <div className="mt-6 flex items-center justify-center gap-5">
            <div className="flex h-10 min-w-[122px] items-center justify-center gap-2 rounded-full bg-[#FFC425] px-5 text-[#0F172A]">
              <Crown className="h-5 w-5 fill-[#0F172A]" aria-hidden />
              <span className="text-[18px] font-black">VIP</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/profile/settings')}
              className="flex h-10 min-w-[122px] items-center justify-center gap-3 rounded-full bg-[#24459A] px-5 text-white"
            >
              <span className="text-[16px] font-bold">Tahrirlash</span>
              <Pencil className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </section>

        <ProfileGroup title="Shaxsiy">
          <ProfileRow icon={<UserCircle />} label="Hisob" onClick={() => navigate('/profile/settings')} />
          <ProfileRow icon={<BookOpen />} label="Sertifikatlar" />
          <ProfileRow icon={<Users />} label="Do'stlarni taklif qilish" onClick={() => navigate('/invite')} />
        </ProfileGroup>

        <ProfileGroup title="Sozlamalar">
          <ProfileRow
            icon={<Type />}
            label="Matn hajmi"
            trailing={
              <div className="flex h-9 min-w-[112px] items-center justify-center gap-3 rounded-full bg-[#0F4598] px-3 text-white">
                <ChevronLeft className="h-5 w-5" aria-hidden />
                <span className="text-[16px] font-bold">1.0 x</span>
                <ChevronRight className="h-5 w-5" aria-hidden />
              </div>
            }
          />
          <ProfileRow
            icon={<Bell />}
            label="Bildirishnomalar"
            trailing={<Switch checked={notificationsEnabled} onChange={() => setNotificationsEnabled((v) => !v)} />}
          />
          <ProfileRow
            icon={<Moon />}
            label="Tungi rejim"
            trailing={<Switch checked={darkModeEnabled} dark onChange={() => setDarkModeEnabled((v) => !v)} />}
          />
          <ProfileRow icon={<Globe2 />} label="Til" />
          <ProfileRow icon={<Volume2 />} label="Ovoz va tebranish" />
        </ProfileGroup>

        <ProfileGroup title="Yordam">
          <ProfileRow icon={<CircleHelp />} label="Yordam" />
          <ProfileRow icon={<CircleDollarSign />} label="Tariflar" onClick={() => navigate('/tariflar')} />
          <ProfileRow icon={<LogOut />} label="Chiqish" danger onClick={handleLogout} />
        </ProfileGroup>
      </main>
    </div>
  );
}

function ProfileGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-3 text-[20px] font-bold leading-none text-[#4B4B4B]">{title}</h3>
      <div className="overflow-hidden rounded-[14px] bg-white px-5 shadow-[4px_4px_10px_rgba(0,0,0,0.16)]">
        {children}
      </div>
    </section>
  );
}

function ProfileRow({
  icon,
  label,
  trailing,
  danger = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[73px] w-full items-center gap-6 border-b border-[#C8DCF3] text-left last:border-b-0 ${
        danger ? 'text-[#A22929]' : 'text-[#0F172A]'
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[2.8]">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-[24px] font-medium leading-none">{label}</span>
      {trailing ?? <ChevronRight className="h-8 w-8 shrink-0 text-[#9D9D9D]" aria-hidden />}
    </button>
  );
}

function Switch({
  checked,
  dark = false,
  onChange,
}: {
  checked: boolean;
  dark?: boolean;
  onChange: () => void;
}) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative h-8 w-[60px] shrink-0 rounded-full transition-colors ${
        checked ? 'bg-[#37C963]' : dark ? 'bg-[#4B4B4B]' : 'bg-[#9D9D9D]'
      }`}
    >
      <span
        className={`absolute top-0.5 h-7 w-7 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[30px]' : 'translate-x-0.5'
        }`}
      />
    </span>
  );
}
