// Express-shaped request type — minimal surface needed by the helpers
// in this file. Replaces a former @vercel/node dep so we don't pull a
// Vercel runtime package into a non-Vercel deployment.
type GenericRequest = {
  url?: string;
  originalUrl?: string;
};

function parseLooseStringBody(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const params = new URLSearchParams(raw);
    const out: Record<string, unknown> = {};
    let hasPairs = false;
    params.forEach((value, key) => {
      hasPairs = true;
      out[key] = value;
    });
    return hasPairs ? out : {};
  }
}

export function parseBody(body: unknown): Record<string, unknown> {
  if (body == null) return {};
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(body)) {
    return parseLooseStringBody(body.toString('utf8'));
  }
  if (typeof body === 'string') {
    return parseLooseStringBody(body);
  }
  return typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

export function normalizeQueryPathSegments(
  raw: string | string[] | undefined
): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const part of raw) {
      if (typeof part !== 'string' || !part.length) continue;
      part
        .split('/')
        .filter(Boolean)
        .forEach((segment) => out.push(segment));
    }
    return out;
  }
  return typeof raw === 'string' && raw.length > 0
    ? raw.split('/').filter(Boolean)
    : [];
}

export function getRequestPathname(req: GenericRequest): string {
  const url = req.url || req.originalUrl || '';
  if (!url || typeof url !== 'string') return '';
  const withoutQuery = url.split('?')[0];
  if (withoutQuery.includes('://')) {
    try {
      return new URL(withoutQuery).pathname;
    } catch {
      return withoutQuery;
    }
  }
  return withoutQuery;
}
