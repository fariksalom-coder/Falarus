/**
 * Social sign-in (Google / Apple) verification + user provisioning.
 *
 * Security model:
 *   - We NEVER trust the client. The mobile app sends only the provider's
 *     signed ID token (Google `id_token` / Apple `identity_token`).
 *   - We verify the token's signature against the provider's published JWKS
 *     and check `aud`, `iss`, expiry, and (when supplied) `nonce`.
 *   - Then we look up `(provider, sub)` in `user_oauth_identities`:
 *       • Found  → log this user in.
 *       • Missing + verified email matches an existing local user → link.
 *       • Otherwise → create a new local user (password = NULL) and link.
 *
 * The endpoint returns the same `{ token, user }` shape as
 * `/api/auth/login` so the Flutter client treats it identically.
 */

import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveGoogleAllowedAudiences } from '../../shared/googleOAuth.ts';

export type SocialProvider = 'google' | 'apple';

export interface VerifiedSocialIdentity {
  provider: SocialProvider;
  /** Provider's stable user identifier (`sub` in the ID token). */
  providerUserId: string;
  /** Verified email if the provider supplied one. May be a private relay. */
  email: string | null;
  /** Provider-supplied name (Google only; Apple sends name once on first sign-in). */
  firstName: string | null;
  lastName: string | null;
}

export class SocialAuthError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly publicMessage: string,
    cause?: unknown,
  ) {
    super(publicMessage);
    this.cause = cause;
  }
}

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------

let googleClient: OAuth2Client | null = null;
function getGoogleClient(): OAuth2Client {
  if (!googleClient) googleClient = new OAuth2Client();
  return googleClient;
}

/**
 * Allowed audiences for Google ID tokens. Tokens minted for iOS, Android,
 * and web flows all have different `aud` values — accept any configured one.
 */
function getGoogleAllowedAudiences(): string[] {
  return resolveGoogleAllowedAudiences({
    GOOGLE_OAUTH_IOS_CLIENT_ID: process.env.GOOGLE_OAUTH_IOS_CLIENT_ID,
    GOOGLE_OAUTH_ANDROID_CLIENT_ID: process.env.GOOGLE_OAUTH_ANDROID_CLIENT_ID,
    GOOGLE_OAUTH_WEB_CLIENT_ID: process.env.GOOGLE_OAUTH_WEB_CLIENT_ID,
    GOOGLE_OAUTH_SERVER_CLIENT_ID: process.env.GOOGLE_OAUTH_SERVER_CLIENT_ID,
  });
}

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedSocialIdentity> {
  const audiences = getGoogleAllowedAudiences();
  if (audiences.length === 0) {
    throw new SocialAuthError(500, 'Google OAuth not configured on server');
  }
  let payload: TokenPayload | undefined;
  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken,
      audience: audiences,
    });
    payload = ticket.getPayload();
  } catch (err) {
    throw new SocialAuthError(401, 'Google identifikatsiyasi tasdiqlanmadi', err);
  }
  if (!payload || !payload.sub) {
    throw new SocialAuthError(401, 'Google identifikatsiyasi tasdiqlanmadi');
  }
  // verifyIdToken already checks aud + iss + exp, but be defensive about iss.
  if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
    throw new SocialAuthError(401, 'Google identifikatsiyasi tasdiqlanmadi');
  }
  // Reject unverified emails so we never link to someone else's account.
  const email =
    payload.email && payload.email_verified === true ? payload.email.toLowerCase() : null;
  return {
    provider: 'google',
    providerUserId: payload.sub,
    email,
    firstName: typeof payload.given_name === 'string' ? payload.given_name : null,
    lastName: typeof payload.family_name === 'string' ? payload.family_name : null,
  };
}

// ---------------------------------------------------------------------------
// Apple
// ---------------------------------------------------------------------------

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const APPLE_ISSUER = 'https://appleid.apple.com';

function getAppleAllowedAudiences(): string[] {
  // Comma-separated to allow main app + extension bundle IDs if needed.
  const raw = process.env.APPLE_AUDIENCES || process.env.APPLE_BUNDLE_ID || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function verifyAppleIdentityToken(
  identityToken: string,
  options: { firstName?: string | null; lastName?: string | null; nonce?: string | null } = {},
): Promise<VerifiedSocialIdentity> {
  const audiences = getAppleAllowedAudiences();
  if (audiences.length === 0) {
    throw new SocialAuthError(500, 'Apple Sign In serverda sozlanmagan');
  }
  let payload: JWTPayload;
  try {
    const result = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: APPLE_ISSUER,
      audience: audiences,
    });
    payload = result.payload;
  } catch (err) {
    throw new SocialAuthError(401, 'Apple identifikatsiyasi tasdiqlanmadi', err);
  }
  if (!payload.sub) {
    throw new SocialAuthError(401, 'Apple identifikatsiyasi tasdiqlanmadi');
  }
  // If the client passed a nonce, the token MUST carry the same value.
  // Apple hashes the nonce (sha256) when the client sets `nonce` on the
  // request, so callers must pass the already-hashed value here if they
  // chose to hash, or the raw value otherwise. The mobile client uses the
  // raw value (sign_in_with_apple default), so we compare verbatim.
  if (options.nonce) {
    const tokenNonce = typeof payload.nonce === 'string' ? payload.nonce : null;
    if (tokenNonce !== options.nonce) {
      throw new SocialAuthError(401, 'Apple identifikatsiyasi tasdiqlanmadi');
    }
  }
  const emailVerifiedRaw = (payload as Record<string, unknown>).email_verified;
  const emailVerified = emailVerifiedRaw === true || emailVerifiedRaw === 'true';
  const rawEmail = typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
  return {
    provider: 'apple',
    providerUserId: payload.sub,
    // Apple sends `email_verified: "true"` for both real and private-relay
    // addresses. Trust it for linking; ignore otherwise.
    email: emailVerified ? rawEmail : null,
    firstName: options.firstName?.trim() || null,
    lastName: options.lastName?.trim() || null,
  };
}

