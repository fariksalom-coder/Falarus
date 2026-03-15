/**
 * Suppress Node DEP0169 url.parse() deprecation from dependencies (e.g. busboy).
 * Import this first in Vercel serverless handlers so it runs before other modules.
 */
const orig = process.emitWarning;
process.emitWarning = function (msg: string | Error, type?: string, ...args: unknown[]) {
  const m = typeof msg === 'string' ? msg : (msg as Error)?.message ?? '';
  if (m.includes('url.parse') || m.includes('DEP0169')) return;
  return orig.apply(process, [msg, type, ...args]);
};
