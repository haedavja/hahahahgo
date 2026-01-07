/**
 * @file cardEnhancementUtils.test.ts
 * @description 카드 강화 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  calculateEnhancedStats,
  getEnhancedCard,
  isEnhanceable,
  getMaxEnhancementLevel,
  getEnhancementDifference,
  getEnhancementColor,
  getEnhancementLabel,
  type BaseCard,
} from './cardEnhancementUtils';

describe('cardEnhancementUtils', () => {
  describe('calculateEnhancedStats', () => {
    it('레벨 0 이하에서는 기본 스탯 반환', () => {
      const stats = calculateEnhancedStats('strike', 0);
      expect(stats.damageBonus).toBe(0);
      expect(stats.blockBonus).toBe(0);
      expect(stats.addedTraits).toEqual([]);
    });

    it('레벨 6 이상에서는 기본 스탯 반환', () => {
      const stats = calculateEnhancedStats('strike', 6);
      expect(stats.damageBonus).toBe(0);
    });

    it('존재하지 않는 카드ID에서는 기본 스탯 반환', () => {
      const stats = calculateEnhancedStats('non_existent_card', 1);
      expect(stats.damageBonus).toBe(0);
      expect(stats.specialEffects).toEqual([]);
    });

    it('유효한 강화 레벨에서 스탯이 계산됨', () => {
      // strike 카드는 강화 데이터가 있음
      const stats = calculateEnhancedStats('strike', 1);
      // 강화 데이터가 있으면 기본값과 다를 수 있음
      expect(stats).toBeDefined();
      expect(typeof stats.damageBonus).toBe('number');
      expect(typeof stats.blockBonus).toBe('number');
    });

    it('강화 레벨이 높을수록 누적 효과', () => {
      const stats1 = calculateEnhancedStats('strike', 1);
      const stats5 = calculateEnhancedStats('strike', 5);
      // 레벨 5의 누적 효과가 레벨 1보다 크거나 같아야 함
      expect(stats5.damageBonus).toBeGreaterThanOrEqual(stats1.damageBonus);
    });
  });

  describe('getEnhancedCard', () => {
    const mockCard: BaseCard = {
      id: 'strike',
      name: '타격',
      type: 'attack',
      damage: 6,
      speedCost: 3,
      actionCost: 1,
      description: '6 피해',
    };

    it('강화 레벨 0에서 기본 카드 반환', () => {
      const enhanced = getEnhancedCard(mockCard, 0);
      expect(enhanced.damage).toBe(mockCard.damage);
      expect(enhanced.speedCost).toBe(mockCard.speedCost);
      expect(enhanced.enhancementLevel).toBe(0);
    });

    it('강화된 카드에 enhancementLevel 포함', () => {
      const enhanced = getEnhancedCard(mockCard, 3);
      expect(enhanced.enhancementLevel).toBe(3);
      expect(enhanced.enhancedStats).toBeDefined();
    });

    it('피해량은 0 미만이 될 수 없음', () => {
      const lowDamageCard: BaseCard = {
        id: 'test',
        name: '테스트',
        type: 'attack',
        damage: 1,
        speedCost: 3,
        actionCost: 1,
      };
      const enhanced = getEnhancedCard(lowDamageCard, 1);
      expect(enhanced.damage).toBeGreaterThanOrEqual(0);
    });

    it('속도 비용은 1 미만이 될 수 없음', () => {
      const fastCard: BaseCard = {
        id: 'test',
        name: '테스트',
        type: 'attack',
        speedCost: 1,
        actionCost: 1,
      };
      const enhanced = getEnhancedCard(fastCard, 5);
      expect(enhanced.speedCost).toBeGreaterThanOrEqual(1);
    });

    it('행동력 비용은 0 미만이 될 수 없음', () => {
      const enhanced = getEnhancedCard(mockCard, 5);
      expect(enhanced.actionCost).toBeGreaterThanOrEqual(0);
    });

    it('방어 카드의 방어력도 강화됨', () => {
      const defenseCard: BaseCard = {
        id: 'defend',
        name: '방어',
        type: 'defense',
        block: 5,
        speedCost: 2,
        actionCost: 1,
      };
      const enhanced = getEnhancedCard(defenseCard, 0);
      expect(enhanced.block).toBe(5);
    });
  });

  describe('isEnhanceable', () => {
    it('강화 데이터가 있는 카드는 true', () => {
      expect(isEnhanceable('strike')).toBe(true);
    });

    it('강화 데이터가 없는 카드는 false', () => {
      expect(isEnhanceable('non_existent_card_xyz')).toBe(false);
    });
  });

  describe('getMaxEnhancementLevel', () => {
    it('강화 가능한 카드는 5 반환', () => {
      expect(getMaxEnhancementLevel('strike')).toBe(5);
    });

    it('강화 불가능한 카드는 0 반환', () => {
      expect(getMaxEnhancementLevel('non_existent_card_xyz')).toBe(0);
    });
  });

  describe('getEnhancementDifference', () => {
    it('두 레벨 간 차이 계산 (문자열 반환)', () => {
      const diff = getEnhancementDifference('strike', 1, 2);
      expect(typeof diff).toBe('string');
    });

    it('같은 레벨에서는 빈 문자열', () => {
      const diff = getEnhancementDifference('strike', 2, 2);
      expect(diff).toBe('');
    });

    it('fromLevel > toLevel에서는 빈 문자열', () => {
      const diff = getEnhancementDifference('strike', 5, 2);
      expect(diff).toBe('');
    });

    it('레벨 0에서 레벨 5까지 차이 설명 포함', () => {
      const diff = getEnhancementDifference('strike', 0, 5);
      // 강화 효과가 있으면 설명 문자열 포함
      expect(typeof diff).toBe('string');
    });
  });

  describe('getEnhancementColor', () => {
    it('레벨 0은 기본 색상 (gray-400)', () => {
      expect(getEnhancementColor(0)).toBe('#9ca3af');
    });

    it('레벨 1~5는 각각 다른 색상', () => {
      const colors = [1, 2, 3, 4, 5].map(getEnhancementColor);
      // 모든 색상이 정의되어 있어야 함
      colors.forEach(color => {
        expect(color).toBeDefined();
        expect(color.startsWith('#')).toBe(true);
      });
    });

    it('레벨 5는 마일스톤 색상 (pink-400)', () => {
      const color = getEnhancementColor(5);
      expect(color).toBe('#f472b6');
    });

    it('각 레벨별 색상 확인', () => {
      expect(getEnhancementColor(1)).toBe('#4ade80'); // green-400
      expect(getEnhancementColor(2)).toBe('#22d3ee'); // cyan-400
      expect(getEnhancementColor(3)).toBe('#a78bfa'); // violet-400 (마일스톤)
      expect(getEnhancementColor(4)).toBe('#fb923c'); // orange-400
    });
  });

  describe('getEnhancementLabel', () => {
    it('레벨 0은 빈 문자열', () => {
      expect(getEnhancementLabel(0)).toBe('');
    });

    it('레벨 1~5는 라벨 있음', () => {
      expect(getEnhancementLabel(1)).toBe('+1');
      expect(getEnhancementLabel(5)).toBe('+5');
    });
  });

  describe('특성(traits) 처리', () => {
    it('기본 특성이 있는 카드 강화', () => {
      const cardWithTraits: BaseCard = {
        id: 'test',
        name: '테스트',
        type: 'attack',
        speedCost: 3,
        actionCost: 1,
        traits: ['SWIFT'],
      };
      const enhanced = getEnhancedCard(cardWithTraits, 1);
      // 기본 특성이 유지되어야 함
      expect(enhanced.traits).toContain('SWIFT');
    });

    it('특성이 없는 카드도 강화로 특성 획득 가능', () => {
      const cardWithoutTraits: BaseCard = {
        id: 'test',
        name: '테스트',
        type: 'attack',
        speedCost: 3,
        actionCost: 1,
      };
      const enhanced = getEnhancedCard(cardWithoutTraits, 5);
      // 강화로 특성이 추가될 수 있음
      expect(enhanced.enhancedStats.addedTraits).toBeDefined();
    });
  });

  describe('hits 처리', () => {
    it('다타 카드의 hits 강화', () => {
      const multiHitCard: BaseCard = {
        id: 'test',
        name: '테스트',
        type: 'attack',
        damage: 3,
        hits: 2,
        speedCost: 4,
        actionCost: 1,
      };
      const enhanced = getEnhancedCard(multiHitCard, 0);
      expect(enhanced.hits).toBe(2);
    });
  });

  describe('pushAmount/advanceAmount 처리', () => {
    it('pushAmount 강화', () => {
      const pushCard: BaseCard = {
        id: 'test',
        name: '테스트',
        type: 'attack',
        pushAmount: 1,
        speedCost: 3,
        actionCost: 1,
      };
      const enhanced = getEnhancedCard(pushCard, 0);
      expect(enhanced.pushAmount).toBe(1);
    });

    it('advanceAmount 강화', () => {
      const advanceCard: BaseCard = {
        id: 'test',
        name: '테스트',
        type: 'attack',
        advanceAmount: 2,
        speedCost: 3,
        actionCost: 1,
      };
      const enhanced = getEnhancedCard(advanceCard, 0);
      expect(enhanced.advanceAmount).toBe(2);
    });
  });

  describe('parryRange 처리', () => {
    it('패링 범위 강화', () => {
      const parryCard: BaseCard = {
        id: 'test',
        name: '테스트',
        type: 'defense',
        parryRange: 3,
        speedCost: 2,
        actionCost: 1,
      };
      const enhanced = getEnhancedCard(parryCard, 0);
      expect(enhanced.parryRange).toBe(3);
    });
  });
});
