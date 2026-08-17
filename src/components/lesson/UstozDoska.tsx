/**
 * UstozDoska — grammatika bo'limidagi jonli dars.
 *
 * OQIM (bosqichma-bosqich, avtomatik):
 *   1. TUSHUNTIRISH — mavzu ovoz bilan qismlab tushuntiriladi, har qism
 *      tugagach keyingisiga o'zi o'tadi.
 *   2. SUHBAT — ustoz og'zaki savol beradi, o'quvchi mikrofon orqali javob
 *      beradi, ustoz baholab ovoz bilan javob qaytaradi. Ikkala tomon ovozli.
 *   3. TEST — nazorat savoli va qo'shimcha mashq.
 *
 * Dars mavzu ochilishi bilan O'ZI boshlanadi — qo'shimcha tugma yo'q.
 *
 * OVOZ: server TTS'i qisqa matnga mo'ljallangan (`tts.service.ts`, 200 belgi),
 * shuning uchun nutq gaplar chegarasidan bo'laklab o'qiladi.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Send,
  Square,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { pauseSpeaking, prefetchSpeech, resumeSpeaking, speakText, stopSpeaking } from '../../utils/speak';
// Bo'laklagich SERVER bilan umumiy: server ovozni oldindan aynan shu
// bo'laklar bo'yicha tayyorlaydi, shunda klient keshdan darhol oladi.
import { darsNutqRejasi, nutqBolaklari, type NutqQadam } from '../../../shared/nutqBolaklari';
import UstozLive from './UstozLive';
import UstozDoskaSahna from './UstozDoskaSahna';
import { doskaKvota, type DoskaKvota } from '../../api/ustozDoska';
import {
  buildDoskaExercise,
  buildDoskaLesson,
  suhbatJavobi,
  type DoskaBaho,
  type DoskaDars,
  type DoskaMashq,
  type DoskaTestSavol,
  type DoskaVazifa,
} from '../../api/ustozDoska';

type Props = {
  mavzu: string;
  nazariya?: string;
  kun?: number;
  vazifalar?: DoskaVazifa[];
  /**
   * Yakuniy testning savollari — kunning O'Z bazasidan. Model bittagina
   * nazorat savoli qaytaradi, dars esa shu ro'yxat bilan to'liq testga
   * aylanadi (kamida olti savol).
   */
  testSavollari?: DoskaTestSavol[];
  /**
   * DARS TUGAGACH KEYINGI BOSQICHGA O'TKAZADI.
   *
   * Dars test bilan tugab, ekranda "Dars yakunlandi" yozuvi va faqat
   * "Qaytadan ko'rish" tugmasi qolardi — o'quvchi uchun kun SHU YERDA
   * tugagandek edi. Aslida undan keyin "Ustozdan so'ra" va mashqlar bor;
   * ularga o'tish faqat tepadagi kichkina yozuvda turardi va ko'rinmasdi.
   */
  onTugadi?: () => void;
  /** Keyingi bosqichning nomi — yakundagi tugmada ko'rinadi. */
  keyingiNomi?: string;
  /**
   * SAHIFANING "←" TUGMASI UCHUN.
   *
   * Dars to'liq ekranda ochiladi va tepadagi "←" ilgari grammatikadan
   * butunlay chiqarib yuborardi. Endi u avval shu yerga qo'yilgan
   * funksiyani chaqiradi: dars bir bosqich ortga qaytadi va `true`
   * qaytariladi. Dars eng boshida bo'lsa `false` — o'shanda sahifa
   * o'zini yopadi.
   */
  ortgaRef?: MutableRefObject<(() => boolean) | null>;
  /**
   * TO'LIQ EKRAN — tushuntirish bosqichi butun ekranni egallaydi.
   *
   * Sahifada doskadan tashqarida hech narsa qolmaydi (mavzu sarlavhasi ham),
   * boshqaruv tugmalari esa doskaning USTIDA suzib turadi. Telefonda dars
   * shunda "taqdimot" bo'lib ko'rinadi va matn uchun eng ko'p joy qoladi.
   */
  toliqEkran?: boolean;
  /**
   * Darsning eng boshida "Ortga" bosilganda sahifadan chiqarish.
   * Berilmasa, birinchi bosqichda tugma o'chiq turadi.
   */
  onChiqish?: () => void;
};

/** Darsning bosqichlari. */
type Faza = 'tushuntirish' | 'suhbat' | 'test' | 'yakun';

const FAZA_NOMI: Record<Faza, string> = {
  tushuntirish: 'Tushuntirish',
  suhbat: 'Savol-javob',
  test: 'Test',
  yakun: 'Yakun',
};

/**
 * Doskaning ovozi — muloyim va tiniq "ustoz" ohangi.
 *
 * Doskada BITTA ovoz bo'lishi kerak: tushuntirish o'zbekcha, misollar ruscha,
 * ammo ikkisi turli ovozda chalinsa dars uzuq-yuluq eshitiladi. Lug'at
 * kartochkalari bunga tegmaydi — ular eski ovozida qoladi.
 */
