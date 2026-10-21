import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import {
  getWelcomeVideoOfferExpiresAt,
  isWelcomeVideoOfferOpen,
  isWelcomeVideoSequenceEligible,
  canPurchaseWelcomeVideoOffer,
} from '../shared/welcomeVideoOffer.ts';
import { resolveActivationTariffType } from '../shared/paymentActivation.ts';
import { createWelcomeVideoOfferRoutes } from '../server/routes/welcomeVideoOfferRoutes.ts';
import type { DbClient } from '../server/types/dbClient.ts';

const now = Date.parse('2026-09-22T12:00:00.000Z');

test('each visit renews the video bonus and preserves a pending payment', async () => {
  for (const status of ['standard', 'expired', 'claimed', 'offer', 'sequence']) {
    let row = { user_id: 1, status, next_video_index: 3, offer_expires_at: new Date(now).toISOString(), payment_id: 42 };
    const db = {
      from: () => {
        let patch: Record<string, unknown> | undefined;
        const query = {
          select: () => query,
          eq: () => query,
          update: (value: Record<string, unknown>) => { patch = value; return query; },
          maybeSingle: async () => {
            if (patch) row = { ...row, ...patch };
            return { data: { ...row }, error: null };
          },
        };
        return query;
      },
    } as unknown as DbClient;
    const router = createWelcomeVideoOfferRoutes(db, (_req, _res, next) => next());
    const invoke = async (path: string, bodyInput?: unknown) => {
      const layer = router.stack.find((item: any) => item.route?.path === path)!;
      let body: any;
      let statusCode = 200;
      const response = {
        json: (value: unknown) => { body = value; },
        status: (value: number) => { statusCode = value; return response; },
      };
      const handle = layer.route.stack.at(-1).handle as unknown as
        (request: { userId: number; body: unknown }, response: unknown, next: () => void) => Promise<void>;
      await handle({ userId: 1, body: bodyInput }, response, () => {});
      assert.equal(statusCode, 200);
      return body;
    };
    for (let visit = 0; visit < 2; visit++) {
      assert.deepEqual(await invoke('/welcome-video-offer/visit'), {
        mode: 'sequence', nextVideoIndex: 0, offerExpiresAt: null, offerUsed: false,
      });
      assert.equal(row.payment_id, 42);
      const second = await invoke('/welcome-video-offer/video-complete', { videoIndex: 0 });
      assert.equal(second.mode, 'sequence');
      assert.equal(second.nextVideoIndex, 1);
      const third = await invoke('/welcome-video-offer/video-complete', { videoIndex: 1 });
      assert.equal(third.mode, 'sequence');
      assert.equal(third.offerExpiresAt, null);
      assert.equal(canPurchaseWelcomeVideoOffer(row), false);
      const started = await invoke('/welcome-video-offer/video-complete', { videoIndex: 2 });
      assert.equal(started.mode, 'offer');
      assert.equal(isWelcomeVideoOfferOpen(started.offerExpiresAt), true);
      assert.equal(row.payment_id, 42);
    }
  }
});

test('bonus purchase requires the final video to finish and an open deadline', () => {
  const offer = {status: 'sequence', next_video_index: 2, offer_expires_at: null};
  assert.equal(canPurchaseWelcomeVideoOffer(offer, now), false);
  assert.equal(canPurchaseWelcomeVideoOffer(offer, now + 30 * 60_000), false);
  for (const next_video_index of [0, 1]) {
    assert.equal(canPurchaseWelcomeVideoOffer({...offer, next_video_index}, now), false);
  }
  for (const status of ['standard', 'claimed', 'expired']) {
    assert.equal(canPurchaseWelcomeVideoOffer({...offer, status}, now), false);
  }
  const running = {...offer, status: 'offer', offer_expires_at: getWelcomeVideoOfferExpiresAt(now)};
  assert.equal(canPurchaseWelcomeVideoOffer(running, now), true);
  assert.equal(canPurchaseWelcomeVideoOffer(running, now + 10 * 60_000), false);
  assert.equal(canPurchaseWelcomeVideoOffer({...running, offer_expires_at: null}, now), false);
});

test('registration video sequence is available through the first 10 minutes only', () => {
  assert.equal(isWelcomeVideoSequenceEligible(now - 10 * 60_000, now), true);
  assert.equal(isWelcomeVideoSequenceEligible(now - 10 * 60_000 - 1, now), false);
  assert.equal(isWelcomeVideoSequenceEligible(now + 1, now), false);
});

test('bonus deadline is exactly 10 minutes after the final video and closes at the deadline', () => {
  const expiry = getWelcomeVideoOfferExpiresAt(now);
  assert.equal(expiry, '2026-09-22T12:10:00.000Z');
  assert.equal(isWelcomeVideoOfferOpen(expiry, now), true);
  assert.equal(isWelcomeVideoOfferOpen(expiry, now + 10 * 60_000), false);
});

test('only a promo-marked payment switches three-month charge to six-month activation', () => {
  assert.equal(resolveActivationTariffType('three_month', 'six_month'), 'six_month');
  assert.equal(resolveActivationTariffType('three_month', null), 'three_month');
  assert.equal(resolveActivationTariffType('three_month', 'not-a-tariff'), 'three_month');
});

test('welcome offer migration enforces unique user state and an expiry for open offers', async () => {
  const db = await PGlite.create();
  try {
    await db.exec('CREATE TABLE users(id BIGINT PRIMARY KEY); CREATE TABLE payments(id BIGINT PRIMARY KEY);');
    await db.exec(await readFile(new URL('../db/migrations/188_welcome_video_bonus_offer.sql', import.meta.url), 'utf8'));
    await db.exec('INSERT INTO users(id) VALUES (1); INSERT INTO welcome_video_offers(user_id,status,next_video_index) VALUES (1,\'sequence\',0);');
    await assert.rejects(db.exec("INSERT INTO welcome_video_offers(user_id,status,next_video_index) VALUES (1,'sequence',0)"));
    await assert.rejects(db.exec("UPDATE welcome_video_offers SET status='offer' WHERE user_id=1"));
    await db.exec("UPDATE welcome_video_offers SET status='offer',offer_expires_at=now()+interval '10 minutes' WHERE user_id=1");
    await db.exec("UPDATE welcome_video_offers SET status='claimed' WHERE user_id=1");
  } finally {
    await db.close();
  }
});
