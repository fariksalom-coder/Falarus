type RequestLike = {
  method?: string;
  url?: string;
  originalUrl?: string;
  headers?: Record<string, unknown>;
  userId?: number | string | null;
  requestId?: string;
};

type LogMeta = Record<string, unknown>;

function compact(meta: LogMeta): LogMeta {
  return Object.fromEntries(
    Object.entries(meta).filter(([, value]) => value !== undefined)
  );
}

function normalizeHeaderValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
}

export function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getRequestId(req?: RequestLike): string | undefined {
  if (!req) return undefined;
  if (typeof req.requestId === 'string' && req.requestId) return req.requestId;
  return normalizeHeaderValue(req.headers?.['x-request-id']);
}

export function buildRequestLogContext(
  source: string,
  req?: RequestLike,
  extra: LogMeta = {}
): LogMeta {
  return compact({
    source,
    requestId: getRequestId(req),
    method: req?.method,
    url: req?.originalUrl || req?.url,
    userId: req?.userId ?? undefined,
    ...extra,
  });
}

export function logInfo(event: string, meta: LogMeta = {}): void {
  console.log(
    JSON.stringify({
      level: 'info',
      event,
      timestamp: new Date().toISOString(),
      ...compact(meta),
    })
  );
}

export function logError(event: string, error: unknown, meta: LogMeta = {}): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      level: 'error',
      event,
      timestamp: new Date().toISOString(),
      ...compact(meta),
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
    })
  );
}
