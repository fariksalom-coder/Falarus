// Conservative text checks for clear abuse and sexual advertising. This does
// not classify photos/audio/video; those still need moderator review.
export const COMMUNITY_CONTENT_ERROR = 'Xabarda haqorat yoki nomaqbul reklama bor. Matnni o‘zgartiring yoki Yordam orqali murojaat qiling.';
const abuse = /(?:^|[^\p{L}\p{N}])(?:fuck\s+you|motherfuckers?|пош[её]л\s+нахуй|иди\s+нахуй|ебан(?:ый|ая|ые)|бляд[ьи]|пидор(?:ас(?:ы|а|ом)?|ы|а)?)(?=$|[^\p{L}\p{N}])/u;
const sexualAdvertising = /(?:pornhub|xvideos|xnxx)\s*\.\s*(?:com|net)|(?:купить|продам)\s+(?:наркотики|кокаин)|(?:buy|sell)\s+cocaine/u;
export function isObjectionableCommunityText(value: string): boolean {
  const text = value.normalize('NFKC').toLowerCase().replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '').replace(/\s+/g, ' ');
  return abuse.test(text) || sexualAdvertising.test(text);
}
export function assertCommunityTextAllowed(value: string): void {
  if (isObjectionableCommunityText(value)) throw new Error(COMMUNITY_CONTENT_ERROR);
}
