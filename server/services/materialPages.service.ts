/**
 * DARS MATERIALLARINI QAYTA ISHLASH.
 *
 *  - PowerPoint/Word (pptx, ppt, docx, doc, odp, odt) → PDF: LibreOffice (headless), navbat bilan
 *    bittadan, vaqt chegarasi bilan. Asl fayl o'chiriladi, material PDF bo'lib qoladi.
 *  - PDF sahifasi → WebP rasm (poppler `pdftoppm` + sharp), so'ralganda chiziladi va diskda saqlanadi.
 *    Telefon butun kitobni emas, faqat kerakli sahifani (~50–150 KB) yuklaydi.
 *  - Rasm → kichraytirilgan WebP (EXIF burilishi to'g'rilanadi).
 *
 * Tashqi dasturlar ishonchsiz fayl o'qiydi: har biri alohida jarayonda, vaqt chegarasi bilan,
 * qobiq (shell)siz chaqiriladi.
 */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { PAGE_WIDTHS, type PageWidth } from '../../shared/teacherMaterials.js';

export type PagesQuery = (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
export type PagesDeps = {
  q: PagesQuery | null;
  privateDir: string;
  /** Sinovlarda almashtiriladi. */
  bin?: { soffice?: string; pdftoppm?: string; pdfinfo?: string };
};

const CONVERT_TIMEOUT_MS = 180_000;
const RENDER_TIMEOUT_MS = 30_000;
const MAX_PARALLEL_RENDERS = 2;
const WEBP_QUALITY = 76;

class ToolError extends Error {}

/** Dasturni ishga tushiradi; stdout ni Buffer qilib qaytaradi. Vaqt o'tsa — o'ldiriladi. */
function run(cmd: string, args: string[], timeoutMs: number, env?: NodeJS.ProcessEnv): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: env ?? process.env });
    const out: Buffer[] = [];
    let err = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new ToolError(`${path.basename(cmd)}: vaqt tugadi`)); }, timeoutMs);
    child.stdout.on('data', (c: Buffer) => out.push(c));
    child.stderr.on('data', (c: Buffer) => { if (err.length < 2000) err += String(c); });
    child.on('error', (e) => { clearTimeout(timer); reject(new ToolError(`${path.basename(cmd)}: ${e.message}`)); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(Buffer.concat(out));
      else reject(new ToolError(`${path.basename(cmd)} (${code}): ${err.trim().slice(0, 300)}`));
    });
  });
}

/** Eng yaqin standart kenglik — kesh hajmi cheksiz o'smasin. */
export function pageWidthFor(raw: unknown): PageWidth {
  const n = Number(raw) || 1280;
  return PAGE_WIDTHS.find((w) => w >= n) ?? PAGE_WIDTHS[PAGE_WIDTHS.length - 1];
}

/** Material uchun sahifa rasmlari papkasi (material o'chirilganda butunlay o'chiriladi). */
export const pagesDirOf = (privateDir: string, privatePath: string) => path.join(privateDir, `${privatePath}.pages`);

