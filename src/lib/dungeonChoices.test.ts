/**
 * @file dungeonChoices.test.js
 * @description dungeonChoices 함수 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  canSelectChoice,
  getSpecialOverride,
  executeChoice,
  isOverpushing,
  getOverpushPenalty,
  getChoiceDisplayInfo
} from './dungeonChoices';

// Math.random 모킹
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dungeonChoices', () => {
  describe('canSelectChoice', () => {
    const defaultStats = { strength: 5, agility: 5, insight: 3 };

    it('기본 선택지는 선택 가능해야 함', () => {
      const choice = { text: 'Test choice' };
      const result = canSelectChoice(choice as any, defaultStats);

      expect(result.canSelect).toBe(true);
      expect(result.reason).toBe(null);
    });

    it('완료된 선택지는 선택 불가능해야 함', () => {
      const choice = { text: 'Test choice' };
      const result = canSelectChoice(choice as any, defaultStats, { completed: true });

      expect(result.canSelect).toBe(false);
      expect(result.reason).toBe('이미 완료됨');
    });

    it('반복 불가능한 선택지는 한 번만 선택 가능해야 함', () => {
      const choice = { text: 'Test choice', repeatable: false };
      const result = canSelectChoice(choice as any, defaultStats, { attempts: 1 });

      expect(result.canSelect).toBe(false);
      expect(result.reason).toBe('다시 선택 불가');
    });

    it('반복 가능한 선택지는 여러 번 선택 가능해야 함', () => {
      const choice = { text: 'Test choice', repeatable: true };
      const result = canSelectChoice(choice as any, defaultStats, { attempts: 3 });

      expect(result.canSelect).toBe(true);
    });

    it('최대 시도 횟수를 초과하면 선택 불가능해야 함', () => {
      const choice = { text: 'Test choice', repeatable: true, maxAttempts: 3 };
      const result = canSelectChoice(choice as any, defaultStats, { attempts: 3 });

      expect(result.canSelect).toBe(false);
      expect(result.reason).toBe('최대 시도 횟수 초과');
    });

    it('요구 아이템이 없으면 선택 불가능해야 함', () => {
      const choice = { text: 'Test choice', requirements: { item: 'golden_key' } as any };
      const result = canSelectChoice(choice as any, defaultStats, {}, { items: [] });

      expect(result.canSelect).toBe(false);
      expect(result.reason).toBe('golden_key 필요');
    });

    it('요구 아이템이 있으면 선택 가능해야 함', () => {
      const choice = { text: 'Test choice', requirements: { item: 'golden_key' } as any };
      const result = canSelectChoice(choice as any, defaultStats, {}, { items: ['golden_key'] });

      expect(result.canSelect).toBe(true);
    });

    it('요구 스탯 미달이면 선택 불가능하고 숨겨져야 함', () => {
      const choice = { text: 'Test choice', requirements: { strength: 10 } as any };
      const result = canSelectChoice(choice as any, defaultStats);

      expect(result.canSelect).toBe(false);
      expect(result.isHidden).toBe(true);
    });

    it('스케일링 요구 스탯 미달이면 선택 불가능해야 함', () => {
      const choice = {
        text: 'Test choice',
        repeatable: true,
        scalingRequirement: { stat: 'strength', baseValue: 3, increment: 2 } as any
      };
      // 시도 횟수 2 → 요구치: 3 + 2*2 = 7, 현재: 5
      const result = canSelectChoice(choice as any, defaultStats, { attempts: 2 });

      expect(result.canSelect).toBe(false);
      expect(result.statRequired).toEqual({ stat: 'strength', value: 7 });
    });

    it('스케일링 요구 스탯 충족이면 선택 가능해야 함', () => {
      const choice = {
        text: 'Test choice',
        repeatable: true,
        scalingRequirement: { stat: 'strength', baseValue: 3, increment: 1 } as any
      };
      // 시도 횟수 1 → 요구치: 3 + 1*1 = 4, 현재: 5
      const result = canSelectChoice(choice as any, { strength: 5 }, { attempts: 1 });

      expect(result.canSelect).toBe(true);
    });
  });

  describe('getSpecialOverride', () => {
    it('특수 선택지가 없으면 null을 반환해야 함', () => {
      const choice = { text: 'Test choice' };
      const result = getSpecialOverride(choice as any, ['lockpick'] as any);

      expect(result).toBe(null);
    });

    it('플레이어가 해당 주특기를 가지면 특수 선택지를 반환해야 함', () => {
      const choice = {
        text: 'Test choice',
        specialOverrides: [
          { requiredSpecial: 'lockpick', text: 'Pick the lock' }
        ] as any
      };
      const result = getSpecialOverride(choice as any, ['lockpick'] as any);

      expect(result).not.toBe(null);
      expect(result.requiredSpecial).toBe('lockpick');
    });

    it('플레이어가 해당 주특기가 없으면 null을 반환해야 함', () => {
      const choice = {
        text: 'Test choice',
        specialOverrides: [
          { requiredSpecial: 'lockpick', text: 'Pick the lock' }
        ] as any
      };
      const result = getSpecialOverride(choice as any, ['strength'] as any);

      expect(result).toBe(null);
    });

    it('여러 특수 선택지 중 첫 번째 일치를 반환해야 함', () => {
      const choice = {
        text: 'Test choice',
        specialOverrides: [
          { requiredSpecial: 'lockpick', text: 'Pick the lock' },
          { requiredSpecial: 'strength', text: 'Force it open' }
        ] as any
      };
      const result = getSpecialOverride(choice as any, ['strength', 'lockpick']);

      expect(result.requiredSpecial).toBe('lockpick');
    });
  });

  describe('executeChoice', () => {
    it('특수 선택지 사용 시 즉시 완료되어야 함', () => {
      const choice = { text: 'Test choice' };
      const specialOverride: any = {
        outcome: { type: 'success', text: 'Success!', effect: { gold: 10 } }
      };

      const result = executeChoice(choice as any, {}, {}, specialOverride);

      expect(result.result).toBe('success');
      expect(result.effect).toEqual({ gold: 10 });
      expect(result.newState.completed).toBe(true);
      expect(result.isSpecial).toBe(true);
    });

    it('경고 시점에 경고 메시지가 포함되어야 함', () => {
      const choice = {
        text: 'Test choice',
        maxAttempts: 5,
        warningAtAttempt: 3,
        warningText: 'Warning!'
      };

      const result = executeChoice(choice as any, {}, { attempts: 2 });

      expect(result.warning).toBe('Warning!');
    });

    it('진행 텍스트가 시도 횟수에 따라 표시되어야 함', () => {
      const choice = {
        text: 'Test choice',
        repeatable: true,
        maxAttempts: 5,
        progressText: ['First', 'Second', 'Third']
      };

      // attempts 0 → 실행 후 attempts=1 → progressText[0] = 'First'
      const result1 = executeChoice(choice as any, {}, { attempts: 0 });
      expect(result1.message).toBe('First');

      // attempts 1 → 실행 후 attempts=2 → progressText[1] = 'Second'
      const result2 = executeChoice(choice as any, {}, { attempts: 1 });
      expect(result2.message).toBe('Second');
    });

    it('최대 시도 횟수에 도달하면 완료되어야 함', () => {
      const choice = {
        text: 'Test choice',
        maxAttempts: 2,
        outcomes: {
          success: { type: 'success', text: 'Done!' } as any
        }
      };

      const result = executeChoice(choice as any, {}, { attempts: 1 });

      expect(result.newState.completed).toBe(true);
    });

    it('진행 중인 상태를 반환해야 함', () => {
      const choice = {
        text: 'Test choice',
        maxAttempts: 5,
        repeatable: true
      };

      const result = executeChoice(choice as any, {}, { attempts: 1 });

      expect(result.result).toBe('in_progress');
      expect(result.canContinue).toBe(true);
    });
  });

  describe('isOverpushing', () => {
    it('경고 시점이 없으면 false를 반환해야 함', () => {
      const choice = { text: 'Test choice' };
      expect(isOverpushing(choice as any, 5)).toBe(false);
    });

    it('경고 시점 이전이면 false를 반환해야 함', () => {
      const choice = { text: 'Test choice', warningAtAttempt: 3 };
      expect(isOverpushing(choice as any, 2)).toBe(false);
    });

    it('경고 시점 이후면 true를 반환해야 함', () => {
      const choice = { text: 'Test choice', warningAtAttempt: 3 };
      expect(isOverpushing(choice as any, 3)).toBe(true);
      expect(isOverpushing(choice as any, 5)).toBe(true);
    });
  });

  describe('getOverpushPenalty', () => {
    it('과잉 선택이 아니면 null을 반환해야 함', () => {
      const choice = { text: 'Test choice', warningAtAttempt: 3 };
      const result = getOverpushPenalty(choice as any, 2);

      expect(result).toBe(null);
    });

    it('과잉 선택 시 확률에 따라 패널티를 반환해야 함', () => {
      const choice = {
        text: 'Test choice',
        warningAtAttempt: 2,
        outcomes: { failure: { type: 'failure', text: 'Failed!' } as any }
      };

      // Math.random() = 0.5, 시도 3 → penaltyChance = 0.2 + (1 * 0.2) = 0.4
      // 0.5 >= 0.4 → 패널티 없음
      const result = getOverpushPenalty(choice as any, 3);
      expect(result).toBe(null);
    });

    it('높은 과잉 시도에서 패널티가 발생해야 함', () => {
      const choice = {
        text: 'Test choice',
        warningAtAttempt: 2,
        outcomes: { failure: { type: 'failure', text: 'Failed!' } as any }
      };

      // 시도 5 → penaltyChance = 0.2 + (3 * 0.2) = 0.8
      // 0.5 < 0.8 → 패널티 발생
      const result = getOverpushPenalty(choice as any, 5);
      expect(result).toEqual(choice.outcomes.failure);
    });
  });

  describe('getChoiceDisplayInfo', () => {
    const defaultStats = { strength: 5, agility: 5, insight: 3 };

    it('기본 선택지 정보를 반환해야 함', () => {
      const choice = { text: 'Test choice' };
      const result = getChoiceDisplayInfo(choice as any, defaultStats);

      expect(result.text).toBe('Test choice');
      expect(result.disabled).toBe(false);
      expect(result.hidden).toBe(false);
    });

    it('숨겨진 선택지는 ???로 표시되어야 함', () => {
      const choice = { text: 'Secret choice', requirements: { strength: 10 } as any };
      const result = getChoiceDisplayInfo(choice as any, defaultStats);

      expect(result.text).toBe('???');
      expect(result.subtext).toBe('조건 미달');
      expect(result.hidden).toBe(true);
    });

    it('특수 선택지가 있으면 대체 텍스트를 표시해야 함', () => {
      const choice = { text: 'Normal choice' };
      const specialOverride: any = {
        text: 'Special choice',
        requiredSpecial: 'lockpick'
      };
      const result = getChoiceDisplayInfo(choice as any, defaultStats, {}, specialOverride as any);

      expect(result.text).toBe('Special choice');
      expect(result.subtext).toBe('[lockpick]');
      expect(result.isSpecial).toBe(true);
    });

    it('반복 선택지는 시도 횟수를 표시해야 함', () => {
      const choice = { text: 'Test choice', repeatable: true, maxAttempts: 5 };
      const result = getChoiceDisplayInfo(choice as any, defaultStats, { attempts: 2 });

      expect(result.subtext).toBe('(2/5)');
    });

    it('선택 불가능한 이유를 서브텍스트로 표시해야 함', () => {
      const choice = { text: 'Test choice', repeatable: true, maxAttempts: 3 };
      const result = getChoiceDisplayInfo(choice as any, defaultStats, { attempts: 3 });

      expect(result.disabled).toBe(true);
      expect(result.subtext).toBe('최대 시도 횟수 초과');
    });
  });
});
