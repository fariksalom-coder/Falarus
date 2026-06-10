import { useState, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
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
import UserAvatar from '../components/UserAvatar';

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
    <div className="min-h-full bg-[#EEF4FA] px-4 pb-6 pt-2">
      <main className="mx-auto w-full max-w-[820px]">
        <header className="mb-5">
          <h1 className="text-[32px] font-black leading-tight tracking-tight text-[#0F172A] sm:text-[40px]">
            Profil
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">Hisob va sozlamalar</p>
        </header>

        <section className="mb-6 flex flex-col items-center rounded-[24px] border border-slate-200/90 bg-white px-4 py-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
          <UserAvatar
            avatarUrl={user?.avatarUrl}
            gender={user?.gender ?? null}
            name={fullName}
            className="h-20 w-20"
          />
          <h2 className="mt-3 text-center text-lg font-extrabold text-[#0F172A]">{fullName}</h2>

          <div className="mt-4 flex items-center justify-center gap-2.5">
            <div className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#FFC425] px-4 text-[#0F172A]">
              <Crown className="h-4 w-4 fill-[#0F172A]" aria-hidden />
              <span className="text-sm font-extrabold">VIP</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/profile/settings')}
              className="flex h-9 items-center justify-center gap-2 rounded-full bg-[#24459A] px-4 text-white active:scale-[0.98]"
            >
              <span className="text-sm font-bold">Tahrirlash</span>
              <Pencil className="h-4 w-4" aria-hidden />
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
              <div className="flex h-8 min-w-[96px] items-center justify-center gap-2 rounded-full bg-[#2563EB] px-2.5 text-white">
                <span className="text-xs font-bold">1.0 x</span>
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
          <ProfileRow icon={<CircleHelp />} label="Yordam" onClick={() => navigate('/help')} />
          <ProfileRow icon={<CircleDollarSign />} label="Tariflar" onClick={() => navigate('/tariflar')} />
          <ProfileRow icon={<LogOut />} label="Chiqish" danger onClick={handleLogout} />
        </ProfileGroup>
      </main>
    </div>
  );
}

function ProfileGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="mb-2 px-0.5 text-base font-extrabold text-slate-900">{title}</h3>
      <div className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
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
      className={`flex w-full items-center gap-3 border-b border-slate-100 px-3.5 py-3.5 text-left transition-colors last:border-b-0 hover:bg-slate-50 active:bg-slate-100 ${
        danger ? 'text-red-600' : 'text-slate-900'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
          danger ? 'bg-red-50 text-red-600' : 'bg-[#EEF4FA] text-[#24459A]'
        } [&>svg]:h-5 [&>svg]:w-5`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-base font-semibold">{label}</span>
      {trailing ?? <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />}
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
      className={`relative h-7 w-11 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-emerald-500' : dark ? 'bg-slate-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </span>
  );
}
