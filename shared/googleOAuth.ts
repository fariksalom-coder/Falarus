/** Public Google OAuth Web client ID (same as mobile `GOOGLE_SERVER_CLIENT_ID`). */
export const FALARUS_GOOGLE_WEB_CLIENT_ID =
  '76774374355-nipao16d92mfk24kfk5nd11lrji7i07c.apps.googleusercontent.com';

const GOOGLE_CLIENT_ID_RE = /^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/;

export function parseGoogleClientIds(...values: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (!value) continue;
    for (const raw of value.split(/[\s,;]+/)) {
      const clientId = raw.trim();
      if (!clientId || seen.has(clientId)) continue;
      seen.add(clientId);
      out.push(clientId);
    }
  }

  return out;
}

export function isGoogleOAuthClientId(value: string | null | undefined): value is string {
  return typeof value === 'string' && GOOGLE_CLIENT_ID_RE.test(value.trim());
}

export function resolveGoogleWebClientId(
  env: {
    GOOGLE_OAUTH_WEB_CLIENT_ID?: string;
    GOOGLE_OAUTH_SERVER_CLIENT_ID?: string;
    VITE_GOOGLE_OAUTH_WEB_CLIENT_ID?: string;
  } = {},
): string {
  return resolveGoogleWebClientIds(env)[0] ?? FALARUS_GOOGLE_WEB_CLIENT_ID;
}

export function resolveGoogleWebClientIds(
  env: {
    GOOGLE_OAUTH_WEB_CLIENT_ID?: string;
    GOOGLE_OAUTH_SERVER_CLIENT_ID?: string;
    VITE_GOOGLE_OAUTH_WEB_CLIENT_ID?: string;
  } = {},
): string[] {
  const configured = parseGoogleClientIds(
    env.VITE_GOOGLE_OAUTH_WEB_CLIENT_ID,
    env.GOOGLE_OAUTH_WEB_CLIENT_ID,
    env.GOOGLE_OAUTH_SERVER_CLIENT_ID,
  );
  return configured.length > 0 ? configured : [FALARUS_GOOGLE_WEB_CLIENT_ID];
}

export function resolveGoogleAllowedAudiences(
  env: {
    GOOGLE_OAUTH_IOS_CLIENT_ID?: string;
    GOOGLE_OAUTH_ANDROID_CLIENT_ID?: string;
    GOOGLE_OAUTH_WEB_CLIENT_ID?: string;
    GOOGLE_OAUTH_SERVER_CLIENT_ID?: string;
    VITE_GOOGLE_OAUTH_WEB_CLIENT_ID?: string;
  } = {},
): string[] {
  const configured = parseGoogleClientIds(
    env.GOOGLE_OAUTH_IOS_CLIENT_ID,
    env.GOOGLE_OAUTH_ANDROID_CLIENT_ID,
    env.GOOGLE_OAUTH_WEB_CLIENT_ID,
    env.GOOGLE_OAUTH_SERVER_CLIENT_ID,
    env.VITE_GOOGLE_OAUTH_WEB_CLIENT_ID,
  );
  return configured.length > 0 ? configured : [FALARUS_GOOGLE_WEB_CLIENT_ID];
}
