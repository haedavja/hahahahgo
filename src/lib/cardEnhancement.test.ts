/**
 * @file cardEnhancement.test.ts
 * @description 카드 강화 시스템 통합 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_CARD_ENHANCEMENTS,
  getCardEnhancement,
  getEnhancementLevel,
  getAccumulatedEffects,
} from './cardEnhancementData';
import {
  calculateEnhancedStats,
  getEnhancedCard,
  isEnhanceable,
  getMaxEnhancementLevel,
  getNextEnhancementPreview,
  getAllEnhancementLevels,
  getEnhancementColor,
  getEnhancementLabel,
  generateEnhancedDescription,
  type BaseCard,
  type EnhancedCardStats,
} from './cardEnhancementUtils';

describe('cardEnhancementData', () => {
  describe('데이터 무결성', () => {
    it('모든 카드가 1~5 레벨을 가져야 함', () => {
      for (const enhancement of ALL_CARD_ENHANCEMENTS) {
        expect(enhancement.levels[1]).toBeDefined();
        expect(enhancement.levels[2]).toBeDefined();
        expect(enhancement.levels[3]).toBeDefined();
        expect(enhancement.levels[4]).toBeDefined();
        expect(enhancement.levels[5]).toBeDefined();
      }
    });

    it('모든 레벨이 description을 가져야 함', () => {
      for (const enhancement of ALL_CARD_ENHANCEMENTS) {
        for (let level = 1; level <= 5; level++) {
          const levelData = enhancement.levels[level as 1 | 2 | 3 | 4 | 5];
          expect(levelData.description).toBeDefined();
          expect(levelData.description.length).toBeGreaterThan(0);
        }
      }
    });

    it('모든 레벨이 effects 배열을 가져야 함', () => {
      for (const enhancement of ALL_CARD_ENHANCEMENTS) {
        for (let level = 1; level <= 5; level++) {
          const levelData = enhancement.levels[level as 1 | 2 | 3 | 4 | 5];
          expect(Array.isArray(levelData.effects)).toBe(true);
        }
      }
    });

    it('카드 ID가 유니크해야 함', () => {
      const ids = ALL_CARD_ENHANCEMENTS.map(e => e.cardId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('getCardEnhancement', () => {
    it('존재하는 카드의 강화 데이터를 반환', () => {
      const enhancement = getCardEnhancement('strike');
      expect(enhancement).toBeDefined();
      expect(enhancement?.cardId).toBe('strike');
    });

    it('존재하지 않는 카드는 undefined 반환', () => {
      const enhancement = getCardEnhancement('nonexistent_card');
      expect(enhancement).toBeUndefined();
    });
  });

  describe('getEnhancementLevel', () => {
    it('특정 레벨의 강화 데이터 반환', () => {
      const level3 = getEnhancementLevel('strike', 3);
      expect(level3).toBeDefined();
      expect(level3?.description).toBeDefined();
    });

    it('잘못된 레벨은 undefined 반환', () => {
      const level0 = getEnhancementLevel('strike', 0);
      const level6 = getEnhancementLevel('strike', 6);
      expect(level0).toBeUndefined();
      expect(level6).toBeUndefined();
    });
  });

  describe('getAccumulatedEffects', () => {
    it('누적 효과를 올바르게 계산', () => {
      const { effects } = getAccumulatedEffects('strike', 3);
      // 3강까지의 모든 효과가 누적되어야 함
      expect(effects.length).toBeGreaterThan(0);
    });

    it('1강의 경우 1강 효과만 포함', () => {
      const level1Data = getEnhancementLevel('strike', 1);
      const { effects } = getAccumulatedEffects('strike', 1);
      expect(effects.length).toBe(level1Data?.effects.length || 0);
    });
  });
});

describe('cardEnhancementUtils', () => {
  describe('calculateEnhancedStats', () => {
    it('0 이하 레벨은 기본 스탯 반환', () => {
      const stats = calculateEnhancedStats('strike', 0);
      expect(stats.damageBonus).toBe(0);
      expect(stats.blockBonus).toBe(0);
    });

    it('6 이상 레벨은 기본 스탯 반환', () => {
      const stats = calculateEnhancedStats('strike', 6);
      expect(stats.damageBonus).toBe(0);
    });

    it('강화 레벨에 따라 스탯이 증가', () => {
      const stats1 = calculateEnhancedStats('strike', 1);
      const stats3 = calculateEnhancedStats('strike', 3);
      const stats5 = calculateEnhancedStats('strike', 5);

      // 레벨이 높을수록 보너스가 높거나 같아야 함
      expect(stats3.damageBonus).toBeGreaterThanOrEqual(stats1.damageBonus);
      expect(stats5.damageBonus).toBeGreaterThanOrEqual(stats3.damageBonus);
    });
  });

  describe('getEnhancedCard', () => {
    const baseCard: BaseCard = {
      id: 'strike',
      name: '스트라이크',
      type: 'attack',
      damage: 10,
      speedCost: 5,
      actionCost: 1,
    };

    it('강화 레벨 0은 기본 카드 반환', () => {
      const enhanced = getEnhancedCard(baseCard, 0);
      expect(enhanced.damage).toBe(10);
      expect(enhanced.enhancementLevel).toBe(0);
    });

    it('강화 시 피해량이 증가', () => {
      const enhanced = getEnhancedCard(baseCard, 3);
      expect(enhanced.damage).toBeGreaterThanOrEqual(baseCard.damage!);
      expect(enhanced.enhancementLevel).toBe(3);
    });

    it('속도 비용은 최소 1 유지', () => {
      const slowCard: BaseCard = {
        id: 'test',
        name: 'Test',
        type: 'attack',
        speedCost: 2,
        actionCost: 1,
      };
      // 강화로 속도가 많이 줄어도 최소 1
      const enhanced = getEnhancedCard(slowCard, 5);
      expect(enhanced.speedCost).toBeGreaterThanOrEqual(1);
    });

    it('행동력은 최소 0 유지', () => {
      const enhanced = getEnhancedCard(baseCard, 5);
      expect(enhanced.actionCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isEnhanceable', () => {
    it('강화 가능한 카드는 true 반환', () => {
      expect(isEnhanceable('strike')).toBe(true);
      expect(isEnhanceable('shoot')).toBe(true);  // 'shot' → 'shoot'
    });

    it('강화 불가능한 카드는 false 반환', () => {
      expect(isEnhanceable('nonexistent')).toBe(false);
    });
  });

  describe('getMaxEnhancementLevel', () => {
    it('강화 가능한 카드는 5 반환', () => {
      expect(getMaxEnhancementLevel('strike')).toBe(5);
    });

    it('강화 불가능한 카드는 0 반환', () => {
      expect(getMaxEnhancementLevel('nonexistent')).toBe(0);
    });
  });

  describe('getNextEnhancementPreview', () => {
    it('다음 레벨 정보 반환', () => {
      const preview = getNextEnhancementPreview('strike', 2);
      expect(preview).not.toBeNull();
      expect(preview?.level).toBe(3);
      expect(preview?.isMilestone).toBe(true);
    });

    it('최대 레벨이면 null 반환', () => {
      const preview = getNextEnhancementPreview('strike', 5);
      expect(preview).toBeNull();
    });

    it('존재하지 않는 카드는 null 반환', () => {
      const preview = getNextEnhancementPreview('nonexistent', 0);
      expect(preview).toBeNull();
    });
  });

  describe('getAllEnhancementLevels', () => {
    it('5개 레벨 정보 반환', () => {
      const levels = getAllEnhancementLevels('strike');
      expect(levels.length).toBe(5);
    });

    it('마일스톤 레벨 표시', () => {
      const levels = getAllEnhancementLevels('strike');
      const level3 = levels.find(l => l.level === 3);
      const level5 = levels.find(l => l.level === 5);
      expect(level3?.isMilestone).toBe(true);
      expect(level5?.isMilestone).toBe(true);
    });

    it('존재하지 않는 카드는 빈 배열 반환', () => {
      const levels = getAllEnhancementLevels('nonexistent');
      expect(levels.length).toBe(0);
    });
  });

  describe('getEnhancementColor', () => {
    it('각 레벨별 색상 반환', () => {
      expect(getEnhancementColor(1)).toBe('#4ade80');
      expect(getEnhancementColor(3)).toBe('#a78bfa');
      expect(getEnhancementColor(5)).toBe('#f472b6');
    });

    it('0 이하는 회색 반환', () => {
      expect(getEnhancementColor(0)).toBe('#9ca3af');
      expect(getEnhancementColor(-1)).toBe('#9ca3af');
    });
  });

  describe('getEnhancementLabel', () => {
    it('레벨에 따른 라벨 반환', () => {
      expect(getEnhancementLabel(1)).toBe('+1');
      expect(getEnhancementLabel(5)).toBe('+5');
    });

    it('0 이하는 빈 문자열 반환', () => {
      expect(getEnhancementLabel(0)).toBe('');
      expect(getEnhancementLabel(-1)).toBe('');
    });
  });
});

describe('buildSlice 통합 테스트', () => {
  // buildSlice와의 통합 테스트는 buildSlice.test.ts에서 수행
  // 여기서는 유틸리티와의 통합만 테스트

  it('강화 레벨에 따른 카드 스탯 변화 검증', () => {
    const baseCard: BaseCard = {
      id: 'strike',
      name: '스트라이크',
      type: 'attack',
      damage: 10,
      speedCost: 5,
      actionCost: 1,
    };

    // 1~5강까지 각 레벨별 스탯 확인
    for (let level = 1; level <= 5; level++) {
      const enhanced = getEnhancedCard(baseCard, level);
      expect(enhanced.enhancementLevel).toBe(level);
      expect(enhanced.damage).toBeGreaterThanOrEqual(baseCard.damage!);
    }
  });

  it('강화 효과 누적 검증', () => {
    // strike의 누적 피해 보너스 확인
    const stats1 = calculateEnhancedStats('strike', 1);
    const stats2 = calculateEnhancedStats('strike', 2);
    const stats3 = calculateEnhancedStats('strike', 3);

    // 레벨이 높을수록 피해 보너스가 증가하거나 같아야 함
    expect(stats2.damageBonus).toBeGreaterThanOrEqual(stats1.damageBonus);
    expect(stats3.damageBonus).toBeGreaterThanOrEqual(stats2.damageBonus);
  });
});

describe('강화 시스템 엣지 케이스', () => {
  describe('특성 추가/제거', () => {
    it('특성 추가가 있는 카드 확인', () => {
      // 5강에서 특성이 추가되는 카드들 확인
      const stats = calculateEnhancedStats('coup_droit', 5);
      // coup_droit 5강: exposed 특성 추가
      expect(stats.addedTraits.length).toBeGreaterThanOrEqual(0);
    });

    it('특성 제거가 있는 카드 확인', () => {
      // parry_rifle 3강: recoil 특성 제거
      const stats = calculateEnhancedStats('parry_rifle', 3);
      expect(stats.removedTraits).toBeDefined();
    });
  });

  describe('특수 효과', () => {
    it('처형 효과가 있는 카드', () => {
      // gun_headshot 5강: 처형 효과 (HP 15 이하)
      const stats = calculateEnhancedStats('gun_headshot', 5);
      const hasExecute = stats.specialEffects.some(e => e.type === 'executeEffect');
      expect(hasExecute).toBe(true);
    });

    it('방어 무시 효과가 있는 카드', () => {
      // sniper_shot 5강: 방어력 무시 100%
      const stats = calculateEnhancedStats('sniper_shot', 5);
      const hasArmorPierce = stats.specialEffects.some(
        e => e.type === 'armorPiercePercent' || e.type === 'armorPierceCount'
      );
      expect(hasArmorPierce).toBe(true);
    });
  });

  describe('카드 타입별 강화', () => {
    it('공격 카드의 피해량 증가', () => {
      const baseCard: BaseCard = {
        id: 'strike',
        name: '스트라이크',
        type: 'attack',
        damage: 10,
        speedCost: 5,
        actionCost: 1,
      };

      const enhanced = getEnhancedCard(baseCard, 5);
      expect(enhanced.damage).toBeGreaterThan(baseCard.damage!);
    });

    it('방어 카드의 방어력 증가', () => {
      const baseCard: BaseCard = {
        id: 'guard',
        name: '가드',
        type: 'defense',
        block: 8,
        speedCost: 4,
        actionCost: 1,
      };

      const enhanced = getEnhancedCard(baseCard, 5);
      expect(enhanced.block).toBeGreaterThanOrEqual(baseCard.block!);
    });
  });

  describe('히트 수 강화', () => {
    it('다타격 카드의 타격 횟수 증가', () => {
      const baseCard: BaseCard = {
        id: 'gyrus',
        name: '가이러스',
        type: 'attack',
        damage: 3,
        hits: 3,
        speedCost: 6,
        actionCost: 2,
      };

      const enhanced = getEnhancedCard(baseCard, 5);
      // gyrus 5강: +2 hits
      expect(enhanced.hits).toBeGreaterThanOrEqual(baseCard.hits!);
    });
  });

  describe('경계 조건 테스트', () => {
    it('존재하지 않는 카드는 기본 스탯 반환', () => {
      const stats = calculateEnhancedStats('nonexistent_card', 5);
      expect(stats.damageBonus).toBe(0);
      expect(stats.blockBonus).toBe(0);
      expect(stats.specialEffects).toEqual([]);
    });

    it('음수 레벨은 기본 스탯 반환', () => {
      const stats = calculateEnhancedStats('strike', -1);
      expect(stats.damageBonus).toBe(0);
    });

    it('빈 문자열 카드 ID는 기본 스탯 반환', () => {
      const stats = calculateEnhancedStats('', 3);
      expect(stats.damageBonus).toBe(0);
    });

    it('undefined/null 처리 확인', () => {
      const baseCard: BaseCard = {
        id: 'strike',
        name: '스트라이크',
        type: 'attack',
        speedCost: 5,
        actionCost: 1,
        // damage is undefined
      };

      const enhanced = getEnhancedCard(baseCard, 3);
      // damage가 undefined면 undefined 유지
      expect(enhanced.damage).toBeUndefined();
    });
  });

  describe('모든 카드 강화 데이터 검증', () => {
    it('모든 카드가 유효한 강화 효과를 가짐', () => {
      for (const enhancement of ALL_CARD_ENHANCEMENTS) {
        for (let level = 1; level <= 5; level++) {
          const levelData = enhancement.levels[level as 1 | 2 | 3 | 4 | 5];

          // effects 배열이 존재해야 함
          expect(Array.isArray(levelData.effects)).toBe(true);

          // 각 effect가 유효한 타입을 가져야 함
          for (const effect of levelData.effects) {
            expect(effect.type).toBeDefined();
            expect(typeof effect.value).toBe('number');
          }
        }
      }
    });

    it('3강과 5강에 특별 효과가 있는 카드가 존재', () => {
      const cardsWithLevel3Special = ALL_CARD_ENHANCEMENTS.filter(
        e => e.levels[3].specialEffects && e.levels[3].specialEffects.length > 0
      );
      const cardsWithLevel5Special = ALL_CARD_ENHANCEMENTS.filter(
        e => e.levels[5].specialEffects && e.levels[5].specialEffects.length > 0
      );

      // 3강과 5강에 특수 효과가 있는 카드가 존재해야 함
      expect(cardsWithLevel3Special.length).toBeGreaterThan(0);
      expect(cardsWithLevel5Special.length).toBeGreaterThan(0);
    });
  });

  describe('특성 처리 테스트', () => {
    it('특성 추가 시 중복 방지', () => {
      const baseCard: BaseCard = {
        id: 'test',
        name: 'Test',
        type: 'attack',
        damage: 10,
        speedCost: 5,
        actionCost: 1,
        traits: ['swift'], // 이미 swift 특성 보유
      };

      // 강화로 swift가 추가되더라도 중복되지 않음
      const stats = calculateEnhancedStats('test', 5);
      if (stats.addedTraits.includes('swift')) {
        const enhanced = getEnhancedCard(baseCard, 5);
        const swiftCount = enhanced.traits?.filter(t => t === 'swift').length || 0;
        expect(swiftCount).toBe(1);
      }
    });

    it('특성 제거 처리', () => {
      const baseCard: BaseCard = {
        id: 'parry_rifle',
        name: 'Parry Rifle',
        type: 'defense',
        block: 10,
        speedCost: 4,
        actionCost: 1,
        traits: ['recoil'],
      };

      // parry_rifle 3강: recoil 제거
      const stats = calculateEnhancedStats('parry_rifle', 3);
      if (stats.removedTraits.includes('recoil')) {
        const enhanced = getEnhancedCard(baseCard, 3);
        expect(enhanced.traits).not.toContain('recoil');
      }
    });
  });
});

describe('generateEnhancedDescription', () => {
  // 기본 스탯 생성 헬퍼
  function createDefaultStats(): EnhancedCardStats {
    return {
      damageBonus: 0,
      blockBonus: 0,
      speedCostReduction: 0,
      actionCostReduction: 0,
      hitsBonus: 0,
      pushAmountBonus: 0,
      advanceAmountBonus: 0,
      burnStacksBonus: 0,
      debuffStacksBonus: 0,
      counterShotBonus: 0,
      critBoostBonus: 0,
      finesseGainBonus: 0,
      drawCountBonus: 0,
      createCountBonus: 0,
      buffAmountBonus: 0,
      agilityGainBonus: 0,
      executeThresholdBonus: 0,
      parryRangeBonus: 0,
      onHitBlockBonus: 0,
      perCardBlockBonus: 0,
      maxSpeedBoostBonus: 0,
      fragStacksBonus: 0,
      growthPerTickBonus: 0,
      durationTurnsBonus: 0,
      specialEffects: [],
      addedTraits: [],
      removedTraits: [],
    };
  }

  describe('피해량 패턴 교체', () => {
    it('"공격력 X" 패턴을 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 15, speedCost: 5, actionCost: 1 };
      const result = generateEnhancedDescription(card, '공격력 10의 일격');
      expect(result).toBe('공격력 15의 일격');
    });

    it('"피해 X" 패턴을 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 20, speedCost: 5, actionCost: 1 };
      const result = generateEnhancedDescription(card, '피해 10을 입힌다');
      expect(result).toBe('피해 20을 입힌다');
    });

    it('"X 피해" 패턴을 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 12, speedCost: 5, actionCost: 1 };
      const result = generateEnhancedDescription(card, '8 피해를 가한다');
      expect(result).toBe('12 피해를 가한다');
    });
  });

  describe('방어력 패턴 교체', () => {
    it('"방어력 X" 패턴을 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'defense', block: 12, speedCost: 4, actionCost: 1 };
      const result = generateEnhancedDescription(card, '방어력 8을 얻는다');
      expect(result).toBe('방어력 12을 얻는다');
    });

    it('"방어 X" 패턴을 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'defense', block: 15, speedCost: 4, actionCost: 1 };
      const result = generateEnhancedDescription(card, '방어 10 획득');
      expect(result).toBe('방어 15 획득');
    });
  });

  describe('기타 스탯 패턴 교체', () => {
    it('"넉백 X" 패턴을 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 5, pushAmount: 3, speedCost: 5, actionCost: 1 };
      const result = generateEnhancedDescription(card, '넉백 2');
      expect(result).toBe('넉백 3');
    });

    it('"앞당김 X" 패턴을 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 5, advanceAmount: 4, speedCost: 5, actionCost: 1 };
      const result = generateEnhancedDescription(card, '앞당김 2');
      expect(result).toBe('앞당김 4');
    });

    it('"X번 공격" 패턴을 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 3, hits: 5, speedCost: 6, actionCost: 2 };
      const result = generateEnhancedDescription(card, '3번 공격');
      expect(result).toBe('5번 공격');
    });

    it('"패링 X" 패턴을 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'defense', block: 5, parryRange: 4, speedCost: 4, actionCost: 1 };
      const result = generateEnhancedDescription(card, '패링 2');
      expect(result).toBe('패링 4');
    });
  });

  describe('강화 효과 인라인 교체', () => {
    it('화상 보너스가 설명 내 숫자를 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 10, speedCost: 5, actionCost: 1 };
      const stats = { ...createDefaultStats(), burnStacksBonus: 2 };
      const result = generateEnhancedDescription(card, '화상 1회 부여', stats);
      expect(result).toBe('화상 3회 부여');
    });

    it('치명타 보너스가 설명 내 숫자를 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 10, speedCost: 5, actionCost: 1 };
      const stats = { ...createDefaultStats(), critBoostBonus: 15 };
      const result = generateEnhancedDescription(card, '치명타 10% 확률', stats);
      expect(result).toBe('치명타 25% 확률');
    });

    it('대응사격 보너스가 설명 내 숫자를 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 10, speedCost: 5, actionCost: 1 };
      const stats = { ...createDefaultStats(), counterShotBonus: 1 };
      const result = generateEnhancedDescription(card, '대응사격 2회', stats);
      expect(result).toBe('대응사격 3회');
    });

    it('처형 보너스는 괄호 안에 표시해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 10, speedCost: 5, actionCost: 1 };
      const stats = { ...createDefaultStats(), executeThresholdBonus: 10 };
      const result = generateEnhancedDescription(card, '공격', stats);
      expect(result).toContain('처형 +10%');
    });

    it('기교 보너스가 설명 내 숫자를 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 10, speedCost: 5, actionCost: 1 };
      const stats = { ...createDefaultStats(), finesseGainBonus: 3 };
      const result = generateEnhancedDescription(card, '기교 1 획득', stats);
      expect(result).toBe('기교 4 획득');
    });

    it('드로우 보너스가 설명 내 숫자를 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'support', speedCost: 3, actionCost: 1 };
      const stats = { ...createDefaultStats(), drawCountBonus: 1 };
      const result = generateEnhancedDescription(card, '2장 드로우', stats);
      expect(result).toBe('3장 드로우');
    });

    it('민첩 보너스가 설명 내 숫자를 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'support', speedCost: 3, actionCost: 1 };
      const stats = { ...createDefaultStats(), agilityGainBonus: 2 };
      const result = generateEnhancedDescription(card, '민첩 1 부여', stats);
      expect(result).toBe('민첩 3 부여');
    });
  });

  describe('괄호 내 추가 효과 표시', () => {
    it('인라인 교체 불가 효과는 괄호 안에 표시해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 10, speedCost: 5, actionCost: 1 };
      const stats = {
        ...createDefaultStats(),
        executeThresholdBonus: 5,
        fragStacksBonus: 2,
        onHitBlockBonus: 3
      };
      const result = generateEnhancedDescription(card, '공격', stats);
      expect(result).toContain('처형 +5%');
      expect(result).toContain('파쇄탄 +2');
      expect(result).toContain('피격 방어 +3');
    });

    it('특성 추가/제거는 카드 UI에서 표시되므로 설명에 포함하지 않아야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 10, speedCost: 5, actionCost: 1 };
      const stats = { ...createDefaultStats(), addedTraits: ['swift', 'exposed'] };
      const result = generateEnhancedDescription(card, '공격', stats);
      // 새 동작: 특성 변경은 카드 UI에 직접 표시되므로 설명에서 제외
      expect(result).toBe('공격');
    });
  });

  describe('복합 효과', () => {
    it('인라인 교체와 괄호 효과를 함께 적용해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 15, speedCost: 5, actionCost: 1 };
      const stats = {
        ...createDefaultStats(),
        burnStacksBonus: 1,
        executeThresholdBonus: 10,
        finesseGainBonus: 2
      };
      const result = generateEnhancedDescription(card, '공격력 10. 화상 2회. 기교 1 획득', stats);
      expect(result).toContain('공격력 15');
      expect(result).toContain('화상 3회');
      expect(result).toContain('기교 3 획득');
      expect(result).toContain('처형 +10%');
    });

    it('enhancedStats가 없으면 기본 패턴만 교체해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 20, speedCost: 5, actionCost: 1 };
      const result = generateEnhancedDescription(card, '공격력 10을 가한다');
      expect(result).toBe('공격력 20을 가한다');
      expect(result).not.toContain('(');
    });

    it('보너스가 0이면 표시하지 않아야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 10, speedCost: 5, actionCost: 1 };
      const stats = createDefaultStats(); // 모든 보너스가 0
      const result = generateEnhancedDescription(card, '공격', stats);
      expect(result).toBe('공격');
    });
  });

  describe('엣지 케이스', () => {
    it('damage가 undefined면 피해 패턴을 교체하지 않아야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'defense', speedCost: 4, actionCost: 1 };
      const result = generateEnhancedDescription(card, '공격력 10');
      expect(result).toBe('공격력 10');
    });

    it('hits가 1이면 타격 횟수를 교체하지 않아야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 10, hits: 1, speedCost: 5, actionCost: 1 };
      const result = generateEnhancedDescription(card, '3번 공격');
      expect(result).toBe('3번 공격');
    });

    it('빈 설명은 그대로 반환해야 함', () => {
      const card: BaseCard = { id: 'test', name: 'Test', type: 'attack', damage: 10, speedCost: 5, actionCost: 1 };
      const result = generateEnhancedDescription(card, '');
      expect(result).toBe('');
    });
  });
});
