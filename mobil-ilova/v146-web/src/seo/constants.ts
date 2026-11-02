/** Canonical production origin — keep consistent with vercel / robots / sitemap */
export const SITE_ORIGIN = 'https://www.falarus.uz';

/** Default Open Graph / Twitter preview image */
export const OG_IMAGE_URL = `${SITE_ORIGIN}/icons/icon-512.png`;

export const BRAND_SHORT = 'FalaRus';

/** Target lengths per brief */
export function clipTitle(raw: string, maxLen = 62): string {
  const t = raw.trim().replace(/\s+/g, ' ');
  const suffix = ` | ${BRAND_SHORT}`;
  const budget = maxLen - suffix.length;
  if (t.length <= budget) return `${t}${suffix}`;
  const ell = '…';
  return `${t.slice(0, Math.max(8, budget - ell.length)).trimEnd()}${ell}${suffix}`;
}

export function clipDescription(raw: string, minLen = 140, maxLen = 168): string {
  let t = raw.trim().replace(/\s+/g, ' ');
  if (t.length > maxLen) t = `${t.slice(0, maxLen - 1).trimEnd()}…`;
  if (t.length < minLen && !t.endsWith('.')) t = `${t}.`;
  return t;
}
