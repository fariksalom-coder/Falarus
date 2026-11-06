type AppleResult = {
  provider?: string;
  result?: {
    idToken?: string;
    authorizationCode?: string;
    accessToken?: { token?: string } | null;
    profile?: { givenName?: string; familyName?: string };
  };
};

/** Both Capgo 7.x native bridge formats carry the same raw authorization code. */
export function readAppleCredential(login: AppleResult, nonce: string) {
  if (login.provider !== 'apple') throw new Error('Apple javobi mos kelmadi. Qayta urinib ko‘ring.');
  const identityToken = login.result?.idToken;
  const authorizationCode = login.result?.authorizationCode || login.result?.accessToken?.token;
  if (!identityToken) throw new Error('Apple identity tokenini qaytarmadi. Qayta urinib ko‘ring.');
  if (!authorizationCode) throw new Error('Apple kirish kodini qaytarmadi. Ilovani yangilab qayta urinib ko‘ring.');
  return { identityToken, authorizationCode, nonce,
    firstName: login.result?.profile?.givenName,
    lastName: login.result?.profile?.familyName };
}
