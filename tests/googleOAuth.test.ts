import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FALARUS_GOOGLE_WEB_CLIENT_ID,
  isGoogleOAuthClientId,
  parseGoogleClientIds,
  resolveGoogleAllowedAudiences,
  resolveGoogleWebClientId,
} from '../shared/googleOAuth.ts';

const WEB_ID = '1234567890-web_client.apps.googleusercontent.com';
const IOS_ID = '1234567890-ios-client.apps.googleusercontent.com';
const ANDROID_ID = '1234567890-android_client.apps.googleusercontent.com';

test('parseGoogleClientIds splits comma, semicolon, and whitespace separated values', () => {
  assert.deepEqual(
    parseGoogleClientIds(` ${WEB_ID},${IOS_ID}; ${ANDROID_ID}\n${WEB_ID} `),
    [WEB_ID, IOS_ID, ANDROID_ID],
  );
});

test('resolveGoogleAllowedAudiences accepts all configured platform client ids', () => {
  assert.deepEqual(
    resolveGoogleAllowedAudiences({
      GOOGLE_OAUTH_WEB_CLIENT_ID: WEB_ID,
      GOOGLE_OAUTH_SERVER_CLIENT_ID: `${WEB_ID}, ${IOS_ID}`,
      GOOGLE_OAUTH_ANDROID_CLIENT_ID: ANDROID_ID,
    }),
    [ANDROID_ID, WEB_ID, IOS_ID],
  );
});

test('resolveGoogleWebClientId prefers a web client id and falls back to FalaRus default', () => {
  assert.equal(resolveGoogleWebClientId({ GOOGLE_OAUTH_WEB_CLIENT_ID: `${WEB_ID}, ${IOS_ID}` }), WEB_ID);
  assert.equal(resolveGoogleWebClientId(), FALARUS_GOOGLE_WEB_CLIENT_ID);
});

test('isGoogleOAuthClientId validates Google OAuth client id shape', () => {
  assert.equal(isGoogleOAuthClientId(WEB_ID), true);
  assert.equal(isGoogleOAuthClientId('not-a-client-id'), false);
});
