export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Record<string, unknown>,
): T {
  const out = { ...base } as T;
  for (const key of Object.keys(override) as (keyof T)[]) {
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
      ) as T[keyof T];
    } else if (o !== undefined) {
      out[key] = o as T[keyof T];
    }
  }
  return out;
}
