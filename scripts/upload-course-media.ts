/**
 * Uploads everything under public/courses/ to Supabase Storage so URLs match courseAssetUrl():
 *   VITE_COURSE_MEDIA_BASE_URL=https://<project>.supabase.co/storage/v1/object/public/<bucket>
 *
 * Requires in .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: COURSE_MEDIA_BUCKET (default: course-assets)
 *
 * **Supabase Free** plan: Storage allows at most **50 MB per file** (not configurable). Either:
 *   - run `npm run compress:course-mp4` (needs ffmpeg) to shrink .mp4, then upload; or
 *   - host media on another CDN (e.g. Cloudflare R2 free tier) and set VITE_COURSE_MEDIA_BASE_URL to that public base; or
 *   - upgrade Supabase Pro for a higher per-file limit.
 * **Pro** plan: raise limit in Dashboard → Project Settings → Storage → Global file size limit.
 *
 * Usage: npm run upload:course-media
 * Dry run (list only): npm run upload:course-media -- --dry-run
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readdir } from 'fs/promises';
import { readFile, stat } from 'fs/promises';
import { join, relative, sep } from 'path';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

const BUCKET = (process.env.COURSE_MEDIA_BUCKET ?? 'course-assets').trim();
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY = process.argv.includes('--dry-run');

const MIME: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function mimeForPath(filePath: string): string | undefined {
  const lower = filePath.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot === -1) return undefined;
  return MIME[lower.slice(dot)];
}

function mbFromTierLabel(t: string): number {
  const m = t.match(/^(\d+(?:\.\d+)?)MB$/i);
  return m ? parseFloat(m[1]) : 0;
}

function tierBytes(t: string): number {
  return Math.round(mbFromTierLabel(t) * 1024 * 1024);
}

/** Highest first; includes headroom above largest file */
function tierCandidates(maxBytes: number): string[] {
  const needMb = Math.ceil(maxBytes / (1024 * 1024));
  const fixed = ['500MB', '400MB', '300MB', '250MB', '200MB', '150MB', '120MB', '100MB', '75MB', '50MB'];
  const extra = [`${needMb + 20}MB`, `${needMb + 10}MB`, `${needMb}MB`].filter((x) => mbFromTierLabel(x) > 0);
  const merged = [...new Set([...extra, ...fixed])];
  merged.sort((a, b) => mbFromTierLabel(b) - mbFromTierLabel(a));
  return merged;
}

async function* walkFiles(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walkFiles(p);
    else if (e.isFile()) yield p;
  }
}

function shouldUploadFile(absPath: string): boolean {
  const base = absPath.split(/[/\\]/).pop() ?? '';
  if (base.endsWith('.bak')) return false;
  return true;
}

