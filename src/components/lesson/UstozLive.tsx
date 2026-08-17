import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Mic, PhoneOff, Volume2 } from 'lucide-react';
import { apiUrl } from '../../api';
import { MikrofonOqimi, OvozNavbati } from '../../utils/liveAudio';

/**
 * UstozLive — doskadagi JONLI ovozli savol-javob.
 *
 * Oddiy savol-javobdan farqi: mikrofon uzluksiz ochiq turadi va ustozning
 * ovozi oqim bo'lib keladi. O'quvchi ustozning gapini bo'lib savol bera oladi
 * — bunda ustoz darhol jim bo'ladi (`interrupted`), xuddi tirik suhbatdagidek.
 *
 * Ulanib bo'lmasa `onZaxira` chaqiriladi va doska eski, yozib-yuborish
 * usuliga qaytadi — jonli suhbat qo'shimcha imkoniyat, darsni to'xtatib
 * qo'ymasligi kerak.
 */

type Gap = { kim: 'ustoz' | 'oquvchi'; matn: string };
type Holat = 'kutmoqda' | 'ulanmoqda' | 'jonli' | 'tugadi' | 'xato';

type Props = {
  token: string | null;
  mavzu: string;
  savollar: string[];
  /** Suhbat tugadi — doska keyingi bosqichga o'tadi. */
  onTugadi: () => void;
  /** Jonli rejim ishlamadi — eski usulga qaytish kerak. */
  onZaxira: (sabab: string) => void;
};

