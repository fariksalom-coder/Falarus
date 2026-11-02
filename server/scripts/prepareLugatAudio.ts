/**
 * Barcha kunlar lug'ati uchun tinglash audiosini oldindan tayyorlaydi
 * (aks holda har kunning birinchi o'quvchisi ~1 daqiqa kutadi).
 *
 *   npx tsx server/scripts/prepareLugatAudio.ts            # 0–182
 *   npx tsx server/scripts/prepareLugatAudio.ts --from=10 --to=20
 *
 * Qayta yuritish xavfsiz: tayyor kunlar o'tkazib yuboriladi.
 */
import 'dotenv/config';
import { pool } from '../lib/db';
import { lugatAudioKey, prepareLugatAudio, readyLugatAudio } from '../services/lugatAudio.service';

let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });

const arg = (name: string, fallback: number) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback);

async function main() {
  if (!pool) throw new Error('DATABASE_URL is required');
  const from = arg('from', 0);
  const to = arg('to', 182);
  let built = 0;
  let skipped = 0;
  for (let day = from; day <= to && !stopping; day += 1) {
    const words = (await pool.query(
      `SELECT word_uz "wordUz", word_ru "wordRu" FROM daily_vocab_words
       WHERE day_number=$1 AND btrim(word_uz)<>'' AND btrim(word_ru)<>'' ORDER BY sort_order`,
      [day],
    )).rows.map((w) => ({ wordUz: String(w.wordUz).trim(), wordRu: String(w.wordRu).trim() }));
    if (!words.length) continue;
    if (await readyLugatAudio(lugatAudioKey(words))) { skipped += 1; continue; }
    const t0 = Date.now();
    try {
      const meta = await prepareLugatAudio(words);
      built += 1;
      console.log(`[lugat-audio] ${day}-kun: ${meta.items.length} so'z, ${Math.round(meta.duration)}s, ${Math.round((Date.now() - t0) / 1000)}s ichida`);
    } catch (e) {
      console.error(`[lugat-audio] ${day}-kun xato:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`[lugat-audio] tayyorlandi: ${built}, oldin tayyor: ${skipped}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
