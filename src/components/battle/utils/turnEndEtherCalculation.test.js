/**
 * @file turnEndEtherCalculation.test.js
 * @description turnEndEtherCalculation 함수 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { calculateTurnEndEther, formatPlayerEtherLog, formatEnemyEtherLog } from './turnEndEtherCalculation';

vi.mock('../../../lib/tokenUtils', () => ({
  getAllTokens: vi.fn(() => [])
}));

import { getAllTokens } from '../../../lib/tokenUtils';

describe('turnEndEtherCalculation', () => {
  describe('calculateTurnEndEther', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      getAllTokens.mockReturnValue([]);
    });

    it('기본 에테르 계산을 해야 함', () => {
      const result = calculateTurnEndEther({
        playerCombo: null,
        enemyCombo: null,
        turnEtherAccumulated: 10,
        enemyTurnEtherAccumulated: 8,
        finalComboMultiplier: 1,
        player: { comboUsageCount: {} },
        enemy: { comboUsageCount: {} }
      });

      expect(result.player.finalEther).toBe(10);
      expect(result.enemy.finalEther).toBe(8);
    });

    it('플레이어 콤보 배율을 적용해야 함', () => {
      const result = calculateTurnEndEther({
        playerCombo: { name: '올인' }, // 1.2 배율
        enemyCombo: null,
        turnEtherAccumulated: 10,
        enemyTurnEtherAccumulated: 5,
        finalComboMultiplier: 1.5, // 상징 포함 배율
        player: { comboUsageCount: {} },
        enemy: { comboUsageCount: {} }
      });

      expect(result.player.finalComboMult).toBe(1.5);
      expect(result.player.beforeDeflation).toBe(15); // 10 * 1.5
    });

    it('에테르 증폭제 배율을 적용해야 함', () => {
      const result = calculateTurnEndEther({
        playerCombo: null,
        enemyCombo: null,
        turnEtherAccumulated: 10,
        enemyTurnEtherAccumulated: 5,
        finalComboMultiplier: 1,
        player: { etherMultiplier: 2, comboUsageCount: {} },
        enemy: { comboUsageCount: {} }
      });

      expect(result.player.etherAmplifierMult).toBe(2);
      expect(result.player.beforeDeflation).toBe(20); // 10 * 1 * 2
    });

    it('적 콤보 배율을 적용해야 함', () => {
      const result = calculateTurnEndEther({
        playerCombo: null,
        enemyCombo: { name: '페어' },
        turnEtherAccumulated: 10,
        enemyTurnEtherAccumulated: 10,
        finalComboMultiplier: 1,
        player: { comboUsageCount: {} },
        enemy: { comboUsageCount: {} }
      });

      expect(result.enemy.comboMult).toBe(2); // 페어 배율
      expect(result.enemy.beforeDeflation).toBe(20);
    });

    it('half_ether 토큰이 있으면 적 에테르를 반감해야 함', () => {
      getAllTokens.mockReturnValue([{ id: 'half_ether' }]);

      const result = calculateTurnEndEther({
        playerCombo: null,
        enemyCombo: null,
        turnEtherAccumulated: 10,
        enemyTurnEtherAccumulated: 20,
        finalComboMultiplier: 1,
        player: { comboUsageCount: {} },
        enemy: { comboUsageCount: {} }
      });

      expect(result.enemy.halfEtherMult).toBe(0.5);
      expect(result.enemy.finalEther).toBe(10); // 20 * 0.5
    });

    it('상징 배율 보너스를 계산해야 함', () => {
      const result = calculateTurnEndEther({
        playerCombo: { name: '페어' }, // 기본 2
        enemyCombo: null,
        turnEtherAccumulated: 10,
        enemyTurnEtherAccumulated: 0,
        finalComboMultiplier: 2.5, // 상징 포함
        player: { comboUsageCount: {} },
        enemy: { comboUsageCount: {} }
      });

      expect(result.player.baseComboMult).toBe(2);
      expect(result.player.finalComboMult).toBe(2.5);
      expect(result.player.relicMultBonus).toBeCloseTo(0.5); // 2.5 - 2
    });

    it('디플레이션을 적용해야 함', () => {
      const result = calculateTurnEndEther({
        playerCombo: { name: '페어' },
        enemyCombo: null,
        turnEtherAccumulated: 100,
        enemyTurnEtherAccumulated: 0,
        finalComboMultiplier: 2,
        player: { comboUsageCount: { '페어': 5 } }, // 5회 사용으로 디플레이션
        enemy: { comboUsageCount: {} }
      });

      // 디플레이션 적용됨
      expect(result.player.deflation.usageCount).toBe(5);
      expect(result.player.finalEther).toBeLessThan(result.player.beforeDeflation);
    });

    it('조합이 없으면 디플레이션 없이 계산해야 함', () => {
      const result = calculateTurnEndEther({
        playerCombo: null,
        enemyCombo: null,
        turnEtherAccumulated: 50,
        enemyTurnEtherAccumulated: 30,
        finalComboMultiplier: 1,
        player: { comboUsageCount: {} },
        enemy: { comboUsageCount: {} }
      });

      expect(result.player.deflation.multiplier).toBe(1);
      expect(result.player.deflation.usageCount).toBe(0);
    });

    it('결과 구조가 올바른지 확인', () => {
      const result = calculateTurnEndEther({
        playerCombo: null,
        enemyCombo: null,
        turnEtherAccumulated: 10,
        enemyTurnEtherAccumulated: 5,
        finalComboMultiplier: 1,
        player: { comboUsageCount: {} },
        enemy: { comboUsageCount: {} }
      });

      // 플레이어 결과 구조
      expect(result.player).toHaveProperty('baseComboMult');
      expect(result.player).toHaveProperty('finalComboMult');
      expect(result.player).toHaveProperty('relicMultBonus');
      expect(result.player).toHaveProperty('etherAmplifierMult');
      expect(result.player).toHaveProperty('beforeDeflation');
      expect(result.player).toHaveProperty('deflation');
      expect(result.player).toHaveProperty('finalEther');
      expect(result.player).toHaveProperty('appliedEther');
      expect(result.player).toHaveProperty('overflow');

      // 적 결과 구조
      expect(result.enemy).toHaveProperty('comboMult');
      expect(result.enemy).toHaveProperty('beforeDeflation');
      expect(result.enemy).toHaveProperty('deflation');
      expect(result.enemy).toHaveProperty('halfEtherMult');
      expect(result.enemy).toHaveProperty('finalEther');
    });
  });

  describe('formatPlayerEtherLog', () => {
    it('기본 로그 포맷을 생성해야 함', () => {
      const result = {
        beforeDeflation: 15,
        deflation: { gain: 15, multiplier: 1, usageCount: 0 },
        finalEther: 15,
        appliedEther: 15,
        relicMultBonus: 0,
        etherAmplifierMult: 1
      };

      const log = formatPlayerEtherLog(result, 10);

      expect(log).toContain('에테르 획득');
      expect(log).toContain('10');
      expect(log).toContain('15');
    });

    it('디플레이션 정보를 포함해야 함', () => {
      const result = {
        beforeDeflation: 20,
        deflation: { gain: 16, multiplier: 0.8, usageCount: 3 },
        finalEther: 16,
        appliedEther: 16,
        relicMultBonus: 0,
        etherAmplifierMult: 1
      };

      const log = formatPlayerEtherLog(result, 10);

      expect(log).toContain('디플레이션');
      expect(log).toContain('20%');
      expect(log).toContain('3회');
    });

    it('상징 배율 보너스를 포함해야 함', () => {
      const result = {
        beforeDeflation: 15,
        deflation: { gain: 15, multiplier: 1, usageCount: 0 },
        finalEther: 15,
        appliedEther: 15,
        relicMultBonus: 0.3,
        etherAmplifierMult: 1
      };

      const log = formatPlayerEtherLog(result, 10);

      expect(log).toContain('상징 배율');
      expect(log).toContain('+0.30');
    });

    it('증폭 정보를 포함해야 함', () => {
      const result = {
        beforeDeflation: 20,
        deflation: { gain: 20, multiplier: 1, usageCount: 0 },
        finalEther: 20,
        appliedEther: 20,
        relicMultBonus: 0,
        etherAmplifierMult: 2
      };

      const log = formatPlayerEtherLog(result, 10);

      expect(log).toContain('증폭');
      expect(log).toContain('×2');
    });

    it('에테르 0일 때 처리해야 함', () => {
      const result = {
        beforeDeflation: 0,
        deflation: { gain: 0, multiplier: 1, usageCount: 0 },
        finalEther: 0,
        appliedEther: 0,
        relicMultBonus: 0,
        etherAmplifierMult: 1
      };

      const log = formatPlayerEtherLog(result, 0);

      expect(log).toContain('에테르 획득');
    });
  });

  describe('formatEnemyEtherLog', () => {
    it('기본 로그 포맷을 생성해야 함', () => {
      const result = {
        comboMult: 1.2,
        beforeDeflation: 12,
        deflation: { gain: 12, multiplier: 1, usageCount: 0 },
        finalEther: 12,
        appliedEther: 12,
        halfEtherMult: 1
      };

      const log = formatEnemyEtherLog(result, 10);

      expect(log).toContain('적 에테르 획득');
      expect(log).toContain('10');
      expect(log).toContain('1.20');
    });

    it('디플레이션 정보를 포함해야 함', () => {
      const result = {
        comboMult: 1,
        beforeDeflation: 10,
        deflation: { gain: 8, multiplier: 0.8, usageCount: 2 },
        finalEther: 8,
        appliedEther: 8,
        halfEtherMult: 1
      };

      const log = formatEnemyEtherLog(result, 10);

      expect(log).toContain('디플레이션');
      expect(log).toContain('80%');
    });

    it('에테르 감소 정보를 포함해야 함', () => {
      const result = {
        comboMult: 1,
        beforeDeflation: 10,
        deflation: { gain: 10, multiplier: 1, usageCount: 0 },
        finalEther: 5,
        appliedEther: 5,
        halfEtherMult: 0.5
      };

      const log = formatEnemyEtherLog(result, 10);

      expect(log).toContain('에테르 감소');
      expect(log).toContain('×0.5');
    });

    it('halfEtherMult가 없으면 기본값 1 사용해야 함', () => {
      const result = {
        comboMult: 1,
        beforeDeflation: 10,
        deflation: { gain: 10, multiplier: 1, usageCount: 0 },
        finalEther: 10,
        appliedEther: 10
        // halfEtherMult 없음
      };

      const log = formatEnemyEtherLog(result, 10);

      expect(log).not.toContain('에테르 감소');
    });
  });
});
