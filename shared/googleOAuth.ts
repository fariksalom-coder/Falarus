/** Public Google OAuth Web client ID (same as mobile `GOOGLE_SERVER_CLIENT_ID`). */
export const FALARUS_GOOGLE_WEB_CLIENT_ID =
  '76774374355-nipao16d92mfk24kfk5nd11lrji7i07c.apps.googleusercontent.com';

export function resolveGoogleWebClientId(
  env: {
    GOOGLE_OAUTH_WEB_CLIENT_ID?: string;
    GOOGLE_OAUTH_SERVER_CLIENT_ID?: string;
    VITE_GOOGLE_OAUTH_WEB_CLIENT_ID?: string;
  } = {},
): string {
  return (
    env.VITE_GOOGLE_OAUTH_WEB_CLIENT_ID?.trim() ||
    env.GOOGLE_OAUTH_WEB_CLIENT_ID?.trim() ||
    env.GOOGLE_OAUTH_SERVER_CLIENT_ID?.trim() ||
    FALARUS_GOOGLE_WEB_CLIENT_ID
  );
}
