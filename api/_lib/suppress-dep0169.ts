/**
 * Suppress Node DEP0169 url.parse() deprecation from dependencies (e.g. busboy).
 * Import this first in Vercel serverless handlers so it runs before other modules.
 */
const origEmitWarning = process.emitWarning.bind(process) as typeof process.emitWarning;

process.emitWarning = ((warning: string | Error, ...args: any[]) => {
  const message = typeof warning === 'string' ? warning : warning?.message ?? '';
  if (message.includes('url.parse') || message.includes('DEP0169')) return;
  return (origEmitWarning as any)(warning, ...args);
}) as typeof process.emitWarning;
