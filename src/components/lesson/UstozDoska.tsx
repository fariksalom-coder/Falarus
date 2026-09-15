import { acquireConversationAudio } from '../../utils/conversationAudio';
/**
 * UstozDoska — grammatika bo'limidagi jonli dars.
 *
 * OQIM (bosqichma-bosqich, avtomatik):
 *   1. TUSHUNTIRISH — mavzu ovoz bilan qismlab tushuntiriladi, har qism
 *      tugagach keyingisiga o'zi o'tadi.
 *   2. SUHBAT — ustoz og'zaki savol beradi, o'quvchi mikrofon orqali javob
 *      beradi, ustoz baholab ovoz bilan javob qaytaradi. Ikkala tomon ovozli.
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
import { doskaKvota, type DoskaKvota, type KunSavol } from '../../api/ustozDoska';
import {
  buildDoskaLesson,
  suhbatJavobi,
  type DoskaBaho,
  type DoskaDars,
  type DoskaVazifa,
} from '../../api/ustozDoska';

type Props = {
  mavzu: string;
  nazariya?: string;
  kun?: number;
  vazifalar?: DoskaVazifa[];
  /**
   * DARS TUGAGACH KEYINGI BOSQICHGA O'TKAZADI.
   *
   * Dars oxirgi bosqichda tugaydi va o'quvchi darhol keyingi bosqichga
   * "Qaytadan ko'rish" tugmasi qolardi — o'quvchi uchun kun SHU YERDA
   * tugagandek edi. Aslida undan keyin "Ustozdan so'ra" va mashqlar bor;
   * ularga o'tish faqat tepadagi kichkina yozuvda turardi va ko'rinmasdi.
   */
  onTugadi?: () => void;
  /** Keyingi bosqichning nomi — oxirgi qadam tugmasida ko'rinadi. */
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
  /**
   * DOSKANING QAYSI QISMI KO'RSATILADI.
   *
   *   'dars'   — tushuntirish va test (odatiy holat);
   *   'suhbat' — faqat ustoz bilan jonli savol-javob.
   *
   * NIMA UCHUN AJRATILDI: savol-javob ilgari darsning O'RTASIDA, tushuntirish
   * bilan test orasida turardi. O'quvchi mavzuni endigina eshitgan bo'lardi va
   * gapirishga tayyor emasdi. Endi u kunning MUSTAQIL 5-BLOKI — bosh sahifadan
   * `/kunlik-reja/kun/:kun/savol-javob` orqali ochiladi. Suhbatning o'zi
   * o'zgarmadi, faqat o'rni ko'chdi.
   */
  qism?: 'dars' | 'suhbat';
  /**
   * SUHBAT rejimidagi savollar — kunning TO'RT BO'LIMIDAN tayyorlangan.
   *
   * Berilsa dars umuman so'ralmaydi. Ilgari savol-javob butun darsni
   * yuklab olib undan faqat `savollar` ni olardi — savollar esa darsning
   * ichida tug'ilgani uchun faqat GRAMMATIKA mavzusiga tegishli bo'lardi.
   * Endi ular alohida, to'rt bo'lim materialidan tuziladi.
   */
  savollarManbasi?: KunSavol[];
  /**
   * Suhbat uchun savol umuman topilmadi.
   *
   * `onTugadi` dan ATAYIN ajratilgan: u bosqichni "bajarildi" deb
   * belgilaydi, bu holatda esa hech qanday savol berilmagan — bloknni
   * bajarilgan deb yozib qo'yish yolg'on bo'lardi.
   */
  onSavolYoq?: () => void;
};

/** Darsning bosqichlari. */
type Faza = 'tushuntirish' | 'suhbat';



