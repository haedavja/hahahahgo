/**
 * @file turnEndEtherCalculation.test.js
 * @description 턴 종료 에테르 최종 계산 테스트
 *
 * ## 테스트 대상
 * - calculateTurnEndEther: 플레이어/적 에테르 최종 계산
 * - formatPlayerEtherLog: 플레이어 에테르 로그 메시지 생성
 * - formatEnemyEtherLog: 적 에테르 로그 메시지 생성
 *
 * ## 주요 테스트 케이스
 * - 콤보 배율 (페어 2x, 트리플 3x 등)
 * - 에테르 증폭제(etherMultiplier) 적용
 * - 디플레이션 (반복 사용 시 감소)
 * - half_ether 토큰 (적 에테르 반감)
 * - 상징 배율 보너스 계산
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { calculateTurnEndEther, formatPlayerEtherLog, formatEnemyEtherLog } from './turnEndEtherCalculation';
import {
  createEtherCalcPlayer,
  createEtherCalcEnemy,
  createCombo,
  createEtherCalcParams,
  createPlayerEtherResult,
  createEnemyEtherResult,
  createDeflation,
  createEtherToken,
} from '../../../test/factories';

vi.mock('../../../lib/tokenUtils', () => ({
  getAllTokens: vi.fn(() => [])
}));

import { getAllTokens } from '../../../lib/tokenUtils';

describe('turnEndEtherCalculation', () => {
  describe('calculateTurnEndEther', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      (getAllTokens as Mock).mockReturnValue([]);
    });

    it('기본 에테르 계산을 해야 함', () => {
      const result = calculateTurnEndEther(createEtherCalcParams({
        turnEtherAccumulated: 10,
        enemyTurnEtherAccumulated: 8,
      }));

      expect(result.player.finalEther).toBe(10);
      expect(result.enemy.finalEther).toBe(8);
    });

    it('플레이어 콤보 배율을 적용해야 함', () => {
      const result = calculateTurnEndEther(createEtherCalcParams({
        playerCombo: createCombo('올인'), // 1.2 배율
        turnEtherAccumulated: 10,
        enemyTurnEtherAccumulated: 5,
        finalComboMultiplier: 1.5, // 상징 포함 배율
      }));

      expect(result.player.finalComboMult).toBe(1.5);
      expect(result.player.beforeDeflation).toBe(15); // 10 * 1.5
    });

    it('에테르 증폭제 배율을 적용해야 함', () => {
      const result = calculateTurnEndEther(createEtherCalcParams({
        turnEtherAccumulated: 10,
        enemyTurnEtherAccumulated: 5,
        player: createEtherCalcPlayer({ etherMultiplier: 2 }),
      }));

      expect(result.player.etherAmplifierMult).toBe(2);
      expect(result.player.beforeDeflation).toBe(20); // 10 * 1 * 2
    });

    it('적 콤보 배율을 적용해야 함', () => {
      const result = calculateTurnEndEther(createEtherCalcParams({
        enemyCombo: createCombo('페어'),
        turnEtherAccumulated: 10,
        enemyTurnEtherAccumulated: 10,
      }));

      expect(result.enemy.comboMult).toBe(2); // 페어 배율
      expect(result.enemy.beforeDeflation).toBe(20);
    });

    it('half_ether 토큰이 있으면 적 에테르를 반감해야 함', () => {
      (getAllTokens as Mock).mockReturnValue([createEtherToken('half_ether')]);

      const result = calculateTurnEndEther(createEtherCalcParams({
        turnEtherAccumulated: 10,
        enemyTurnEtherAccumulated: 20,
      }));

      expect(result.enemy.halfEtherMult).toBe(0.5);
      expect(result.enemy.finalEther).toBe(10); // 20 * 0.5
    });

    it('상징 배율 보너스를 계산해야 함', () => {
      const result = calculateTurnEndEther(createEtherCalcParams({
        playerCombo: createCombo('페어'), // 기본 2
        turnEtherAccumulated: 10,
        finalComboMultiplier: 2.5, // 상징 포함
      }));

      expect(result.player.baseComboMult).toBe(2);
      expect(result.player.finalComboMult).toBe(2.5);
      expect(result.player.relicMultBonus).toBeCloseTo(0.5); // 2.5 - 2
    });

    it('디플레이션을 적용해야 함', () => {
      const result = calculateTurnEndEther(createEtherCalcParams({
        playerCombo: createCombo('페어'),
        turnEtherAccumulated: 100,
        finalComboMultiplier: 2,
        player: createEtherCalcPlayer({ comboUsageCount: { '페어': 5 } }), // 5회 사용으로 디플레이션
      }));

      // 디플레이션 적용됨
      expect(result.player.deflation.usageCount).toBe(5);
      expect(result.player.finalEther).toBeLessThan(result.player.beforeDeflation);
    });

    it('조합이 없으면 디플레이션 없이 계산해야 함', () => {
      const result = calculateTurnEndEther(createEtherCalcParams({
        turnEtherAccumulated: 50,
        enemyTurnEtherAccumulated: 30,
      }));

      expect(result.player.deflation.multiplier).toBe(1);
      expect(result.player.deflation.usageCount).toBe(0);
    });

    it('결과 구조가 올바른지 확인', () => {
      const result = calculateTurnEndEther(createEtherCalcParams({
        turnEtherAccumulated: 10,
        enemyTurnEtherAccumulated: 5,
      }));

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
      const result = createPlayerEtherResult({
        beforeDeflation: 15,
        deflation: createDeflation({ gain: 15, multiplier: 1, usageCount: 0 }),
        finalEther: 15,
        appliedEther: 15,
      });

      const log = formatPlayerEtherLog(result, 10);

      expect(log).toContain('에테르 획득');
      expect(log).toContain('10');
      expect(log).toContain('15');
    });

    it('디플레이션 정보를 포함해야 함', () => {
      const result = createPlayerEtherResult({
        beforeDeflation: 20,
        deflation: createDeflation({ gain: 16, multiplier: 0.8, usageCount: 3 }),
        finalEther: 16,
        appliedEther: 16,
      });

      const log = formatPlayerEtherLog(result, 10);

      expect(log).toContain('디플레이션');
      expect(log).toContain('20%');
      expect(log).toContain('3회');
    });

    it('상징 배율 보너스를 포함해야 함', () => {
      const result = createPlayerEtherResult({
        beforeDeflation: 15,
        deflation: createDeflation({ gain: 15, multiplier: 1, usageCount: 0 }),
        finalEther: 15,
        appliedEther: 15,
        relicMultBonus: 0.3,
      });

      const log = formatPlayerEtherLog(result, 10);

      expect(log).toContain('상징 배율');
      expect(log).toContain('+0.30');
    });

    it('증폭 정보를 포함해야 함', () => {
      const result = createPlayerEtherResult({
        beforeDeflation: 20,
        deflation: createDeflation({ gain: 20, multiplier: 1, usageCount: 0 }),
        finalEther: 20,
        appliedEther: 20,
        etherAmplifierMult: 2,
      });

      const log = formatPlayerEtherLog(result, 10);

      expect(log).toContain('증폭');
      expect(log).toContain('×2');
    });

    it('에테르 0일 때 처리해야 함', () => {
      const result = createPlayerEtherResult({
        beforeDeflation: 0,
        deflation: createDeflation({ gain: 0, multiplier: 1, usageCount: 0 }),
        finalEther: 0,
        appliedEther: 0,
      });

      const log = formatPlayerEtherLog(result, 0);

      expect(log).toContain('에테르 획득');
    });
  });

  describe('formatEnemyEtherLog', () => {
    it('기본 로그 포맷을 생성해야 함', () => {
      const result = createEnemyEtherResult({
        comboMult: 1.2,
        beforeDeflation: 12,
        deflation: createDeflation({ gain: 12, multiplier: 1, usageCount: 0 }),
        finalEther: 12,
        appliedEther: 12,
        halfEtherMult: 1,
      });

      const log = formatEnemyEtherLog(result, 10);

      expect(log).toContain('적 에테르 획득');
      expect(log).toContain('10');
      expect(log).toContain('1.20');
    });

    it('디플레이션 정보를 포함해야 함', () => {
      const result = createEnemyEtherResult({
        comboMult: 1,
        beforeDeflation: 10,
        deflation: createDeflation({ gain: 8, multiplier: 0.8, usageCount: 2 }),
        finalEther: 8,
        appliedEther: 8,
        halfEtherMult: 1,
      });

      const log = formatEnemyEtherLog(result, 10);

      expect(log).toContain('디플레이션');
      expect(log).toContain('-20%');  // 감소율 표시 (80% 적용 = 20% 감소)
    });

    it('에테르 감소 정보를 포함해야 함', () => {
      const result = createEnemyEtherResult({
        comboMult: 1,
        beforeDeflation: 10,
        deflation: createDeflation({ gain: 10, multiplier: 1, usageCount: 0 }),
        finalEther: 5,
        appliedEther: 5,
        halfEtherMult: 0.5,
      });

      const log = formatEnemyEtherLog(result, 10);

      expect(log).toContain('에테르 감소');
      expect(log).toContain('×0.5');
    });

    it('halfEtherMult가 없으면 기본값 1 사용해야 함', () => {
      const result = createEnemyEtherResult({
        comboMult: 1,
        beforeDeflation: 10,
        deflation: createDeflation({ gain: 10, multiplier: 1, usageCount: 0 }),
        finalEther: 10,
        appliedEther: 10,
        // halfEtherMult 없음
      });

      const log = formatEnemyEtherLog(result, 10);

      expect(log).not.toContain('에테르 감소');
    });
  });
});
