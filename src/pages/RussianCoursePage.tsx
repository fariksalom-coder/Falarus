import { ArrowLeft, ArrowRight, GraduationCap, BookMarked } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BG = '#F8FAFC';
const BORDER = '#E2E8F0';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';

const SECTIONS = [
  {
    id: 'grammar',
    href: '/russian/grammar',
    title: 'Grammatika',
    subtitle: 'Darslar 1 dan 24 gacha',
    accent: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
    Icon: GraduationCap,
    iconColor: '#2563EB',
    iconBg: '#DBEAFE',
  },
  {
    id: 'vocabulary',
    href: '/vocabulary',
    title: "Lug'at",
    subtitle: "So'z boyligini oshirish",
    accent: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
    Icon: BookMarked,
    iconColor: '#16A34A',
    iconBg: '#DCFCE7',
  },
] as const;

export default function RussianCoursePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: BG }}>
      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-5">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </button>

        <h1 className="mb-5 text-[24px] font-bold sm:text-[28px]" style={{ color: TEXT }}>
          Ruscha tili
        </h1>

        <div className="space-y-4">
          {SECTIONS.map(({ id, href, title, subtitle, accent, Icon, iconColor, iconBg }) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(href)}
              className="w-full overflow-hidden rounded-[24px] border px-4 py-4 text-left shadow-[0_14px_34px_rgba(148,163,184,0.12)] sm:px-5 sm:py-5"
              style={{
                borderColor: BORDER,
                background: accent,
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-[0_12px_24px_rgba(37,99,235,0.12)] sm:h-[72px] sm:w-[72px]"
                  style={{ backgroundColor: iconBg }}
                >
                  <Icon className="h-8 w-8 sm:h-9 sm:w-9" style={{ color: iconColor }} />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-[20px] font-bold leading-tight sm:text-[22px]" style={{ color: TEXT }}>
                    {title}
                  </h2>
                  <p className="mt-1 text-sm sm:text-[15px]" style={{ color: TEXT_SECONDARY }}>
                    {subtitle}
                  </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/85 text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
