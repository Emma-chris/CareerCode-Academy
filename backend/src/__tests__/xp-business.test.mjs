import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Pure XP business logic tests (no DB) — mirrors backend/src/models/gamification.ts
function xpToNgn(xp, rate = 0.1) { return Math.floor(xp * rate); }
function validateRedeem(xpAmount, available, settings = { minRedeem: 1000, step: 1000, redeemEnabled: true }) {
  if (!settings.redeemEnabled) throw new Error('XP redemption is disabled');
  if (!Number.isInteger(xpAmount) || xpAmount < settings.minRedeem) throw new Error(`Minimum redeem is ${settings.minRedeem} XP`);
  if (xpAmount % settings.step !== 0) throw new Error(`XP amount must be in steps of ${settings.step}`);
  if (available < xpAmount) throw new Error(`Insufficient XP. Available: ${available}`);
  return true;
}
function maxDiscountForCourse(priceAfterDiscount, maxPercent = 50) {
  return Math.floor(priceAfterDiscount * (maxPercent / 100));
}

describe('XP Business Model — 1000 XP = 100 NGN', () => {
  it('converts 1000 XP to 100 NGN at rate 0.1', () => {
    assert.equal(xpToNgn(1000, 0.1), 100);
  });
  it('converts 5000 XP to 500 NGN', () => {
    assert.equal(xpToNgn(5000, 0.1), 500);
  });
  it('converts 2500 XP with custom rate 0.2 to 500 NGN (admin customizable)', () => {
    assert.equal(xpToNgn(2500, 0.2), 500);
  });
  it('validates redeem requires 1000 step', () => {
    assert.throws(() => validateRedeem(1500, 5000), /steps/);
  });
  it('validates insufficient XP', () => {
    assert.throws(() => validateRedeem(2000, 1000), /Insufficient/);
  });
  it('validates disabled redeem', () => {
    assert.throws(() => validateRedeem(1000, 5000, { minRedeem: 1000, step: 1000, redeemEnabled: false }), /disabled/);
  });
  it('calculates max discount 50% cap', () => {
    assert.equal(maxDiscountForCourse(20000, 50), 10000);
    assert.equal(maxDiscountForCourse(1000, 50), 500);
  });
  it('effective price never negative', () => {
    const priceAfterCourseDiscount = 5000;
    const xpDiscount = 10000;
    const effective = Math.max(0, priceAfterCourseDiscount - xpDiscount);
    assert.equal(effective, 0);
  });
});
