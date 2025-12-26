/**
 * @file cardTraitEffects.test.js
 * @description 카드 특성 효과 처리 테스트
 *
 * ## 테스트 대상
 * - processCardTraitEffects: 특성 기반 다음 턴 효과 계산
 *
 * ## 주요 테스트 케이스
 * - repeat: 카드 반복 사용
 * - warmup: 다음 턴 행동력 보너스
 * - exhaust: 사용 후 소멸
 * - afterimage: 유령 카드 생성
 * - 보장 카드(guaranteedCards) 추가
 */

import { describe, it, expect, vi } from 'vitest';
import { processCardTraitEffects } from './cardTraitEffects';

describe('cardTraitEffects', () => {
  describe('processCardTraitEffects', () => {
    it('빈 배열은 기본 효과를 반환해야 함', () => {
      const result = processCardTraitEffects([]);

      expect(result.guaranteedCards).toEqual([]);
      expect(result.bonusEnergy).toBe(0);
      expect(result.energyPenalty).toBe(0);
      expect(result.etherBlocked).toBe(false);
      expect(result.mainSpecialOnly).toBe(false);
      expect(result.subSpecialBoost).toBe(0);
    });

    it('repeat 특성은 다음턴 확정 카드에 추가해야 함', () => {
      const cards = [
        { id: 'card1', name: 'Repeat Card', traits: ['repeat'] }
      ];
      const result = processCardTraitEffects(cards);

      expect(result.guaranteedCards).toContain('card1');
    });

    it('warmup 특성은 보너스 행동력을 추가해야 함', () => {
      const cards = [
        { id: 'card1', name: 'Warmup Card', traits: ['warmup'] }
      ];
      const result = processCardTraitEffects(cards);

      expect(result.bonusEnergy).toBe(2);
    });

    it('exhaust 특성은 행동력 페널티를 추가해야 함', () => {
      const cards = [
        { id: 'card1', name: 'Exhaust Card', traits: ['exhaust'] }
      ];
      const result = processCardTraitEffects(cards);

      expect(result.energyPenalty).toBe(2);
    });

    it('oblivion 특성은 에테르 차단을 설정해야 함', () => {
      const cards = [
        { id: 'card1', name: 'Oblivion Card', traits: ['oblivion'] }
      ];
      const result = processCardTraitEffects(cards);

      expect(result.etherBlocked).toBe(true);
    });

    it('ruin 특성은 주특기 전용을 설정해야 함', () => {
      const cards = [
        { id: 'card1', name: 'Ruin Card', traits: ['ruin'] }
      ];
      const result = processCardTraitEffects(cards);

      expect(result.mainSpecialOnly).toBe(true);
    });

    it('general 특성은 보조특기 등장률을 증가시켜야 함', () => {
      const cards = [
        { id: 'card1', name: 'General Card', traits: ['general'] }
      ];
      const result = processCardTraitEffects(cards);

      expect(result.subSpecialBoost).toBe(0.25);
    });

    it('여러 카드의 효과가 누적되어야 함', () => {
      const cards = [
        { id: 'card1', name: 'Card 1', traits: ['warmup'] },
        { id: 'card2', name: 'Card 2', traits: ['warmup', 'general'] }
      ];
      const result = processCardTraitEffects(cards);

      expect(result.bonusEnergy).toBe(4); // 2 + 2
      expect(result.subSpecialBoost).toBe(0.25);
    });

    it('한 카드에 여러 특성이 있으면 모두 적용되어야 함', () => {
      const cards = [
        { id: 'card1', name: 'Multi Trait', traits: ['repeat', 'warmup', 'general'] }
      ];
      const result = processCardTraitEffects(cards);

      expect(result.guaranteedCards).toContain('card1');
      expect(result.bonusEnergy).toBe(2);
      expect(result.subSpecialBoost).toBe(0.25);
    });

    it('특성이 없는 카드는 효과가 없어야 함', () => {
      const cards = [
        { id: 'card1', name: 'No Trait', traits: [] },
        { id: 'card2', name: 'No Traits Field' }
      ];
      const result = processCardTraitEffects(cards);

      expect(result.guaranteedCards).toEqual([]);
      expect(result.bonusEnergy).toBe(0);
    });

    it('addLog 함수가 호출되어야 함', () => {
      const addLog: any = vi.fn();
      const cards = [
        { id: 'card1', name: 'Repeat Card', traits: ['repeat'] }
      ];

      processCardTraitEffects(cards, addLog);

      expect(addLog).toHaveBeenCalled();
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('반복'));
    });

    it('여러 repeat 카드가 모두 guaranteedCards에 추가되어야 함', () => {
      const cards = [
        { id: 'card1', name: 'Repeat 1', traits: ['repeat'] },
        { id: 'card2', name: 'Repeat 2', traits: ['repeat'] }
      ];
      const result = processCardTraitEffects(cards);

      expect(result.guaranteedCards).toHaveLength(2);
      expect(result.guaranteedCards).toContain('card1');
      expect(result.guaranteedCards).toContain('card2');
    });

    it('여러 general 카드의 효과가 누적되어야 함', () => {
      const cards = [
        { id: 'card1', name: 'General 1', traits: ['general'] },
        { id: 'card2', name: 'General 2', traits: ['general'] }
      ];
      const result = processCardTraitEffects(cards);

      expect(result.subSpecialBoost).toBe(0.5); // 0.25 + 0.25
    });
  });
});
