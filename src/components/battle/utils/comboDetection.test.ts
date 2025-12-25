/**
 * @file comboDetection.test.js
 * @description 포커 콤보 감지 로직 테스트
 *
 * ## 테스트 대상
 * - detectPokerCombo: actionCost 기반 포커 패 감지
 * - applyPokerBonus: 콤보 보너스 카드 강화
 *
 * ## 주요 테스트 케이스
 * - 하이카드/페어/투페어/트리플/풀하우스/포카드/파이브카드
 * - 플러쉬 (동일 타입 4장 이상)
 * - bonusKeys 정확한 설정
 * - null/undefined/빈 배열 안전 처리
 */

import { describe, it, expect } from 'vitest';
import { detectPokerCombo, applyPokerBonus } from './comboDetection';

// 테스트용 카드 헬퍼
function createCard(actionCost, type = 'attack', traits = []) {
  return { actionCost, type, traits };
}

describe('detectPokerCombo', () => {
  describe('기본 케이스', () => {
    it('빈 배열이면 null 반환', () => {
      expect(detectPokerCombo([])).toBeNull();
    });

    it('null이면 null 반환', () => {
      expect(detectPokerCombo(null)).toBeNull();
    });

    it('undefined면 null 반환', () => {
      expect(detectPokerCombo(undefined)).toBeNull();
    });
  });

  describe('하이카드', () => {
    it('카드 1장이면 하이카드', () => {
      const result = detectPokerCombo([createCard(3)]);
      expect(result.name).toBe('하이카드');
      expect(result.bonusKeys.has(3)).toBe(true);
    });

    it('모두 다른 코스트면 하이카드', () => {
      const cards = [createCard(1), createCard(2), createCard(3)];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('하이카드');
    });
  });

  describe('페어', () => {
    it('같은 코스트 2장이면 페어', () => {
      const cards = [createCard(2), createCard(2), createCard(3)];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('페어');
      expect(result.bonusKeys.has(2)).toBe(true);
    });
  });

  describe('투페어', () => {
    it('2쌍의 페어면 투페어', () => {
      // 혼합 타입으로 플러쉬 방지 (4장 동일 타입은 플러쉬)
      const cards = [
        createCard(2, 'attack'),
        createCard(2, 'defense'),
        createCard(3, 'attack'),
        createCard(3, 'defense')
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('투페어');
      expect(result.bonusKeys.has(2)).toBe(true);
      expect(result.bonusKeys.has(3)).toBe(true);
    });
  });

  describe('트리플', () => {
    it('같은 코스트 3장이면 트리플', () => {
      const cards = [createCard(2), createCard(2), createCard(2)];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('트리플');
      expect(result.bonusKeys.has(2)).toBe(true);
    });
  });

  describe('풀하우스', () => {
    it('트리플 + 페어면 풀하우스', () => {
      const cards = [
        createCard(2), createCard(2), createCard(2),
        createCard(3), createCard(3)
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('풀하우스');
      expect(result.bonusKeys.has(2)).toBe(true);
      expect(result.bonusKeys.has(3)).toBe(true);
    });
  });

  describe('포카드', () => {
    it('같은 코스트 4장이면 포카드', () => {
      const cards = [
        createCard(2), createCard(2), createCard(2), createCard(2)
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('포카드');
      expect(result.bonusKeys.has(2)).toBe(true);
    });
  });

  describe('파이브카드', () => {
    it('같은 코스트 5장이면 파이브카드', () => {
      const cards = [
        createCard(2), createCard(2), createCard(2), createCard(2), createCard(2)
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('파이브카드');
      expect(result.bonusKeys.has(2)).toBe(true);
    });
  });

  describe('플러쉬', () => {
    it('공격 카드 4장 이상이면 플러쉬', () => {
      const cards = [
        createCard(1, 'attack'),
        createCard(2, 'attack'),
        createCard(3, 'attack'),
        createCard(4, 'attack')
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('플러쉬');
    });

    it('방어 카드 4장 이상이면 플러쉬', () => {
      const cards = [
        createCard(1, 'defense'),
        createCard(2, 'defense'),
        createCard(3, 'defense'),
        createCard(4, 'defense')
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('플러쉬');
    });

    it('general 카드도 방어로 취급', () => {
      const cards = [
        createCard(1, 'general'),
        createCard(2, 'general'),
        createCard(3, 'general'),
        createCard(4, 'general')
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('플러쉬');
    });

    it('혼합 타입 4장은 플러쉬 아님', () => {
      const cards = [
        createCard(1, 'attack'),
        createCard(2, 'attack'),
        createCard(3, 'defense'),
        createCard(4, 'attack')
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).not.toBe('플러쉬');
    });
  });

  describe('outcast 특성 처리', () => {
    it('outcast 카드는 조합 계산에서 제외', () => {
      const cards = [
        createCard(2, 'attack', ['outcast']),
        createCard(2, 'attack'),
        createCard(3, 'attack')
      ];
      const result = detectPokerCombo(cards);
      // outcast 제외 후 카드 2장 (2, 3)이므로 하이카드
      expect(result.name).toBe('하이카드');
    });

    it('모든 카드가 outcast면 null 반환', () => {
      const cards = [
        createCard(2, 'attack', ['outcast']),
        createCard(2, 'attack', ['outcast'])
      ];
      expect(detectPokerCombo(cards)).toBeNull();
    });
  });

  describe('유령카드 처리', () => {
    it('유령카드는 조합 계산에서 제외', () => {
      const cards = [
        { actionCost: 2, type: 'attack', isGhost: true },
        { actionCost: 2, type: 'attack' },
        { actionCost: 3, type: 'attack' }
      ];
      const result = detectPokerCombo(cards);
      // 유령 제외 후 카드 2장 (2, 3)이므로 하이카드
      expect(result.name).toBe('하이카드');
    });

    it('유령카드 제외 후 페어 감지', () => {
      const cards = [
        { actionCost: 2, type: 'attack', isGhost: true },
        { actionCost: 2, type: 'attack' },
        { actionCost: 2, type: 'attack' }
      ];
      const result = detectPokerCombo(cards);
      // 유령 제외 후 2장 페어
      expect(result.name).toBe('페어');
    });

    it('모든 카드가 유령이면 null 반환', () => {
      const cards = [
        { actionCost: 2, type: 'attack', isGhost: true },
        { actionCost: 2, type: 'attack', isGhost: true }
      ];
      expect(detectPokerCombo(cards)).toBeNull();
    });

    it('유령카드 3장 + 실제카드 1장 = 하이카드', () => {
      const cards = [
        { actionCost: 1, type: 'attack', isGhost: true },
        { actionCost: 1, type: 'attack', isGhost: true },
        { actionCost: 1, type: 'attack', isGhost: true },
        { actionCost: 1, type: 'attack' }
      ];
      const result = detectPokerCombo(cards);
      // 실제 카드 1장만 = 하이카드
      expect(result.name).toBe('하이카드');
    });
  });

  describe('우선순위 테스트', () => {
    it('포카드가 플러쉬보다 우선', () => {
      const cards = [
        createCard(2, 'attack'),
        createCard(2, 'attack'),
        createCard(2, 'attack'),
        createCard(2, 'attack')
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('포카드');
    });

    it('풀하우스가 트리플보다 우선', () => {
      const cards = [
        createCard(2), createCard(2), createCard(2),
        createCard(3), createCard(3)
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('풀하우스');
    });
  });
});

describe('applyPokerBonus', () => {
  it('combo가 null이면 원본 카드 반환', () => {
    const cards = [createCard(2), createCard(3)];
    const result = applyPokerBonus(cards, null);
    expect(result).toEqual(cards);
  });

  it('bonusKeys에 포함된 카드에 _combo 태그 추가', () => {
    const cards = [createCard(2), createCard(3)];
    const combo = { name: '페어', bonusKeys: new Set([2]) };
    const result = applyPokerBonus(cards, combo);

    expect(result[0]._combo).toBe('페어');
    expect(result[1]._combo).toBeUndefined();
  });
});
