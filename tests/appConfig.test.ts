import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAppConfig,
  DEFAULT_APP_CONFIG,
  normalizeMedia,
  normalizeWelcomeOffer,
  secondsUntilBonus,
} from '../shared/appConfig';

test('defaults match the prices that are charged today', () => {
  const byCode = Object.fromEntries(DEFAULT_APP_CONFIG.plans.map((p) => [p.code, p]));
  assert.equal(byCode.month.priceUzs, 400_000);
  assert.equal(byCode.three_month.priceUzs, 530_000);
  assert.equal(byCode.six_month.priceUzs, 790_000);
  assert.equal(byCode.six_month.priceRub, 6_000);
  const offer = DEFAULT_APP_CONFIG.welcomeOffer;
  assert.equal(offer.finalPriceUzs, 530_000, 'offer pays the 3-month price');
  assert.equal(offer.accessTariff, 'six_month');
  assert.equal(offer.freeMonths, 3);
  assert.equal(offer.oldPriceRub, 18_000);
  assert.equal(offer.discountPercent, 78);
  assert.equal(offer.offerMinutes, 10);
});

test('admin prices from the database drive plans and the offer', () => {
  const cfg = buildAppConfig({
    prices: { month: { rub: 3_500, uzs: 450_000 }, three_month: { uzs: 600_000 } },
    welcomeOffer: { offerMinutes: 15, priceUzs: 500_000 },
  });
  const three = cfg.plans.find((p) => p.code === 'three_month')!;
  assert.equal(three.priceUzs, 600_000);
  assert.equal(three.wasRub, 10_500, 'savings follow the new monthly price');
  assert.equal(cfg.welcomeOffer.finalPriceUzs, 500_000, 'explicit offer price wins');
  assert.equal(cfg.welcomeOffer.oldPriceUzs, 2_700_000);
  assert.equal(cfg.welcomeOffer.offerMinutes, 15);
});

test('bad settings fall back instead of breaking checkout', () => {
  const o = normalizeWelcomeOffer({ offerMinutes: -5, payTariff: 'year', priceUzs: 'abc' });
  assert.equal(o.offerMinutes, 1);
  assert.equal(o.payTariff, 'three_month');
  assert.equal(o.priceUzs, null);
  const m = normalizeMedia({ courseOfferVideo: '../../etc/passwd', paymentGuideVideo: 'javascript:alert(1)' });
  assert.equal(m.courseOfferVideo, '/videos/welcome-combined.mp4');
  assert.equal(m.paymentGuideVideo, '/payment-guide/russia.mp4');
  assert.equal(normalizeMedia({ courseOfferVideo: '/videos/new-2027.mp4' }).courseOfferVideo, '/videos/new-2027.mp4');
});

test('bonus reveal point is configurable', () => {
  assert.equal(secondsUntilBonus(300, 0, 20), 280);
  assert.equal(secondsUntilBonus(300, 0, 60), 240);
  assert.equal(secondsUntilBonus(Number.NaN, 0, 20), null);
});