const DOSKA_OHANG = 'ustoz' as const;
/** Tushuntirish — tabiiy nutq tezligi; pastroq qiymatda ovoz cho'ziladi. */
const NUTQ_TEZLIGI = 1.0;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve((r.result as string).split(',')[1] ?? '');
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export default function UstozDoska({
  mavzu,
  nazariya,
  kun,
  vazifalar,
  testSavollari,
  onTugadi,
  keyingiNomi,
  ortgaRef,
  toliqEkran = false,
  onChiqish,
}: Props) {
  const { token } = useAuth();
  const recorder = useVoiceRecorder();

  const [dars, setDars] = useState<DoskaDars | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [faza, setFaza] = useState<Faza>('tushuntirish');
  const [step, setStep] = useState(0);
  const [savolIdx, setSavolIdx] = useState(0);
  const [baho, setBaho] = useState<DoskaBaho | null>(null);
  const [baholanmoqda, setBaholanmoqda] = useState(false);

  const [testJavoblar, setTestJavoblar] = useState<Record<number, number>>({});
  const [mashq, setMashq] = useState<DoskaMashq | null>(null);
  const [mashqJavoblar, setMashqJavoblar] = useState<Record<number, number>>({});

  /**
   * Jonli suhbat (Gemini Live). Ishlamasa `zaxiraSuhbat` yoqiladi va suhbat
   * eski usulda — yozib yuborish orqali — davom etadi.
   */
  const [zaxiraSuhbat, setZaxiraSuhbat] = useState(false);

  /**
   * Qolgan savol soni. Ekranda ko'rsatiladi, chunki chegaraga urilib qolgan
   * o'quvchi nima uchun javob kelmayotganini bilmasa, dastur buzilgan deb
   * o'ylaydi.
   */
  const [kvota, setKvota] = useState<DoskaKvota | null>(null);

  const [ovozOchiq, setOvozOchiq] = useState(true);
  const [oqilmoqda, setOqilmoqda] = useState(false);
  /** Dars to'xtatib turilgan — ovoz ham, avtomatik o'tish ham muzlaydi. */
  const [pauza, setPauza] = useState(false);
  /**
   * Bir bosqichni QAYTA eshitish uchun hisoblagich. Bosqich raqami
   * o'zgarmagani uchun effekt o'zi qayta ishga tushmaydi — shu son o'zgarsa
   * tushuntirish boshidan o'qiladi.
   */
  const [takror, setTakror] = useState(0);
  /** Ovoz serverda tayyorlanmoqda — doskada belgisi turadi. */
  const [tayyorlanmoqda, setTayyorlanmoqda] = useState(false);
  /**
   * Doskada shu satrgacha yozilgan (0 — sarlavha/tushuntirish, 1 — qoida,
   * 2+ — misollar). Ovoz qaysi satrni o'qiyotgan bo'lsa, o'sha satr ochiladi.
   */
  const [ochiqSatr, setOchiqSatr] = useState(-1);
  /** Ayni damda o'qilayotgan satr — doskada ajratib ko'rsatiladi. */
  const [faolSatr, setFaolSatr] = useState(-1);
  // Har ijro uchun token: bosqich almashsa eski ovoz davom etmasin.
  const ijroRef = useRef(0);
  const boshlandiRef = useRef(false);

  const bosqichlar = dars?.bosqichlar ?? [];
  const savollar = dars?.savollar ?? [];
  const joriy = bosqichlar[step];
  const joriySavol = savollar[savolIdx];

  /**
   * YAKUNIY TEST savollari.
   *
   * Ilgari bu yerda modelning BITTA nazorat savoli turardi — o'quvchi darsni
   * bir savol bilan tugatardi va mavzu mustahkamlanmasdi. Endi asosini kunning
   * o'z bazasi tashkil qiladi (har kunda 10-20 ta tekshirilgan savol bor),
   * model savoli esa oxiriga qo'shiladi: uning izohi foydali, ammo yolg'iz
   * o'zi yetarli emas va xato bo'lishi ham mumkin.
   */
  const testSavollar = useMemo<DoskaTestSavol[]>(() => {
    const out: DoskaTestSavol[] = [];
    const korilgan = new Set<string>();

    for (const q of testSavollari ?? []) {
      const savol = String(q.savol ?? '').trim();
      const variantlar = (q.variantlar ?? []).map((v) => String(v ?? '').trim());
      if (!savol || variantlar.length < 2 || korilgan.has(savol)) continue;
      if (q.togriIndex < 0 || q.togriIndex >= variantlar.length) continue;
      korilgan.add(savol);
      out.push({ savol, variantlar, togriIndex: q.togriIndex, izoh: q.izoh });
    }

    const n = dars?.nazorat;
    if (n && String(n.savol ?? '').trim() && !korilgan.has(String(n.savol).trim())) {
      out.push({
        savol: String(n.savol).trim(),
        variantlar: n.variantlar.map(String),
        togriIndex: n.togriIndex,
        izoh: n.izoh,
      });
    }

    return out;
  }, [testSavollari, dars?.nazorat]);

  const testTogri = testSavollar.filter((q, i) => testJavoblar[i] === q.togriIndex).length;
  const testJavobBerilgan = Object.keys(testJavoblar).length;

  /* ---------------- Ovoz ---------------- */

  /**
   * Rejani ketma-ket o'qiydi; tugagach `keyin` chaqiriladi.
   *
   * Har qadam doskadagi o'z satrini bildiradi: shu satr aynan o'qilayotgan
   * paytda ochiladi va ajratib turiladi — ustoz nimani aytayotgan bo'lsa,
   * o'quvchi doskada o'shani ko'radi.
   */
  const rejaniOqi = useCallback(
    (reja: NutqQadam[], keyin?: () => void) => {
      ijroRef.current += 1;
      const tk = ijroRef.current;
      const bolaklar = reja.map((q) => q.matn);
      if (!bolaklar.length || !ovozOchiq) {
        // Ovoz o'chiq bo'lsa ham doska to'liq ko'rinishi kerak.
        setOchiqSatr(Number.MAX_SAFE_INTEGER);
        setFaolSatr(-1);
        keyin?.();
        return;
      }

      setOqilmoqda(true);
      const yur = (i: number) => {
        if (ijroRef.current !== tk) return;
        if (i >= bolaklar.length) {
          setOqilmoqda(false);
          setTayyorlanmoqda(false);
          setFaolSatr(-1);
          keyin?.();
          return;
        }
        // Birinchi bo'lak hali kelmagan bo'lsa — doskada "tayyorlanmoqda" turadi.
        setTayyorlanmoqda(true);
        const satr = reja[i].satr;
        setFaolSatr(satr);
        setOchiqSatr((oldingi) => Math.max(oldingi, satr));
        void speakText(bolaklar[i], {
          token,
          lang: 'uz-UZ',
          ohang: DOSKA_OHANG,
          speed: NUTQ_TEZLIGI,
          // Dars ovozi bir xil bo'lsin: server ovozi kelmasa ham brauzerning
          // robot ovoziga o'tmaydi.
          zaxira: false,
          onEnd: () => yur(i + 1),
        }).then(() => {
          if (ijroRef.current !== tk) return;
          setTayyorlanmoqda(false);
          /*
           * Keyingi bo'lak SHU bo'lak chalina boshlagach yuklanadi.
           *
           * Ilgari u oldinroq so'ralardi va serverdagi navbatda BIRINCHI
           * bo'lakdan oldinga tushib qolardi — dars gapirishni boshlashi
           * uchun ikkita ovoz tayyorlanishini kutish kerak bo'lardi.
           */
          if (bolaklar[i + 1]) {
            prefetchSpeech(bolaklar[i + 1], {
              token,
              lang: 'uz-UZ',
              ohang: DOSKA_OHANG,
              speed: NUTQ_TEZLIGI,
            });
          }
        });
      };
      yur(0);
    },
    [token, ovozOchiq],
  );

  /** Oddiy matnni o'qish (savol, izoh, xulosa) — doska satrlariga bog'liq emas. */
  const oqi = useCallback(
    (matn: string, keyin?: () => void) => {
      rejaniOqi(
        nutqBolaklari(matn).map((b) => ({ matn: b, satr: -1 })),
        keyin,
      );
    },
    [rejaniOqi],
  );

  const toxtat = useCallback(() => {
    ijroRef.current += 1;
    setOqilmoqda(false);
    setTayyorlanmoqda(false);
    setFaolSatr(-1);
    setPauza(false);
    stopSpeaking();
  }, []);

  useEffect(() => () => { ijroRef.current += 1; stopSpeaking(); }, []);

  /* ---------------- Dars avtomatik boshlanadi ---------------- */

  const darsniBoshla = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setFaza('tushuntirish');
    setStep(0);
    setSavolIdx(0);
    setBaho(null);
    setTestJavoblar({});
    setMashq(null);
    setMashqJavoblar({});
    try {
      setDars(await buildDoskaLesson(token, { mavzu, nazariya, kun, vazifalar }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ustoz darsni tayyorlay olmadi");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, mavzu, nazariya, kun]);

  // Mavzu ochilishi bilan dars o'zi boshlanadi (bir marta).
  useEffect(() => {
    if (boshlandiRef.current || !token) return;
    boshlandiRef.current = true;
    void darsniBoshla();
  }, [token, darsniBoshla]);

  /* ---------------- 1. Tushuntirish: o'qiydi va o'zi davom etadi ---------------- */

  /**
   * Bosqich oxiridan oshib ketsa (masalan "Keyingisi" tez-tez bosilganda),
   * doska bo'sh qolib ketmasin — keyingi fazaga o'tkazamiz.
   */
  useEffect(() => {
    if (faza !== 'tushuntirish' || !dars) return;
    if (step >= bosqichlar.length) setFaza(savollar.length ? 'suhbat' : 'test');
  }, [faza, step, dars, bosqichlar.length, savollar.length]);

  useEffect(() => {
    if (faza !== 'tushuntirish' || !joriy) return;
    // Yangi bosqich — doska toza, satrlar ovoz bilan birga ochiladi.
    setOchiqSatr(-1);
    setFaolSatr(-1);
    rejaniOqi(darsNutqRejasi(joriy), () => {
      /*
       * Ovoz o'chiq bo'lsa AVTOMATIK o'tish yo'q.
       *
       * Ilgari o'quvchi ovozni o'chirsa, `rejaniOqi` darhol "tugadi" deb
       * xabar berardi va bosqichlar bir zumda oxirigacha yugurib ketardi —
       * tushuntirishni o'qishga ham ulgurmasdi. Endi jim rejimda bosqichni
       * o'quvchining o'zi almashtiradi.
       */
      if (!ovozOchiq) return;
      if (step < bosqichlar.length - 1) setStep((s) => s + 1);
      else setFaza(savollar.length ? 'suhbat' : 'test');
    });
    // Bosqich almashsa: zanjir ham, chalinayotgan (va yo'ldagi) ovoz ham to'xtaydi.
    return () => {
      ijroRef.current += 1;
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faza, step, dars, takror]);

  /* ---------------- 2. Suhbat: ustoz savolni ovoz bilan beradi ---------------- */

  useEffect(() => {
    // Jonli rejimda savolni ustozning o'zi Live oqimida beradi — bu yerda
    // qayta o'qilsa, ikkita ovoz ustma-ust tushardi.
    if (faza !== 'suhbat' || !joriySavol || !zaxiraSuhbat) return;
    setBaho(null);
    recorder.reset();
    oqi(joriySavol);
    return () => {
      ijroRef.current += 1;
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faza, savolIdx, dars, zaxiraSuhbat]);

  // Yozuv tugadi -> transkripsiya + baho -> ustoz ovoz bilan javob qaytaradi.
  useEffect(() => {
    if (!recorder.audioBlob || recorder.isRecording || !token || !joriySavol) return;
    const blob = recorder.audioBlob;
    let bekor = false;

    (async () => {
      setBaholanmoqda(true);
      setError(null);
      try {
        const audioBase64 = await blobToBase64(blob);
        const r = await suhbatJavobi(token, {
          savol: joriySavol,
          mavzu,
          audioBase64,
          mimeType: blob.type || 'audio/webm',
        });
        if (bekor) return;
        setBaho(r);
        oqi(r.izoh);
      } catch (e) {
        if (!bekor) setError(e instanceof Error ? e.message : 'Javobni baholab bo‘lmadi');
      } finally {
        if (!bekor) { setBaholanmoqda(false); recorder.reset(); }
      }
    })();

    return () => { bekor = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.audioBlob, recorder.isRecording, token]);

  // Suhbat bosqichiga o'tganda qolgan savol sonini olamiz.
  useEffect(() => {
    if (faza !== 'suhbat' || !token) return;
    let bekor = false;
    void doskaKvota(token).then((k) => { if (!bekor) setKvota(k); });
    return () => { bekor = true; };
  }, [faza, token, savolIdx]);

  function keyingiSavol() {
    toxtat();
    if (savolIdx < savollar.length - 1) setSavolIdx((i) => i + 1);
    else setFaza('test');
  }

  /* ---------------- Boshqaruv: pauza, ortga, qayta eshitish ---------------- */

  /**
   * PAUZA / DAVOM ETISH.
   *
   * `toxtat()` dan farqi bor: u ovozni butunlay tashlaydi, bu esa aynan shu
   * joyda muzlatib turadi — davom etilganda gap yarmidan boshlanmaydi.
   */
  function pauzaAlmashtir() {
    if (pauza) {
      setPauza(false);
      resumeSpeaking();
    } else {
      setPauza(true);
      pauseSpeaking();
    }
  }

  /**
   * ORTGA — tushunmay qolgan joyni qayta eshitish uchun.
   *
   * Dars faqat oldinga yurardi: bir bosqich o'tib ketsa, uni qayta ko'rishning
   * yagona yo'li darsni boshidan boshlash edi. Endi har bosqich va har faza
   * bo'ylab ortga qaytish mumkin.
   */
  function ortga() {
    toxtat();
    if (faza === 'tushuntirish') {
      if (step > 0) setStep((s) => s - 1);
      return;
    }
    if (faza === 'suhbat') {
      if (zaxiraSuhbat && savolIdx > 0) { setSavolIdx((i) => i - 1); return; }
      setFaza('tushuntirish');
      setStep(Math.max(0, bosqichlar.length - 1));
      return;
    }
    if (faza === 'test') {
      if (savollar.length) { setFaza('suhbat'); setSavolIdx(Math.max(0, savollar.length - 1)); }
      else { setFaza('tushuntirish'); setStep(Math.max(0, bosqichlar.length - 1)); }
      return;
    }
    setFaza('test');
  }

  /** Joriy bosqichni boshidan qayta o'qib berish. */
  function qaytaEshit() {
    toxtat();
    setOchiqSatr(-1);
    setFaolSatr(-1);
    setTakror((n) => n + 1);
  }

  const ortgaMumkin = !(faza === 'tushuntirish' && step === 0);

  /**
   * TO'LIQ EKRANDAGI "ORTGA".
   *
   * Dars ichida bo'lsa bir bosqich ortga suradi; eng boshida bo'lsa
   * sahifadan chiqaradi. Sahifada boshqa "ortga" qolmagani uchun (mavzu
   * qatori olib tashlangan) chiqish yo'li shu tugmada bo'lishi shart.
   */
  const ortgaYokiChiqish = () => {
    if (ortgaMumkin) {
      ortga();
      return;
    }
    onChiqish?.();
  };

  /*
   * Sahifaning "←" tugmasi doskaning ichiga ulanadi. Bog'lash har renderda
   * yangilanadi — funksiya joriy bosqichni bilishi shart.
   */
  useEffect(() => {
    if (!ortgaRef) return;
    ortgaRef.current = () => {
      if (!ortgaMumkin) return false;
      ortga();
      return true;
    };
    return () => {
      ortgaRef.current = null;
    };
  });

  /* ---------------- 3. Test ---------------- */

  useEffect(() => {
    if (faza !== 'test' || !dars?.nazorat) return;
    oqi(dars.nazorat.savol);
    return () => { ijroRef.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faza, dars]);

  /**
   * TEST TUGADI -> YAKUN (avtomatik).
   *
   * Dars zanjiri o'zi oqishi kerak: tushuntirish -> savol-javob -> test ->
   * vazifalar. Ilgari oxirgi savolga javob berilgach ham ekranda "Darsni
   * yakunlash" tugmasi kutib turardi va o'quvchi kun shu yerda tugadi deb
   * o'ylardi.
   */
  useEffect(() => {
    if (faza !== 'test' || testSavollar.length === 0 || pauza) return;
    if (testJavobBerilgan < testSavollar.length) return;
    // Oxirgi javobning izohi o'qilib ulgursin.
    const id = window.setTimeout(() => setFaza('yakun'), 1600);
    return () => window.clearTimeout(id);
  }, [faza, testJavobBerilgan, testSavollar.length, pauza]);

  /**
   * YAKUN -> KEYINGI BOSQICH (avtomatik).
   *
   * Xulosa o'qib bo'lingach o'quvchi vazifalarga o'zi tushadi. Tugma ham
   * qoladi — sabri chidamagani bosib o'tib ketishi mumkin.
   */
  useEffect(() => {
    if (faza !== 'yakun' || !dars || !onTugadi) return;
    let bekor = false;
    let tid = 0;
    const otish = () => {
      if (bekor) return;
      bekor = true;
      stopSpeaking();
      onTugadi();
    };
    if (ovozOchiq) oqi(dars.xulosa, () => { tid = window.setTimeout(otish, 1400); });
    else tid = window.setTimeout(otish, 3000);
    return () => {
      bekor = true;
      window.clearTimeout(tid);
      ijroRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faza, dars, ovozOchiq]);

  async function mashqOl() {
    if (!token || mashq) return;
    try {
      setMashq(await buildDoskaExercise(token, { mavzu, nazariya }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mashq tayyorlanmadi');
    }
  }

  /* ---------------- Ko'rinish ---------------- */

  const jamiQadam = bosqichlar.length + savollar.length + 1;
  const otilgan =
    faza === 'tushuntirish' ? step
      : faza === 'suhbat' ? bosqichlar.length + savolIdx
      : jamiQadam - 1;
  const progress = useMemo(
    () => (jamiQadam > 0 ? ((otilgan + 1) / jamiQadam) * 100 : 0),
    [otilgan, jamiQadam],
  );

  if (loading) {
    return (
      <div className="rounded-[24px] border border-[#DDD7F5] bg-[color:var(--rd-white)] p-6 text-center shadow-[0_10px_28px_-14px_rgba(45,27,105,0.14)]">
        <Loader2 size={22} className="mx-auto animate-spin text-[#5B3FA8]" />
        <p className="mt-2.5 text-[14px] font-bold text-[#2D1B69]">Ustoz darsga tayyorlanmoqda…</p>
        <p className="mt-1 text-[12.5px] text-[#8B7FAB]">{mavzu}</p>
      </div>
    );
  }

  if (!dars) {
    return (
      <div className="rounded-[24px] border border-[#DDD7F5] bg-[color:var(--rd-white)] p-5 shadow-[0_10px_28px_-14px_rgba(45,27,105,0.14)]">
        <p className="text-[13px] font-semibold text-[#B91C1C]">
          {error ?? "Ustoz darsni tayyorlay olmadi"}
        </p>
        <button
          type="button"
          onClick={() => void darsniBoshla()}
          className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#5B3FA8] px-4 text-[14px] font-bold text-white transition active:scale-[0.98]"
        >
          <RotateCcw size={16} /> Qayta urinish
        </button>
      </div>
    );
  }

  /* ------------------------------------------------------------------ *
   *  TO'LIQ EKRAN — tushuntirish bosqichi
   *
   *  Ekranda faqat doska qoladi: sahifa sarlavhasi ham, oq kartochka ham
   *  yo'q. Boshqaruv doskaning USTIDA suzadi, shunda matn uchun butun
   *  balandlik bo'shaydi — telefonda dars taqdimotdek ko'rinadi.
   * ------------------------------------------------------------------ */
  if (toliqEkran && faza === 'tushuntirish' && joriy) {
    return (
      <div className="flex h-full flex-col" style={{ background: '#081419' }}>
        {/* Ekranning eng tepasidagi ingichka progress chizig'i */}
        <div className="h-[3px] w-full shrink-0" style={{ background: 'rgba(255,255,255,0.10)' }}>
          <motion.div
            className="h-full"
            style={{ background: 'linear-gradient(90deg,#F0B963,#6FC7C9)' }}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 24 }}
          />
        </div>

        <div className="relative min-h-0 flex-1">
          <UstozDoskaSahna
            toliq
            bosqich={joriy}
            speaking={oqilmoqda && ovozOchiq && !pauza}
            loading={tayyorlanmoqda && !pauza}
            kalitSavol={dars?.kalitSavol}
            ochiqSatr={ochiqSatr}
            faolSatr={faolSatr}
          />

          {/*
            Tugmalar ortidagi soya: aylantirilgan matn ularning ostidan
            o'tayotganda "kesilgan"dek emas, so'nayotgandek ko'rinadi.
          */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[calc(env(safe-area-inset-top,0px)+86px)]"
            style={{ background: 'linear-gradient(180deg, rgba(8,20,25,0.96) 0%, rgba(8,20,25,0.86) 50%, rgba(8,20,25,0) 100%)' }}
          />

          {/* Suzib turuvchi boshqaruv: chiqish, holat, pauza, ovoz */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 px-3 pt-[max(env(safe-area-inset-top),10px)]">
            <button
              type="button"
              onClick={ortgaYokiChiqish}
              className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur transition active:scale-[0.95]"
              aria-label={ortgaMumkin ? 'Oldingi bosqich' : 'Darsdan chiqish'}
            >
              <ArrowLeft size={17} />
            </button>

            <span className="flex-1" />

            {oqilmoqda || tayyorlanmoqda ? (
              <span
                className="flex items-center gap-1.5 rounded-full border border-white/12 px-2 py-1 text-[10.5px] font-semibold"
                style={{ background: 'rgba(0,0,0,0.30)', color: 'rgba(237,244,244,0.76)' }}
              >
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ background: tayyorlanmoqda && !pauza ? '#F0B963' : '#56CC97' }}
                />
                {tayyorlanmoqda && !pauza ? 'tayyorlanmoqda…' : null}
              </span>
            ) : null}

            {ovozOchiq ? (
              <button
                type="button"
                onClick={pauzaAlmashtir}
                className="pointer-events-auto flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/15 px-2.5 text-[12px] font-bold backdrop-blur transition active:scale-[0.95]"
                style={
                  pauza
                    ? { background: '#F0B963', color: '#08121C', borderColor: 'transparent' }
                    : { background: 'rgba(0,0,0,0.35)', color: '#fff' }
                }
                aria-label={pauza ? 'Darsni davom ettirish' : "Darsni to'xtatib turish"}
              >
                {pauza ? (
                  <>
                    <Play size={14} fill="currentColor" /> Davom etish
                  </>
                ) : (
                  <Pause size={16} />
                )}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                if (ovozOchiq) {
                  setOvozOchiq(false);
                  toxtat();
                  return;
                }
                setOvozOchiq(true);
                qaytaEshit();
              }}
              className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur transition active:scale-[0.95]"
              aria-label={ovozOchiq ? "Ovozni o'chirish" : 'Ovozni yoqish'}
            >
              {ovozOchiq ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>

        {/* Pastki qator: ortga, qayta eshitish va keyingi bosqich */}
        <div className="shrink-0 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
          <AnimatePresence initial={false}>
            {pauza ? (
              <motion.button
                type="button"
                key="pauza-banner-toliq"
                onClick={pauzaAlmashtir}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2 flex w-full items-center justify-center gap-1.5 overflow-hidden rounded-2xl py-2 text-[12.5px] font-bold"
                style={{ background: 'rgba(240,185,99,0.14)', color: '#F0B963' }}
              >
                <Pause size={13} fill="currentColor" /> Dars to‘xtatib turildi — davom etish uchun bosing
              </motion.button>
            ) : null}
          </AnimatePresence>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={ortga}
              disabled={step === 0}
              className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border border-white/12 text-white transition active:scale-[0.95] disabled:opacity-35"
              style={{ background: 'rgba(255,255,255,0.07)' }}
              aria-label="Oldingi bosqich"
            >
              <ArrowLeft size={18} />
            </button>

            <button
              type="button"
              onClick={qaytaEshit}
              className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border border-white/12 text-white transition active:scale-[0.95]"
              style={{ background: 'rgba(255,255,255,0.07)' }}
              aria-label="Shu bosqichni qayta eshitish"
            >
              <RotateCcw size={17} />
            </button>

            <button
              type="button"
              onClick={() => {
                toxtat();
                if (step < bosqichlar.length - 1) setStep((s) => s + 1);
                else setFaza(savollar.length ? 'suhbat' : 'test');
              }}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-[14.5px] font-bold transition active:scale-[0.98]"
              style={{ background: '#F0B963', color: '#08121C' }}
            >
              {step < bosqichlar.length - 1 ? 'Keyingisi' : 'Savol-javobga o‘tish'}
              <ArrowRight size={17} />
            </button>
          </div>

          {error ? (
            <p className="mt-2 rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold" style={{ background: 'rgba(239,68,68,0.14)', color: '#FFB4A8' }}>
              {error}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const asosiy = (
    <div className="overflow-hidden rounded-[24px] border border-[#DDD7F5] bg-[color:var(--rd-white)] shadow-[0_10px_28px_-14px_rgba(45,27,105,0.14)]">
      {/* Sarlavha va boshqaruv */}
      <div className="flex items-start gap-2.5 px-4 pt-4 sm:px-5">
        <div className="min-w-0 flex-1">
          {/* Mavzu sarlavhasi sahifaning o'zida turibdi — bu yerda takrorlanmaydi. */}
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8B7FAB]">
            {FAZA_NOMI[faza]}
          </p>
        </div>

        {/*
          Darsni BOSHQARISH: to'xtatib turish va ovoz. "Ortga" bu yerda
          takrorlanmaydi — sahifaning tepasidagi "←" ayni shu darsni bir
          bosqich orqaga suradi.
        */}
        {ovozOchiq ? (
          <button
            type="button"
            onClick={pauzaAlmashtir}
            className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-2xl px-2.5 text-[12.5px] font-bold transition active:scale-[0.95]"
            style={pauza ? { background: '#5B3FA8', color: '#fff' } : { background: '#F3F0FC', color: '#5B3FA8' }}
            aria-label={pauza ? 'Darsni davom ettirish' : "Darsni to'xtatib turish"}
          >
            {pauza ? <><Play size={15} fill="currentColor" /> Davom etish</> : <Pause size={16} />}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            if (ovozOchiq) { setOvozOchiq(false); toxtat(); return; }
            setOvozOchiq(true);
            // Ovoz qaytgach shu bosqich boshidan o'qib beriladi.
            qaytaEshit();
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl transition active:scale-[0.95]"
          style={ovozOchiq ? { background: '#5B3FA8', color: '#fff' } : { background: '#F3F0FC', color: '#5B3FA8' }}
          aria-label={ovozOchiq ? "Ovozni o'chirish" : 'Ovozni yoqish'}
        >
          {ovozOchiq ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

      </div>

      <div className="mt-3 h-1.5 bg-[#EDE9FB]">
        <motion.div
          className="h-full bg-[#5B3FA8]"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 180, damping: 24 }}
        />
      </div>

      {/* Dars to'xtatib turilgani ko'rinib tursin — jimlik "buzildi" degani emas. */}
      <AnimatePresence initial={false}>
        {pauza ? (
          <motion.button
            type="button"
            key="pauza-banner"
            onClick={pauzaAlmashtir}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex w-full items-center justify-center gap-1.5 overflow-hidden bg-[#F3F0FC] py-2 text-[12.5px] font-bold text-[#5B3FA8]"
          >
            <Pause size={13} fill="currentColor" /> Dars to‘xtatib turildi — davom etish uchun bosing
          </motion.button>
        ) : null}
      </AnimatePresence>

      <div className={faza === 'tushuntirish' ? 'p-2.5 sm:p-3.5' : 'p-4 sm:p-5'}>
        <AnimatePresence mode="wait">
          {/* ---------- 1. TUSHUNTIRISH ---------- */}
          {faza === 'tushuntirish' && joriy ? (
            <motion.div key={`t${step}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
              {/*
                Sinf ko'rinishi: mavzu, qoida va misollar DOSKAGA yoziladi,
                ustoz esa doska yonida turib tushuntiradi. Ilgari ekranda
                faqat ustoz turardi va hamma narsa ovozda aytilardi — o'quvchi
                qoidani ko'z bilan ko'ra olmasdi.
              */}
              <UstozDoskaSahna
                bosqich={joriy}
                speaking={oqilmoqda && ovozOchiq && !pauza}
                loading={tayyorlanmoqda && !pauza}
                kalitSavol={dars?.kalitSavol}
                ochiqSatr={ochiqSatr}
                faolSatr={faolSatr}
              />

              {/*
                Dars boshqaruvi doska OSTIDA ham turadi: ko'z shu yerda
                bo'ladi va "tushunmadim, qaytar" degan harakat bir bosishda
                bajarilishi kerak.
              */}
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={ortga}
                  disabled={step === 0}
                  className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-2xl bg-[#F3F0FC] text-[#5B3FA8] transition active:scale-[0.95] disabled:opacity-40"
                  aria-label="Oldingi bosqich"
                  title="Oldingi bosqich"
                >
                  <ArrowLeft size={18} />
                </button>

                <button
                  type="button"
                  onClick={qaytaEshit}
                  className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-2xl bg-[#F3F0FC] text-[#5B3FA8] transition active:scale-[0.95]"
                  aria-label="Shu bosqichni qayta eshitish"
                  title="Qayta eshitish"
                >
                  <RotateCcw size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toxtat();
                    if (step < bosqichlar.length - 1) setStep((s) => s + 1);
                    else setFaza(savollar.length ? 'suhbat' : 'test');
                  }}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#5B3FA8] px-4 text-[14px] font-bold text-white transition active:scale-[0.98]"
                >
                  {step < bosqichlar.length - 1 ? 'Keyingisi' : 'Savol-javobga o‘tish'}
                  <ArrowRight size={17} />
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* Qolgan savol soni — faqat suhbat bosqichida va oz qolganda. */}
          {faza === 'suhbat' && kvota && kvota.qolgan <= 5 ? (
            <p className="mb-2.5 rounded-xl bg-[#FEF3E2] px-3 py-2 text-[12.5px] font-semibold leading-snug text-[#B45309]">
              {kvota.ruxsat
                ? `Ustoz bilan suhbat: yana ${kvota.qolgan} ta savol qoldi (${kvota.jami} tadan).`
                : `Suhbat chegarasi tugadi. ${Math.ceil(kvota.kutish / 3600)} soatdan keyin ochiladi — dars va mashqlar esa ochiq.`}
            </p>
          ) : null}

          {/* ---------- 2a. SUHBAT — JONLI (Gemini Live) ---------- */}
          {faza === 'suhbat' && !zaxiraSuhbat ? (
            <motion.div key="live" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
              <UstozLive
                token={token}
                mavzu={mavzu}
                savollar={savollar}
                onTugadi={() => { toxtat(); setFaza('test'); }}
                onZaxira={(sabab) => {
                  // Jonli suhbat ochilmadi: darsni to'xtatmaymiz, eski
                  // yozib-yuborish usuliga o'tamiz.
                  console.warn('[doska] jonli suhbat ishlamadi:', sabab);
                  setZaxiraSuhbat(true);
                }}
              />
            </motion.div>
          ) : null}

          {/* ---------- 2b. SUHBAT — zaxira: yozib yuborish ---------- */}
          {faza === 'suhbat' && zaxiraSuhbat && joriySavol ? (
            <motion.div key={`s${savolIdx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
              <p className="text-[11.5px] font-semibold text-[#8B7FAB]">
                Savol {savolIdx + 1} / {savollar.length}
              </p>

              {/* Ustoz savoli */}
              <div className="mt-1.5 flex items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#EDE9FB] text-[#5B3FA8]">
                  <Volume2 size={15} strokeWidth={2.4} />
                </span>
                <p className="rounded-2xl rounded-tl-md bg-[#F7F5FE] px-3.5 py-3 text-[15px] font-bold leading-snug text-[#2D1B69]">
                  {joriySavol}
                </p>
              </div>

              {/* O'quvchining aytgani */}
              {baho?.transcript ? (
                <p className="ml-auto mt-2.5 max-w-[85%] rounded-2xl rounded-tr-md bg-[#EDE9FB] px-3.5 py-3 text-[14px] leading-snug text-[#2D1B69]">
                  {baho.transcript}
                </p>
              ) : null}

              {/* Ustoz bahosi */}
              {baho ? (
                <div className="mt-2.5 flex items-start gap-2.5">
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl"
                    style={
                      baho.baho === 'togri' ? { background: '#E7F7ED', color: '#177A3C' }
                        : baho.baho === 'xato' ? { background: '#FDECEC', color: '#B91C1C' }
                        : { background: '#FEF3E2', color: '#B45309' }
                    }
                  >
                    {baho.baho === 'togri' ? <CheckCircle2 size={16} /> : baho.baho === 'xato' ? <XCircle size={16} /> : <Volume2 size={15} />}
                  </span>
                  <div className="min-w-0 rounded-2xl rounded-tl-md bg-[#F7F5FE] px-3.5 py-3">
                    <p className="text-[14px] leading-relaxed text-[#5C5470]">{baho.izoh}</p>
                    {baho.namuna ? (
                      <p className="mt-2 text-[13px] leading-relaxed text-[#2D1B69]">
                        <span className="font-bold">Namuna: </span>{baho.namuna}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Mikrofon */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {!recorder.isRecording ? (
                  <button
                    type="button"
                    onClick={() => { toxtat(); setBaho(null); void recorder.startRecording(); }}
                    disabled={baholanmoqda}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#5B3FA8] px-4 text-[14px] font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
                  >
                    {baholanmoqda ? <Loader2 size={17} className="animate-spin" /> : <Mic size={17} />}
                    {baholanmoqda ? 'Ustoz tinglayapti…' : baho ? 'Yana javob berish' : 'Javob berish'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => recorder.stopRecording()}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#EF4444] px-4 text-[14px] font-bold text-white transition active:scale-[0.98]"
                  >
                    <Square size={15} fill="currentColor" />
                    To‘xtatish · {recorder.elapsedSeconds}s
                  </button>
                )}

                <button
                  type="button"
                  onClick={keyingiSavol}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-[#F3F0FC] px-4 text-[14px] font-bold text-[#5B3FA8] transition active:scale-[0.98]"
                >
                  {savolIdx < savollar.length - 1 ? 'Keyingi savol' : 'Testga o‘tish'}
                  <ArrowRight size={16} />
                </button>
              </div>

              {recorder.error ? (
                <p className="mt-2 text-[12.5px] font-semibold text-[#B91C1C]">{recorder.error}</p>
              ) : null}
            </motion.div>
          ) : null}

          {/* ---------- 3. TEST ---------- */}
          {faza === 'test' ? (
            <motion.div key="test" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
              {testSavollar.length > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-black text-[#2D1B69]">
                      {testSavollar.length} ta savol
                    </p>
                    <p className="text-[13px] font-bold text-[#5C5470]">
                      To‘g‘ri: {testTogri}/{testJavobBerilgan || 0}
                    </p>
                  </div>

                  <div className="mt-3 grid gap-3">
                    {testSavollar.map((q, qi) => {
                      const tanlov = testJavoblar[qi];
                      const ochilgan = tanlov !== undefined;
                      return (
                        <div key={`${qi}-${q.savol}`} className="rounded-2xl bg-[#F7F5FE] p-3.5">
                          <p className="text-[14px] font-bold leading-snug text-[#2D1B69]">
                            {qi + 1}. {q.savol}
                          </p>
                          <div className="mt-2.5 grid gap-2">
                            {q.variantlar.map((v, vi) => {
                              const togri = vi === q.togriIndex;
                              const cls = !ochilgan
                                ? 'bg-white text-[#2D1B69]'
                                : togri ? 'bg-[#E7F7ED] text-[#177A3C]'
                                : tanlov === vi ? 'bg-[#FDECEC] text-[#B91C1C]'
                                : 'bg-white text-[#8B7FAB]';
                              return (
                                <button
                                  key={vi}
                                  type="button"
                                  disabled={ochilgan}
                                  onClick={() => {
                                    setTestJavoblar((p) => ({ ...p, [qi]: vi }));
                                    /*
                                     * Ovoz faqat XATO javobda: har to'g'ri javobda
                                     * "barakalla" deyilsa, olti savollik testda
                                     * ustoz gapdan to'xtamaydi.
                                     */
                                    if (!togri) {
                                      oqi(q.izoh || `To‘g‘ri javob: ${q.variantlar[q.togriIndex]}`);
                                    }
                                  }}
                                  className={`min-h-[44px] rounded-2xl px-3.5 py-2.5 text-left text-[14px] font-semibold transition active:scale-[0.99] ${cls}`}
                                >
                                  {v}
                                </button>
                              );
                            })}
                          </div>
                          {ochilgan ? (
                            <p className="mt-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-[#5C5470]">
                              {q.izoh || `To‘g‘ri javob: ${q.variantlar[q.togriIndex]}`}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-[14px] text-[#5C5470]">Bu dars uchun test tayyorlanmadi.</p>
              )}

              {mashq ? (
                <div className="mt-4 grid gap-3">
                  {mashq.savollar.map((q, qi) => {
                    const tanlov = mashqJavoblar[qi];
                    const ochilgan = tanlov !== undefined;
                    return (
                      <div key={qi} className="rounded-2xl bg-[#F7F5FE] p-3.5">
                        <p className="text-[14px] font-bold leading-snug text-[#2D1B69]">{qi + 1}. {q.savol}</p>
                        <div className="mt-2.5 grid gap-2">
                          {q.variantlar.map((v, vi) => {
                            const togri = vi === q.togriIndex;
                            const cls = !ochilgan
                              ? 'bg-white text-[#2D1B69]'
                              : togri ? 'bg-[#E7F7ED] text-[#177A3C]'
                              : tanlov === vi ? 'bg-[#FDECEC] text-[#B91C1C]'
                              : 'bg-white text-[#8B7FAB]';
                            return (
                              <button
                                key={vi}
                                type="button"
                                disabled={ochilgan}
                                onClick={() => setMashqJavoblar((p) => ({ ...p, [qi]: vi }))}
                                className={`min-h-[44px] rounded-2xl px-3.5 py-2.5 text-left text-[14px] font-semibold transition active:scale-[0.99] ${cls}`}
                              >
                                {v}
                              </button>
                            );
                          })}
                        </div>
                        {ochilgan && q.izoh ? (
                          <p className="mt-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-[#5C5470]">{q.izoh}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void mashqOl()}
                  className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-[#F3F0FC] px-4 text-[14px] font-bold text-[#5B3FA8] transition active:scale-[0.98]"
                >
                  <Send size={16} /> Yana mashq qilish
                </button>
              )}

              <button
                type="button"
                onClick={() => { toxtat(); setFaza('yakun'); }}
                className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-[#5B3FA8] px-4 text-[14px] font-bold text-white transition active:scale-[0.98]"
              >
                Darsni yakunlash <ArrowRight size={17} />
              </button>
            </motion.div>
          ) : null}

          {/* ---------- Yakun ---------- */}
          {faza === 'yakun' ? (
            <motion.div key="yakun" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F7ED] text-[#177A3C]">
                <CheckCircle2 size={24} />
              </span>
              <p className="mt-2.5 text-[15px] font-black text-[#2D1B69]">Dars yakunlandi</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5C5470]">{dars.xulosa}</p>

              {/*
                Kun shu yerda tugamaydi: darsdan keyin "Ustozdan so'ra" va
                mashqlar bor. Shuning uchun DAVOM ETISH asosiy tugma, qaytadan
                ko'rish esa ikkinchi darajali bo'lib qoladi.
              */}
              {onTugadi ? (
                <button
                  type="button"
                  onClick={() => { toxtat(); onTugadi(); }}
                  className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#5B3FA8] px-4 text-[15px] font-bold text-white transition active:scale-[0.98]"
                >
                  {keyingiNomi ? `Davom etish: ${keyingiNomi}` : 'Davom etish'}
                  <ArrowRight size={17} />
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => { setFaza('tushuntirish'); setStep(0); }}
                className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-4 text-[14px] font-bold text-[#5B3FA8] transition active:scale-[0.98] ${
                  onTugadi ? 'mt-2.5 bg-transparent' : 'mt-4 bg-[#F3F0FC]'
                }`}
              >
                <Play size={16} /> Qaytadan ko‘rish
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {error ? (
          <p className="mt-3 rounded-2xl bg-[#FDECEC] px-3.5 py-2.5 text-[13px] font-semibold text-[#B91C1C]">{error}</p>
        ) : null}
      </div>
    </div>
  );

  /*
   * To'liq ekran rejimida qolgan bosqichlar (savol-javob, test, yakun) oq
   * kartochka bo'lib qoladi, lekin sahifada sarlavha yo'q — shuning uchun
   * o'ram o'zi bo'shliq beradi va aylantirishga ruxsat etadi.
   */
  if (toliqEkran) {
    return (
      <div className="h-full overflow-y-auto bg-[#F7F5FE] px-3 pb-6 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={ortgaYokiChiqish}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--rd-white)] text-[#5B4CE0] shadow-[0_6px_16px_rgba(91,76,224,0.12)] transition active:scale-[0.95]"
            aria-label="Ortga"
          >
            <ArrowLeft size={17} />
          </button>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8B7FAB]">
            {FAZA_NOMI[faza]}
          </p>
        </div>
        {asosiy}
      </div>
    );
  }

  return asosiy;
}
