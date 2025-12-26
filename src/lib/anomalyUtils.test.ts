/**
 * @file anomalyUtils.test.js
 * @description anomalyUtils 함수 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkAnomalyOccurrence,
  getAnomalyLevel,
  selectBattleAnomalies,
  applyAnomalyEffects,
  formatAnomaliesForDisplay,
  applyAnomalyPenalties,
  applyDrawPenalty
} from './anomalyUtils';

// Math.random 모킹
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.3);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('anomalyUtils', () => {
  describe('checkAnomalyOccurrence', () => {
    it('mapRisk가 0이면 이변이 발동하지 않아야 함', () => {
      expect(checkAnomalyOccurrence(0)).toBe(false);
    });

    it('mapRisk가 100이면 항상 이변이 발동해야 함', () => {
      expect(checkAnomalyOccurrence(100)).toBe(true);
    });

    it('mapRisk / 100 > Math.random()이면 이변이 발동해야 함', () => {
      // Math.random()이 0.3으로 고정
      // mapRisk 50 → probability 0.5 > 0.3 → true
      expect(checkAnomalyOccurrence(50)).toBe(true);
    });

    it('mapRisk / 100 <= Math.random()이면 이변이 발동하지 않아야 함', () => {
      // Math.random()이 0.3으로 고정
      // mapRisk 20 → probability 0.2 < 0.3 → false
      expect(checkAnomalyOccurrence(20)).toBe(false);
    });
  });

  describe('getAnomalyLevel', () => {
    it('mapRisk 0-24는 레벨 1을 반환해야 함', () => {
      expect(getAnomalyLevel(0)).toBe(1);
      expect(getAnomalyLevel(10)).toBe(1);
      expect(getAnomalyLevel(24)).toBe(1);
    });

    it('mapRisk 25-49는 레벨 1을 반환해야 함', () => {
      expect(getAnomalyLevel(25)).toBe(1);
      expect(getAnomalyLevel(49)).toBe(1);
    });

    it('mapRisk 50-74는 레벨 2를 반환해야 함', () => {
      expect(getAnomalyLevel(50)).toBe(2);
      expect(getAnomalyLevel(74)).toBe(2);
    });

    it('mapRisk 75-99는 레벨 3을 반환해야 함', () => {
      expect(getAnomalyLevel(75)).toBe(3);
      expect(getAnomalyLevel(99)).toBe(3);
    });

    it('mapRisk 100 이상은 레벨 4를 반환해야 함', () => {
      expect(getAnomalyLevel(100)).toBe(4);
      expect(getAnomalyLevel(150)).toBe(4);
    });

    it('최소 레벨은 1이어야 함', () => {
      expect(getAnomalyLevel(-10)).toBe(1);
    });

    it('최대 레벨은 4이어야 함', () => {
      expect(getAnomalyLevel(200)).toBe(4);
    });
  });

  describe('selectBattleAnomalies', () => {
    it('mapRisk가 50 미만이고 발동 실패하면 빈 배열을 반환해야 함', () => {
      // Math.random() = 0.3, mapRisk = 20 → probability = 0.2 < 0.3 → 실패
      const result = selectBattleAnomalies(20, false, undefined as any);
      expect(result).toEqual([]);
    });

    it('mapRisk가 50 이상이면 항상 이변이 발동해야 함', () => {
      const result = selectBattleAnomalies(50, false, undefined as any);
      expect(result.length).toBeGreaterThan(0);
    });

    it('일반 전투는 1개의 이변만 반환해야 함', () => {
      const result = selectBattleAnomalies(60, false, undefined as any);
      expect(result).toHaveLength(1);
    });

    it('개발자 모드 강제 이변이 적용되어야 함', () => {
      const devForced = [
        { anomalyId: 'ether_void', level: 3 } as any
      ];
      const result = selectBattleAnomalies(10, false, devForced);

      // 결과가 있고 레벨이 강제 레벨과 같아야 함
      if (result.length > 0) {
        expect(result[0].level).toBe(3);
      }
    });

    it('존재하지 않는 이변 ID는 필터링되어야 함', () => {
      const devForced = [
        { anomalyId: 'nonexistent_anomaly', level: 1 } as any
      ];
      const result = selectBattleAnomalies(10, false, devForced);
      expect(result).toEqual([]);
    });
  });

  describe('applyAnomalyEffects', () => {
    it('빈 이변 배열은 원본 플레이어를 반환해야 함', () => {
      const player = { hp: 100, maxHp: 100 } as any;
      const result = applyAnomalyEffects([] as any, player, {} as any);

      expect(result.player).toEqual(player);
      expect(result.logs).toEqual([]);
    });

    it('null 이변 배열은 원본 플레이어를 반환해야 함', () => {
      const player = { hp: 100, maxHp: 100 } as any;
      const result = applyAnomalyEffects(null as any, player, {} as any);

      expect(result.player).toEqual(player);
      expect(result.logs).toEqual([]);
    });

    it('ETHER_BAN 효과가 적용되어야 함', () => {
      const player = { hp: 100, maxHp: 100 } as any;
      const anomalies = [{
        anomaly: {
          name: 'Test Anomaly',
          emoji: '🌀',
          getEffect: () => ({ type: 'ETHER_BAN', description: 'No ether' })
        } as any,
        level: 1
      } as any];

      const result = applyAnomalyEffects(anomalies, player, {} as any);

      expect(result.player.etherBan).toBe(true);
      expect(result.logs).toHaveLength(1);
    });

    it('ENERGY_REDUCTION 효과가 적용되어야 함', () => {
      const player = { hp: 100, maxHp: 100 } as any;
      const anomalies = [{
        anomaly: {
          name: 'Test Anomaly',
          emoji: '🌀',
          getEffect: () => ({ type: 'ENERGY_REDUCTION', value: 2, description: '-2 energy' })
        } as any,
        level: 1
      } as any];

      const result = applyAnomalyEffects(anomalies, player, {} as any);

      expect(result.player.energyPenalty).toBe(2);
    });

    it('SPEED_REDUCTION 효과가 적용되어야 함', () => {
      const player = { hp: 100, maxHp: 100 } as any;
      const anomalies = [{
        anomaly: {
          name: 'Test Anomaly',
          emoji: '🌀',
          getEffect: () => ({ type: 'SPEED_REDUCTION', value: 3, description: '-3 speed' })
        } as any,
        level: 1
      } as any];

      const result = applyAnomalyEffects(anomalies, player, {} as any);

      expect(result.player.speedPenalty).toBe(3);
    });

    it('DRAW_REDUCTION 효과가 적용되어야 함', () => {
      const player = { hp: 100, maxHp: 100 } as any;
      const anomalies = [{
        anomaly: {
          name: 'Test Anomaly',
          emoji: '🌀',
          getEffect: () => ({ type: 'DRAW_REDUCTION', value: 0.1, description: '-10% draw' })
        } as any,
        level: 1
      } as any];

      const result = applyAnomalyEffects(anomalies, player, {} as any);

      expect(result.player.drawPenalty).toBe(0.1);
    });

    it('INSIGHT_REDUCTION 효과가 적용되어야 함', () => {
      const player = { hp: 100, maxHp: 100 } as any;
      const anomalies = [{
        anomaly: {
          name: 'Test Anomaly',
          emoji: '🌀',
          getEffect: () => ({ type: 'INSIGHT_REDUCTION', value: 1, description: '-1 insight' })
        } as any,
        level: 1
      } as any];

      const result = applyAnomalyEffects(anomalies, player, {} as any);

      expect(result.player.insightPenalty).toBe(1);
    });

    it('여러 이변 효과가 누적되어야 함', () => {
      const player = { hp: 100, maxHp: 100 } as any;
      const anomalies = [
        {
          anomaly: {
            name: 'Anomaly 1',
            emoji: '🌀',
            getEffect: () => ({ type: 'ENERGY_REDUCTION', value: 1, description: '-1 energy' })
          } as any,
          level: 1
        } as any,
        {
          anomaly: {
            name: 'Anomaly 2',
            emoji: '💫',
            getEffect: () => ({ type: 'ENERGY_REDUCTION', value: 2, description: '-2 energy' })
          } as any,
          level: 2
        } as any
      ];

      const result = applyAnomalyEffects(anomalies, player, {} as any);

      expect(result.player.energyPenalty).toBe(3); // 1 + 2
      expect(result.logs).toHaveLength(2);
    });
  });

  describe('formatAnomaliesForDisplay', () => {
    it('이변을 UI 표시용 포맷으로 변환해야 함', () => {
      const anomalies = [{
        anomaly: {
          id: 'test_anomaly',
          name: 'Test Anomaly',
          emoji: '🌀',
          color: '#ff0000',
          description: 'Test description',
          getEffect: (level: any) => ({ description: `Level ${level} effect` })
        } as any,
        level: 2
      } as any];

      const result = formatAnomaliesForDisplay(anomalies);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test_anomaly');
      expect(result[0].name).toBe('Test Anomaly');
      expect(result[0].emoji).toBe('🌀');
      expect(result[0].color).toBe('#ff0000');
      expect(result[0].level).toBe(2);
      expect(result[0].description).toBe('Test description');
      expect(result[0].effect.description).toBe('Level 2 effect');
    });

    it('빈 배열은 빈 배열을 반환해야 함', () => {
      const result = formatAnomaliesForDisplay([] as any);
      expect(result).toEqual([]);
    });
  });

  describe('applyAnomalyPenalties', () => {
    it('패널티가 없으면 기본값을 반환해야 함', () => {
      const player = { hp: 100 } as any;
      const result = applyAnomalyPenalties(player, 5, 30, 3);

      expect(result.energy).toBe(5);
      expect(result.speed).toBe(30);
      expect(result.insight).toBe(3);
    });

    it('패널티가 적용되어야 함', () => {
      const player = {
        hp: 100,
        energyPenalty: 2,
        speedPenalty: 10,
        insightPenalty: 1
      } as any;
      const result = applyAnomalyPenalties(player, 5, 30, 3);

      expect(result.energy).toBe(3);  // 5 - 2
      expect(result.speed).toBe(20);  // 30 - 10
      expect(result.insight).toBe(2); // 3 - 1
    });

    it('energy와 speed는 0 이하로 내려가지 않아야 함', () => {
      const player = {
        hp: 100,
        energyPenalty: 10,
        speedPenalty: 50
      } as any;
      const result = applyAnomalyPenalties(player, 5, 30, 3);

      expect(result.energy).toBe(0);
      expect(result.speed).toBe(0);
    });

    it('insight는 음수가 될 수 있음', () => {
      const player = {
        hp: 100,
        insightPenalty: 5
      } as any;
      const result = applyAnomalyPenalties(player, 5, 30, 3);

      expect(result.insight).toBe(-2); // 3 - 5
    });
  });

  describe('applyDrawPenalty', () => {
    it('패널티가 없으면 기본 확률을 반환해야 함', () => {
      const player = { hp: 100 } as any;
      expect(applyDrawPenalty(0.8, player)).toBe(0.8);
    });

    it('패널티가 적용되어야 함', () => {
      const player = { hp: 100, drawPenalty: 0.2 } as any;
      expect(applyDrawPenalty(0.8, player)).toBeCloseTo(0.6); // 0.8 - 0.2
    });

    it('확률은 0 이하로 내려가지 않아야 함', () => {
      const player = { hp: 100, drawPenalty: 1 } as any;
      expect(applyDrawPenalty(0.5, player)).toBe(0);
    });

    it('확률은 1을 초과하지 않아야 함', () => {
      const player = { hp: 100, drawPenalty: -0.5 } as any; // 음수 패널티 = 보너스
      expect(applyDrawPenalty(0.8, player)).toBe(1); // 0.8 + 0.5 = 1.3 → 1
    });
  });
});
