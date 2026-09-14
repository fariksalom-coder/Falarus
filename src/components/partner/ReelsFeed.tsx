import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Heart, MessageCircle, Plus, Send, ShieldAlert, Trash2, Video, VolumeX, Volume2, X } from 'lucide-react';
import {
  addReelComment,
  deleteReel,
  getReelComments,
  getReels,
  getSavolJavobSummary,
  toggleReelLike,
  uploadReel,
  type Reel,
  type ReelComment,
} from '../../api/communityChat';
import { useAuth } from '../../context/AuthContext';
import ChatAvatar from '../ChatAvatar';

/**
 * RELS LENTASI — vertikal, bittalab suriladigan videolar.
 *
 * NIMA UCHUN `IntersectionObserver`: bir vaqtda O'NLAB video bo'ladi va
 * hammasini o'ynatib qo'yish telefonni ham, tarmoqni ham yeb qo'yadi.
 * Shuning uchun faqat EKRANDAGI video o'ynaydi, qolganlari to'xtaydi.
 *
 * Ovoz standart holatda O'CHIQ: lenta ochilishi bilan qichqirib
 * yubormasin va brauzerlarning avto-ijro qoidasiga ham mos tushsin —
 * ovozli video ko'pincha avtomatik o'ynamaydi.
 */

/**
 * RELS QOIDALARI — joylash tugmasi bosilganda HAR SAFAR ko'rsatiladi.
 *
 * Nima uchun har safar, bir marta emas: bu shunchaki eslatma emas, balki
 * oqibati bor ogohlantirish. Bir marta ko'rsatilib, keyin unutilsa,
 * "men bilmasdim" degan da'voga o'rin qoladi. Har yuklashdan oldin
 * ko'rinsa esa, har bir video ongli ravishda joylanadi.
 *
 * Admin va support bundan mustasno — moderatsiya ishida bu har safar
 * to'sqinlik qilardi.
 */
const QOIDALAR: Array<{ sarlavha: string; matn: string }> = [
  {
    sarlavha: '18+ va behayo mazmun',
    matn: "Yalang'och yoki jinsiy mazmundagi, shuningdek shama qiluvchi videolar butunlay taqiqlanadi. Platformada o'quvchilar bor.",
  },
  {
    sarlavha: "Targ'ibot va reklama",
    matn: "Boshqa kurs, kanal, mahsulot yoki xizmat reklamasi; siyosiy, diniy va mafkuraviy targ'ibot — ruxsat etilmaydi.",
  },
  {
    sarlavha: "Zo'ravonlik va haqorat",
    matn: "Qo'rquv soluvchi, zo'ravonlik ko'rsatuvchi videolar; millat, din yoki jins bo'yicha kamsitish taqiqlanadi.",
  },
  {
    sarlavha: 'Aldov va firibgarlik',
    matn: "Pul yig'ish, soxta yutuq, «tez boyish» va shunga o'xshash da'volar darhol o'chiriladi.",
  },
  {
    sarlavha: "O'zganing mehnati",
    matn: "Boshqa muallifning videosini o'zingiznikidek joylamang. Mualliflik huquqi buzilishi shikoyatga sabab bo'ladi.",
  },
];

function vaqt(ms: number | null | undefined): string {
  const j = Math.max(0, Math.round((ms ?? 0) / 1000));
  return `${Math.floor(j / 60)}:${String(j % 60).padStart(2, '0')}`;
}

function sana(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
}

