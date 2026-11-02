import { useCallback, useEffect, useState } from 'react';
import { BellRing, Radio } from 'lucide-react';
import { pushObunaBol, pushObunaSoni, pushQollabQuvvatlanadi, pushSinovYubor } from '../../api/push';
import {
  cancelLiveStream,
  createLiveStream,
  endLiveStream,
  getHostRoom,
  listManagedStreams,
  startLiveStream,
  type ManagedLiveStream,
} from '../../api/liveStream';

/**
 * Efir boshqaruvi — OLTIN SUPPORT hisobi uchun, ilova ichida.
 *
 * Admin panelida emas: efirni jonli olib boradigan odam support va u
 * o'zining oddiy hisobidan kiradi. Server har bir so'rovda `is_golden` ni
 * tekshiradi, ya'ni bu panel boshqa hisobga ochilib qolsa ham amal
 * bajarilmaydi.
 *
 * MUHIM: efirga MANA SHU YERDAN kirilsin. Jitsi anonim rejimda va xonaga
 * birinchi kirgan odam moderator bo'ladi — support birinchi kirsagina
 * mikrofonlarni boshqara oladi.
 */

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Rejalashtirilgan',
  live: 'JONLI',
  ended: 'Tugagan',
  cancelled: 'Bekor qilingan',
};

function sana(v: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' });
}

