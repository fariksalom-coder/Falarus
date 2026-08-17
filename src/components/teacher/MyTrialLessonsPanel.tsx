/**
 * MyTrialLessonsPanel — o'quvchining sinov darslari (yagona panel).
 *
 * Nima uchun bitta panel: avval «Sinov darslarim» va «Dars jadvalim» alohida
 * turardi va bir xil darslarni ikki marta ko'rsatardi. Endi har bir dars
 * BITTA qatorda: ustoz ismi, dars qachon (belgilangan vaqt yoki yozilgan sana),
 * holati va ikkita amal — «Suhbat» hamda «Profil».
 *
 * Hech qanday sinov darsi bo'lmasa panel umuman chizilmaydi.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  MessageCircle,
  Timer,
  User,
} from 'lucide-react';
import { getMyTrialLessons, type MyTrialItem, type MyTrialsResponse } from '../../api/teachers';
import { lessonCountdown, needsCountdown } from '../../utils/lessonCountdown';
import { formatTeacherPrice } from '../../utils/teacherDisplay';
import { useAuth } from '../../context/AuthContext';
import TeacherChatModal from './TeacherChatModal';

// Qisqa shakl: yonida taymer chipi ham turadi, to'liq nom bir qatorga sig'maydi.
// Sana raqami baribir yozilgani uchun ma'no yo'qolmaydi.
const WEEKDAY_UZ = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'];
const MONTH_UZ = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

/**
 * Holat kodini matnga aylantiradi. `chip` — buni alohida belgi sifatida
 * ko'rsatish kerakmi: oddiy "yozilgan" holat sana qatoridan ko'rinib turadi,
 * shuning uchun faqat yakunlangan yoki to'lov kutilayotgan dars belgilanadi.
 */
function statusLabel(status: string): { text: string; done: boolean; chip: boolean } {
  const s = String(status || '').toLowerCase();
  if (s.includes('complete')) return { text: 'Dars o‘tildi', done: true, chip: true };
  if (s.includes('pending_payment')) return { text: 'To‘lov kutilmoqda', done: false, chip: true };
  return { text: 'Yozildingiz', done: false, chip: false };
}

function parseDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * Vaqt qatori. Dars vaqti belgilangan bo'lsa — o'sha vaqt ko'rsatiladi;
 * belgilanmagan bo'lsa — o'quvchi QACHON yozilgani (aks holda qator bo'sh
 * ko'rinib, "hech narsa bo'lmagandek" tuyulardi).
 */
function whenLine(item: MyTrialItem): { text: string; scheduled: boolean } {
  const sched = parseDate(item.scheduledStartsAt);
  if (sched) {
    const today = new Date();
    const sameDay =
      sched.getDate() === today.getDate() &&
      sched.getMonth() === today.getMonth() &&
      sched.getFullYear() === today.getFullYear();
    const day = sameDay
      ? 'Bugun'
      : `${WEEKDAY_UZ[sched.getDay()]}, ${sched.getDate()}-${MONTH_UZ[sched.getMonth()]}`;
    return { text: `${day} ${hhmm(sched)}`, scheduled: true };
  }
  const booked = parseDate(item.bookedAt);
  if (booked) {
    // Qisqa: uzun matn qatorga sig'may kesilib qolardi.
    return {
      text: `${booked.getDate()}-${MONTH_UZ[booked.getMonth()]} · vaqt kelishilmagan`,
      scheduled: false,
    };
  }
  return { text: 'Vaqt kelishilmagan', scheduled: false };
}


export default function MyTrialLessonsPanel({ token }: { token: string | null }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<MyTrialsResponse | null>(null);
  const [chat, setChat] = useState<{ conversationId: number; name: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!token) return;
    let alive = true;
    getMyTrialLessons(token)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        /* panel ixtiyoriy — xato bo'lsa shunchaki ko'rsatilmaydi */
      });
    return () => {
      alive = false;
    };
  }, [token]);

  // Sanoq kerak bo'ladigan dars bormi? Bo'lmasa taymer umuman ishga tushmaydi —
  // har soniyada bekorga qayta chizishning hojati yo'q.
  const hasCountdown = useMemo(
    () => (data?.items ?? []).some((i) => needsCountdown(i.scheduledStartsAt, Date.now())),
    [data],
  );

  useEffect(() => {
    if (!hasCountdown) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasCountdown]);

  if (!data || data.items.length === 0) return null;

  const { items, used, limit, remaining } = data;

  return (
    <section className="mb-4 overflow-hidden rounded-[24px] bg-white shadow-[0_14px_34px_-18px_rgba(15,23,42,0.18)] ring-1 ring-app-border">
      {/* Sarlavha qatori: nishon matn bilan bir qatorda, izoh pastda to'liq kenglikda */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#2563EB]">
            <GraduationCap className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <p className="min-w-0 flex-1 text-[16px] font-black leading-tight text-app-text">
            Sinov darslarim
          </p>
          <span className="shrink-0 rounded-full bg-[#EEF2FF] px-3 py-1.5 text-[13px] font-black tabular-nums text-[#2563EB]">
            {used}/{limit}
          </span>
        </div>
        <p className="mt-2 text-[12.5px] font-bold leading-snug text-app-text-muted">
          {remaining > 0
            ? `Yana ${remaining} ta ustozni sinab ko‘rishingiz mumkin`
            : 'Limit to‘ldi — endi bitta ustozni tanlang'}
        </p>
      </div>

      {/* Bosqich chizig'i */}
      <div className="mt-3 flex gap-1.5 px-4">
        {Array.from({ length: limit }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < used ? 'bg-[#2563EB]' : 'bg-slate-200'}`}
          />
        ))}
      </div>

      <ul className="mt-3 divide-y divide-app-border/70">
        {items.map((item) => {
          const st = statusLabel(item.status);
          const when = whenLine(item);
          const name = item.teacherName ?? 'Ustoz';
          const left = lessonCountdown(item.scheduledStartsAt, now);
          return (
            <li key={item.trialId} className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                {item.teacherPhoto ? (
                  <img
                    src={item.teacherPhoto}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-[16px] font-black text-slate-500">
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                )}

                {/* Ism va narx bir qatorda; vaqt qatori PASTDA to'liq kenglikda —
                    aks holda o'ng ustun uni siqib, matn kesilib qolardi. */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="min-w-0 flex-1 truncate text-[15px] font-black leading-tight text-app-text">
                      {name}
                    </p>
                    {item.monthlyPriceAmount ? (
                      <p className="shrink-0 text-[12.5px] font-bold text-app-text">
                        {formatTeacherPrice(item.monthlyPriceAmount, item.monthlyPriceCurrency)}
                      </p>
                    ) : null}
                  </div>
                  {/* flex-wrap: joy tor bo'lsa taymer pastki qatorga tushadi,
                      sana esa kesilmaydi. */}
                  <p
                    className={`mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] font-bold ${
                      when.scheduled ? 'text-[#2563EB]' : 'text-app-text-muted'
                    }`}
                  >
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                    <span>{when.text}</span>
                    {/* Raqamli sanoq: soat:daqiqa:soniya, har soniyada yangilanadi.
                        `tabular-nums` — raqamlar kengligi teng, shuning uchun
                        chip sanayotganda qimirlamaydi. */}
                    {left ? (
                      <span
                        className={`ml-0.5 inline-flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-0.5 text-[12px] font-black tabular-nums tracking-tight ${
                          left.urgent ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#EEF2FF] text-[#1D4ED8]'
                        }`}
                      >
                        <Timer className="h-3 w-3" strokeWidth={2.6} />
                        {left.text}
                      </span>
                    ) : null}
                  </p>
                  {/* Holat faqat MA'NOLI bo'lganda: yakunlangan yoki to'lov kutilmoqda.
                      Oddiy "yozildingiz" holati sana qatoridan allaqachon ko'rinadi. */}
                  {st.chip ? (
                    <p
                      className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ${
                        st.done ? 'bg-[#E7F6EC] text-[#177A3C]' : 'bg-[#FEF3C7] text-[#92400E]'
                      }`}
                    >
                      {st.done ? <CheckCircle2 className="h-3 w-3" /> : null}
                      {st.text}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Amallar: suhbat va profil */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    item.conversationId != null
                      ? setChat({ conversationId: item.conversationId, name })
                      : navigate(`/teachers/${item.teacherUserId}`)
                  }
                  className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-[#2563EB] text-[13.5px] font-black text-white transition active:scale-[0.98]"
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={2.5} />
                  Suhbat
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/teachers/${item.teacherUserId}`)}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border-2 border-app-border bg-white text-[13.5px] font-black text-app-text transition active:scale-[0.98]"
                >
                  <User className="h-4 w-4" strokeWidth={2.5} />
                  Profil
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="border-t border-app-border/70 bg-slate-50/70 px-4 py-2.5 text-[12px] font-semibold leading-snug text-app-text-muted">
        Sinovdan so‘ng yoqqan ustozni tanlab, uning sahifasidan oylik kursga yoziling.
      </p>

      {chat && token && user ? (
        <TeacherChatModal
          token={token}
          conversationId={chat.conversationId}
          currentUserId={user.id}
          title={`${chat.name} bilan suhbat`}
          onClose={() => setChat(null)}
        />
      ) : null}
    </section>
  );
}
