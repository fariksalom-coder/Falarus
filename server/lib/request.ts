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

