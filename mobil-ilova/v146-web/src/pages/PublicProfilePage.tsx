import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Flame as FlameIcon,
  Zap as ZapIcon,
  Star as StarIcon,
  Medal as MedalIcon,
  Trophy as TrophyIcon,
  Crown as CrownIcon,
  Sparkles as SparklesIcon,
  BookOpen as BookIcon,
  Library as LibraryIcon,
  GraduationCap as GradIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import { fetchPublicProfile, type PublicProfileResponse } from '../api/publicProfile';
import { appMainBottomOffsetCss } from '../constants/appLayout';

const ICON_BY_KEY: Record<string, LucideIcon> = {
  flame: FlameIcon,
  zap: ZapIcon,
  star: StarIcon,
  medal: MedalIcon,
  trophy: TrophyIcon,
  crown: CrownIcon,
  sparkles: SparklesIcon,
  book: BookIcon,
  library: LibraryIcon,
  graduation: GradIcon,
};

function displayNameFrom(user: Pick<PublicProfileResponse, 'firstName' | 'lastName'>): string {
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Foydalanuvchi';
}

function initialsFrom(user: Pick<PublicProfileResponse, 'firstName' | 'lastName'>): string {
  const f = (user.firstName ?? '').trim();
  const l = (user.lastName ?? '').trim();
  return (((f[0] ?? '') + (l[0] ?? '')) || (f[0] ?? '?')).toUpperCase();
}

