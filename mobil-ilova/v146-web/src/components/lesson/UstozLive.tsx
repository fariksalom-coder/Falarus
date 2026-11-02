import { ConversationMicGate } from '../../utils/conversationAudio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, PhoneOff } from 'lucide-react';
import { apiUrl } from '../../api';
import type { KunSavol } from '../../api/ustozDoska';
import { MikrofonOqimi, OvozNavbati } from '../../utils/liveAudio';

/**
 * UstozLive — doskadagi JONLI ovozli savol-javob.
 *
 * Oddiy savol-javobdan farqi: mikrofon uzluksiz ochiq turadi va ustozning
 * ovozi oqim bo'lib keladi. Karnay aks-sadosini qayta yubormaslik uchun
 * ustoz gapirganda mikrofon oqimi jim PCM bilan almashtiriladi.
 *
 * Ulanib bo'lmasa `onZaxira` chaqiriladi va doska eski, yozib-yuborish
 * usuliga qaytadi — jonli suhbat qo'shimcha imkoniyat, darsni to'xtatib
 * qo'ymasligi kerak.
 */

type Holat = 'kutmoqda' | 'ulanmoqda' | 'jonli' | 'tugadi' | 'xato' | 'kvota';

/** Javob berilmagan savol — o'quvchi shu kunga qaytariladi. */
type Props = {
  token: string | null;
  mavzu: string;
  savollar: KunSavol[];
  /** Joriy kun — suhbat tarixi shu kunga yoziladi. */
  kun?: number;
  /** Suhbat tugadi — doska keyingi bosqichga o'tadi. */
  onTugadi: () => void;
  /** Jonli rejim ishlamadi — eski usulga qaytish kerak. */
  onZaxira: (sabab: string) => void;
  /**
   * O'quvchi savolga javob bera olmadi — savol tegishli kunga qaytariladi.
   * Berilmasa qaytarish ekrani ko'rsatiladi, lekin o'tish bo'lmaydi.
   */
  /**
   * Suhbatdan KEYINGI qadam nomi — yakundagi tugmada yoziladi.
   *
   * Suhbat darsning ichida bo'lganda undan keyin test kelardi; kunning
   * oxirgi bosqichi sifatida ochilganda esa keyingi qadam boshqa bo'ladi.
   */
  keyingiNomi?: string;
};

