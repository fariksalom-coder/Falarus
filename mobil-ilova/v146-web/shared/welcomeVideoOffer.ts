export const WELCOME_VIDEO_ELIGIBILITY_MS = 10 * 60_000;
export const WELCOME_VIDEO_OFFER_MS = 10 * 60_000;
export const WELCOME_VIDEO_BONUS_REVEAL_SECONDS = 25;

export function canPurchaseWelcomeVideoOffer(offer: {
  status: string;
  next_video_index: number;
  offer_expires_at: string | null;
}, now = Date.now()): boolean {
  // During the bonus video the countdown has not started yet.
  return (offer.status === 'sequence' && Number(offer.next_video_index) === 2)
    || (offer.status === 'offer' && Boolean(offer.offer_expires_at)
      && isWelcomeVideoOfferOpen(offer.offer_expires_at!, now));
}

export function isWelcomeVideoSequenceEligible(registeredAt: string | number | Date, now = Date.now()): boolean {
  const registeredMs = registeredAt instanceof Date ? registeredAt.getTime() : typeof registeredAt === 'number' ? registeredAt : Date.parse(registeredAt);
  return Number.isFinite(registeredMs) && now >= registeredMs && now - registeredMs <= WELCOME_VIDEO_ELIGIBILITY_MS;
}

export function isWelcomeVideoOfferOpen(expiresAt: string | number | Date, now = Date.now()): boolean {
  const expiresMs = expiresAt instanceof Date ? expiresAt.getTime() : typeof expiresAt === 'number' ? expiresAt : Date.parse(expiresAt);
  return Number.isFinite(expiresMs) && now < expiresMs;
}

export function getWelcomeVideoOfferExpiresAt(completedAt = Date.now()): string {
  return new Date(completedAt + WELCOME_VIDEO_OFFER_MS).toISOString();
}
