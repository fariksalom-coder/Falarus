/**
 * lugatAudio.service.ts — kun lug'atini tinglash uchun bitta audio fayl.
 *
 * Har so'z ikki marta eshitiladi: avval O'ZBEKCHA, keyin RUSCHA tarjimasi,
 * so'zlar orasida tin. O'quvchi uni yo'lda, ishda, quloqchinda eshitadi —
 * shuning uchun bitta uzluksiz fayl (har so'zni alohida yuklash emas).
 *
 * OVOZ MANBALARI tts.service bilan bir xil va keshdan olinadi:
 *  - o'zbekcha — `ustoz` ohangi, ya'ni Gemini (Leda): OpenAI lotin yozuvini
 *    inglizcha o'qiydi, shuning uchun o'zbekchani faqat Gemini beradi;
 *  - ruscha — `sozlar` ohangi (OpenAI nova): lug'at kartochkasidagi aynan
 *    o'sha ovoz, ko'p so'zi allaqachon keshda.
 *
 * Tayyor fayl `uploads/lugat-audio/<kalit>.mp3` + `<kalit>.json` (har so'z
 * qaysi soniyada boshlanadi). Kalit so'zlar ro'yxatidan tuziladi: admin
 * lug'atni tahrirlasa, yangi fayl o'zi tayyorlanadi.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { speak } from './tts.service';

/** Ovoz yoki tinlar o'zgarsa oshiring — eski fayllar qayta yig'iladi. */
const VERSIYA = 1;
/** O'zbekcha so'zdan keyin, ruscha tarjimadan oldin. */
const TIN_TARJIMA = 0.6;
/** Bir so'z tugab, keyingisi boshlanguncha. */
const TIN_SOZ = 1.3;
const RATE = 24000;

const AUDIO_DIR = process.env.LUGAT_AUDIO_DIR || path.resolve(process.cwd(), 'uploads', 'lugat-audio');

export type LugatAudioWord = { wordUz: string; wordRu: string };
export type LugatAudioItem = { uz: string; ru: string; start: number; ruStart: number; end: number };
export type LugatAudio = { key: string; duration: number; items: LugatAudioItem[] };

export const isLugatAudioKey = (key: string) => /^[a-f0-9]{40}$/.test(key);
export const lugatAudioFile = (key: string) => path.join(AUDIO_DIR, `${key}.mp3`);

export function lugatAudioKey(words: LugatAudioWord[]): string {
  const body = words.map((w) => `${w.wordUz.trim()}\u0000${w.wordRu.trim()}`).join('\u0001');
  return createHash('sha1').update(`v${VERSIYA}|${body}`).digest('hex');
}

/** Tayyor bo'lsa — ma'lumoti, aks holda null. */
export async function readyLugatAudio(key: string): Promise<LugatAudio | null> {
  try {
    const meta = JSON.parse(await fs.promises.readFile(path.join(AUDIO_DIR, `${key}.json`), 'utf8')) as LugatAudio;
    await fs.promises.access(lugatAudioFile(key));
    return meta;
  } catch {
    return null;
  }
}

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd}: ${err.slice(-300)}`))));
  });
}

/** Har bo'lak bir xil formatga (mono 24 kHz WAV) keltiriladi — keyin oddiy ulash yetadi. */
async function toWav(input: string, output: string): Promise<number> {
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-ac', '1', '-ar', String(RATE), output]);
  const seconds = Number((await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', output])).trim());
  return Number.isFinite(seconds) ? seconds : 0;
}

async function silence(output: string, seconds: number) {
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `anullsrc=r=${RATE}:cl=mono`, '-t', String(seconds), output]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Gemini ba'zan bitta so'zga ovozsiz javob qaytaradi; shunda tts.service
 * manbani ~2 daqiqaga uxlatadi. Butun kun shu bitta so'z tufayli yiqilmasin:
 * kutib, qayta urinamiz (fon ishi, shoshilinch emas).
 */
async function speakRetry(text: string, opts: Parameters<typeof speak>[1]) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await speak(text, opts);
    } catch (e) {
      if (attempt >= 4) throw e;
      const sleeping = e instanceof Error && /vaqtincha/.test(e.message);
      await sleep(sleeping ? 130_000 : 5_000);
    }
  }
}

const ext = (mime: string) => (mime.includes('wav') ? 'wav' : mime.includes('ogg') ? 'ogg' : 'mp3');

async function build(key: string, words: LugatAudioWord[]): Promise<LugatAudio> {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'lugat-audio-'));
  try {
    const parts: string[] = [];
    const items: LugatAudioItem[] = [];
    const pauseShort = path.join(tmp, 'tin-qisqa.wav');
    const pauseLong = path.join(tmp, 'tin-uzun.wav');
    await silence(pauseShort, TIN_TARJIMA);
    await silence(pauseLong, TIN_SOZ);
    let t = 0;
    for (const [i, w] of words.entries()) {
      // Ketma-ket: Gemini sessiyasi bitta, parallel so'rovlar uni bandlab qo'yadi.
      const uz = await speakRetry(w.wordUz, { ohang: 'ustoz', fon: true });
      const ru = await speakRetry(w.wordRu, { ohang: 'sozlar', fon: true });
      const uzRaw = path.join(tmp, `${i}-uz.${ext(uz.mime)}`);
      const ruRaw = path.join(tmp, `${i}-ru.${ext(ru.mime)}`);
      await fs.promises.writeFile(uzRaw, uz.audio);
      await fs.promises.writeFile(ruRaw, ru.audio);
      const uzWav = path.join(tmp, `${i}-uz.wav`);
      const ruWav = path.join(tmp, `${i}-ru.wav`);
      const uzLen = await toWav(uzRaw, uzWav);
      const ruLen = await toWav(ruRaw, ruWav);
      const start = t;
      const ruStart = start + uzLen + TIN_TARJIMA;
      const end = ruStart + ruLen;
      items.push({ uz: w.wordUz, ru: w.wordRu, start: round(start), ruStart: round(ruStart), end: round(end) });
      parts.push(uzWav, pauseShort, ruWav, pauseLong);
      t = end + TIN_SOZ;
    }
    const list = path.join(tmp, 'list.txt');
    await fs.promises.writeFile(list, parts.map((p) => `file '${p}'`).join('\n'));
    await fs.promises.mkdir(AUDIO_DIR, { recursive: true });
    const mp3Tmp = path.join(AUDIO_DIR, `${key}.mp3.tmp`);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', '-f', 'mp3', mp3Tmp]);
    await fs.promises.rename(mp3Tmp, lugatAudioFile(key));
    const meta: LugatAudio = { key, duration: round(t), items };
    // JSON oxirida yoziladi: u bor bo'lsa, mp3 ham to'liq tayyor.
    await fs.promises.writeFile(path.join(AUDIO_DIR, `${key}.json`), JSON.stringify(meta));
    return meta;
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
}

const round = (n: number) => Math.round(n * 100) / 100;

const inFlight = new Map<string, Promise<LugatAudio>>();

/**
 * Faylni tayyorlaydi (bir kalit uchun bitta ish). Birinchi marta ~1 daqiqa
 * oladi, shuning uchun so'rov uni kutmaydi — fonda boshlab qo'yadi.
 */
export function prepareLugatAudio(words: LugatAudioWord[]): Promise<LugatAudio> {
  const key = lugatAudioKey(words);
  const running = inFlight.get(key);
  if (running) return running;
  const job = readyLugatAudio(key)
    .then((ready) => ready ?? build(key, words))
    .finally(() => inFlight.delete(key));
  inFlight.set(key, job);
  return job;
}
