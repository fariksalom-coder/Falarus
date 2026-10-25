import type { Server } from 'node:http';
import type { WebSocketServer } from 'ws';

/**
 * Bitta HTTP serverda bir nechta WebSocket manzili.
 *
 * `new WebSocketServer({ server, path })` ikkinchi marta ishlatilsa, har biri boshqasining
 * manzilini 400 bilan rad etadi (ws kutubxonasi shunday ishlaydi). Shuning uchun serverlar
 * `noServer: true` bilan yaratiladi va ulanishni shu yerdagi bitta `upgrade` tinglovchisi
 * manzil bo'yicha tarqatadi.
 */
const routes = new WeakMap<Server, Map<string, WebSocketServer>>();

export function registerWsRoute(server: Server, path: string, wss: WebSocketServer): void {
  let table = routes.get(server);
  if (!table) {
    table = new Map();
    routes.set(server, table);
    const own = table;
    server.on('upgrade', (req, socket, head) => {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
      const target = own.get(pathname);
      if (!target) {
        socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
        return;
      }
      target.handleUpgrade(req, socket, head, (ws) => target.emit('connection', ws, req));
    });
  }
  table.set(path, wss);
}
