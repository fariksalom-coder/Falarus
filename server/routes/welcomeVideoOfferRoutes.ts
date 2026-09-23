import { Router, type Request, type Response } from 'express';
import type { DbClient } from '../types/dbClient';
import { getWelcomeVideoOfferExpiresAt, isWelcomeVideoOfferOpen, isWelcomeVideoSequenceEligible } from '../../shared/welcomeVideoOffer';

type OfferRow = {
  user_id: number;
  status: 'sequence' | 'standard' | 'offer' | 'claimed' | 'expired';
  next_video_index: number;
  offer_expires_at: string | null;
  payment_id: number | null;
};

function toClientState(row: OfferRow) {
  const expired = row.status === 'offer' && row.offer_expires_at && !isWelcomeVideoOfferOpen(row.offer_expires_at);
  return {
    mode: expired ? 'standard' : row.status === 'sequence' ? 'sequence' : row.status === 'offer' ? 'offer' : 'standard',
    nextVideoIndex: row.status === 'sequence' ? Number(row.next_video_index) : null,
    offerExpiresAt: !expired && row.status === 'offer' ? row.offer_expires_at : null,
    offerUsed: row.status === 'claimed' || row.status === 'expired' || Boolean(expired),
  } as const;
}

async function getOrCreateOffer(db: DbClient, userId: number): Promise<OfferRow> {
  const { data: current, error: readErr } = await db
    .from('welcome_video_offers')
    .select('user_id, status, next_video_index, offer_expires_at, payment_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (current) return current as OfferRow;

  const { data: user, error: userErr } = await db.from('users').select('created_at').eq('id', userId).maybeSingle();
  if (userErr) throw userErr;
  if (!user?.created_at) throw new Error('User registration time is missing');
  const status = isWelcomeVideoSequenceEligible(String(user.created_at)) ? 'sequence' : 'standard';
  const { data: inserted, error: insertErr } = await db
    .from('welcome_video_offers')
    .insert({ user_id: userId, status, next_video_index: 0 })
    .select('user_id, status, next_video_index, offer_expires_at, payment_id')
    .maybeSingle();
  if (!insertErr && inserted) return inserted as OfferRow;

  // Concurrent first requests may race on the user_id primary key; use the winner's row.
  const { data: raced, error: raceErr } = await db
    .from('welcome_video_offers')
    .select('user_id, status, next_video_index, offer_expires_at, payment_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (raceErr || !raced) throw insertErr ?? raceErr ?? new Error('Welcome offer state could not be created');
  return raced as OfferRow;
}

export function createWelcomeVideoOfferRoutes(
  db: DbClient,
  authenticate: (req: Request, res: Response, next: () => void) => void,
) {
  const router = Router();

  router.get('/welcome-video-offer', authenticate, async (req: any, res: Response) => {
    try {
      let row = await getOrCreateOffer(db, Number(req.userId));
      if (row.status === 'offer' && row.offer_expires_at && !isWelcomeVideoOfferOpen(row.offer_expires_at)) {
        await db.from('welcome_video_offers').update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('user_id', Number(req.userId)).eq('status', 'offer');
        row = { ...row, status: 'expired' };
      }
      return res.json(toClientState(row));
    } catch (error) {
      console.error('[welcome-video-offer/status]', error);
      return res.status(500).json({ error: 'WELCOME_OFFER_UNAVAILABLE' });
    }
  });

  router.post('/welcome-video-offer/start', authenticate, async (req: any, res: Response) => {
    const userId = Number(req.userId);
    try {
      const row = await getOrCreateOffer(db, userId);
      if (row.status !== 'sequence' || Number(row.next_video_index) !== 2) return res.json(toClientState(row));
      const now = new Date();
      const { data: updated, error } = await db.from('welcome_video_offers').update({
        status: 'offer',
        next_video_index: 3,
        offer_expires_at: getWelcomeVideoOfferExpiresAt(now.getTime()),
        updated_at: now.toISOString(),
      }).eq('user_id', userId).eq('status', 'sequence').eq('next_video_index', 2)
        .select('user_id, status, next_video_index, offer_expires_at, payment_id').maybeSingle();
      if (error) throw error;
      return res.json(toClientState(updated ?? await getOrCreateOffer(db, userId)));
    } catch (error) {
      console.error('[welcome-video-offer/start]', error);
      return res.status(500).json({ error: 'WELCOME_OFFER_UNAVAILABLE' });
    }
  });

  router.post('/welcome-video-offer/video-complete', authenticate, async (req: any, res: Response) => {
    const userId = Number(req.userId);
    const index = Number(req.body?.videoIndex);
    if (!Number.isInteger(index) || index < 0 || index > 2) return res.status(400).json({ error: 'INVALID_VIDEO_INDEX' });
    try {
      const row = await getOrCreateOffer(db, userId);
      if (row.status !== 'sequence' || Number(row.next_video_index) !== index) return res.json(toClientState(row));
      const now = new Date();
      const patch = index === 2
        ? { status: 'offer', next_video_index: 3, offer_expires_at: getWelcomeVideoOfferExpiresAt(now.getTime()), updated_at: now.toISOString() }
        : { next_video_index: index + 1, updated_at: now.toISOString() };
      const { data: updated, error } = await db.from('welcome_video_offers').update(patch)
        .eq('user_id', userId).eq('status', 'sequence').eq('next_video_index', index)
        .select('user_id, status, next_video_index, offer_expires_at, payment_id').maybeSingle();
      if (error) throw error;
      const latest = updated ?? await getOrCreateOffer(db, userId);
      return res.json(toClientState(latest as OfferRow));
    } catch (error) {
      console.error('[welcome-video-offer/video-complete]', error);
      return res.status(500).json({ error: 'WELCOME_OFFER_UNAVAILABLE' });
    }
  });

  return router;
}
