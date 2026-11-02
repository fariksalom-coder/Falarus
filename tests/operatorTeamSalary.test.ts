import test from 'node:test';
import assert from 'node:assert/strict';
import { isTeamDay, isTeamOperator, teamFundForSales } from '../server/operator/salary';

test('team fund: highest daily tier reached, tiers do not add up', () => {
  assert.equal(teamFundForSales(6).amount, 0);
  assert.deepEqual(teamFundForSales(6), { sales: 6, amount: 0, nextTarget: 7, nextAmount: 150000, remainingToNext: 1 });
  assert.equal(teamFundForSales(7).amount, 150000);
  assert.equal(teamFundForSales(10).amount, 250000);
  assert.equal(teamFundForSales(14).amount, 250000);
  assert.equal(teamFundForSales(15).amount, 500000);
  assert.equal(teamFundForSales(20).amount, 750000);
  assert.equal(teamFundForSales(31).nextTarget, null);
});

test('team scheme starts in November for Laziz, Sarvinoz and Raksana only', () => {
  assert.equal(isTeamDay('2026-10-31'), false);
  assert.equal(isTeamDay('2026-11-01'), true);
  assert.deepEqual([1, 2, 3, 4].filter(isTeamOperator), [1, 2, 4]);
});
