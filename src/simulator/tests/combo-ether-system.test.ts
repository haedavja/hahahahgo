/**
 * @file combo-ether-system.test.ts
 * @description 포커 콤보 및 에테르 계산 시스템 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  detectPokerCombo,
  calculateActionCostBonus,
  calculateDeflation,
  getCardBaseEther,
  calculateTotalEther,
  checkEtherBurst,
  COMBO_MULTIPLIERS,
  COMBO_INFO,
  ETHER_BY_RARITY,
  ETHER_THRESHOLD,
  DEFLATION_RATE,
  type ComboCard,
} from '../core/combo-ether-system';

// 테스트용 카드 생성 헬퍼
function createCard(
  overrides: Partial<ComboCard> = {}
): ComboCard {
  return {
    id: `card_${Math.random().toString(36).substring(7)}`,
    actionCost: 1,
    type: 'attack',
    traits: [],
    isGhost: false,
    rarity: 'common',
    ...overrides,
  };
}

describe('combo-ether-system', () => {
  describe('상수', () => {
    it('콤보 배율이 올바르게 정의되어 있다', () => {
      expect(COMBO_MULTIPLIERS['하이카드']).toBe(1);
      expect(COMBO_MULTIPLIERS['페어']).toBe(2);
      expect(COMBO_MULTIPLIERS['투페어']).toBe(2.5);
      expect(COMBO_MULTIPLIERS['트리플']).toBe(3);
      expect(COMBO_MULTIPLIERS['플러쉬']).toBe(3.5);
      expect(COMBO_MULTIPLIERS['풀하우스']).toBe(3.75);
      expect(COMBO_MULTIPLIERS['포카드']).toBe(4);
      expect(COMBO_MULTIPLIERS['파이브카드']).toBe(5);
    });

    it('콤보 정보가 올바르게 정의되어 있다', () => {
      expect(COMBO_INFO['하이카드'].rank).toBe(0);
      expect(COMBO_INFO['파이브카드'].rank).toBe(7);
    });

    it('희귀도별 에테르가 올바르게 정의되어 있다', () => {
      expect(ETHER_BY_RARITY.common).toBe(10);
      expect(ETHER_BY_RARITY.rare).toBe(25);
      expect(ETHER_BY_RARITY.special).toBe(100);
      expect(ETHER_BY_RARITY.legendary).toBe(500);
    });

    it('에테르 임계치가 100이다', () => {
      expect(ETHER_THRESHOLD).toBe(100);
    });

    it('디플레이션 감소율이 0.8이다', () => {
      expect(DEFLATION_RATE).toBe(0.8);
    });
  });

  describe('detectPokerCombo', () => {
    it('빈 배열은 하이카드를 반환한다', () => {
      const result = detectPokerCombo([]);
      expect(result.name).toBe('하이카드');
      expect(result.multiplier).toBe(1);
    });

    it('카드 1장은 하이카드를 반환한다', () => {
      const cards = [createCard({ actionCost: 1 })];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('하이카드');
    });

    it('같은 actionCost 2장은 페어를 반환한다', () => {
      const cards = [
        createCard({ actionCost: 2 }),
        createCard({ actionCost: 2 }),
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('페어');
      expect(result.multiplier).toBe(2);
    });

    it('같은 actionCost 3장은 트리플을 반환한다', () => {
      const cards = [
        createCard({ actionCost: 3 }),
        createCard({ actionCost: 3 }),
        createCard({ actionCost: 3 }),
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('트리플');
      expect(result.multiplier).toBe(3);
    });

    it('같은 actionCost 4장은 포카드를 반환한다', () => {
      const cards = [
        createCard({ actionCost: 2 }),
        createCard({ actionCost: 2 }),
        createCard({ actionCost: 2 }),
        createCard({ actionCost: 2 }),
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('포카드');
      expect(result.multiplier).toBe(4);
    });

    it('같은 actionCost 5장은 파이브카드를 반환한다', () => {
      const cards = [
        createCard({ actionCost: 1 }),
        createCard({ actionCost: 1 }),
        createCard({ actionCost: 1 }),
        createCard({ actionCost: 1 }),
        createCard({ actionCost: 1 }),
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('파이브카드');
      expect(result.multiplier).toBe(5);
    });

    it('2개의 페어는 투페어를 반환한다', () => {
      // 플러쉬보다 투페어를 우선하기 위해 타입을 섞음
      const cards = [
        createCard({ actionCost: 2, type: 'attack' }),
        createCard({ actionCost: 2, type: 'general' }),
        createCard({ actionCost: 3, type: 'attack' }),
        createCard({ actionCost: 3, type: 'general' }),
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('투페어');
      expect(result.multiplier).toBe(2.5);
    });

    it('트리플과 페어는 풀하우스를 반환한다', () => {
      const cards = [
        createCard({ actionCost: 2 }),
        createCard({ actionCost: 2 }),
        createCard({ actionCost: 2 }),
        createCard({ actionCost: 3 }),
        createCard({ actionCost: 3 }),
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('풀하우스');
      expect(result.multiplier).toBe(3.75);
    });

    it('같은 타입(attack) 4장은 플러쉬를 반환한다', () => {
      const cards = [
        createCard({ actionCost: 1, type: 'attack' }),
        createCard({ actionCost: 2, type: 'attack' }),
        createCard({ actionCost: 3, type: 'attack' }),
        createCard({ actionCost: 4, type: 'attack' }),
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('플러쉬');
      expect(result.multiplier).toBe(3.5);
    });

    it('소외(outcast) 특성 카드는 조합에서 제외된다', () => {
      const cards = [
        createCard({ actionCost: 2, traits: ['outcast'] }),
        createCard({ actionCost: 2 }),
        createCard({ actionCost: 1 }),
      ];
      const result = detectPokerCombo(cards);
      // 소외 카드 제외하면 2코스트 1장, 1코스트 1장이므로 하이카드
      expect(result.name).toBe('하이카드');
    });

    it('유령 카드는 조합에서 제외된다', () => {
      const cards = [
        createCard({ actionCost: 2, isGhost: true }),
        createCard({ actionCost: 2 }),
        createCard({ actionCost: 1 }),
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('하이카드');
    });

    it('포카드가 풀하우스보다 우선한다', () => {
      const cards = [
        createCard({ actionCost: 2 }),
        createCard({ actionCost: 2 }),
        createCard({ actionCost: 2 }),
        createCard({ actionCost: 2 }),
        createCard({ actionCost: 3 }),
        createCard({ actionCost: 3 }),
      ];
      const result = detectPokerCombo(cards);
      expect(result.name).toBe('포카드');
    });
  });

  describe('calculateActionCostBonus', () => {
    it('빈 배열은 0을 반환한다', () => {
      expect(calculateActionCostBonus([])).toBe(0);
    });

    it('1코스트 카드는 보너스가 없다', () => {
      const cards = [createCard({ actionCost: 1 })];
      expect(calculateActionCostBonus(cards)).toBe(0);
    });

    it('2코스트 카드는 0.5 보너스가 있다', () => {
      const cards = [createCard({ actionCost: 2 })];
      expect(calculateActionCostBonus(cards)).toBe(0.5);
    });

    it('3코스트 카드는 1.0 보너스가 있다', () => {
      const cards = [createCard({ actionCost: 3 })];
      expect(calculateActionCostBonus(cards)).toBe(1.0);
    });

    it('여러 고비용 카드의 보너스가 합산된다', () => {
      const cards = [
        createCard({ actionCost: 2 }), // 0.5
        createCard({ actionCost: 3 }), // 1.0
      ];
      expect(calculateActionCostBonus(cards)).toBe(1.5);
    });

    it('유령 카드는 보너스에서 제외된다', () => {
      const cards = [
        createCard({ actionCost: 3, isGhost: true }),
        createCard({ actionCost: 2 }),
      ];
      expect(calculateActionCostBonus(cards)).toBe(0.5);
    });

    it('소외 카드는 보너스에서 제외된다', () => {
      const cards = [
        createCard({ actionCost: 3, traits: ['outcast'] }),
        createCard({ actionCost: 2 }),
      ];
      expect(calculateActionCostBonus(cards)).toBe(0.5);
    });
  });

  describe('calculateDeflation', () => {
    it('첫 사용은 디플레이션이 없다', () => {
      const result = calculateDeflation('페어', {});
      expect(result.multiplier).toBe(1);
      expect(result.usageCount).toBe(0);
    });

    it('1회 사용 후 0.8배가 된다', () => {
      const result = calculateDeflation('페어', { '페어': 1 });
      expect(result.multiplier).toBe(0.8);
      expect(result.usageCount).toBe(1);
    });

    it('2회 사용 후 0.64배가 된다', () => {
      const result = calculateDeflation('페어', { '페어': 2 });
      expect(result.multiplier).toBeCloseTo(0.64);
      expect(result.usageCount).toBe(2);
    });

    it('다른 조합은 영향을 받지 않는다', () => {
      const result = calculateDeflation('트리플', { '페어': 5 });
      expect(result.multiplier).toBe(1);
      expect(result.usageCount).toBe(0);
    });
  });

  describe('getCardBaseEther', () => {
    it('common 희귀도는 10 에테르다', () => {
      const card = createCard({ rarity: 'common' });
      expect(getCardBaseEther(card)).toBe(10);
    });

    it('rare 희귀도는 25 에테르다', () => {
      const card = createCard({ rarity: 'rare' });
      expect(getCardBaseEther(card)).toBe(25);
    });

    it('special 희귀도는 100 에테르다', () => {
      const card = createCard({ rarity: 'special' });
      expect(getCardBaseEther(card)).toBe(100);
    });

    it('legendary 희귀도는 500 에테르다', () => {
      const card = createCard({ rarity: 'legendary' });
      expect(getCardBaseEther(card)).toBe(500);
    });

    it('희귀도가 없으면 traits 기반으로 추정한다', () => {
      const card = createCard({ rarity: undefined, traits: ['pinnacle'] });
      expect(getCardBaseEther(card)).toBe(500); // legendary
    });
  });

  describe('calculateTotalEther', () => {
    it('유효 카드가 없으면 0을 반환한다', () => {
      const result = calculateTotalEther([]);
      expect(result.finalGain).toBe(0);
      expect(result.comboName).toBe('없음');
    });

    it('에테르 차단 상태면 0을 반환한다', () => {
      const cards = [createCard({ rarity: 'common' })];
      const result = calculateTotalEther(cards, {}, true);
      expect(result.finalGain).toBe(0);
      expect(result.breakdown).toContain('❌ 에테르 획득 불가 (망각)');
    });

    it('기본 계산이 올바르다', () => {
      const cards = [createCard({ rarity: 'common', actionCost: 1 })];
      const result = calculateTotalEther(cards, {});
      // 기본 10 × 하이카드 1 = 10
      expect(result.baseGain).toBe(10);
      expect(result.comboMultiplier).toBe(1);
      expect(result.finalGain).toBe(10);
    });

    it('페어 조합이 올바르게 계산된다', () => {
      const cards = [
        createCard({ rarity: 'common', actionCost: 2 }),
        createCard({ rarity: 'common', actionCost: 2 }),
      ];
      const result = calculateTotalEther(cards, {});
      // 기본 20 × 페어 2 + 액션코스트 보너스 1.0 = 60
      expect(result.baseGain).toBe(20);
      expect(result.comboMultiplier).toBe(2);
      expect(result.actionCostBonus).toBe(1.0);
    });

    it('디플레이션이 적용된다', () => {
      const cards = [
        createCard({ rarity: 'common', actionCost: 2 }),
        createCard({ rarity: 'common', actionCost: 2 }),
      ];
      const result = calculateTotalEther(cards, { '페어': 1 });
      expect(result.deflationMultiplier).toBe(0.8);
    });

    it('breakdown에 계산 과정이 포함된다', () => {
      const cards = [createCard({ rarity: 'rare', actionCost: 3 })];
      const result = calculateTotalEther(cards, {});
      expect(result.breakdown.length).toBeGreaterThan(0);
      expect(result.breakdown.some(s => s.includes('기본 획득'))).toBe(true);
      expect(result.breakdown.some(s => s.includes('조합'))).toBe(true);
    });
  });

  describe('checkEtherBurst', () => {
    it('임계치 미만이면 버스트가 발생하지 않는다', () => {
      const result = checkEtherBurst(50, 30);
      expect(result.triggered).toBe(false);
      expect(result.overflowEther).toBe(0);
      expect(result.bonusDamage).toBe(0);
    });

    it('임계치 도달 시 버스트가 발생한다', () => {
      const result = checkEtherBurst(80, 20);
      expect(result.triggered).toBe(true);
      expect(result.overflowEther).toBe(0);
    });

    it('임계치 초과 시 초과분이 계산된다', () => {
      const result = checkEtherBurst(80, 50);
      // 총 130, 초과 30
      expect(result.triggered).toBe(true);
      expect(result.overflowEther).toBe(30);
      expect(result.bonusDamage).toBe(3); // 30 × 0.1 = 3
    });

    it('버스트 메시지가 포함된다', () => {
      const result = checkEtherBurst(90, 20);
      expect(result.triggered).toBe(true);
      expect(result.message).toContain('에테르 버스트');
    });
  });
});