export default function UstozLive({ token, mavzu, savollar, onTugadi, onZaxira }: Props) {
  const [holat, setHolat] = useState<Holat>('kutmoqda');
  const [gaplar, setGaplar] = useState<Gap[]>([]);
  const [gapiryapti, setGapiryapti] = useState(false);
  const [daraja, setDaraja] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const mikRef = useRef<MikrofonOqimi | null>(null);
  const ovozRef = useRef<OvozNavbati | null>(null);
  // Joriy navbatdagi matn bo'laklab keladi, shuning uchun to'planib boriladi.
  const joriyRef = useRef<{ ustoz: string; oquvchi: string }>({ ustoz: '', oquvchi: '' });
  const oxiriRef = useRef(document.createElement('div'));

  const tozala = useCallback(() => {
    try { wsRef.current?.close(); } catch { /* allaqachon yopiq */ }
    wsRef.current = null;
    mikRef.current?.toxtat();
    mikRef.current = null;
    ovozRef.current?.yop();
    ovozRef.current = null;
  }, []);

  useEffect(() => tozala, [tozala]);

  /** Bo'lak matnni joriy navbatga qo'shadi va ekranda yangilaydi. */
  const matnQosh = useCallback((kim: 'ustoz' | 'oquvchi', bolak: string) => {
    joriyRef.current[kim] += bolak;
    const toliq = joriyRef.current[kim];
    setGaplar((oldin) => {
      const nusxa = [...oldin];
      const oxirgi = nusxa[nusxa.length - 1];
      // Bir kishining ketma-ket bo'laklari bitta xabarga yig'iladi.
      if (oxirgi && oxirgi.kim === kim) nusxa[nusxa.length - 1] = { kim, matn: toliq };
      else nusxa.push({ kim, matn: toliq });
      return nusxa;
    });
  }, []);

  const boshla = useCallback(async () => {
    if (!token) { onZaxira('token yo\'q'); return; }
    setHolat('ulanmoqda');
    setGaplar([]);
    joriyRef.current = { ustoz: '', oquvchi: '' };

    // Ovoz kontekstini foydalanuvchi bosgan paytda ochamiz: brauzerlar
    // avtomatik ijroni faqat shu holatda ruxsat beradi.
    const ovoz = new OvozNavbati();
    try {
      await ovoz.tayyorla();
    } catch {
      setHolat('xato');
      onZaxira('ovoz chiqishini ochib bo\'lmadi');
      return;
    }
    ovozRef.current = ovoz;

    const asos = apiUrl('/api/ustoz/live').replace(/^http/, 'ws');
    const ws = new WebSocket(`${asos}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'start', mavzu, savollar }));
    };

    ws.onmessage = async (e) => {
      let m: { type?: string; kim?: string; matn?: string; data?: string; sabab?: string; xato?: string };
      try { m = JSON.parse(e.data); } catch { return; }

      if (m.type === 'ready') {
        setHolat('jonli');
        // Ustoz gapira boshlagach mikrofon ochiladi. Aks-sado bostirish
        // yoqilgani uchun ustozning o'z ovozi mikrofonga qaytmaydi.
        try {
          const mik = new MikrofonOqimi();
          await mik.boshla((b64) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'audio', data: b64 }));
            }
            setDaraja(mik.daraja);
          });
          mikRef.current = mik;
        } catch {
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

      if (m.type === 'text' && m.matn) {
        matnQosh(m.kim === 'oquvchi' ? 'oquvchi' : 'ustoz', m.matn);
        return;
      }

      if (m.type === 'turnComplete') {
        joriyRef.current = { ustoz: '', oquvchi: '' };
        return;
      }

      if (m.type === 'error') {
        tozala();
        setHolat('xato');
        onZaxira(m.xato ?? 'jonli suhbat xatosi');
        return;
      }

      if (m.type === 'end') {
        tozala();
        setHolat('tugadi');
      }
    };

    ws.onerror = () => {
      tozala();
      setHolat('xato');
      onZaxira('ulanib bo\'lmadi');
    };

    ws.onclose = () => {
      mikRef.current?.toxtat();
      mikRef.current = null;
      setHolat((h) => (h === 'jonli' || h === 'ulanmoqda' ? 'tugadi' : h));
    };
  }, [token, mavzu, savollar, matnQosh, onZaxira, tozala]);

  const yakunla = useCallback(() => {
    try { wsRef.current?.send(JSON.stringify({ type: 'end' })); } catch { /* yopiq */ }
    tozala();
    setHolat('tugadi');
  }, [tozala]);

  useEffect(() => {
    oxiriRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [gaplar]);

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

  /* ------------------------------ Ko'rinish ------------------------------ */

  if (holat === 'kutmoqda') {
    return (
      <div className="rounded-[20px] bg-[#F7F5FE] p-4 text-center">
        <p className="text-[15px] font-bold leading-snug text-[#2D1B69]">
          Endi ustoz bilan jonli suhbat
        </p>
        <p className="mx-auto mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-[#7A6C9E]">
          Mavzu bo'yicha ovoz orqali savol-javob qilasiz. Ustozning gapini bo'lib
          savol bersangiz ham bo'ladi — u sizni eshitib to'xtaydi.
        </p>
        <button
          type="button"
          onClick={() => void boshla()}
          className="mt-3.5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-[#5B3FA8] px-4 text-[14px] font-bold text-white transition active:scale-[0.98]"
        >
          <Mic size={17} /> Suhbatni boshlash
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
          Testga o'tish
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Holat chizig'i */}
      <div className="flex items-center gap-2.5 rounded-2xl bg-[#F7F5FE] px-3.5 py-2.5">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#EDE9FB] text-[#5B3FA8]">
          {holat === 'ulanmoqda' ? <Loader2 size={15} className="animate-spin" /> : <Volume2 size={15} strokeWidth={2.4} />}
          {gapiryapti ? (
            <motion.span
              className="absolute inset-0 rounded-xl border-2 border-[#5B3FA8]"
              animate={{ opacity: [0.7, 0, 0.7], scale: [1, 1.25, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          ) : null}
        </span>

        <p className="min-w-0 flex-1 text-[13px] font-bold leading-snug text-[#2D1B69]">
          {holat === 'ulanmoqda' ? 'Ustoz ulanmoqda…' : gapiryapti ? 'Ustoz gapiryapti' : 'Sizni tinglayapti'}
        </p>

        {/* Mikrofon darajasi — o'quvchi ovozi yetib borayotganini ko'rsatadi. */}
        {holat === 'jonli' ? (
          <span className="flex h-6 items-end gap-[3px]">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-[#5B3FA8] transition-[height] duration-100"
                style={{ height: `${Math.max(4, Math.min(22, daraja * 70 * (1 - i * 0.18)))}px` }}
              />
            ))}
          </span>
        ) : null}
      </div>

      {/* Suhbat yozuvi */}
      <div className="mt-3 space-y-2.5">
        {gaplar.map((g, i) => (
          g.kim === 'ustoz' ? (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#EDE9FB] text-[#5B3FA8]">
                <Volume2 size={15} strokeWidth={2.4} />
              </span>
              <p className="rounded-2xl rounded-tl-md bg-[#F7F5FE] px-3.5 py-3 text-[14px] leading-relaxed text-[#2D1B69]">
                {g.matn}
              </p>
            </div>
          ) : (
            <p key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-[#EDE9FB] px-3.5 py-3 text-[14px] leading-snug text-[#2D1B69]">
              {g.matn}
            </p>
          )
        ))}
        <div ref={(el) => { if (el) oxiriRef.current = el; }} />
      </div>

      <button
        type="button"
        onClick={yakunla}
        className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-[#DDD7F5] px-4 text-[14px] font-bold text-[#5B3FA8] transition active:scale-[0.98]"
      >
        <PhoneOff size={16} /> Suhbatni tugatish
      </button>
    </div>
  );
}
