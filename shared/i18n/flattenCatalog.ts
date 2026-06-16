/** Flatten nested MessageCatalog to dot keys for mobile export. */
export function flattenCatalog(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out[path] = value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenCatalog(value as Record<string, unknown>, path));
    }
  }
  return out;
}