/** `datetime-local` uchun hozirgi vaqt (mahalliy zonada). */
function hozirLocal(): string {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export type HostRoom = { domain: string; room_slug: string; title: string };

export default function LiveStreamHostPanel({
  token,
  onEnterRoom,
}: {
  token: string;
  onEnterRoom: (room: HostRoom) => void;
}) {
  const [streams, setStreams] = useState<ManagedLiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [duration, setDuration] = useState(60);

  /*
   * Bildirishnoma holati. Efir xabari uni BOSHLAGAN supportga yuborilmaydi,
   * shuning uchun "keldimi" degan savolga faqat shu yerdan javob bor:
   * obuna soni nol bo'lsa xabar hech kimga bormaydi.
   */
  const [push, setPush] = useState<{ qurilmalar: number; odamlar: number } | null>(null);
  const [sinov, setSinov] = useState('');

  const load = useCallback(async () => {
    try {
      setStreams((await listManagedStreams(token)).streams);
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    // Qo'shimcha ko'rsatkich: yuklanmasa panel baribir ishlayveradi.
    void pushObunaSoni(token).then(setPush).catch(() => undefined);
  }, [token]);

  const sinovQongiroq = async () => {
    setSinov('Yuborilmoqda…');
    try {
      // Supportning o'z qurilmasi obuna bo'lmagan bo'lsa avval obuna qilamiz,
      // aks holda sinov "0 ta yuborildi" deb qaytadi va sabab tushunarsiz bo'ladi.
      if (pushQollabQuvvatlanadi() && Notification.permission !== 'denied') {
        await pushObunaBol(token, true).catch(() => false);
      }
      const n = await pushSinovYubor(token);
      setSinov(
        n > 0
          ? `${n} ta qurilmaga yuborildi — telefon ekranini tekshiring`
          : 'Bu hisobda obuna bo‘lgan qurilma yo‘q. Bildirishnomaga ruxsat bering.',
      );
      setPush(await pushObunaSoni(token).catch(() => push));
    } catch (e) {
      setSinov(e instanceof Error ? e.message : 'Sinov yuborilmadi');
    }
  };

  const bajar = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Amal bajarilmadi');
    } finally {
      setBusy(false);
    }
  };

  const jonli = streams.find((s) => s.status === 'live') ?? null;

  const yarat = (startNow: boolean) =>
    bajar(async () => {
      if (!title.trim()) throw new Error('Efir mavzusini yozing');
      if (!startNow && !startsAt) throw new Error('Boshlanish vaqtini tanlang');
      const s = await createLiveStream(token, {
        title: title.trim(),
        description: description.trim(),
        starts_at: startNow ? null : new Date(startsAt).toISOString(),
        duration_minutes: duration,
        start_now: startNow,
      });
      setTitle('');
      setDescription('');
      setStartsAt('');
      // Darhol boshlangan bo'lsa support xonaga DARHOL kirsin — moderator
      // bo'lib qolishi uchun.
      if (startNow) onEnterRoom(await getHostRoom(token, s.id));
    });

  const inputClass =
    'w-full rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-sm text-app-text outline-none transition focus:border-app-primary';

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-2xl bg-app-danger-bg px-4 py-3 text-sm font-semibold text-app-danger">
          {err}
        </div>
      ) : null}

      {jonli ? (
        <section className="rounded-[24px] border-2 border-red-200 bg-red-50 p-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-black text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              JONLI
            </span>
            <p className="text-base font-bold text-slate-900">{jonli.title}</p>
          </div>
          <p className="mt-1.5 text-xs text-slate-600">Boshlandi: {sana(jonli.started_at)}</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => bajar(async () => onEnterRoom(await getHostRoom(token, jonli.id)))}
              className="min-h-[44px] rounded-2xl bg-app-primary px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
            >
              Efirga kirish
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => bajar(() => endLiveStream(token, jonli.id))}
              className="min-h-[44px] rounded-2xl bg-red-600 px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
            >
              Efirni tugatish
            </button>
          </div>
        </section>
      ) : null}

      {/* ── Bildirishnoma holati ── */}
      <section className="rounded-[24px] bg-app-surface p-5 shadow-app-soft ring-1 ring-app-border">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <BellRing className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-app-text">Qo‘ng‘iroq bildirishnomasi</h2>
            <p className="mt-0.5 text-xs font-semibold text-app-text-muted">
              {push
                ? push.qurilmalar > 0
                  ? `${push.odamlar} ta foydalanuvchi · ${push.qurilmalar} ta qurilma ruxsat bergan`
                  : 'Hali hech kim ruxsat bermagan — efir xabari hech kimga bormaydi'
                : 'Tekshirilmoqda…'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={sinovQongiroq}
          className="mt-3.5 min-h-[44px] w-full rounded-2xl bg-app-bg-muted px-4 text-sm font-bold text-app-text transition active:scale-[0.98]"
        >
          Sinov qo‘ng‘irog‘ini yuborish
        </button>
        {sinov ? (
          <p className="mt-2 text-xs font-semibold text-app-text-muted">{sinov}</p>
        ) : (
          <p className="mt-2 text-xs text-app-text-muted">
            Efir boshlanganda xabar hammaga ketadi, lekin uni boshlagan sizga emas — shuning
            uchun tekshirish shu tugma orqali.
          </p>
        )}
      </section>

      {/* ── Yangi efir ── */}
      <section className="rounded-[24px] bg-app-surface p-5 shadow-app-soft ring-1 ring-app-border">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-icon-bg text-app-primary-deep">
            <Radio className="h-5 w-5" />
          </span>
          <h2 className="text-base font-black text-app-text">Yangi efir</h2>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-app-text-muted">Mavzu</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Kelishiklar bo'yicha savol-javob"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-app-text-muted">
              Izoh (ixtiyoriy)
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Efirda nima muhokama qilinadi"
              className={`${inputClass} resize-none`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-app-text-muted">
                Boshlanish vaqti
              </span>
              <input
                type="datetime-local"
                value={startsAt}
                min={hozirLocal()}
                onChange={(e) => setStartsAt(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-app-text-muted">
                Davomiyligi (daqiqa)
              </span>
              <input
                type="number"
                min={10}
                max={300}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 60)}
                className={inputClass}
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={busy || !!jonli}
            onClick={() => yarat(true)}
            title={jonli ? 'Avval jonli efirni tugating' : ''}
            className="min-h-[48px] flex-1 rounded-2xl bg-red-600 px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            Hoziroq boshlash
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => yarat(false)}
            className="min-h-[48px] flex-1 rounded-2xl bg-app-text px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            Rejalashtirish
          </button>
        </div>
      </section>

      {/* ── Ro'yxat ── */}
      <section className="rounded-[24px] bg-app-surface p-5 shadow-app-soft ring-1 ring-app-border">
        <h2 className="mb-3 text-base font-black text-app-text">Efirlar</h2>
        {loading ? (
          <p className="text-sm text-app-text-muted">Yuklanmoqda…</p>
        ) : streams.length === 0 ? (
          <p className="text-sm text-app-text-muted">Hali efir ochilmagan.</p>
        ) : (
          <ul className="space-y-2.5">
            {streams.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border border-app-border bg-app-bg-muted p-3.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      s.status === 'live'
                        ? 'bg-red-100 text-red-700'
                        : s.status === 'scheduled'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-app-bg text-app-text-muted'
                    }`}
                  >
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                  <p className="min-w-0 flex-1 truncate font-bold text-app-text">{s.title}</p>
                </div>
                <p className="mt-1 text-xs text-app-text-muted">
                  {s.status === 'live' ? `Boshlandi: ${sana(s.started_at)}` : sana(s.starts_at)} ·{' '}
                  {s.duration_minutes} daqiqa
                </p>
                {s.status === 'scheduled' ? (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || !!jonli}
                      onClick={() =>
                        bajar(async () => {
                          await startLiveStream(token, s.id);
                          onEnterRoom(await getHostRoom(token, s.id));
                        })
                      }
                      title={jonli ? 'Avval jonli efirni tugating' : ''}
                      className="min-h-[40px] rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition disabled:opacity-50"
                    >
                      Boshlash
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => bajar(() => cancelLiveStream(token, s.id))}
                      className="min-h-[40px] rounded-xl bg-app-bg px-4 text-xs font-bold text-app-text-muted transition disabled:opacity-50"
                    >
                      Bekor qilish
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
