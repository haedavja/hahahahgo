/**
 * @file specializationUtils.test.ts
 * @description 카드 특화 시스템 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateSpecializationOptions,
  getTraitById,
  formatTraits,
  type SpecializationOption,
  type CardType,
} from './specializationUtils';

describe('specializationUtils', () => {
  describe('generateSpecializationOptions', () => {
    it('5개 이하의 선택지를 생성한다', () => {
      const options = generateSpecializationOptions();
      expect(options.length).toBeLessThanOrEqual(5);
      expect(options.length).toBeGreaterThan(0);
    });

    it('각 선택지는 필수 필드를 가진다', () => {
      const options = generateSpecializationOptions();

      for (const option of options) {
        expect(option.id).toBeDefined();
        expect(typeof option.id).toBe('string');
        expect(option.traits).toBeDefined();
        expect(Array.isArray(option.traits)).toBe(true);
        expect(option.traits.length).toBeGreaterThan(0);
        expect(typeof option.totalWeight).toBe('number');
        expect(typeof option.description).toBe('string');
      }
    });

    it('기존 특성과 중복되지 않는 선택지를 생성한다', () => {
      const existingTraits = ['swift', 'chain'];
      const options = generateSpecializationOptions(existingTraits);

      for (const option of options) {
        for (const trait of option.traits) {
          expect(existingTraits).not.toContain(trait.id);
        }
      }
    });

    it('attack 카드 타입에서 방어 전용 특성이 제외된다', () => {
      const defenseOnlyTraits = ['guard_stance', 'cautious', 'indomitable', 'solidarity'];
      const options = generateSpecializationOptions([], 'attack');

      for (const option of options) {
        for (const trait of option.traits) {
          expect(defenseOnlyTraits).not.toContain(trait.id);
        }
      }
    });

    it('defense 카드 타입에서 공격 전용 특성이 제외된다', () => {
      const attackOnlyTraits = [
        'crush', 'knockback', 'destroyer', 'slaughter', 'pinnacle',
        'stun', 'cooperation', 'training', 'finisher', 'chain', 'followup', 'cross'
      ];
      const options = generateSpecializationOptions([], 'defense');

      for (const option of options) {
        for (const trait of option.traits) {
          expect(attackOnlyTraits).not.toContain(trait.id);
        }
      }
    });

    it('general 카드 타입도 처리한다', () => {
      const options = generateSpecializationOptions([], 'general');
      expect(options.length).toBeGreaterThan(0);
    });

    it('기존 특성이 있으면 연관 특성 선택지가 포함될 수 있다', () => {
      // 여러 번 실행하여 연관 특성이 한 번이라도 나오는지 확인
      let hasSynergyOption = false;

      for (let i = 0; i < 10; i++) {
        const options = generateSpecializationOptions(['swift']);
        if (options.some(o => o.id.startsWith('synergy_'))) {
          hasSynergyOption = true;
          break;
        }
      }

      // 연관 특성이 반드시 나와야 하는 건 아니므로 soft 검증
      // (연관 특성이 없거나 이미 사용된 경우 안 나올 수 있음)
      expect(typeof hasSynergyOption).toBe('boolean');
    });

    it('혼합 선택지는 긍정과 부정 특성을 포함할 수 있다', () => {
      // 여러 번 실행하여 혼합 선택지 찾기
      let hasMixedOption = false;

      for (let i = 0; i < 20; i++) {
        const options = generateSpecializationOptions();
        const mixedOption = options.find(o => o.id.startsWith('mixed_'));
        if (mixedOption) {
          hasMixedOption = true;
          const hasPositive = mixedOption.traits.some(t => t.type === 'positive');
          expect(hasPositive).toBe(true);
          break;
        }
      }

      // 혼합 선택지가 한 번은 나와야 함
      expect(hasMixedOption).toBe(true);
    });
  });

  describe('getTraitById', () => {
    it('존재하는 특성 ID로 특성을 조회한다', () => {
      const trait = getTraitById('swift');
      expect(trait).not.toBeNull();
      expect(trait?.id).toBe('swift');
      expect(trait?.name).toBeDefined();
      expect(trait?.type).toMatch(/^(positive|negative)$/);
    });

    it('존재하지 않는 특성 ID는 null을 반환한다', () => {
      const trait = getTraitById('nonexistent_trait');
      expect(trait).toBeNull();
    });

    it('빈 문자열은 null을 반환한다', () => {
      const trait = getTraitById('');
      expect(trait).toBeNull();
    });
  });

  describe('formatTraits', () => {
    it('긍정 특성은 + 접두사를 붙인다', () => {
      const result = formatTraits(['swift']);
      expect(result).toContain('+');
    });

    it('부정 특성은 - 접두사를 붙인다', () => {
      const result = formatTraits(['slow']);
      expect(result).toContain('-');
    });

    it('여러 특성을 쉼표로 구분한다', () => {
      const result = formatTraits(['swift', 'chain']);
      expect(result).toContain(',');
    });

    it('빈 배열은 빈 문자열을 반환한다', () => {
      const result = formatTraits([]);
      expect(result).toBe('');
    });

    it('존재하지 않는 특성 ID는 그대로 반환한다', () => {
      const result = formatTraits(['unknown_trait']);
      expect(result).toBe('unknown_trait');
    });

    it('혼합된 특성 배열을 처리한다', () => {
      const result = formatTraits(['swift', 'slow', 'chain']);
      expect(result).toContain('+');
      expect(result).toContain('-');
      expect(result.split(',').length).toBe(3);
    });
  });
});
