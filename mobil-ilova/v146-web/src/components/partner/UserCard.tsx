import { useEffect, useState } from 'react';
import { Ban, Clock, Flame, Mail, MessageSquare, Phone, ShieldCheck, Trophy, X, ZoomIn } from 'lucide-react';
import { getUserCard, type UserCard as Karta } from '../../api/communityChat';
import { useAuth } from '../../context/AuthContext';
import { resolveAssetUrl } from '../../api';

/**
 * FOYDALANUVCHI KARTASI — support chatda ismga bosganda ochiladi.
 *
 * FAQAT SUPPORT ko'radi. Chaqiruvchi tomon `canModerate` bilan qo'riqlaydi,
 * server esa mustaqil ravishda yana tekshiradi — front tekshiruvi
 * qulaylik uchun, haqiqiy to'siq serverda.
 *
 * PAROL YO'Q va bo'lmaydi: u bcrypt xeshi sifatida saqlanadi, asl matn
 * hech qayerda yozilmagan. Support parolni ko'rish o'rniga uni qayta
 * tiklashi kerak.
 */

const BLOK_NOMI: Record<string, string> = {
  grammar: 'Grammatika',
  vocabulary: "Lug'at",
  text: "O'qish",
  speaking: 'Gapirish',
  suhbat: 'Savol-javob',
  review: 'Takrorlash',
};