async function collectFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  try {
    for await (const f of walkFiles(root)) {
      if (!shouldUploadFile(f)) continue;
      out.push(f);
    }
  } catch {
    return [];
  }
  return out;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const publicDir = join(process.cwd(), 'public');
  const coursesRoot = join(publicDir, 'courses');

  const files = await collectFiles(coursesRoot);
  if (files.length === 0) {
    console.error('Nothing under public/courses — add media there first (same paths as in the app: courses/patent/media/…, courses/vnzh/source/…).');
    process.exit(1);
  }

  let totalBytes = 0;
  let maxFileBytes = 0;
  for (const f of files) {
    const s = (await stat(f)).size;
    totalBytes += s;
    if (s > maxFileBytes) maxFileBytes = s;
  }

  console.log(`Found ${files.length} files (${(totalBytes / 1024 / 1024).toFixed(1)} MiB total, largest single file ${(maxFileBytes / 1024 / 1024).toFixed(1)} MiB)`);

  if (DRY) {
    console.log('[dry-run] Would upload to bucket:', BUCKET);
    console.log('[dry-run] First files:', files.slice(0, 5).map((p) => relative(publicDir, p).split(sep).join('/')));
    process.exit(0);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error('listBuckets:', listErr.message);
    process.exit(1);
  }

  const tiers = tierCandidates(maxFileBytes);
  let appliedTier: string | null = null;

  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    for (const tier of tiers) {
      const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: tier,
      });
      if (!createErr) {
        appliedTier = tier;
        console.log(`Created public bucket: ${BUCKET} (fileSizeLimit ${tier})`);
        break;
      }
    }
    if (!appliedTier) {
      console.error('createBucket: could not set a working file size limit. Check Supabase Storage settings.');
      process.exit(1);
    }
  } else {
    for (const tier of tiers) {
      const { error: updErr } = await supabase.storage.updateBucket(BUCKET, {
        public: true,
        fileSizeLimit: tier,
      });
      if (!updErr) {
        appliedTier = tier;
        console.log(`Bucket ${BUCKET} fileSizeLimit: ${tier}`);
        break;
      }
    }
    if (!appliedTier) {
      console.error('updateBucket failed for all tried limits.');
      process.exit(1);
    }
  }

  const capBytes = tierBytes(appliedTier);
  if (capBytes < maxFileBytes) {
    const needMb = Math.ceil(maxFileBytes / (1024 * 1024));
    console.error(
      `\nСейчас бакет разрешает не больше ${appliedTier} на файл, а самый большой файл — ${(maxFileBytes / 1024 / 1024).toFixed(1)} MB.`
    );
    if (mbFromTierLabel(appliedTier) <= 55) {
      console.error(
        'На бесплатном тарифе Supabase лимит Storage — 50 MB на файл (не меняется). Варианты:\n' +
          '  • Сжать видео: npm run compress:course-mp4 (нужен ffmpeg), затем снова npm run upload:course-media\n' +
          '  • Или выложить файлы на Cloudflare R2 / другой CDN и задать VITE_COURSE_MEDIA_BASE_URL на его публичный URL\n' +
          '  • Или тариф Supabase Pro и поднять Global file size limit в настройках Storage\n'
      );
    } else {
      console.error(
        `Откройте: Supabase → Project Settings → Storage → Global file size limit → ≥ ${needMb} MB (или Unlimited), затем: npm run upload:course-media\n`
      );
    }
    process.exit(1);
  }

  function isTransientUploadError(msg: string) {
    return /502|503|504|gateway|timeout|ECONNRESET|ETIMEDOUT|network|fetch failed|rate|too many/i.test(msg);
  }

  async function uploadWithRetry(storagePath: string, body: Buffer, contentType: string | undefined) {
    const maxAttempts = 5;
    let lastMsg = '';
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, body, {
        upsert: true,
        contentType,
      });
      if (!upErr) return;
      lastMsg = upErr.message;
      if (!isTransientUploadError(lastMsg) || attempt === maxAttempts) {
        throw new Error(lastMsg);
      }
      const delayMs = Math.min(12000, 600 * 2 ** (attempt - 1));
      console.warn(`  retry ${attempt}/${maxAttempts} ${storagePath}: ${lastMsg} (wait ${delayMs}ms)`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error(lastMsg);
  }

  let uploaded = 0;
  for (const absPath of files) {
    const storagePath = relative(publicDir, absPath).split(sep).join('/');
    const buf = await readFile(absPath);
    const contentType = mimeForPath(absPath);

    try {
      await uploadWithRetry(storagePath, buf, contentType);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Upload failed (${storagePath}):`, msg);
      if (/maximum allowed size|exceeded|413/i.test(msg)) {
        console.error(
          'Увеличьте Global file size limit в Supabase (Project Settings → Storage) и повторите загрузку.'
        );
      }
      process.exit(1);
    }
    uploaded += 1;
    if (uploaded % 25 === 0 || uploaded === files.length) {
      console.log(`  ${uploaded}/${files.length} …`);
    }
  }

  const base = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
  console.log('\nDone.');
  console.log(`Set in Vercel / .env.production:\n  VITE_COURSE_MEDIA_BASE_URL="${base}"`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
