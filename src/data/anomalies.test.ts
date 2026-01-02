/**
 * @file anomalies.test.ts
 * @description 이변 시스템 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ANOMALY_TYPES,
  ALL_ANOMALIES,
  getAnomalyById,
  selectRandomAnomaly,
  selectMultipleAnomalies,
} from './anomalies';

describe('anomalies', () => {
  describe('ANOMALY_TYPES', () => {
    it('12개의 이변 타입이 정의되어 있다', () => {
      expect(Object.keys(ANOMALY_TYPES)).toHaveLength(12);
    });

    it('모든 이변 타입이 필수 속성을 가진다', () => {
      Object.values(ANOMALY_TYPES).forEach((anomaly) => {
        expect(anomaly).toHaveProperty('id');
        expect(anomaly).toHaveProperty('name');
        expect(anomaly).toHaveProperty('emoji');
        expect(anomaly).toHaveProperty('color');
        expect(anomaly).toHaveProperty('description');
        expect(anomaly).toHaveProperty('getEffect');
        expect(typeof anomaly.getEffect).toBe('function');
      });
    });

    describe('DEFLATION_CURSE', () => {
      it('에테르 금지 효과를 반환한다', () => {
        const effect = ANOMALY_TYPES.DEFLATION_CURSE.getEffect(1);
        expect(effect.type).toBe('ETHER_BAN');
        expect(effect.description).toContain('에테르');
      });

      it('레벨과 관계없이 동일한 효과를 반환한다', () => {
        const effect1 = ANOMALY_TYPES.DEFLATION_CURSE.getEffect(1);
        const effect4 = ANOMALY_TYPES.DEFLATION_CURSE.getEffect(4);
        expect(effect1.type).toBe(effect4.type);
      });
    });

    describe('ENERGY_DRAIN', () => {
      it('레벨에 따라 행동력 감소량이 증가한다', () => {
        const effect1 = ANOMALY_TYPES.ENERGY_DRAIN.getEffect(1);
        const effect4 = ANOMALY_TYPES.ENERGY_DRAIN.getEffect(4);
        expect(effect1.value).toBe(1);
        expect(effect4.value).toBe(4);
        expect(effect1.type).toBe('ENERGY_REDUCTION');
      });
    });

    describe('TIME_DISTORTION', () => {
      it('레벨당 속도 3씩 감소한다', () => {
        const effect1 = ANOMALY_TYPES.TIME_DISTORTION.getEffect(1);
        const effect2 = ANOMALY_TYPES.TIME_DISTORTION.getEffect(2);
        const effect4 = ANOMALY_TYPES.TIME_DISTORTION.getEffect(4);
        expect(effect1.value).toBe(3);
        expect(effect2.value).toBe(6);
        expect(effect4.value).toBe(12);
        expect(effect1.type).toBe('SPEED_REDUCTION');
      });
    });

    describe('DRAW_INTERFERENCE', () => {
      it('레벨당 뽑기 확률 10%씩 감소한다', () => {
        const effect1 = ANOMALY_TYPES.DRAW_INTERFERENCE.getEffect(1);
        const effect4 = ANOMALY_TYPES.DRAW_INTERFERENCE.getEffect(4);
        expect(effect1.value).toBe(0.1);
        expect(effect4.value).toBe(0.4);
        expect(effect1.type).toBe('DRAW_REDUCTION');
      });
    });

    describe('COGNITIVE_FOG', () => {
      it('레벨에 따라 통찰 감소량이 증가한다', () => {
        const effect1 = ANOMALY_TYPES.COGNITIVE_FOG.getEffect(1);
        const effect4 = ANOMALY_TYPES.COGNITIVE_FOG.getEffect(4);
        expect(effect1.value).toBe(1);
        expect(effect4.value).toBe(4);
        expect(effect1.type).toBe('INSIGHT_REDUCTION');
      });
    });

    describe('VALUE_DOWN', () => {
      it('레벨에 따라 감소 토큰 개수가 증가한다', () => {
        const effect1 = ANOMALY_TYPES.VALUE_DOWN.getEffect(1);
        const effect4 = ANOMALY_TYPES.VALUE_DOWN.getEffect(4);
        expect(effect1.value).toBe(1);
        expect(effect4.value).toBe(4);
        expect(effect1.type).toBe('VALUE_DOWN');
      });
    });

    // ==================== 신규 이변 테스트 ====================

    describe('BACKFLOW', () => {
      it('레벨당 2씩 자해 피해가 증가한다', () => {
        const effect1 = ANOMALY_TYPES.BACKFLOW.getEffect(1);
        const effect4 = ANOMALY_TYPES.BACKFLOW.getEffect(4);
        expect(effect1.value).toBe(2);
        expect(effect4.value).toBe(8);
        expect(effect1.type).toBe('DEFENSE_BACKFIRE');
      });
    });

    describe('INSTABILITY', () => {
      it('레벨에 따라 속도 변동폭이 증가한다', () => {
        const effect1 = ANOMALY_TYPES.INSTABILITY.getEffect(1);
        const effect4 = ANOMALY_TYPES.INSTABILITY.getEffect(4);
        expect(effect1.value).toBe(1);
        expect(effect4.value).toBe(4);
        expect(effect1.type).toBe('SPEED_INSTABILITY');
      });
    });

    describe('VULNERABILITY', () => {
      it('레벨당 10%씩 받는 피해가 증가한다', () => {
        const effect1 = ANOMALY_TYPES.VULNERABILITY.getEffect(1);
        const effect4 = ANOMALY_TYPES.VULNERABILITY.getEffect(4);
        expect(effect1.value).toBe(10);
        expect(effect4.value).toBe(40);
        expect(effect1.type).toBe('VULNERABILITY');
      });
    });

    describe('SILENCE', () => {
      it('레벨에 따라 비활성화 특성 범위가 증가한다', () => {
        const effect1 = ANOMALY_TYPES.SILENCE.getEffect(1);
        const effect4 = ANOMALY_TYPES.SILENCE.getEffect(4);
        expect(effect1.value).toBe(1);
        expect(effect4.value).toBe(4);
        expect(effect1.type).toBe('TRAIT_SILENCE');
        expect(effect4.description).toContain('모든 특성');
      });
    });

    describe('ISOLATION', () => {
      it('레벨에 따라 무효화 범위가 증가한다', () => {
        const effect1 = ANOMALY_TYPES.ISOLATION.getEffect(1);
        const effect3 = ANOMALY_TYPES.ISOLATION.getEffect(3);
        expect(effect1.value).toBe(1);
        expect(effect3.value).toBe(3);
        expect(effect1.type).toBe('CHAIN_ISOLATION');
        expect(effect3.description).toContain('완전 무효화');
      });
    });

    describe('MADNESS', () => {
      it('레벨 3 이상에서 기교 획득이 불가능하다', () => {
        const effect2 = ANOMALY_TYPES.MADNESS.getEffect(2);
        const effect3 = ANOMALY_TYPES.MADNESS.getEffect(3);
        expect(effect2.value).toBe(2);
        expect(effect3.value).toBe(3);
        expect(effect2.type).toBe('FINESSE_BLOCK');
        expect(effect2.description).toContain('-50%');
        expect(effect3.description).toContain('불가');
      });
    });
  });

  describe('ALL_ANOMALIES', () => {
    it('모든 이변이 배열에 포함되어 있다', () => {
      expect(ALL_ANOMALIES).toHaveLength(12);
    });

    it('ANOMALY_TYPES의 모든 값을 포함한다', () => {
      const typeIds = Object.values(ANOMALY_TYPES).map((a) => a.id);
      const allIds = ALL_ANOMALIES.map(a => a.id);
      expect(allIds.sort()).toEqual(typeIds.sort());
    });
  });

  describe('getAnomalyById', () => {
    it('존재하는 ID로 이변을 찾는다', () => {
      const anomaly = getAnomalyById('deflation_curse');
      expect(anomaly).toBeDefined();
      expect(anomaly?.id).toBe('deflation_curse');
      expect(anomaly?.name).toBe('디플레이션의 저주');
    });

    it('존재하지 않는 ID는 undefined를 반환한다', () => {
      const anomaly = getAnomalyById('nonexistent');
      expect(anomaly).toBeUndefined();
    });

    it('모든 이변을 ID로 찾을 수 있다', () => {
      const ids = [
        'deflation_curse', 'energy_drain', 'time_distortion',
        'draw_interference', 'cognitive_fog', 'value_down',
        'backflow', 'instability', 'vulnerability',
        'silence', 'isolation', 'madness'
      ];
      ids.forEach((id) => {
        const anomaly = getAnomalyById(id);
        expect(anomaly).toBeDefined();
        expect(anomaly?.id).toBe(id);
      });
    });
  });

  describe('selectRandomAnomaly', () => {
    it('이변을 반환한다', () => {
      const anomaly = selectRandomAnomaly();
      expect(anomaly).toBeDefined();
      expect(anomaly).toHaveProperty('id');
      expect(anomaly).toHaveProperty('name');
    });

    it('유효한 이변을 반환한다', () => {
      const anomaly = selectRandomAnomaly();
      const found = ALL_ANOMALIES.find(a => a.id === anomaly.id);
      expect(found).toBeDefined();
    });

    it('여러 번 호출해도 에러가 없다', () => {
      for (let i = 0; i < 20; i++) {
        expect(() => selectRandomAnomaly()).not.toThrow();
      }
    });
  });

  describe('selectMultipleAnomalies', () => {
    it('요청한 개수만큼 이변을 반환한다', () => {
      const anomalies = selectMultipleAnomalies(3);
      expect(anomalies).toHaveLength(3);
    });

    it('중복 없이 이변을 선택한다', () => {
      const anomalies = selectMultipleAnomalies(4);
      const ids = anomalies.map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('전체 이변 수보다 많이 요청하면 전체를 반환한다', () => {
      const anomalies = selectMultipleAnomalies(100);
      expect(anomalies).toHaveLength(ALL_ANOMALIES.length);
    });

    it('0개를 요청하면 빈 배열을 반환한다', () => {
      const anomalies = selectMultipleAnomalies(0);
      expect(anomalies).toHaveLength(0);
    });

    it('음수를 요청해도 에러가 없다', () => {
      expect(() => selectMultipleAnomalies(-1)).not.toThrow();
    });

    it('모든 반환된 이변이 유효하다', () => {
      const anomalies = selectMultipleAnomalies(5);
      anomalies.forEach(anomaly => {
        expect(anomaly).toHaveProperty('id');
        expect(anomaly).toHaveProperty('name');
        expect(anomaly).toHaveProperty('getEffect');
      });
    });
  });
});