function sana(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sanaVaqt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Aniq payt — sekundigacha. Support «qachon aynan» deb so'raganda kerak. */
function aniqVaqt(iso: string | null): string {
  if (!iso) return "Ma'lumot yo'q";
  return new Date(iso).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Oxirgi 5 daqiqa ichida ko'ringan bo'lsa — hozir ilovada. */
function hozirOnlayn(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 5 * 60 * 1000;
}

/** «5 daqiqa oldin» ko'rinishi — aniq sanadan ko'ra tezroq o'qiladi. */
function qachon(iso: string | null): string {
  if (!iso) return "Ma'lumot yo'q";
  const farq = Date.now() - new Date(iso).getTime();
  const daq = Math.floor(farq / 60000);
  if (daq < 2) return 'Hozir onlayn';
  if (daq < 60) return `${daq} daqiqa oldin`;
  const soat = Math.floor(daq / 60);
  if (soat < 24) return `${soat} soat oldin`;
  const kun = Math.floor(soat / 24);
  if (kun < 30) return `${kun} kun oldin`;
  return sana(iso);
}

function vaqtMiqdori(sek: number): string {
  const soat = Math.floor(sek / 3600);
  const daq = Math.floor((sek % 3600) / 60);
  if (soat > 0) return `${soat} soat ${daq} daqiqa`;
  return `${daq} daqiqa`;
}

function Qator({ belgi, nom, qiymat }: { belgi: React.ReactNode; nom: string; qiymat: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-pmn-pill text-pmn-text-muted">
        {belgi}
      </span>
      <span className="shrink-0 text-[12.5px] text-pmn-text-muted">{nom}</span>
      <span className="ml-auto min-w-0 truncate text-right text-[13px] font-bold text-pmn-text">
        {qiymat}
      </span>
    </div>
  );
}

export default function UserCard({ userId, onClose }: { userId: number; onClose: () => void }) {
  const { token } = useAuth();
  const [karta, setKarta] = useState<Karta | null>(null);
  const [xato, setXato] = useState('');
  /*
   * Suratni KATTA ko'rish — faqat shu kartada, ya'ni faqat supportda.
   * Chatda hamma kichik avatarni ko'radi, lekin uni ochib bo'lmaydi.
   */
  const [kattaSurat, setKattaSurat] = useState(false);

  useEffect(() => {
    if (!token) return;
    let tirik = true;
    getUserCard(token, userId)
      .then((k) => tirik && setKarta(k))
      .catch((e) => tirik && setXato(e instanceof Error ? e.message : "Ma'lumot yuklanmadi"));
    return () => {
      tirik = false;
    };
  }, [token, userId]);

  const bosh = karta?.name
    ?.split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-sm flex-col overflow-hidden rounded-[24px] bg-pmn-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-pmn-border px-5 py-4">
          {karta?.avatar_url ? (
            <button
              type="button"
              onClick={() => setKattaSurat(true)}
              aria-label="Suratni katta ko'rish"
              className="relative h-11 w-11 shrink-0 transition-transform active:scale-95"
            >
              <img
                src={resolveAssetUrl(karta.avatar_url) ?? karta.avatar_url}
                alt=""
                className="h-11 w-11 rounded-full object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-pmn-card text-pmn-text-muted ring-1 ring-pmn-border">
                <ZoomIn className="h-2.5 w-2.5" />
              </span>
            </button>
          ) : (
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-black text-white"
              style={{ background: 'linear-gradient(145deg, #8B5CF6, #6D28D9)' }}
            >
              {bosh || '?'}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-black leading-tight text-pmn-text">
              {karta?.name ?? 'Yuklanmoqda…'}
            </p>
            <p className="flex items-center gap-1.5 text-[11.5px] text-pmn-text-muted">
              ID {userId}
              {karta ? (
                <>
                  <span>·</span>
                  {/*
                    Yashil nuqta — bir qarashda o'qiladigan yagona belgi.
                    Matnning o'zi «2 daqiqa oldin» desa ham, support avval
                    rangga qaraydi.
                  */}
                  {hozirOnlayn(karta.last_seen_at) ? (
                    <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="h-[7px] w-[7px] rounded-full bg-emerald-500" />
                      Hozir onlayn
                    </span>
                  ) : (
                    <span>{qachon(karta.last_seen_at)}</span>
                  )}
                </>
              ) : (
                <span>…</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pmn-pill text-pmn-text"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {xato ? <p className="py-6 text-center text-[13px] font-semibold text-red-500">{xato}</p> : null}
          {!karta && !xato ? (
            <p className="py-6 text-center text-[13px] text-pmn-text-muted">Yuklanmoqda…</p>
          ) : null}

          {karta ? (
            <>
              {karta.block ? (
                <div className="mb-3 rounded-[14px] border border-red-200 bg-red-50 p-3 dark:border-red-400/25 dark:bg-red-500/10">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-black text-red-700 dark:text-red-300">
                    <Ban className="h-[15px] w-[15px] shrink-0" />
                    Chatda bloklangan
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-red-700 dark:text-red-300">
                    {karta.block.reason || 'Sabab yozilmagan'} ·{' '}
                    {karta.block.expires_at ? `${sana(karta.block.expires_at)} gacha` : 'muddatsiz'}
                  </p>
                </div>
              ) : null}

              <p className="pt-1 text-[11px] font-black uppercase tracking-wide text-pmn-text-muted">
                Aloqa
              </p>
              <div className="divide-y divide-pmn-border">
                <Qator belgi={<Phone className="h-[15px] w-[15px]" />} nom="Telefon" qiymat={karta.phone || '—'} />
                <Qator belgi={<Mail className="h-[15px] w-[15px]" />} nom="Pochta" qiymat={karta.email || '—'} />
              </div>

              <p className="pt-3 text-[11px] font-black uppercase tracking-wide text-pmn-text-muted">
                Shaxsiy
              </p>
              <div className="divide-y divide-pmn-border">
                <Qator belgi={<span className="text-[12px] font-black">Y</span>} nom="Yoshi" qiymat={karta.age ? `${karta.age}` : '—'} />
                <Qator belgi={<span className="text-[12px] font-black">J</span>} nom="Jinsi" qiymat={karta.gender === 'male' ? 'Erkak' : karta.gender === 'female' ? 'Ayol' : '—'} />
                <Qator belgi={<span className="text-[12px] font-black">D</span>} nom="Daraja" qiymat={karta.level || '—'} />
                <Qator belgi={<Clock className="h-[15px] w-[15px]" />} nom="Ro'yxatdan o'tgan" qiymat={sana(karta.registered_at)} />
                <Qator belgi={<ShieldCheck className="h-[15px] w-[15px]" />} nom="Hisob turi" qiymat={karta.account_type === 'teacher' ? "O'qituvchi" : 'Talaba'} />
              </div>

              <p className="pt-3 text-[11px] font-black uppercase tracking-wide text-pmn-text-muted">
                Obuna
              </p>
              <div className="divide-y divide-pmn-border">
                <Qator belgi={<span className="text-[12px] font-black">T</span>} nom="Tarif" qiymat={karta.plan_name || 'Yo‘q'} />
                <Qator belgi={<Clock className="h-[15px] w-[15px]" />} nom="Amal qiladi" qiymat={sana(karta.plan_expires_at)} />
              </div>

              <p className="pt-3 text-[11px] font-black uppercase tracking-wide text-pmn-text-muted">
                Platformada
              </p>
              <div className="divide-y divide-pmn-border">
                <Qator
                  belgi={<Clock className="h-[15px] w-[15px]" />}
                  nom="Oxirgi marta"
                  qiymat={aniqVaqt(karta.last_seen_at)}
                />
                <Qator
                  belgi={<span className="text-[12px] font-black">≈</span>}
                  nom="Ya'ni"
                  qiymat={qachon(karta.last_seen_at)}
                />
                {/*
                  Chatdagi ko'rinish alohida: «platformada bor, chatda yo'q»
                  degan holat support uchun mazmunli — odam o'qiyapti, ammo
                  savol bermayapti.
                */}
                <Qator
                  belgi={<MessageSquare className="h-[15px] w-[15px]" />}
                  nom="Chatda oxirgi"
                  qiymat={karta.last_seen_chat ? aniqVaqt(karta.last_seen_chat) : 'Kirmagan'}
                />
              </div>

              <p className="pt-3 text-[11px] font-black uppercase tracking-wide text-pmn-text-muted">
                Faollik
              </p>
              <div className="divide-y divide-pmn-border">
                <Qator belgi={<Trophy className="h-[15px] w-[15px]" />} nom="Ball" qiymat={`${karta.total_points}`} />
                <Qator belgi={<Flame className="h-[15px] w-[15px]" />} nom="Eng uzun seriya" qiymat={`${karta.best_streak_days} kun`} />
                <Qator belgi={<Clock className="h-[15px] w-[15px]" />} nom="Umumiy vaqt" qiymat={vaqtMiqdori(karta.total_time_seconds)} />
                <Qator belgi={<MessageSquare className="h-[15px] w-[15px]" />} nom="Chatdagi xabari" qiymat={`${karta.message_count}`} />
                <Qator belgi={<span className="text-[12px] font-black">F</span>} nom="Faol kunlar" qiymat={`${karta.active_dates.length}`} />
              </div>

              <p className="pt-3 text-[11px] font-black uppercase tracking-wide text-pmn-text-muted">
                Oxirgi faoliyati
              </p>
              {karta.recent_activity.length === 0 ? (
                <p className="py-3 text-[12.5px] text-pmn-text-muted">Hali darsga kirmagan.</p>
              ) : (
                <ol className="flex flex-col divide-y divide-pmn-border">
                  {karta.recent_activity.map((a, i) => (
                    <li key={`${a.day_number}-${a.block_kind}-${i}`} className="flex items-center gap-2.5 py-2">
                      <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded-[9px] bg-pmn-pill text-[11px] font-black text-pmn-text">
                        {a.day_number}-k
                      </span>
                      <span className="text-[13px] font-bold text-pmn-text">
                        {BLOK_NOMI[a.block_kind] ?? a.block_kind}
                      </span>
                      <span className="ml-auto shrink-0 text-[11.5px] text-pmn-text-muted">
                        {sanaVaqt(a.done_at)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              {/*
                Parol haqidagi izoh ataylab ko'rsatiladi. Aks holda support
                "parol qani?" deb so'rayverardi; sabab shu yerda yozilgan.
              */}
              <div className="mt-3 rounded-[14px] bg-pmn-pill p-3">
                <p className="text-[12px] leading-relaxed text-pmn-text-muted">
                  <span className="font-black text-pmn-text">Parol ko'rsatilmaydi.</span>{' '}
                  U bazada qaytarib bo'lmaydigan shaklda (bcrypt) saqlanadi — asl matn
                  hech qayerda yozilmagan. Foydalanuvchi parolini unutgan bo'lsa, uni
                  qayta tiklash kerak.
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Katta surat — support uchun. Bosilsa yopiladi. */}
      {kattaSurat && karta?.avatar_url ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setKattaSurat(false);
          }}
        >
          <img
            src={resolveAssetUrl(karta.avatar_url) ?? karta.avatar_url}
            alt={karta.name}
            className="max-h-[86vh] max-w-full rounded-2xl object-contain"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setKattaSurat(false);
            }}
            aria-label="Yopish"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