export default function PublicProfilePage() {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const userId = Number(userIdParam);

  const [data, setData] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token || !Number.isFinite(userId)) return;
    let alive = true;
    setLoading(true);
    void fetchPublicProfile(token, userId).then((res) => {
      if (!alive) return;
      if (!res) setNotFound(true);
      else setData(res);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [token, userId]);

  const featuredAchievements = useMemo(() => {
    if (!data) return [];
    const unlocked = data.achievements
      .filter((a) => a.unlocked)
      .slice()
      .sort((a, b) => (b.unlocked_at ?? '').localeCompare(a.unlocked_at ?? ''));
    const locked = data.achievements.filter((a) => !a.unlocked);
    return [...unlocked, ...locked].slice(0, 4);
  }, [data]);

  const memberInitials = data
    ? ((data.firstName?.[0] ?? '') + (data.lastName?.[0] ?? '')).toUpperCase().slice(0, 2) || 'FR'
    : 'FR';
  const membershipCode = data ? `${memberInitials} · ${data.memberSinceYear}` : '';
  const fullName = data ? displayNameFrom(data) : '';
  const points = data?.points ?? 0;
  const level = data?.level ?? 1;
  const formattedPoints = points.toLocaleString('ru-RU').replace(/,/g, ' ');

  return (
    <div
      className="profile-premium min-h-full px-4 pt-2"
      style={{ paddingBottom: `calc(${appMainBottomOffsetCss()} + 24px)` }}
    >
      <main className="mx-auto w-full max-w-[820px]">
        {/* Top bar: back arrow + serif "Profil" title */}
        <header className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-pmn-card ring-1 ring-pmn-border text-pmn-text shadow-[0_6px_16px_-10px_rgba(15,23,42,0.3)]"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          </button>
          <h1 className="profile-heading text-[19px] font-semibold text-pmn-text">Profil</h1>
          <span className="h-10 w-10" aria-hidden />
        </header>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-pmn-gold border-t-transparent" />
          </div>
        ) : notFound || !data ? (
          <div className="mt-6 rounded-[20px] bg-pmn-card p-6 text-center ring-1 ring-pmn-border">
            <p className="text-[15px] font-bold text-pmn-text">Foydalanuvchi topilmadi</p>
            <p className="mt-1 text-[13px] font-semibold text-pmn-text-muted">
              Ehtimol profil o'chirilgan yoki ID noto'g'ri.
            </p>
          </div>
        ) : (
          <>
            {/* Hero — centered navy card with gold ring avatar + hairline stats */}
            <section className="profile-guilloche relative mb-4 overflow-hidden rounded-[26px] px-5 pb-5 pt-7 text-white shadow-[0_22px_46px_-16px_rgba(6,18,47,0.6)]">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-[70px] -top-[70px] h-[230px] w-[230px] rounded-full"
                style={{
                  background:
                    'repeating-radial-gradient(circle at center, rgba(217,180,90,0.16) 0 1px, transparent 1px 11px)',
                }}
              />

              <span className="profile-heading absolute right-5 top-4 z-[2] text-[11.5px] tracking-[0.28em] text-[#D4AC5C]">
                {membershipCode}
              </span>

              <div className="relative z-[2] flex flex-col items-center text-center">
                {/* Avatar with gold ring — no camera / edit for public view */}
                <div
                  className="relative h-[92px] w-[92px] rounded-full p-[3px]"
                  style={{
                    background: 'linear-gradient(135deg, #F6E2A8 0%, #D9B45A 50%, #B8892F 100%)',
                  }}
                >
                  <UserAvatar
                    avatarUrl={data.avatarUrl}
                    gender={null}
                    name={fullName}
                    className="h-full w-full"
                  />
                </div>

                <h2 className="profile-heading mt-6 text-[25px] leading-tight text-white">
                  {fullName}
                </h2>

                {/* Pills row: OLTIN A'ZO (premium) + level */}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  {data.hasPremium ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-black uppercase tracking-[0.06em] text-[#0A1E48]"
                      style={{
                        background: 'linear-gradient(135deg, #F6E2A8 0%, #D9B45A 100%)',
                      }}
                    >
                      <span aria-hidden>✦</span>
                      <span>Oltin a'zo</span>
                    </span>
                  ) : null}
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(217,180,90,0.28)',
                      color: '#B9C7E6',
                    }}
                  >
                    {level}-daraja
                  </span>
                </div>
              </div>

              {/* Hairline stats: BALL · SERIYA · DARAJA */}
              <div
                className="relative z-[2] mt-5 flex items-stretch border-t pt-4"
                style={{ borderColor: 'rgba(217,180,90,0.28)' }}
              >
                <div className="flex-1 text-center">
                  <p className="profile-heading text-[22px] leading-none text-[#F0D999]">
                    {formattedPoints}
                  </p>
                  <p className="mt-[3px] text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#8FA0C4]">
                    Ball
                  </p>
                </div>
                <div className="my-auto h-[30px] w-px" style={{ background: 'rgba(217,180,90,0.28)' }} />
                <div className="flex-1 text-center">
                  <p className="profile-heading text-[22px] leading-none text-[#F0D999]">
                    <span aria-hidden className="mr-0.5">🔥</span>
                    {data.streakDays}
                  </p>
                  <p className="mt-[3px] text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#8FA0C4]">
                    Seriya
                  </p>
                </div>
                <div className="my-auto h-[30px] w-px" style={{ background: 'rgba(217,180,90,0.28)' }} />
                <div className="flex-1 text-center">
                  <p className="profile-heading text-[22px] leading-none text-[#F0D999]">
                    {level}
                  </p>
                  <p className="mt-[3px] text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#8FA0C4]">
                    Daraja
                  </p>
                </div>
              </div>
            </section>

            {/* YUTUQLAR preview */}
            <div className="mb-4 rounded-[20px] bg-pmn-card p-4 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.22)] ring-1 ring-pmn-border">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-pmn-gold-deep">
                  Yutuqlar · {data.unlockedAchievementsCount}/{data.totalAchievementsCount}
                </p>
              </div>
              {featuredAchievements.length === 0 ? (
                <p className="text-center text-[12.5px] font-semibold text-pmn-text-muted">
                  Hozircha yutuqlar yo'q
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {featuredAchievements.map((a) => {
                    const Icon = ICON_BY_KEY[a.icon] ?? TrophyIcon;
                    const isUnlocked = a.unlocked;
                    return (
                      <div key={a.key} className="text-center">
                        <div
                          className={`mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-[16px] ${
                            isUnlocked ? '' : 'opacity-45 grayscale'
                          }`}
                          style={
                            isUnlocked
                              ? {
                                  background: 'linear-gradient(135deg, #FBF3DE 0%, #F6E2A8 100%)',
                                  border: '1px solid #EAD9AE',
                                }
                              : {
                                  background: 'var(--pmn-fill-inset)',
                                  border: '1px solid var(--pmn-fill-inset-border)',
                                }
                          }
                        >
                          <Icon
                            className="h-6 w-6"
                            strokeWidth={2.2}
                            style={{ color: isUnlocked ? '#B0894A' : 'var(--pmn-text-soft)' }}
                          />
                        </div>
                        <p
                          className="mt-1.5 text-[10px] font-bold"
                          style={{ color: isUnlocked ? 'var(--pmn-text-muted)' : 'var(--pmn-text-soft)' }}
                        >
                          {a.kind === 'days' ? `${a.threshold} kun` : `${a.threshold} so'z`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Initials fallback marker (accessibility hint) */}
            <p className="sr-only" aria-hidden>
              {initialsFrom(data)}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