export function createMaterialPages(deps: PagesDeps) {
  const bin = { soffice: 'soffice', pdftoppm: 'pdftoppm', pdfinfo: 'pdfinfo', ...deps.bin };
  const inFlight = new Map<string, Promise<string>>();
  let active = 0;
  const waiting: Array<() => void> = [];
  const slot = async () => {
    if (active >= MAX_PARALLEL_RENDERS) await new Promise<void>((r) => waiting.push(r));
    active++;
  };
  const release = () => { active--; waiting.shift()?.(); };
  // LibreOffice bittadan: u ko'p xotira oladi va bitta profilni bir vaqtda ikki jarayon buzadi.
  let convertChain: Promise<unknown> = Promise.resolve();

  async function pageCount(pdfPath: string): Promise<number> {
    // Ochish paroli bor PDF da pdfinfo xato bilan chiqadi — chaqiruvchi buni «ochilmadi» deb ko'rsatadi.
    const info = String(await run(bin.pdfinfo, [pdfPath], 20_000));
    const n = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
    if (!n) throw new ToolError('PDF sahifalari oʻqilmadi');
    return n;
  }

  /** Sahifa (yoki rasm) WebP faylining yo'li; yo'q bo'lsa chiziladi. */
  function renderPage(m: { private_path: string; kind: string }, page: number, width: PageWidth): Promise<string> {
    const dir = path.join(pagesDirOf(deps.privateDir, m.private_path), `w${width}`);
    const file = path.join(dir, `${page}.webp`);
    if (fs.existsSync(file)) return Promise.resolve(file);
    const running = inFlight.get(file);
    if (running) return running;
    const job = (async () => {
      await slot();
      try {
        const source = path.join(deps.privateDir, m.private_path);
        const raster = m.kind === 'image'
          ? fs.readFileSync(source)
          : await run(bin.pdftoppm, ['-f', String(page), '-l', String(page), '-singlefile', '-scale-to-x', String(width), '-scale-to-y', '-1', '-png', source], RENDER_TIMEOUT_MS);
        if (!raster.length) throw new ToolError('Sahifa chizilmadi');
        const webp = await sharp(raster, { limitInputPixels: 80_000_000 })
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .flatten({ background: '#ffffff' })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();
        fs.mkdirSync(dir, { recursive: true });
        const tmp = `${file}.${crypto.randomBytes(4).toString('hex')}.tmp`;
        fs.writeFileSync(tmp, webp, { mode: 0o640 });
        fs.renameSync(tmp, file);
        return file;
      } finally {
        release();
        inFlight.delete(file);
      }
    })();
    inFlight.set(file, job);
    return job;
  }

  /** PowerPoint/Word → PDF. Natija: shu papkadagi yangi .pdf yo'li. */
  function convertToPdf(sourcePath: string): Promise<string> {
    const job = convertChain.then(async () => {
      const work = fs.mkdtempSync(path.join(os.tmpdir(), 'falarus-convert-'));
      try {
        // Profil har safar yangidan: oldingi faylning holati keyingisiga o'tmasin.
        await run(bin.soffice, [
          `-env:UserInstallation=file://${path.join(work, 'profile')}`,
          '--headless', '--norestore', '--nologo', '--nodefault', '--nolockcheck',
          '--convert-to', 'pdf', '--outdir', work, sourcePath,
        ], CONVERT_TIMEOUT_MS, { ...process.env, HOME: work });
        const produced = path.join(work, `${path.basename(sourcePath, path.extname(sourcePath))}.pdf`);
        if (!fs.existsSync(produced) || fs.statSync(produced).size === 0) throw new ToolError('Fayl PDF ga aylanmadi');
        const target = sourcePath.replace(/\.[a-z0-9]+$/i, '') + '.pdf';
        fs.copyFileSync(produced, target);
        fs.chmodSync(target, 0o640);
        return target;
      } finally {
        fs.rmSync(work, { recursive: true, force: true });
      }
    });
    convertChain = job.catch(() => undefined);
    return job;
  }

  /** Yuklangan PowerPoint/Word ni fon rejimida PDF ga aylantiradi va materialni «tayyor» qiladi. */
  async function processOffice(materialId: number) {
    const q = deps.q;
    if (!q) return;
    const m = (await q(`SELECT id, private_path FROM teacher_materials WHERE id = $1 AND status = 'processing'`, [materialId])).rows[0];
    if (!m) return;
    const source = path.join(deps.privateDir, m.private_path);
    try {
      const pdf = await convertToPdf(source);
      const pages = await pageCount(pdf);
      const rel = path.relative(deps.privateDir, pdf);
      const size = fs.statSync(pdf).size;
      const done = await q(`UPDATE teacher_materials SET status = 'ready', kind = 'pdf', mime = 'application/pdf', private_path = $2,
        size_bytes = $3, page_count = $4, error = NULL, updated_at = now() WHERE id = $1 AND status = 'processing' RETURNING id`, [m.id, rel, size, pages]);
      if (done.rows[0]) fs.rmSync(source, { force: true });
      else fs.rmSync(pdf, { force: true }); // shu orada o'chirilgan
    } catch (e) {
      console.error('[materials] convert', materialId, (e as Error).message);
      await q(`UPDATE teacher_materials SET status = 'failed', error = $2, updated_at = now() WHERE id = $1`,
        [m.id, 'Faylni ochib boʻlmadi. PowerPoint/Word da «PDF qilib saqlash» bilan PDF yuklang.']).catch(() => undefined);
    }
  }

  /** Server qayta ishga tushganda chala qolgan aylantirishlar davom ettiriladi. */
  async function resume() {
    if (!deps.q) return;
    const rows = (await deps.q(`SELECT id FROM teacher_materials WHERE status = 'processing' ORDER BY id`)).rows;
    for (const r of rows) void processOffice(Number(r.id));
  }

  return { pageCount, renderPage, convertToPdf, processOffice, resume };
}

export type MaterialPages = ReturnType<typeof createMaterialPages>;
