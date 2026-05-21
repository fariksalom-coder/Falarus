/**
 * Downloads everything from Supabase Storage bucket `course-assets` to a local folder,
 * preserving directory structure. Mirror of scripts/upload-course-media.ts.
 *
 * Requires in .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: COURSE_MEDIA_BUCKET (default: course-assets)
 *           COURSE_MEDIA_TARGET (default: ./public)
 *
 * Result layout: ${COURSE_MEDIA_TARGET}/courses/...  (matches courseAssetUrl paths)
 *
 * Usage:
 *   COURSE_MEDIA_TARGET=/var/www/falarus-media npx tsx scripts/download-course-media.ts
 *   npx tsx scripts/download-course-media.ts --dry-run
 *   npx tsx scripts/download-course-media.ts --force      # re-download existing files
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile, stat } from 'fs/promises';
import { dirname, join, resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

const BUCKET = (process.env.COURSE_MEDIA_BUCKET ?? 'course-assets').trim();
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET = resolve(process.cwd(), process.env.COURSE_MEDIA_TARGET ?? './public');
const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Entry = { path: string; size: number };

async function listAll(prefix = ''): Promise<Entry[]> {
  const out: Entry[] = [];
  const limit = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`list(${prefix || '/'}) failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      const isFolder = item.id === null && item.metadata === null;
      if (isFolder) {
        const nested = await listAll(fullPath);
        out.push(...nested);
      } else {
        out.push({ path: fullPath, size: item.metadata?.size ?? 0 });
      }
    }
    if (data.length < limit) break;
    offset += data.length;
  }
  return out;
}

async function existsWithSize(localPath: string, expected: number): Promise<boolean> {
  try {
    const s = await stat(localPath);
    return s.isFile() && (expected === 0 || s.size === expected);
  } catch {
    return false;
  }
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function downloadOne(entry: Entry): Promise<'downloaded' | 'skipped' | 'failed'> {
  const localPath = join(TARGET, entry.path);
  if (!FORCE && (await existsWithSize(localPath, entry.size))) {
    return 'skipped';
  }
  if (DRY) {
    console.log(`would download ${entry.path} (${fmtBytes(entry.size)}) → ${localPath}`);
    return 'downloaded';
  }
  const { data, error } = await supabase.storage.from(BUCKET).download(entry.path);
  if (error || !data) {
    console.error(`  FAIL ${entry.path}: ${error?.message ?? 'no data'}`);
    return 'failed';
  }
  await mkdir(dirname(localPath), { recursive: true });
  const buf = Buffer.from(await data.arrayBuffer());
  await writeFile(localPath, buf);
  return 'downloaded';
}

async function main() {
  console.log(`Bucket:   ${BUCKET}`);
  console.log(`Target:   ${TARGET}`);
  console.log(`Mode:     ${DRY ? 'DRY-RUN' : FORCE ? 'FORCE re-download' : 'incremental (skip existing)'}`);
  console.log('Listing files…');

  const entries = await listAll('');
  const total = entries.reduce((a, e) => a + e.size, 0);
  console.log(`Found ${entries.length} files, ${fmtBytes(total)} total\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let bytes = 0;

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const tag = `[${i + 1}/${entries.length}]`;
    const res = await downloadOne(e);
    if (res === 'downloaded') {
      downloaded++;
      bytes += e.size;
      console.log(`${tag} ok  ${e.path}  (${fmtBytes(e.size)})`);
    } else if (res === 'skipped') {
      skipped++;
      if ((i + 1) % 25 === 0) console.log(`${tag} skip (already present)`);
    } else {
      failed++;
    }
  }

  console.log('');
  console.log(`Done. downloaded=${downloaded} (${fmtBytes(bytes)}), skipped=${skipped}, failed=${failed}`);
  if (failed > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