// ---------------------------------------------------------------------------
// User lookup / provisioning
// ---------------------------------------------------------------------------

export interface ResolvedSocialUser {
  /** Row from `users` (selected columns from AUTH_USER_SELECT). */
  user: Record<string, unknown>;
  /** True when a new local row was inserted as part of this sign-in. */
  isNewUser: boolean;
}

const AUTH_USER_COLUMNS =
  'id, first_name, last_name, email, phone, password, level, onboarded, plan_name, plan_expires_at';

/**
 * Find or create a local user for a verified social identity.
 * Always returns a row with the selected AUTH_USER_COLUMNS.
 */
export async function findOrCreateUserForSocial(
  supabase: SupabaseClient,
  identity: VerifiedSocialIdentity,
): Promise<ResolvedSocialUser> {
  // 1) Existing link? Fast path.
  const linkLookup = await supabase
    .from('user_oauth_identities')
    .select('user_id')
    .eq('provider', identity.provider)
    .eq('provider_user_id', identity.providerUserId)
    .maybeSingle();
  if (linkLookup.error) throw linkLookup.error;

  if (linkLookup.data?.user_id != null) {
    const userId = Number(linkLookup.data.user_id);
    const r = await supabase
      .from('users')
      .select(AUTH_USER_COLUMNS)
      .eq('id', userId)
      .maybeSingle();
    if (r.error) throw r.error;
    if (r.data) {
      // Best-effort: refresh last_login_at; ignore errors.
      void supabase
        .from('user_oauth_identities')
        .update({ last_login_at: new Date().toISOString() })
        .eq('provider', identity.provider)
        .eq('provider_user_id', identity.providerUserId);
      return { user: r.data as Record<string, unknown>, isNewUser: false };
    }
  }

  // 2) No link yet. If the verified email matches an existing local user,
  //    link this provider to that account.
  if (identity.email) {
    const byEmail = await supabase
      .from('users')
      .select(AUTH_USER_COLUMNS)
      .eq('email', identity.email)
      .maybeSingle();
    if (byEmail.error) throw byEmail.error;
    if (byEmail.data) {
      const userId = Number((byEmail.data as { id: number }).id);
      await insertIdentity(supabase, userId, identity);
      return { user: byEmail.data as Record<string, unknown>, isNewUser: false };
    }
  }

  // 3) Brand new user — create with password = NULL and onboarded = 0
  //    so the existing onboarding flow runs after first login.
  const insertRow: Record<string, unknown> = {
    first_name: identity.firstName ?? '',
    last_name: identity.lastName ?? '',
    email: identity.email,
    password: null,
    onboarded: 0,
  };
  const insertResult = await supabase
    .from('users')
    .insert(insertRow)
    .select(AUTH_USER_COLUMNS)
    .single();
  if (insertResult.error) {
    // Race: another concurrent call created a user with this email.
    // Re-fetch and link.
    if (insertResult.error.code === '23505' && identity.email) {
      const retry = await supabase
        .from('users')
        .select(AUTH_USER_COLUMNS)
        .eq('email', identity.email)
        .maybeSingle();
      if (retry.error) throw retry.error;
      if (retry.data) {
        const userId = Number((retry.data as { id: number }).id);
        await insertIdentity(supabase, userId, identity);
        return { user: retry.data as Record<string, unknown>, isNewUser: false };
      }
    }
    throw insertResult.error;
  }
  const userId = Number((insertResult.data as { id: number }).id);
  await insertIdentity(supabase, userId, identity);
  return { user: insertResult.data as Record<string, unknown>, isNewUser: true };
}

async function insertIdentity(
  supabase: SupabaseClient,
  userId: number,
  identity: VerifiedSocialIdentity,
): Promise<void> {
  const { error } = await supabase.from('user_oauth_identities').insert({
    user_id: userId,
    provider: identity.provider,
    provider_user_id: identity.providerUserId,
    email_at_link: identity.email,
    last_login_at: new Date().toISOString(),
  });
  // Tolerate races: another in-flight request just inserted the same
  // (provider, provider_user_id) — that's fine.
  if (error && error.code !== '23505') {
    throw error;
  }
}
