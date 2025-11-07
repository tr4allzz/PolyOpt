// lib/rewards/calculator.test.ts

import { describe, it, expect } from 'vitest';
import {
  calculateOrderScore,
  calculateSpread,
  calculateQOne,
  calculateQTwo,
  calculateQMin,
  calculateQScore,
  calculateExpectedReward,
  validateCalculation,
} from './calculator';
import { Market, Order } from '@/types/rewards';

describe('Reward Calculator', () => {
  const mockMarket: Market = {
    id: 'test-market',
    question: 'Test question?',
    midpoint: 0.50,
    maxSpread: 0.03, // 3¢
    minSize: 10,
    rewardPool: 100,
  };

  describe('calculateSpread', () => {
    it('should calculate spread correctly', () => {
      expect(calculateSpread(0.49, 0.50)).toBeCloseTo(0.01, 5);
      expect(calculateSpread(0.51, 0.50)).toBeCloseTo(0.01, 5);
      expect(calculateSpread(0.47, 0.50)).toBeCloseTo(0.03, 5);
    });
  });

  describe('calculateOrderScore', () => {
    it('should return 0 for orders outside max spread', () => {
      const score = calculateOrderScore(0.03, 0.04, 100);
      expect(score).toBe(0);
    });

    it('should return maximum score for orders at midpoint', () => {
      const score = calculateOrderScore(0.03, 0.00, 100);
      expect(score).toBe(100);
    });

    it('should calculate correct score at 1¢ spread', () => {
      const score = calculateOrderScore(0.03, 0.01, 100);
      // ((3-1)/3)^2 * 100 = (2/3)^2 * 100 = 44.44...
      expect(score).toBeCloseTo(44.44, 2);
    });

    it('should calculate correct score at 2¢ spread', () => {
      const score = calculateOrderScore(0.03, 0.02, 100);
      // ((3-2)/3)^2 * 100 = (1/3)^2 * 100 = 11.11...
      expect(score).toBeCloseTo(11.11, 2);
    });

    it('should apply boost multiplier correctly', () => {
      const baseScore = calculateOrderScore(0.03, 0.01, 100, 1.0);
      const boostedScore = calculateOrderScore(0.03, 0.01, 100, 2.0);
      expect(boostedScore).toBe(baseScore * 2);
    });

    it('should scale with order size', () => {
      const smallOrder = calculateOrderScore(0.03, 0.01, 100);
      const largeOrder = calculateOrderScore(0.03, 0.01, 200);
      expect(largeOrder).toBe(smallOrder * 2);
    });
  });

  describe('calculateQOne', () => {
    it('should calculate Q_one for YES bids', () => {
      const orders: Order[] = [
        { price: 0.49, size: 100, side: 'YES', type: 'BID' },
      ];

      const qOne = calculateQOne(orders, mockMarket);
      expect(qOne).toBeGreaterThan(0);
    });

    it('should calculate Q_one for NO asks', () => {
      const orders: Order[] = [
        { price: 0.51, size: 100, side: 'NO', type: 'ASK' },
      ];

      const qOne = calculateQOne(orders, mockMarket);
      expect(qOne).toBeGreaterThan(0);
    });

    it('should ignore YES asks and NO bids', () => {
      const orders: Order[] = [
        { price: 0.51, size: 100, side: 'YES', type: 'ASK' },
        { price: 0.49, size: 100, side: 'NO', type: 'BID' },
      ];

      const qOne = calculateQOne(orders, mockMarket);
      expect(qOne).toBe(0);
    });

    it('should ignore orders below min size', () => {
      const orders: Order[] = [
        { price: 0.49, size: 5, side: 'YES', type: 'BID' }, // Below min
      ];

      const qOne = calculateQOne(orders, mockMarket);
      expect(qOne).toBe(0);
    });

    it('should sum multiple qualifying orders', () => {
      const orders: Order[] = [
        { price: 0.49, size: 100, side: 'YES', type: 'BID' },
        { price: 0.48, size: 100, side: 'YES', type: 'BID' },
      ];

      const qOne = calculateQOne(orders, mockMarket);
      const singleOrder = calculateQOne([orders[0]], mockMarket);
      expect(qOne).toBeGreaterThan(singleOrder);
    });
  });

  describe('calculateQTwo', () => {
    it('should calculate Q_two for YES asks', () => {
      const orders: Order[] = [
        { price: 0.51, size: 100, side: 'YES', type: 'ASK' },
      ];

      const qTwo = calculateQTwo(orders, mockMarket);
      expect(qTwo).toBeGreaterThan(0);
    });

    it('should calculate Q_two for NO bids', () => {
      const orders: Order[] = [
        { price: 0.49, size: 100, side: 'NO', type: 'BID' },
      ];

      const qTwo = calculateQTwo(orders, mockMarket);
      expect(qTwo).toBeGreaterThan(0);
    });

    it('should ignore YES bids and NO asks', () => {
      const orders: Order[] = [
        { price: 0.49, size: 100, side: 'YES', type: 'BID' },
        { price: 0.51, size: 100, side: 'NO', type: 'ASK' },
      ];

      const qTwo = calculateQTwo(orders, mockMarket);
      expect(qTwo).toBe(0);
    });
  });

  describe('calculateQMin', () => {
    it('should return min of qOne and qTwo for balanced midpoint', () => {
      const qOne = 100;
      const qTwo = 80;
      const qMin = calculateQMin(qOne, qTwo, 0.50);

      expect(qMin).toBe(80);
    });

    it('should allow single-sided liquidity with penalty at midpoint 0.50', () => {
      const qOne = 300;
      const qTwo = 0;
      const qMin = calculateQMin(qOne, qTwo, 0.50);

      // Should be max(min(300, 0), max(300/3, 0/3)) = max(0, 100) = 100
      expect(qMin).toBe(100);
    });

    it('should require two-sided liquidity at extreme midpoint', () => {
      const qOne = 300;
      const qTwo = 0;
      const qMin = calculateQMin(qOne, qTwo, 0.05); // Midpoint < 0.10

      // Should be min(300, 0) = 0
      expect(qMin).toBe(0);
    });

    it('should handle midpoint exactly at 0.10 boundary', () => {
      const qOne = 300;
      const qTwo = 0;
      const qMin = calculateQMin(qOne, qTwo, 0.10);

      // At 0.10, should allow single-sided
      expect(qMin).toBe(100);
    });

    it('should handle midpoint exactly at 0.90 boundary', () => {
      const qOne = 300;
      const qTwo = 0;
      const qMin = calculateQMin(qOne, qTwo, 0.90);

      // At 0.90, should allow single-sided
      expect(qMin).toBe(100);
    });

    it('should use custom scaling factor', () => {
      const qOne = 600;
      const qTwo = 0;
      const qMin = calculateQMin(qOne, qTwo, 0.50, 2.0); // c = 2.0

      // Should be max(0, 600/2) = 300
      expect(qMin).toBe(300);
    });
  });

  describe('calculateQScore', () => {
    it('should calculate balanced two-sided score', () => {
      const orders: Order[] = [
        { price: 0.49, size: 100, side: 'YES', type: 'BID' },
        { price: 0.51, size: 100, side: 'YES', type: 'ASK' },
      ];

      const score = calculateQScore(orders, mockMarket);

      expect(score.qOne).toBeGreaterThan(0);
      expect(score.qTwo).toBeGreaterThan(0);
      expect(score.qMin).toBe(Math.min(score.qOne, score.qTwo));
    });

    it('should ignore orders below min size', () => {
      const orders: Order[] = [
        { price: 0.49, size: 5, side: 'YES', type: 'BID' }, // Below min
        { price: 0.51, size: 100, side: 'YES', type: 'ASK' },
      ];

      const score = calculateQScore(orders, mockMarket);
      expect(score.qOne).toBe(0); // No qualifying bids
      expect(score.qTwo).toBeGreaterThan(0);
    });

    it('should penalize single-sided liquidity', () => {
      const singleSided: Order[] = [
        { price: 0.49, size: 100, side: 'YES', type: 'BID' },
      ];

      const twoSided: Order[] = [
        { price: 0.49, size: 100, side: 'YES', type: 'BID' },
        { price: 0.51, size: 100, side: 'YES', type: 'ASK' },
      ];

      const singleScore = calculateQScore(singleSided, mockMarket);
      const doubleScore = calculateQScore(twoSided, mockMarket);

      expect(doubleScore.qMin).toBeGreaterThan(singleScore.qMin);
    });

    it('should handle empty order array', () => {
      const score = calculateQScore([], mockMarket);

      expect(score.qOne).toBe(0);
      expect(score.qTwo).toBe(0);
      expect(score.qMin).toBe(0);
    });
  });

  describe('calculateExpectedReward', () => {
    it('should calculate correct reward share', () => {
      const result = calculateExpectedReward(100, 1000, 240);

      expect(result.userShare).toBe(0.1); // 10%
      expect(result.dailyReward).toBe(24); // 10% of $240
      expect(result.monthlyReward).toBe(720); // $24 * 30
    });

    it('should handle zero competition', () => {
      const result = calculateExpectedReward(100, 100, 240);

      expect(result.userShare).toBe(1.0); // 100%
      expect(result.dailyReward).toBe(240); // All of it
    });

    it('should calculate APY when capital provided', () => {
      const result = calculateExpectedReward(100, 1000, 240, 1000);

      expect(result.annualizedAPY).toBeDefined();
      // $24/day * 365 / $1000 = 8.76 = 876% APY
      expect(result.annualizedAPY).toBeCloseTo(8.76, 2);
    });

    it('should return zeros when userQMin is zero', () => {
      const result = calculateExpectedReward(0, 1000, 240);

      expect(result.userShare).toBe(0);
      expect(result.dailyReward).toBe(0);
      expect(result.monthlyReward).toBe(0);
    });

    it('should return zeros when totalQMin is zero', () => {
      const result = calculateExpectedReward(100, 0, 240);

      expect(result.userShare).toBe(0);
      expect(result.dailyReward).toBe(0);
      expect(result.monthlyReward).toBe(0);
    });

    it('should handle large capital deployment', () => {
      const result = calculateExpectedReward(100, 1000, 240, 100000);

      expect(result.annualizedAPY).toBeDefined();
      expect(result.annualizedAPY).toBeGreaterThan(0);
      expect(result.annualizedAPY).toBeLessThan(1); // Should be less than 100%
    });
  });

  describe('validateCalculation', () => {
    it('should validate correct calculations within tolerance', () => {
      const result = validateCalculation(100, 101);

      expect(result.isValid).toBe(true);
      expect(result.error).toBe(1);
      expect(result.errorPercent).toBeCloseTo(0.0099, 4);
    });

    it('should reject calculations outside tolerance', () => {
      const result = validateCalculation(100, 110);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(10);
      expect(result.errorPercent).toBeCloseTo(0.0909, 4);
    });

    it('should use custom tolerance', () => {
      const result = validateCalculation(100, 110, 0.10); // 10% tolerance

      expect(result.isValid).toBe(true);
    });

    it('should handle zero actual payout', () => {
      const result = validateCalculation(10, 0);

      expect(result.error).toBe(10);
      expect(result.errorPercent).toBe(0);
    });

    it('should handle exact match', () => {
      const result = validateCalculation(100, 100);

      expect(result.isValid).toBe(true);
      expect(result.error).toBe(0);
      expect(result.errorPercent).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should calculate realistic scenario correctly', () => {
      // Realistic market: Trump 2024
      const realMarket: Market = {
        id: 'trump-2024',
        question: 'Will Trump win 2024?',
        midpoint: 0.552,
        maxSpread: 0.03,
        minSize: 100,
        rewardPool: 240.50,
      };

      // User orders: balanced liquidity near midpoint
      const orders: Order[] = [
        { price: 0.542, size: 1000, side: 'YES', type: 'BID' },
        { price: 0.562, size: 1000, side: 'YES', type: 'ASK' },
      ];

      const qScore = calculateQScore(orders, realMarket);

      // Both sides should have similar scores
      expect(qScore.qOne).toBeGreaterThan(0);
      expect(qScore.qTwo).toBeGreaterThan(0);
      expect(Math.abs(qScore.qOne - qScore.qTwo)).toBeLessThan(qScore.qOne * 0.1);

      // Assuming 50% market share
      const reward = calculateExpectedReward(
        qScore.qMin,
        qScore.qMin * 2, // Double to simulate competition
        realMarket.rewardPool
      );

      expect(reward.userShare).toBeCloseTo(0.5, 1);
      expect(reward.dailyReward).toBeGreaterThan(100);
    });

    it('should show deteriorating returns with more competition', () => {
      const orders: Order[] = [
        { price: 0.49, size: 100, side: 'YES', type: 'BID' },
        { price: 0.51, size: 100, side: 'YES', type: 'ASK' },
      ];

      const qScore = calculateQScore(orders, mockMarket);

      // Calculate with different competition levels
      const lowCompetition = calculateExpectedReward(
        qScore.qMin,
        qScore.qMin * 2,
        100
      );

      const highCompetition = calculateExpectedReward(
        qScore.qMin,
        qScore.qMin * 10,
        100
      );

      expect(lowCompetition.dailyReward).toBeGreaterThan(highCompetition.dailyReward);
    });
  });
});