export default function ReelsFeed({ onBack }: { onBack: () => void }) {
  const { token } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ovozli, setOvozli] = useState(false);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [caption, setCaption] = useState('');
  const [panel, setPanel] = useState(false);

  /*
   * Qoida oynasi. `moderator` aniqlanmaguncha `null` — shu holatda ham
   * qoida KO'RSATILADI. Xato tomon ataylab shunday tanlangan: moderator
   * qoidani ortiqcha bir marta ko'rsa zarari yo'q, oddiy foydalanuvchi
   * uni ko'rmay qolsa esa butun ogohlantirishning ma'nosi yo'qoladi.
   */
  const [qoida, setQoida] = useState(false);
  const [moderator, setModerator] = useState<boolean | null>(null);

  /*
   * Kommentariyalar alohida oynada. Ochilganda yuklanadi — lentadagi
   * har bir rels uchun oldindan yuklash ortiqcha so'rov bo'lardi.
   */
  const [kommRels, setKommRels] = useState<Reel | null>(null);
  const [kommlar, setKommlar] = useState<ReelComment[]>([]);
  const [kommMatn, setKommMatn] = useState('');
  const [kommYuk, setKommYuk] = useState(false);

  /*
   * Moderator huquqi mavjud `summary` so'rovidan olinadi — rels ro'yxati
   * javobining shakli o'zgartirilmaydi. Aks holda deploy paytida eski
   * to'plam yangi javobni tushunmay qolardi.
   */
  useEffect(() => {
    if (!token) return;
    let tirik = true;
    getSavolJavobSummary(token)
      .then((s) => {
        if (tirik) setModerator(s.can_moderate === true);
      })
      .catch(() => {
        if (tirik) setModerator(false); // shubhada — qoida ko'rsatiladi
      });
    return () => {
      tirik = false;
    };
  }, [token]);

  const faylRef = useRef<HTMLInputElement | null>(null);
  const konteynerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef(new Map<number, HTMLVideoElement>());

  const yukla = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setReels(await getReels(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void yukla();
  }, [yukla]);

  /*
   * Faqat ekrandagi video o'ynaydi. `threshold: 0.6` — video yarmidan
   * ko'pi ko'ringandagina ishga tushadi, ya'ni surish paytida ikkita
   * video birdan o'ynab ketmaydi.
   */
  useEffect(() => {
    const kuzatuvchi = new IntersectionObserver(
      (yozuvlar) => {
        for (const y of yozuvlar) {
          const v = y.target as HTMLVideoElement;
          if (y.isIntersecting) void v.play().catch(() => {});
          else {
            v.pause();
            v.currentTime = 0;
          }
        }
      },
      { threshold: 0.6 },
    );
    for (const v of videoRefs.current.values()) kuzatuvchi.observe(v);
    return () => kuzatuvchi.disconnect();
  }, [reels]);

  async function faylTanlandi(f: File | null | undefined) {
    if (!f || !token || yuklanmoqda) return;
    setYuklanmoqda(true);
    setError('');
    try {
      const yangi = await uploadReel(token, {
        file: f,
        fileName: f.name || 'rels.mp4',
        caption: caption.trim(),
      });
      setReels((prev) => [yangi, ...prev]);
      setCaption('');
      setPanel(false);
      konteynerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Joylanmadi');
    } finally {
      setYuklanmoqda(false);
    }
  }

  async function laykBos(r: Reel) {
    if (!token) return;
    // Darhol ko'rinadi, keyin server javobi bilan aniqlanadi.
    setReels((prev) =>
      prev.map((x) =>
        x.id === r.id
          ? {
              ...x,
              liked_by_me: !x.liked_by_me,
              likes_count: x.likes_count + (x.liked_by_me ? -1 : 1),
            }
          : x,
      ),
    );
    try {
      const j = await toggleReelLike(token, r.id);
      setReels((prev) =>
        prev.map((x) =>
          x.id === r.id ? { ...x, likes_count: j.likes_count, liked_by_me: j.liked_by_me } : x,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Layk saqlanmadi');
      void yukla();
    }
  }

  async function kommOch(r: Reel) {
    if (!token) return;
    setKommRels(r);
    setKommlar([]);
    try {
      setKommlar(await getReelComments(token, r.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklanmadi');
    }
  }

  async function kommYubor() {
    const matn = kommMatn.trim();
    if (!token || !kommRels || !matn || kommYuk) return;
    setKommYuk(true);
    try {
      const yangi = await addReelComment(token, kommRels.id, matn);
      setKommlar((prev) => [...prev, yangi]);
      setKommMatn('');
      setReels((prev) =>
        prev.map((x) => (x.id === kommRels.id ? { ...x, comments_count: x.comments_count + 1 } : x)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuborilmadi');
    } finally {
      setKommYuk(false);
    }
  }

  async function ochir(id: number) {
    if (!token) return;
    setError('');
    try {
      await deleteReel(token, id);
      setReels((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "O'chirilmadi");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <header className="flex shrink-0 items-center gap-2.5 bg-black/80 px-3.5 pb-3 pt-[max(env(safe-area-inset-top,0px),12px)] backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-white/10 text-white"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="flex-1 text-[15px] font-extrabold text-white">Rels</p>
        <button
          type="button"
          onClick={() => setOvozli((v) => !v)}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-white/10 text-white"
          aria-label={ovozli ? "Ovozni o'chirish" : 'Ovozni yoqish'}
        >
          {ovozli ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => (moderator === true ? setPanel(true) : setQoida(true))}
          className="flex h-[38px] items-center gap-1.5 rounded-[12px] bg-[#0EA5A5] px-3 text-[13px] font-black text-white"
        >
          <Plus className="h-4 w-4" />
          Joylash
        </button>
      </header>

      {error ? (
        <div className="shrink-0 bg-red-600/90 px-4 py-2 text-[13px] font-semibold text-white">
          {error}
        </div>
      ) : null}

      {/*
        `snap-y snap-mandatory` — bittalab to'xtaydigan lenta.
        Har bir element to'liq ekran balandligida.
      */}
      <div
        ref={konteynerRef}
        className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain"
      >
        {loading ? (
          <p className="py-16 text-center text-sm text-white/60">Yuklanmoqda…</p>
        ) : reels.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <Video className="h-10 w-10 text-white/40" />
            <p className="text-[15px] font-bold text-white">Hali rels yo'q</p>
            <p className="text-[13px] text-white/60">
              Birinchi bo'lib video joylang — «Joylash» tugmasi yuqorida.
            </p>
          </div>
        ) : (
          reels.map((r) => (
            <section
              key={r.id}
              className="relative flex h-full snap-start snap-always items-center justify-center"
            >
              <video
                ref={(el) => {
                  if (el) videoRefs.current.set(r.id, el);
                  else videoRefs.current.delete(r.id);
                }}
                src={r.video_url}
                poster={r.poster_url ?? undefined}
                loop
                muted={!ovozli}
                playsInline
                preload="metadata"
                className="h-full w-full object-contain"
                onClick={(e) => {
                  const v = e.currentTarget;
                  if (v.paused) void v.play().catch(() => {});
                  else v.pause();
                }}
              />

              {/* Pastdagi ma'lumot — video ustida, gradient bilan o'qiladi. */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(env(safe-area-inset-bottom,0px),16px)] pt-10">
                <div className="flex items-center gap-2">
                  <ChatAvatar url={r.author_avatar_url} ism={r.author_name} olcham={28} />
                  <p className="text-[14px] font-black text-white">{r.author_name}</p>
                </div>
                {r.caption ? (
                  <p className="mt-1 max-w-[80%] text-[13.5px] leading-snug text-white/90">
                    {r.caption}
                  </p>
                ) : null}
                <p className="mt-1 text-[11.5px] font-semibold text-white/60">
                  {sana(r.created_at)}
                  {r.duration_ms ? ` · ${vaqt(r.duration_ms)}` : ''}
                </p>
              </div>

              {r.can_delete ? (
                <button
                  type="button"
                  onClick={() => void ochir(r.id)}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-red-600"
                  aria-label="O'chirish"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}

              {/*
                Layk va kommentariya — o'ngda, EKRAN O'RTASIDA.

                Ilgari `bottom-24` edi va telefonda pastdagi panellar
                (brauzer paneli, xavfsiz zona) ostida qolib ketardi.
                O'rtada esa hech narsa ustidan tushmaydi va bosh barmoq
                bilan yetib borish ham qulayroq.
              */}
              <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => void laykBos(r)}
                  className="flex flex-col items-center gap-1 text-white"
                  aria-label="Yoqdi"
                  aria-pressed={r.liked_by_me}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur transition active:scale-90">
                    <Heart
                      className={`h-5 w-5 ${r.liked_by_me ? 'fill-red-500 text-red-500' : ''}`}
                    />
                  </span>
                  <span className="text-[12px] font-black tabular-nums">{r.likes_count}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void kommOch(r)}
                  className="flex flex-col items-center gap-1 text-white"
                  aria-label="Kommentariyalar"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur transition active:scale-90">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <span className="text-[12px] font-black tabular-nums">{r.comments_count}</span>
                </button>
              </div>
            </section>
          ))
        )}
      </div>

      {/*
        KOMMENTARIYALAR.

        Yozilgan matn savol-javob guruhida ham ko'rinadi — server uni
        guruh xabari sifatida saqlaydi. Buni foydalanuvchi bilishi kerak,
        shuning uchun kirish maydoni ostida eslatma turadi.
      */}
      {kommRels ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-[24px] bg-pmn-card">
            <div className="flex shrink-0 items-center justify-between border-b border-pmn-border px-5 py-3">
              <span className="text-[14px] font-black text-pmn-text">
                Kommentariyalar {kommlar.length ? `· ${kommlar.length}` : ''}
              </span>
              <button
                type="button"
                onClick={() => setKommRels(null)}
                className="rounded-lg p-1.5 text-pmn-text-muted"
                aria-label="Yopish"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
              {kommlar.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-pmn-text-muted">
                  Hali kommentariya yo'q — birinchi bo'ling.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {kommlar.map((k) => (
                    <div key={k.id} className="flex items-start gap-2">
                      <ChatAvatar url={k.author_avatar_url} ism={k.author_name} olcham={26} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-black text-[#0EA5A5]">{k.author_name}</p>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-[14px] leading-snug text-pmn-text">
                          {k.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-pmn-border px-5 pb-3 pt-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={kommMatn}
                  onChange={(e) => setKommMatn(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void kommYubor();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Kommentariya yozing…"
                  className="max-h-24 min-h-[42px] flex-1 resize-none rounded-[14px] border border-pmn-border bg-pmn-bg px-3 py-2.5 text-[14px] text-pmn-text outline-none focus:border-[#0EA5A5]"
                />
                <button
                  type="button"
                  disabled={!kommMatn.trim() || kommYuk}
                  onClick={() => void kommYubor()}
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#0EA5A5] text-white disabled:opacity-40"
                  aria-label="Yuborish"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-pmn-text-muted">
                Kommentariyangiz savol-javob guruhida ham ko'rinadi.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* QOIDALAR — joylashdan oldin har safar. */}
      {qoida ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[86vh] w-full max-w-sm flex-col overflow-hidden rounded-[24px] bg-pmn-card">
            <div className="flex shrink-0 items-center gap-2.5 border-b border-pmn-border px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
                <ShieldAlert className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-black leading-tight text-pmn-text">Rels joylash qoidalari</p>
                <p className="text-[11.5px] text-pmn-text-muted">Yuklashdan oldin diqqat bilan o‘qing</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <ol className="flex flex-col gap-3.5">
                {QOIDALAR.map((q, i) => (
                  <li key={q.sarlavha} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-pmn-pill text-[11.5px] font-black text-pmn-text">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-black leading-snug text-pmn-text">{q.sarlavha}</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-pmn-text-muted">{q.matn}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {/*
                Oqibat alohida va qizil ramkada: yuqoridagi ro'yxat "nima
                mumkin emas" ni aytadi, bu blok esa "buzilsa nima bo'ladi"
                ni. Ikkisi bir xil ko'rinsa, ogohlantirish ko'zga tashlanmay
                matn ichida yo'qolib ketardi.
              */}
              <div className="mt-4 rounded-[14px] border border-red-200 bg-red-50 p-3.5 dark:border-red-400/25 dark:bg-red-500/10">
                <p className="flex items-center gap-1.5 text-[12.5px] font-black text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-[15px] w-[15px] shrink-0" />
                  Qoida buzilsa
                </p>
                <ul className="mt-2 flex flex-col gap-1.5 text-[12.5px] leading-relaxed text-red-700 dark:text-red-300">
                  <li>· Video ogohlantirishsiz o‘chiriladi.</li>
                  <li>· Akkauntingiz butunlay bloklanadi.</li>
                  <li className="font-black">· To‘lagan pulingiz QAYTARILMAYDI.</li>
                </ul>
              </div>

              <p className="mt-3 text-[11.5px] leading-relaxed text-pmn-text-muted">
                «Tushundim» tugmasini bosish orqali siz ushbu qoidalarga rozilik
                bildirasiz va joylagan videongiz uchun to‘liq javobgar bo‘lasiz.
              </p>
            </div>

            <div className="flex shrink-0 gap-2 border-t border-pmn-border px-5 py-3.5">
              <button
                type="button"
                onClick={() => setQoida(false)}
                className="flex-1 rounded-[12px] bg-pmn-pill py-2.5 text-[13.5px] font-black text-pmn-text"
              >
                Bekor
              </button>
              <button
                type="button"
                onClick={() => {
                  setQoida(false);
                  setPanel(true);
                }}
                className="flex-1 rounded-[12px] bg-[#0EA5A5] py-2.5 text-[13.5px] font-black text-white"
              >
                Tushundim
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Joylash oynasi. */}
      {panel ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-[24px] bg-pmn-card p-5">
            <p className="text-[15px] font-black text-pmn-text">Rels joylash</p>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Izoh (ixtiyoriy)"
              className="mt-3 w-full resize-none rounded-[12px] border border-pmn-border bg-pmn-bg px-3 py-2.5 text-[14px] text-pmn-text outline-none focus:border-[#0EA5A5]"
            />
            <input
              ref={faylRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                void faylTanlandi(f);
              }}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setPanel(false)}
                className="flex-1 rounded-[12px] bg-pmn-pill py-2.5 text-[13.5px] font-black text-pmn-text"
              >
                Bekor
              </button>
              <button
                type="button"
                disabled={yuklanmoqda}
                onClick={() => faylRef.current?.click()}
                className="flex-1 rounded-[12px] bg-[#0EA5A5] py-2.5 text-[13.5px] font-black text-white disabled:opacity-50"
              >
                {yuklanmoqda ? 'Yuklanmoqda…' : 'Video tanlash'}
              </button>
            </div>
            <p className="mt-2.5 text-[11.5px] text-pmn-text-muted">
              MP4, WEBM yoki MOV · 60 MB gacha
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