const FAZA_NOMI: Record<Faza, string> = {
  tushuntirish: 'Tushuntirish',
  suhbat: 'Savol-javob',
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

/**
 * Nechta bo'lak oldindan yuklanadi.
 *
 * Uchtasi yetarli: qisqa gaplar ketma-ket kelganda ham ovoz uzilmaydi.
 * Ko'proq qilish serverga bir vaqtda ortiqcha yuk beradi va o'quvchi
 * eshitmasligi mumkin bo'lgan matnga ovoz tayyorlanadi.
 */
const OLDINDAN_YUKLASH = 3;

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
  onTugadi,
  keyingiNomi,
  ortgaRef,
  toliqEkran = false,
  onChiqish,
  qism = 'dars',
  savollarManbasi,
  onSavolYoq,
}: Props) {
  const { token } = useAuth();
  const recorder = useVoiceRecorder(60_000);

  /** Faqat savol-javob rejimi: dars va test bu yerda ko'rsatilmaydi. */
  const suhbatRejimi = qism === 'suhbat';

  const [dars, setDars] = useState<DoskaDars | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [faza, setFaza] = useState<Faza>(suhbatRejimi ? 'suhbat' : 'tushuntirish');
  useEffect(() => {
    if (faza === 'suhbat') return acquireConversationAudio();
  }, [faza]);
  const [step, setStep] = useState(0);
  const [savolIdx, setSavolIdx] = useState(0);
  const [baho, setBaho] = useState<DoskaBaho | null>(null);
  const [baholanmoqda, setBaholanmoqda] = useState(false);


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
  /*
   * Suhbat savollari. Tashqaridan kelganda ular O'Z KUNI bilan keladi
   * (`KunSavol`), darsdan kelganda esa oddiy matn — shuning uchun ikkala
   * ko'rinish ham bir xil ro'yxatga keltiriladi.
   */
  const savollar: KunSavol[] =
    savollarManbasi ??
    (dars?.savollar ?? []).map((q) => ({ savol: q, manbaKun: kun ?? 0, manbaMavzu: mavzu }));
  const joriy = bosqichlar[step];
  const joriySavol = savollar[savolIdx];


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
      if (!bolaklar.length) {
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
           * KEYINGI BIR NECHA BO'LAK OLDINDAN YUKLANADI.
           *
           * Ilgari faqat BITTA keyingi bo'lak so'ralardi. Bo'lak qisqa
           * bo'lsa (bir gap ~2 soniya), server esa ovozni 3-5 soniyada
           * tayyorlasa, joriy bo'lak tugaganda keyingisi hali yo'q edi —
           * dars TO'XTAB-TO'XTAB gapirardi. Zaxira oynasi kengaytirildi:
           * bir nechta bo'lak yo'lda bo'lsa, uzilish yopiladi.
           *
           * Boshlanish tartibi saqlanadi: oldindan yuklash faqat BIRINCHI
           * bo'lak chalina boshlagandan KEYIN ishlaydi, aks holda ikkinchi
           * bo'lak serverdagi navbatda birinchisidan oldinga tushib,
           * darsning boshlanishi kechikardi.
           */
          for (let j = 1; j <= OLDINDAN_YUKLASH; j += 1) {
            const keyingi = bolaklar[i + j];
            if (!keyingi) break;
            prefetchSpeech(keyingi, {
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
    [token],
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

  /*
   * UZOQ KUTISH BELGISI.
   *
   * Yuklanish ekrani ataylab yozuvsiz: dars ko'pincha server keshidan
   * bir zumda keladi va yozuv chaqnab yo'qolardi. Lekin YANGI dars
   * yaratilganda 30 soniyagacha ketishi mumkin — o'shanda jim skelet
   * "sayt qotib qoldi" degan taassurot berardi. Shuning uchun yozuv
   * faqat 6 soniyadan keyin, ya'ni haqiqatan kutilayotganda chiqadi.
   */
  const [uzoqKutish, setUzoqKutish] = useState(false);
  useEffect(() => {
    if (!loading) {
      setUzoqKutish(false);
      return;
    }
    const soat = setTimeout(() => setUzoqKutish(true), 6000);
    return () => clearTimeout(soat);
  }, [loading]);

  /* ---------------- Dars avtomatik boshlanadi ---------------- */

  const darsniBoshla = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setFaza(suhbatRejimi ? 'suhbat' : 'tushuntirish');
    setStep(0);
    setSavolIdx(0);
    setBaho(null);
    try {
      // Savollar tashqaridan berilgan bo'lsa dars kerak emas — suhbat
      // rejimida undan boshqa hech narsa ishlatilmaydi.
      if (!savollarManbasi) {
        setDars(await buildDoskaLesson(token, { mavzu, nazariya, kun, vazifalar }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ustoz darsni tayyorlay olmadi");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, mavzu, nazariya, kun, savollarManbasi]);

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
    if (step >= bosqichlar.length) darsniYakunla();
  }, [faza, step, dars, bosqichlar.length]);

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
      if (step < bosqichlar.length - 1) setStep((s) => s + 1);
      else darsniYakunla();
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
    oqi(joriySavol.savol);
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
          savol: joriySavol.savol,
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

  /*
   * ZAXIRA REJIM SAVOLSIZ QOLMASIN.
   *
   * Jonli ulanish yiqilsa suhbat "yozib yuborish" usuliga o'tadi, u esa
   * kunning savollariga tayanadi. Savollar bo'lmasa ekran bo'sh qolardi va
   * o'quvchi oxirgi bosqichda tiqilib qolardi — bunday holatda bosqichni
   * yopib, kun oqimini davom ettiramiz.
   */
  useEffect(() => {
    if (!suhbatRejimi || faza !== 'suhbat' || !zaxiraSuhbat) return;
    if (savollar.length === 0) (suhbatRejimi ? (onSavolYoq ?? onTugadi) : onTugadi)?.();
    // `onTugadi` har renderda yangi funksiya — deps'ga qo'shilmaydi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suhbatRejimi, faza, zaxiraSuhbat, savollar.length]);

  /*
   * KVOTA — FAQAT ZAXIRA REJIM UCHUN.
   *
   * Jonli suhbat kvotadan hisoblanmaydi: uning chegarasi VAQT (5 daqiqa).
   * Zaxira ("javob berish" tugmasi bilan yozib yuborish) esa har javobda
   * `/ustoz/suhbat` ga boradi va o'sha kvotaga kiradi — qolgan son shu
   * yerdagina ma'noli.
   */
  useEffect(() => {
    if (faza !== 'suhbat' || !zaxiraSuhbat || !token) return;
    let bekor = false;
    void doskaKvota(token).then((k) => { if (!bekor) setKvota(k); });
    return () => { bekor = true; };
  }, [faza, zaxiraSuhbat, token, savolIdx]);

  function keyingiSavol() {
    toxtat();
    if (savolIdx < savollar.length - 1) setSavolIdx((i) => i + 1);
    // Alohida bosqichda suhbatdan keyin test yo'q — kun oqimi davom etadi.
    else if (suhbatRejimi) onTugadi?.();
    else darsniYakunla();
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
      // Suhbat alohida bosqich: uning ortida dars yo'q, sahifaning o'zi qaytaradi.
      if (suhbatRejimi) return;
      setFaza('tushuntirish');
      setStep(Math.max(0, bosqichlar.length - 1));
    }
  }

  /*
   * DARS TUGADI -> DARHOL KEYINGI BOSQICH.
   *
   * Ilgari bu yerda alohida "Yakun" ekrani turardi (tabrik, xulosa va
   * sanoq). Egasining qarori bilan u butunlay olib tashlandi: dars oxirgi
   * bosqichda tugashi bilan o'quvchi to'g'ridan-to'g'ri vazifalarga tushadi,
   * ortiqcha ekran ko'rsatilmaydi.
   */
  const darsniYakunla = () => {
    toxtat();
    if (onTugadi) {
      onTugadi();
      return;
    }
    onChiqish?.();
  };

  /** Joriy bosqichni boshidan qayta o'qib berish. */
  function qaytaEshit() {
    toxtat();
    setOchiqSatr(-1);
    setFaolSatr(-1);
    setTakror((n) => n + 1);
  }

  const ortgaMumkin = !(faza === 'tushuntirish' && step === 0);

  /**
   * TEPADAGI "ORTGA" — DARSDAN TO'LIQ CHIQARADI.
   *
   * Ilgari u bosqichma-bosqich ortga surardi, ya'ni pastki qatordagi "←"
   * bilan AYNI ISHNI qilardi — ikkita bir xil tugma foydalanuvchini
   * chalkashtirardi. Endi vazifalar ajratilgan:
   *   tepadagi «←»  — darsdan butunlay chiqish;
   *   pastdagi «←»  — bir bosqich ortga.
   *
   * `onChiqish` berilmagan holat uchun eski xatti-harakat zaxira bo'lib
   * qoladi: tugma hech bo'lmasa bir bosqich ortga suradi, o'lik bo'lib
   * qolmaydi.
   */
  const darsdanChiqish = () => {
    toxtat();
    if (onChiqish) {
      onChiqish();
      return;
    }
    if (ortgaMumkin) ortga();
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

  /* ---------------- Ko'rinish ---------------- */

  // Suhbat rejimida qadamlar — savollar; darsda esa bosqichlar.
  const jamiQadam = suhbatRejimi ? Math.max(savollar.length, 1) : bosqichlar.length + 1;
  const otilgan = suhbatRejimi
    ? Math.min(savolIdx, jamiQadam - 1)
    : faza === 'tushuntirish' ? step : jamiQadam - 1;
  const progress = useMemo(
    () => (jamiQadam > 0 ? ((otilgan + 1) / jamiQadam) * 100 : 0),
    [otilgan, jamiQadam],
  );

  /**
   * Suhbat tugagach ko'rinadigan tugma nomi. Dars ichida suhbatdan keyin test
   * kelardi; alohida bosqichda esa keyingi qadamni sahifa aytadi.
   */
  const suhbatYakuniNomi = suhbatRejimi
    ? (keyingiNomi ? `Davom etish: ${keyingiNomi}` : 'Davom etish')
    : (keyingiNomi ?? 'Yakunlash');

  /*
   * Yuklanish — YOZUVSIZ.
   *
   * Ilgari bu yerda "Ustoz darsga tayyorlanmoqda…" yozuvi turardi. Dars
   * ko'pincha serverdagi keshdan keladi, ya'ni yozuv bir lahzaga chaqnab
   * yo'qolardi — bu kutish tuyg'usini yaratardi, holbuki kutish yo'q edi.
   * Endi o'rnida doskaning o'z shakli turadi: ekran bo'sh qolmaydi, ammo
   * hech narsa "yuklanyapti" deb qichqirmaydi.
   */
  if (loading) {
    return (
      <div className="overflow-hidden rounded-[24px] border border-[#DDD7F5] bg-[color:var(--rd-white)] p-5 shadow-[0_10px_28px_-14px_rgba(45,27,105,0.14)]">
        <div className="animate-pulse space-y-3">
          <div className="h-3.5 w-1/2 rounded-full bg-[#EDE9FB]" />
          <div className="h-2.5 w-full rounded-full bg-[#F2EFFA]" />
          <div className="h-2.5 w-[85%] rounded-full bg-[#F2EFFA]" />
          <div className="h-2.5 w-[70%] rounded-full bg-[#F2EFFA]" />
        </div>
        {uzoqKutish ? (
          <p className="mt-4 text-center text-[13px] font-semibold text-[#6B5CA5]">
            Ustoz dars tayyorlayapti…
          </p>
        ) : null}
      </div>
    );
  }

  /*
   * DARS KELMADI.
   *
   * DIQQAT: savollar TASHQARIDAN kelgan bo'lsa (`savollarManbasi`) dars
   * umuman so'ralmaydi va `dars` doim `null` bo'ladi — u holda bu yerda
   * to'xtash NOTO'G'RI. Ilgari shart shuni hisobga olmasdi va savol-javob
   * bloki muvaffaqiyatli holatda ham "Ustoz darsni tayyorlay olmadi"
   * ekraniga tushib qolardi; savollar KELMAGANDA esa ishlardi — ya'ni
   * xatti-harakat teskari edi.
   */
  if (!dars && !savollarManbasi) {
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
            speaking={oqilmoqda && !pauza}
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
              onClick={darsdanChiqish}
              className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur transition active:scale-[0.95]"
              aria-label="Darsdan chiqish"
            >
              <ArrowLeft size={17} />
            </button>

            <span className="flex-1" />

            {oqilmoqda || tayyorlanmoqda ? (
              <span
                className="flex items-center gap-1.5 rounded-full border border-white/12 px-2 py-1 text-[10.5px] font-semibold"
                style={{ background: 'rgba(0,0,0,0.30)', color: 'rgba(237,244,244,0.76)' }}
              >
                {/* Rang o'zgarmaydi: "ovoz yuklanyapti" holati o'quvchiga
                    ko'rsatilmaydi — u uchun dars uzluksiz. */}
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ background: '#56CC97' }}
                />
              </span>
            ) : null}

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

            {/* Pauza — ortga/qayta eshitish bilan bitta qatorda. Ilgari u
                ekranning tepasida, o'ng burchakda turardi. */}
            <button
              type="button"
              onClick={pauzaAlmashtir}
              className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border border-white/12 transition active:scale-[0.95]"
              style={
                pauza
                  ? { background: '#F0B963', color: '#08121C', borderColor: 'transparent' }
                  : { background: 'rgba(255,255,255,0.07)', color: '#fff' }
              }
              aria-label={pauza ? 'Darsni davom ettirish' : "Darsni to'xtatib turish"}
            >
              {pauza ? <Play size={17} fill="currentColor" /> : <Pause size={17} />}
            </button>

            <button
              type="button"
              onClick={() => {
                toxtat();
                if (step < bosqichlar.length - 1) setStep((s) => s + 1);
                else darsniYakunla();
              }}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-[14.5px] font-bold transition active:scale-[0.98]"
              style={{ background: '#F0B963', color: '#08121C' }}
            >
              {step < bosqichlar.length - 1 ? 'Keyingisi' : (keyingiNomi ?? 'Yakunlash')}
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

  const jonliSuhbat = faza === 'suhbat' && !zaxiraSuhbat;

  const asosiy = (
    <div
      className={
        jonliSuhbat
          ? 'overflow-hidden bg-[#101728]'
          : 'overflow-hidden rounded-[24px] border border-[#DDD7F5] bg-[color:var(--rd-white)] shadow-[0_10px_28px_-14px_rgba(45,27,105,0.14)]'
      }
    >
      {/* Sarlavha va boshqaruv — jonli suhbatda yashirin: bitta qorong'u ekran */}
      {jonliSuhbat ? null : (
      <div className="flex items-start gap-2.5 px-4 pt-4 sm:px-5">
        <div className="min-w-0 flex-1">
          {/* Mavzu sarlavhasi sahifaning o'zida turibdi — bu yerda takrorlanmaydi. */}
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8B7FAB]">
            {FAZA_NOMI[faza]}
          </p>
        </div>

        {/*
          Darsni BOSHQARISH: to'xtatib turish. "Ortga" bu yerda
          takrorlanmaydi — sahifaning tepasidagi "←" ayni shu darsni bir
          bosqich orqaga suradi.
        */}
        <button
          type="button"
          onClick={pauzaAlmashtir}
          className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-2xl px-2.5 text-[12.5px] font-bold transition active:scale-[0.95]"
          style={pauza ? { background: '#5B3FA8', color: '#fff' } : { background: '#F3F0FC', color: '#5B3FA8' }}
          aria-label={pauza ? 'Darsni davom ettirish' : "Darsni to'xtatib turish"}
        >
          {pauza ? <><Play size={15} fill="currentColor" /> Davom etish</> : <Pause size={16} />}
        </button>


      </div>
      )}

      {/*
        Jonli suhbatda o'lchanadigan qadam yo'q: gap ustozning savollari
        bilan emas, suhbatning o'zi bilan boradi. Muzlab qolgan chiziq
        "dastur qotdi" degan taassurot berardi.
      */}
      {suhbatRejimi && !zaxiraSuhbat ? null : (
        <div className="mt-3 h-1.5 bg-[#EDE9FB]">
          <motion.div
            className="h-full bg-[#5B3FA8]"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 24 }}
          />
        </div>
      )}

      {/* Dars to'xtatib turilgani ko'rinib tursin — jimlik "buzildi" degani emas. */}
      <AnimatePresence initial={false}>
        {pauza && !jonliSuhbat ? (
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

      <div className={jonliSuhbat ? '' : faza === 'tushuntirish' ? 'p-2.5 sm:p-3.5' : 'p-4 sm:p-5'}>
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
                speaking={oqilmoqda && !pauza}
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
                    else darsniYakunla();
                  }}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#5B3FA8] px-4 text-[14px] font-bold text-white transition active:scale-[0.98]"
                >
                  {step < bosqichlar.length - 1 ? 'Keyingisi' : (keyingiNomi ?? 'Yakunlash')}
                  <ArrowRight size={17} />
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* Qolgan savol soni — faqat ZAXIRA suhbatda va oz qolganda. */}
          {faza === 'suhbat' && zaxiraSuhbat && kvota && kvota.qolgan <= 5 ? (
            <p className="mb-2.5 rounded-xl bg-[#FEF3E2] px-3 py-2 text-[12.5px] font-semibold leading-snug text-[#B45309]">
              {kvota.ruxsat
                ? `Ustoz bilan suhbat: yana ${kvota.qolgan} ta savol qoldi (${kvota.jami} tadan).`
                : `Suhbat chegarasi tugadi. ${Math.ceil(kvota.kutish / 3600)} soatdan keyin ochiladi — dars va mashqlar esa ochiq.`}
            </p>
          ) : null}

          {/* ---------- 2a. SUHBAT — JONLI (Gemini Live) ---------- */}
          {faza === 'suhbat' && !zaxiraSuhbat ? (
            <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <UstozLive
                token={token}
                mavzu={mavzu}
                savollar={savollar}
                kun={kun}
                keyingiNomi={suhbatYakuniNomi}
                onTugadi={() => {
                  toxtat();
                  if (suhbatRejimi) onTugadi?.();
                  else darsniYakunla();
                }}
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
                  {joriySavol.savol}
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
                  {savolIdx < savollar.length - 1 ? 'Keyingi savol' : suhbatYakuniNomi}
                  <ArrowRight size={16} />
                </button>
              </div>

              {recorder.error ? (
                <p className="mt-2 text-[12.5px] font-semibold text-[#B91C1C]">{recorder.error}</p>
              ) : null}
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
   * To'liq ekran rejimida savol-javob bosqichi oq
   * kartochka bo'lib qoladi, lekin sahifada sarlavha yo'q — shuning uchun
   * o'ram o'zi bo'shliq beradi va aylantirishga ruxsat etadi.
   */
  if (toliqEkran) {
    return (
      <div className="h-full overflow-y-auto bg-[#F7F5FE] px-3 pb-6 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={darsdanChiqish}
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
