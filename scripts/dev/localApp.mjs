/** Start the existing local PGlite database together with the app. */
import 'dotenv/config';
import { existsSync } from 'node:fs';
import { createConnection } from 'node:net';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

async function portIsOpen(host, port) {
  return new Promise((resolveResult) => {
    const socket = createConnection({ host, port });
    const finish = (open) => { socket.destroy(); resolveResult(open); };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(1500, () => finish(false));
  });
}

let localDb;
let localSocket;
const dataDir = resolve(process.env.PGLITE_DATA || 'tmp/pglite-data');
const databaseUrl = process.env.DATABASE_URL?.trim();
if (databaseUrl) {
  const address = new URL(databaseUrl);
  const isLocal = ['localhost', '127.0.0.1'].includes(address.hostname);
  const port = Number(address.port || 5432);
  // Reuse an existing PostgreSQL/tunnel. Never initialize an empty database
  // or attempt to start one for a remote DATABASE_URL.
  if (isLocal && !(await portIsOpen(address.hostname, port))) {
    if (!existsSync(dataDir)) {
      throw new Error('Lokal PostgreSQL ishlamayapti va mavjud PGlite bazasi topilmadi. Bazani ishga tushiring.');
    }
    const { PGlite } = await import('@electric-sql/pglite');
    const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');
    localDb = await PGlite.create({ dataDir });
    localSocket = new PGLiteSocketServer({ db: localDb, port, host: '127.0.0.1', maxConnections: 1 });
    try {
      await localSocket.start();
    } catch (error) {
      await localDb.close();
      throw error;
    }
    process.env.PG_POOL_MAX = '1';
    console.log(`[local-dev] Mavjud lokal baza tayyor: 127.0.0.1:${port}`);
  }
}

const app = spawn(process.execPath, ['--disable-warning=DEP0169', '--import', 'tsx', 'server.ts', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});
let stopping = false;
let forceStop;
const stop = () => {
  if (stopping) return;
  stopping = true;
  app.kill('SIGTERM');
  forceStop = setTimeout(() => app.kill('SIGKILL'), 5000);
  forceStop.unref();
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
app.once('error', (error) => { console.error('[local-dev]', error.message); stop(); });
app.once('exit', async (code) => {
  clearTimeout(forceStop);
  try {
    await localSocket?.stop();
    await localDb?.close();
  } finally {
    process.exit(stopping ? 0 : code ?? 1);
  }
});
