import type { VercelRequest } from '@vercel/node';

export function parseBody(body: unknown): Record<string, unknown> {
  if (body == null) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
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

export function getRequestPathname(req: VercelRequest): string {
  const url = req.url || (req as { originalUrl?: string }).originalUrl || '';
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
