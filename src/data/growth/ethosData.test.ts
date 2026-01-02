/**
 * @file ethosData.test.ts
 * @description 에토스 (Ethos) 데이터 검증 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  BASE_ETHOS,
  TIER3_ETHOS,
  TIER5_ETHOS,
  ETHOS,
  ETHOS_NODES,
  getEthosForLevel,
  getEthosNodeChoices,
  getEthosNodesForTier,
  getBaseEthos,
  type Ethos,
  type EthosNode,
} from './ethosData';

describe('ethosData', () => {
  describe('BASE_ETHOS', () => {
    it('기초 에토스가 비어있지 않다', () => {
      expect(Object.keys(BASE_ETHOS).length).toBeGreaterThan(0);
    });

    it('모든 기초 에토스가 레벨 1이다', () => {
      Object.values(BASE_ETHOS).forEach((ethos: Ethos) => {
        expect(ethos.pyramidLevel).toBe(1);
      });
    });

    it('모든 기초 에토스가 필수 필드를 가진다', () => {
      Object.values(BASE_ETHOS).forEach((ethos: Ethos) => {
        expect(ethos.id).toBeDefined();
        expect(ethos.name).toBeDefined();
        expect(ethos.type).toBeDefined();
        expect(ethos.description).toBeDefined();
        expect(ethos.effect).toBeDefined();
        expect(ethos.pyramidLevel).toBeDefined();
      });
    });

    it('기초 에토스는 nodeId가 없다', () => {
      Object.values(BASE_ETHOS).forEach((ethos: Ethos) => {
        expect(ethos.nodeId).toBeUndefined();
      });
    });
  });

  describe('TIER3_ETHOS', () => {
    it('3단계 에토스가 비어있지 않다', () => {
      expect(Object.keys(TIER3_ETHOS).length).toBeGreaterThan(0);
    });

    it('모든 3단계 에토스가 레벨 3이다', () => {
      Object.values(TIER3_ETHOS).forEach((ethos: Ethos) => {
        expect(ethos.pyramidLevel).toBe(3);
      });
    });

    it('모든 3단계 에토스가 nodeId를 가진다', () => {
      Object.values(TIER3_ETHOS).forEach((ethos: Ethos) => {
        expect(ethos.nodeId).toBeDefined();
      });
    });
  });

  describe('TIER5_ETHOS', () => {
    it('5단계 에토스가 비어있지 않다', () => {
      expect(Object.keys(TIER5_ETHOS).length).toBeGreaterThan(0);
    });

    it('모든 5단계 에토스가 레벨 5이다', () => {
      Object.values(TIER5_ETHOS).forEach((ethos: Ethos) => {
        expect(ethos.pyramidLevel).toBe(5);
      });
    });

    it('모든 5단계 에토스가 nodeId를 가진다', () => {
      Object.values(TIER5_ETHOS).forEach((ethos: Ethos) => {
        expect(ethos.nodeId).toBeDefined();
      });
    });
  });

  describe('ETHOS', () => {
    it('모든 에토스가 통합되어 있다', () => {
      const expectedCount =
        Object.keys(BASE_ETHOS).length +
        Object.keys(TIER3_ETHOS).length +
        Object.keys(TIER5_ETHOS).length;
      expect(Object.keys(ETHOS).length).toBe(expectedCount);
    });

    it('에토스 ID가 키와 일치한다', () => {
      Object.entries(ETHOS).forEach(([key, ethos]) => {
        expect(ethos.id).toBe(key);
      });
    });

    it('에토스 타입이 유효하다', () => {
      const validTypes = ['gun', 'sword', 'common'];
      Object.values(ETHOS).forEach((ethos: Ethos) => {
        expect(validTypes).toContain(ethos.type);
      });
    });

    it('effect 객체가 trigger와 action을 가진다', () => {
      Object.values(ETHOS).forEach((ethos: Ethos) => {
        expect(ethos.effect.trigger).toBeDefined();
        expect(ethos.effect.action).toBeDefined();
      });
    });
  });

  describe('ETHOS_NODES', () => {
    it('노드가 비어있지 않다', () => {
      expect(Object.keys(ETHOS_NODES).length).toBeGreaterThan(0);
    });

    it('모든 노드가 필수 필드를 가진다', () => {
      Object.values(ETHOS_NODES).forEach((node: EthosNode) => {
        expect(node.id).toBeDefined();
        expect(node.name).toBeDefined();
        expect(node.tier).toBeDefined();
        expect(node.choices).toBeDefined();
        expect(node.description).toBeDefined();
      });
    });

    it('노드 ID가 키와 일치한다', () => {
      Object.entries(ETHOS_NODES).forEach(([key, node]) => {
        expect(node.id).toBe(key);
      });
    });

    it('노드 티어가 3 또는 5이다', () => {
      Object.values(ETHOS_NODES).forEach((node: EthosNode) => {
        expect([3, 5]).toContain(node.tier);
      });
    });

    it('각 노드가 정확히 2개의 선택지를 가진다', () => {
      Object.values(ETHOS_NODES).forEach((node: EthosNode) => {
        expect(node.choices.length).toBe(2);
      });
    });

    it('선택지가 실제 에토스를 참조한다', () => {
      Object.values(ETHOS_NODES).forEach((node: EthosNode) => {
        node.choices.forEach(choiceId => {
          expect(ETHOS[choiceId]).toBeDefined();
        });
      });
    });
  });

  describe('getEthosForLevel', () => {
    it('레벨 1에서 기초 에토스만 반환한다', () => {
      const result = getEthosForLevel(1);
      expect(result.length).toBe(Object.keys(BASE_ETHOS).length);
      result.forEach(ethos => {
        expect(ethos.pyramidLevel).toBe(1);
      });
    });

    it('레벨 3에서 1단계와 3단계 에토스를 반환한다', () => {
      const result = getEthosForLevel(3);
      const expectedCount =
        Object.keys(BASE_ETHOS).length + Object.keys(TIER3_ETHOS).length;
      expect(result.length).toBe(expectedCount);
    });

    it('레벨 5에서 모든 에토스를 반환한다', () => {
      const result = getEthosForLevel(5);
      expect(result.length).toBe(Object.keys(ETHOS).length);
    });

    it('타입 필터가 작동한다', () => {
      const gunEthos = getEthosForLevel(5, 'gun');
      gunEthos.forEach(ethos => {
        expect(ethos.type).toBe('gun');
      });
    });

    it('sword 타입 필터가 작동한다', () => {
      const swordEthos = getEthosForLevel(5, 'sword');
      swordEthos.forEach(ethos => {
        expect(ethos.type).toBe('sword');
      });
    });
  });

  describe('getEthosNodeChoices', () => {
    it('존재하는 노드의 선택지를 반환한다', () => {
      const choices = getEthosNodeChoices('advance');
      expect(choices).not.toBeNull();
      expect(choices?.length).toBe(2);
    });

    it('존재하지 않는 노드는 null을 반환한다', () => {
      const choices = getEthosNodeChoices('nonexistent');
      expect(choices).toBeNull();
    });

    it('선택지가 Ethos 객체이다', () => {
      const choices = getEthosNodeChoices('advance');
      if (choices) {
        choices.forEach(choice => {
          expect(choice.id).toBeDefined();
          expect(choice.name).toBeDefined();
          expect(choice.effect).toBeDefined();
        });
      }
    });
  });

  describe('getEthosNodesForTier', () => {
    it('3단계 노드를 반환한다', () => {
      const nodes = getEthosNodesForTier(3);
      expect(nodes.length).toBeGreaterThan(0);
      nodes.forEach(node => {
        expect(node.tier).toBe(3);
      });
    });

    it('5단계 노드를 반환한다', () => {
      const nodes = getEthosNodesForTier(5);
      expect(nodes.length).toBeGreaterThan(0);
      nodes.forEach(node => {
        expect(node.tier).toBe(5);
      });
    });

    it('1단계는 노드가 없다', () => {
      const nodes = getEthosNodesForTier(1);
      expect(nodes.length).toBe(0);
    });
  });

  describe('getBaseEthos', () => {
    it('기초 에토스 목록을 반환한다', () => {
      const result = getBaseEthos();
      expect(result.length).toBe(Object.keys(BASE_ETHOS).length);
    });

    it('모든 반환값이 레벨 1이다', () => {
      const result = getBaseEthos();
      result.forEach(ethos => {
        expect(ethos.pyramidLevel).toBe(1);
      });
    });
  });

  describe('특정 에토스 검증', () => {
    it('용맹함이 올바르게 정의되어 있다', () => {
      const ethos = BASE_ETHOS.bravery;
      expect(ethos.name).toBe('용맹함');
      expect(ethos.type).toBe('sword');
      expect(ethos.effect.trigger).toBe('battleStart');
      expect(ethos.effect.action).toBe('attackBonus');
      expect(ethos.effect.value).toBe(1);
    });

    it('틈새가 올바르게 정의되어 있다', () => {
      const ethos = TIER3_ETHOS.gap;
      expect(ethos.name).toBe('틈새');
      expect(ethos.type).toBe('gun');
      expect(ethos.effect.trigger).toBe('evadeSuccess');
      expect(ethos.effect.action).toBe('shoot');
      expect(ethos.nodeId).toBe('advance');
    });

    it('명사수가 올바르게 정의되어 있다', () => {
      const ethos = TIER5_ETHOS.marksman;
      expect(ethos.name).toBe('명사수');
      expect(ethos.type).toBe('gun');
      expect(ethos.effect.trigger).toBe('gunAttack');
      expect(ethos.effect.action).toBe('ignoreEvasion');
      expect(ethos.effect.percent).toBe(25);
      expect(ethos.nodeId).toBe('emperor');
    });
  });

  describe('노드-에토스 연결 검증', () => {
    it('전진 노드의 선택지가 올바르다', () => {
      const node = ETHOS_NODES.advance;
      expect(node.choices).toContain('smokescreen');
      expect(node.choices).toContain('gap');
    });

    it('제왕 노드의 선택지가 올바르다', () => {
      const node = ETHOS_NODES.emperor;
      expect(node.choices).toContain('extreme');
      expect(node.choices).toContain('marksman');
    });

    it('선택지 에토스의 nodeId가 노드 ID와 일치한다', () => {
      Object.values(ETHOS_NODES).forEach((node: EthosNode) => {
        node.choices.forEach(choiceId => {
          const ethos = ETHOS[choiceId];
          expect(ethos.nodeId).toBe(node.id);
        });
      });
    });
  });
});
