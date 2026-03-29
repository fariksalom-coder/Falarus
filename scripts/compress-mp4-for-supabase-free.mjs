/**
 * Supabase Free: max 50 MB per file in Storage. This script re-encodes .mp4 files
 * larger than ~48 MiB so they can be uploaded with npm run upload:course-media.
 *
 * Requires: ffmpeg on PATH (brew install ffmpeg)
 * Backs up each replaced file as <name>.mp4.bak before overwrite.
 *
 * Usage: node scripts/compress-mp4-for-supabase-free.mjs
 *        node scripts/compress-mp4-for-supabase-free.mjs --dry-run
 */
import { execFileSync } from 'child_process';
import { readdir, rename, stat, unlink } from 'fs/promises';
import { join } from 'path';

const ROOT = join(process.cwd(), 'public', 'courses');
const MAX_BYTES = 48 * 1024 * 1024;
const DRY = process.argv.includes('--dry-run');

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile()) yield p;
  }
}

function runFfmpeg(input, output, crf, scale) {
  const vf = scale ? `scale='min(${scale},iw)':-2` : 'scale=iw:ih';
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      input,
      '-vf',
      vf,
      '-c:v',
      'libx264',
      '-profile:v',
      'main',
      '-crf',
      String(crf),
      '-preset',
      'medium',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      output,
    ],
    { stdio: 'inherit' }
  );
}

async function main() {
  const targets = [];
  try {
    for await (const f of walk(ROOT)) {
      if (!f.toLowerCase().endsWith('.mp4')) continue;
      if (f.endsWith('.bak')) continue;
      const s = (await stat(f)).size;
      if (s > MAX_BYTES) targets.push({ path: f, size: s });
    }
  } catch (e) {
    console.error('No public/courses or read error:', e.message);
    process.exit(1);
  }

  if (targets.length === 0) {
    console.log('No .mp4 files over ~48 MiB under public/courses.');
    process.exit(0);
  }

  console.log(`${targets.length} file(s) over ~48 MiB:`);
  for (const t of targets) {
    console.log(`  ${(t.size / 1024 / 1024).toFixed(1)} MiB  ${t.path}`);
  }

  if (DRY) {
    console.log('[dry-run] No changes. Install ffmpeg before a real run (e.g. brew install ffmpeg).');
    process.exit(0);
  }

  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'pipe' });
  } catch {
    console.error('Install ffmpeg first (e.g. brew install ffmpeg)');
    process.exit(1);
  }

  for (const { path: input } of targets) {
    const tmp = `${input}.compressing.mp4`;
    const bak = `${input}.bak`;

    let done = false;
    for (const scale of [1280, 960, 854]) {
      for (const crf of [26, 28, 30, 32, 34]) {
        try {
          await unlink(tmp).catch(() => {});
          runFfmpeg(input, tmp, crf, scale);
          const outSize = (await stat(tmp)).size;
          if (outSize <= 50 * 1024 * 1024) {
            await rename(input, bak);
            await rename(tmp, input);
            console.log(`OK ${input} → ${(outSize / 1024 / 1024).toFixed(1)} MiB (scale≤${scale}, crf=${crf})`);
            done = true;
            break;
          }
        } catch (e) {
          console.error(`ffmpeg error (${input}):`, e.message);
        }
      }
      if (done) break;
    }

    await unlink(tmp).catch(() => {});

    if (!done) {
      console.error(`Could not get under 50 MiB: ${input} — shorten the video or host it elsewhere (R2 / Pro).`);
      process.exitCode = 1;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
