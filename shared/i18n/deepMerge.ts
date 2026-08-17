export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Record<string, unknown>,
): T {
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const b = base[key];
    const o = override[key];
    if (
      o &&
      typeof o === 'object' &&
      !Array.isArray(o) &&
      b &&
      typeof b === 'object' &&
      !Array.isArray(b)
    ) {
      out[key] = deepMerge(
        b as Record<string, unknown>,
        o as Record<string, unknown>,
      );
    } else if (o !== undefined) {
      out[key] = o;
    }
  }
  return out as T;
}