export default function UstozLive({
  token,
  mavzu,
  savollar,
  kun,
  onTugadi,
  onZaxira,
  keyingiNomi = 'Testga o‘tish',
}: Props) {
  const [holat, setHolat] = useState<Holat>('kutmoqda');
  const [xatoMatn, setXatoMatn] = useState('');
  /**
   * Suhbat tugashiga qolgan vaqt (soniya) — serverdan `ready` bilan keladi.
   *
   * Cheklov endi savol sonida emas, VAQTDA: o'quvchi qancha vaqti borligini
   * ko'rib tursa, suhbat kutilmaganda kesilgandek tuyulmaydi.
   */
  const [qoldi, setQoldi] = useState<number | null>(null);
  const [gapiryapti, setGapiryapti] = useState(false);
  const [daraja, setDaraja] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const mikRef = useRef<MikrofonOqimi | null>(null);
  const ovozRef = useRef<OvozNavbati | null>(null);

  const generationRef = useRef(0);
  const connectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tozala = useCallback(() => {
    generationRef.current++;
    if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
    const ws = wsRef.current;
    if (ws) { ws.onopen = null; ws.onmessage = null; ws.onerror = null; ws.onclose = null; }
    try { wsRef.current?.close(); } catch { /* allaqachon yopiq */ }
    wsRef.current = null;
    mikRef.current?.toxtat();
    mikRef.current = null;
    ovozRef.current?.yop();
    ovozRef.current = null;
  }, []);

  useEffect(() => tozala, [tozala]);

  const boshla = useCallback(async () => {
    if (!token) { onZaxira('token yo\'q'); return; }
    tozala();
    const generation = generationRef.current;
    const active = () => generation === generationRef.current;
    const micGate = new ConversationMicGate();
    setHolat('ulanmoqda');

    // Ovoz kontekstini foydalanuvchi bosgan paytda ochamiz: brauzerlar
    // avtomatik ijroni faqat shu holatda ruxsat beradi.
    const ovoz = new OvozNavbati();
    ovozRef.current = ovoz;
    try {
      await ovoz.tayyorla();
      if (!active()) { ovoz.yop(); return; }
    } catch {
      if (!active()) return;
      tozala();
      setHolat('xato');
      onZaxira('ovoz chiqishini ochib bo\'lmadi');
      return;
    }
    ovozRef.current = ovoz;

    /*
     * WebSocket manzili MUTLAQ bo'lishi SHART.
     *
     * Ilgari bu yerda `apiUrl(...).replace(/^http/, 'ws')` turardi. Bir xil
     * manbada `API_BASE` bo'sh bo'ladi, ya'ni `apiUrl()` `/api/ustoz/live`
     * degan NISBIY yo'l qaytaradi — `replace` esa unga tegmaydi, chunki
     * boshida `http` yo'q. Natijada `new WebSocket('/api/...')` chaqirilib,
     * brauzer "The URL is invalid" bilan yiqilardi. Aynan shu holat prodda
     * edi: jonli suhbat hech kimda ulanmasdi.
     *
     * `new URL(..., location.origin)` nisbiyni ham, mutlaqni ham to'g'ri
     * hal qiladi; protokol esa sahifanikiga qarab tanlanadi (https → wss).
     */
    const manzil = new URL(apiUrl('/api/ustoz/live'), window.location.origin);
    manzil.protocol = manzil.protocol === 'https:' ? 'wss:' : 'ws:';
    manzil.searchParams.set('token', token);
    const ws = new WebSocket(manzil);
    wsRef.current = ws;
    connectionTimerRef.current = setTimeout(() => {
      if (!active()) return;
      tozala(); setHolat('xato'); onZaxira('Ulanish vaqti tugadi.');
    }, 20_000);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'start', mavzu, savollar, kun }));
    };

    ws.onmessage = async (e) => {
      if (!active()) return;
      let m: {
        type?: string; kim?: string; matn?: string; data?: string;
        sabab?: string; xato?: string; kod?: string; qolgan?: number;
        kun?: number; mavzu?: string; savol?: string;
      };
      try { m = JSON.parse(e.data); } catch { return; }

      if (m.type === 'ready') {
        if (mikRef.current) return;
        if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
        setHolat('jonli');
        if (typeof m.qolgan === 'number') setQoldi(m.qolgan);
        // Keep the connection alive with silent PCM while the response plays.
        // Browser echo cancellation alone cannot guarantee speaker isolation.
        try {
          const mik = new MikrofonOqimi();
          mikRef.current = mik;
          await mik.boshla((b64) => {
            if (!active()) return;
            if (ws.bufferedAmount >= 64_000) {
              tozala(); setHolat('xato');
              onZaxira('Ulanish sekinlashdi. Ovozli javob rejimida davom eting.');
              return;
            }
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'audio', data: micGate.filter(b64, ovoz.gapiryapti, performance.now()) }));
            }
            setDaraja(mik.daraja);
          }, ovoz.context);
          if (!active()) mik.toxtat();
        } catch {
          if (!active()) return;
          // Mikrofonga ruxsat berilmadi — suhbatni davom ettirib bo'lmaydi.
          tozala();
          setHolat('xato');
          onZaxira('mikrofonga ruxsat berilmadi');
        }
        return;
      }

      if (m.type === 'audio' && m.data) {
        setGapiryapti(true);
        ovozRef.current?.qosh(m.data, () => setGapiryapti(false));
        return;
      }

      if (m.type === 'interrupted') {
        // O'quvchi gapira boshladi — ustoz darhol jim bo'ladi.
        ovozRef.current?.toxtat();
        setGapiryapti(false);
        return;
      }

      /*
       * MATN E'TIBORSIZ QOLDIRILADI.
       *
       * Server suhbat transkriptini yuborib turadi, lekin ekranda yozuv
       * YO'Q: bu jonli suhbat, o'quvchi ustozni TINGLASHI kerak. Yozuv
       * chiqib turganda ko'z matnga tushardi va o'quvchi eshitish o'rniga
       * o'qiy boshlardi — mashqning ma'nosi yo'qolardi.
       */
      if (m.type === 'text' || m.type === 'turnComplete') return;

      /*
       * KVOTA TUGASHI — zaxira rejimga o'tish uchun sabab EMAS.
       *
       * Zaxira ("javob berish" tugmasi bilan yozib yuborish) texnik
       * nosozlik uchun: tarmoq uzildi, brauzer qo'llamadi. Kvota esa
       * ataylab qo'yilgan chegara, uni aylanib o'tish noto'g'ri —
       * qolaversa zaxira rejim ham har javobda AI ga pul turadi.
       *
       * Shuning uchun bu yerda `onZaxira` CHAQIRILMAYDI: o'quvchiga
       * chegara haqida ochiq aytiladi va u dars bilan davom etadi.
       */
      if (m.type === 'error' && m.kod === 'kvota') {
        tozala();
        setXatoMatn(m.xato ?? 'Suhbat chegarasi tugadi.');
        setHolat('kvota');
        return;
      }

      if (m.type === 'error') {
        tozala();
        setHolat('xato');
        onZaxira(m.xato ?? 'jonli suhbat xatosi');
        return;
      }

      if (m.type === 'end') {
        if (m.sabab && m.sabab !== 'vaqt tugadi' && m.sabab !== "o'quvchi yopdi") {
          tozala(); setHolat('xato');
          onZaxira('Jonli ulanish uzildi. Ovozli javob rejimida davom eting.');
          return;
        }
        mikRef.current?.toxtat();
        ws.onclose = null;
        // Let already received speech finish before navigating away.
        ovoz.whenDrained(() => {
          if (!active()) return;
          tozala(); setGapiryapti(false); setHolat('tugadi');
        });
      }
    };

    ws.onerror = () => {
      tozala();
      setHolat('xato');
      onZaxira('ulanib bo\'lmadi');
    };

    ws.onclose = () => {
      if (!active()) return;
      tozala(); setHolat('xato');
      onZaxira('Jonli ulanish uzildi. Ovozli javob rejimida davom eting.');
    };
  }, [token, mavzu, savollar, kun, onZaxira, tozala]);

  const yakunla = useCallback(() => {
    try { wsRef.current?.send(JSON.stringify({ type: 'end' })); } catch { /* yopiq */ }
    tozala();
    setHolat('tugadi');
  }, [tozala]);

  /*
   * TESKARI HISOB.
   *
   * Faqat suhbat jonli ketayotganda yuradi. Sessiyani serverning o'zi
   * yopadi — bu yerdagi son shunchaki ko'rsatkich, u nolga tushgani bilan
   * hech narsani to'xtatmaydi.
   */
  useEffect(() => {
    if (holat !== 'jonli') return;
    const id = window.setInterval(() => {
      setQoldi((q) => (q === null ? null : Math.max(0, q - 1)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [holat]);

  /*
   * Suhbat tugagach dars O'ZI testga o'tadi.
   *
   * Oqim uzilmasligi kerak: tushuntirish -> suhbat -> test -> vazifalar.
   * Ilgari bu yerda "Testga o'tish" tugmasi kutib turardi va dars shu yerda
   * to'xtab qolardi. Tugma qoldi — kutmoqchi bo'lmagan bosib o'tadi.
   */
  useEffect(() => {
    if (holat !== 'tugadi') return;
    const id = window.setTimeout(() => onTugadi(), 1800);
    return () => window.clearTimeout(id);
    // `onTugadi` har renderda yangi funksiya — deps'ga qo'shilsa taymer
    // qayta-qayta nolga tushardi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holat]);

  /*
   * SUHBAT O'ZI BOSHLANADI — tugma bosish shart emas.
   *
   * Ilgari bu yerda "Suhbatni boshlash" ekrani turardi va o'quvchi mikrofonni
   * qo'lda yoqishi kerak edi. Bu ortiqcha qadam: o'quvchi bu bosqichga
   * ALLAQACHON darsdagi tugmani bosib keldi, ya'ni niyati aniq.
   *
   * Brauzer talabi buzilmaydi: mikrofonga ruxsat so'rash uchun sahifada
   * foydalanuvchi harakati bo'lishi kifoya, u esa oldingi bosqichda
   * ("Keyingisi" bosilganda) sodir bo'lgan. Ruxsat berilmasa `boshla`
   * o'zi `onZaxira` ni chaqiradi va dars zaxira rejimda davom etadi —
   * ya'ni xato holatda ham o'quvchi kundan chiqib keta oladi.
   *
   * `useRef` bilan bir marta: `boshla` qayta yaratilganda effekt takror
   * ishlab, ikkinchi ulanish ochilib ketmasin.
   */
  const startRef = useRef(boshla);
  startRef.current = boshla;
  useEffect(() => {
    // Deferral lets StrictMode cleanup cancel the first mount before it opens audio.
    const timer = window.setTimeout(() => void startRef.current(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  /* ------------------------------ Ko'rinish ------------------------------ */

  /*
   * `kutmoqda` endi ko'zga ko'rinmas oraliq: yuqoridagi effekt suhbatni
   * darhol boshlaydi. Ekran baribir bo'sh qolmasligi uchun qisqa izoh
   * turadi — ulanish bir necha yuz millisekund davom etadi.
   */
  if (holat === 'kutmoqda') {
    return (
      <div className="rounded-[20px] bg-[#F7F5FE] p-4 text-center">
        <p className="text-[15px] font-bold leading-snug text-[#2D1B69]">
          Endi ustoz bilan jonli suhbat
        </p>
        <p className="mx-auto mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-[#7A6C9E]">
          Mavzu bo'yicha <b className="font-bold text-[#5B3FA8]">5 daqiqalik erkin
          suhbat</b>. Ustoz savolini tugatgach javob bering. Mikrofon
          javobingizni avtomatik qabul qiladi.
        </p>
        <p className="mt-3.5 inline-flex items-center justify-center gap-2 text-[13px] font-bold text-[#5B3FA8]">
          <Loader2 size={15} className="animate-spin" /> Mikrofon yoqilmoqda…
        </p>
      </div>
    );
  }

  if (holat === 'kvota') {
    return (
      <div className="rounded-[20px] bg-[#FFF7ED] p-4 text-center">
        <p className="text-[14px] font-bold leading-snug text-[#9A3412]">{xatoMatn}</p>
        <p className="mx-auto mt-1.5 max-w-[300px] text-[12.5px] leading-relaxed text-[#B45309]">
          Dars va mashqlar ochiq — davom etavering.
        </p>
        <button
          type="button"
          onClick={onTugadi}
          className="mt-3.5 inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-[#5B3FA8] px-4 text-[14px] font-bold text-white transition active:scale-[0.98]"
        >
          Davom etish
        </button>
      </div>
    );
  }

  if (holat === 'tugadi') {
    return (
      <div className="rounded-[20px] bg-[#F7F5FE] p-4 text-center">
        <p className="text-[15px] font-bold text-[#2D1B69]">Suhbat tugadi</p>
        <button
          type="button"
          onClick={onTugadi}
          className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-[#5B3FA8] px-4 text-[14px] font-bold text-white transition active:scale-[0.98]"
        >
          {keyingiNomi}
        </button>
      </div>
    );
  }

  /*
   * BITTA EKRAN — YOZUVSIZ.
   *
   * Ilgari bu yerda suhbat transkripti chiqib turardi. U ikki narsani
   * buzardi: o'quvchi ustozni TINGLASH o'rniga ekranni O'QIY boshlardi,
   * va har javobda ro'yxat uzayib sahifa o'zi siljib ketardi.
   *
   * Endi ekranda faqat USTOZNING O'ZI turadi. Nima bo'layotgani
   * harakat orqali ko'rinadi: ustoz gapirganda orqasidagi halqa
   * to'lqinlanadi, tinglayotganda mikrofon darajasi jonlanadi.
   */
  const jonli = holat === 'jonli';

  return (
    <div className="flex flex-col items-center">
      {/* Ustoz — yagona ko'rgazmali element */}
      <div className="relative flex h-[210px] w-full items-end justify-center">
        {/* Gapirayotganda tarqaladigan halqalar */}
        {gapiryapti
          ? [0, 1].map((i) => (
              <motion.span
                key={i}
                className="absolute bottom-6 h-[130px] w-[130px] rounded-full bg-[#5B3FA8]/12"
                animate={{ scale: [0.85, 1.5], opacity: [0.55, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.9, ease: 'easeOut' }}
              />
            ))
          : null}

        {/*
          Tinglayotganda halqa o'quvchining OVOZIGA qarab kengayadi —
          mikrofon ishlayotgani shu bilan bilinadi.
        */}
        {jonli && !gapiryapti ? (
          <span
            className="absolute bottom-6 rounded-full bg-[#5B3FA8]/10 transition-transform duration-100"
            style={{
              height: 130,
              width: 130,
              transform: `scale(${(0.8 + Math.min(0.45, daraja * 2.2)).toFixed(3)})`,
            }}
          />
        ) : null}

        <motion.img
          src="/app-mobile/images/ustoz/robot.png"
          alt=""
          aria-hidden
          draggable={false}
          className="relative h-[196px] w-auto select-none object-contain drop-shadow-[0_18px_28px_rgba(45,27,105,0.22)]"
          animate={gapiryapti ? { y: [0, -6, 0] } : { y: 0 }}
          transition={gapiryapti ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
        />
      </div>

      {/* Holat — bir qator, o'qishga majburlamaydigan qisqa yozuv */}
      <div className="mt-1 flex items-center gap-2">
        {holat === 'ulanmoqda' ? <Loader2 size={15} className="animate-spin text-[#5B3FA8]" /> : null}
        <p className="text-[15px] font-black leading-none text-[#2D1B69]">
          {holat === 'ulanmoqda' ? 'Ustoz ulanmoqda…' : gapiryapti ? 'Ustoz gapiryapti' : 'Sizni tinglayapti'}
        </p>
      </div>

      {jonli && <p className="mt-2 text-center text-xs text-[#7A6C9E]">{gapiryapti ? 'Savolni tinglang — mikrofon vaqtincha jim.' : 'Savol tugagach, javobingizni ayting.'}</p>}
      {jonli && qoldi !== null ? (
        <span
          className={`mt-2 rounded-full px-3 py-1 text-[12.5px] font-black tabular-nums ${
            qoldi <= 30 ? 'bg-[#FEF3E2] text-[#B45309]' : 'bg-[#EDE9FB] text-[#5B3FA8]'
          }`}
          title="Suhbat tugashiga qolgan vaqt"
        >
          {Math.floor(qoldi / 60)}:{String(qoldi % 60).padStart(2, '0')}
        </span>
      ) : null}

      {holat === 'ulanmoqda' && <button type="button" className="mt-3 min-h-[44px] rounded-xl bg-[#5B3FA8] px-5 text-sm font-bold text-white" onClick={() => { void ovozRef.current?.tayyorla().catch(() => {}); }}>
        Ovozni yoqish
      </button>}
      <button
        type="button"
        onClick={yakunla}
        className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-[#DDD7F5] px-4 text-[14px] font-bold text-[#5B3FA8] transition active:scale-[0.98]"
      >
        <PhoneOff size={16} /> Suhbatni tugatish
      </button>
    </div>
  );
}
